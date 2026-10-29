import { AppError } from "../../shared/errors";
import type { AuthRepository, AuthUser } from "../auth/schema";
import type { BookingRecord } from "../bookings/schema";
import type {
  RescheduleFilters,
  RescheduleRepository,
  RescheduleRequestRecord,
} from "./schema";

const serialize = (item: RescheduleRequestRecord) => ({
  ...item,
  reviewedAt: item.reviewedAt?.toISOString() ?? null,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
});

function mapConflict(error: any) {
  const code = error?.code ?? error?.cause?.code;
  const constraint = error?.constraint_name ?? error?.constraint ?? error?.cause?.constraint_name;
  if (code === "23505" || code === "23514" || code === "P0001" || code === "P0002" || code === "P0003" || code === "P0004" || code === "P0005" || code === "P0006" || constraint === "reschedule_requests_active_booking_uidx") {
    return new AppError("CONFLICT", "Reschedule request conflicts with the current booking state", 409);
  }
  return null;
}

export class RescheduleService {
  constructor(readonly repository: RescheduleRepository, readonly authRepository: AuthRepository) {}

  async create(user: AuthUser, input: { bookingId: string; requestedScheduleId: string; customerMessage: string }) {
    const member = await this.authRepository.findMemberByUserId(user.userId);
    if (!member) throw new AppError("NOT_FOUND", "Member not found", 404);
    try {
      const created = await this.repository.transaction(async (tx) => {
        const booking = await tx.findBooking(input.bookingId, true);
        if (!booking) throw new AppError("NOT_FOUND", "Booking not found", 404);
        if (booking.memberId !== member.id) throw new AppError("FORBIDDEN", "Booking does not belong to the member", 403);
        if (booking.status !== "booked") throw new AppError("CONFLICT", "Only booked reservations can be rescheduled", 409);
         // Lock and validate the complete historical tuple in one transaction. The
         // source schedule is intentionally copied from the booking, rather than
         // trusting a client-provided source value.
         const source = await tx.findSchedule(booking.scheduleId, true);
         if (!source) throw new AppError("CONFLICT", "Booking source schedule no longer exists", 409);
         const target = await tx.findSchedule(input.requestedScheduleId, true);
        if (!target) throw new AppError("NOT_FOUND", "Target schedule not found", 404);
        if (target.id === booking.scheduleId) throw new AppError("CONFLICT", "Target schedule must differ from the current schedule", 409);
        if (target.status === "cancelled") throw new AppError("CONFLICT", "Target schedule is cancelled", 409);
        if ((await tx.countBooked(target.id)) >= target.capacity) throw new AppError("CONFLICT", "Target schedule is full", 409);
        if ((await tx.listRequests({ memberId: member.id })).some((item) => item.bookingId === booking.id && (item.status === "pending" || item.status === "held"))) {
          throw new AppError("CONFLICT", "An active reschedule request already exists", 409);
        }
        return tx.insertRequest({ bookingId: booking.id, memberId: member.id, fromScheduleId: booking.scheduleId, toScheduleId: target.id, customerMessage: input.customerMessage });
      });
      return serialize(created);
    } catch (error) {
      const conflict = mapConflict(error);
      if (conflict) throw conflict;
      throw error;
    }
  }

  async listOwn(user: AuthUser) {
    const member = await this.authRepository.findMemberByUserId(user.userId);
    if (!member) throw new AppError("NOT_FOUND", "Member not found", 404);
    return (await this.repository.listRequests({ memberId: member.id })).map(serialize);
  }

  async listAdmin(filters: RescheduleFilters = {}) {
    return (await this.repository.listRequests(filters)).map(serialize);
  }

  async review(user: AuthUser, id: string, input: { decision: "approved" | "rejected" | "held"; adminNote?: string }) {
    try {
      const result = await this.repository.transaction(async (tx) => {
        const initial = await tx.findRequest(id, true);
        if (!initial) throw new AppError("NOT_FOUND", "Reschedule request not found", 404);
        const sourceId = initial.fromScheduleId < initial.toScheduleId ? initial.fromScheduleId : initial.toScheduleId;
        const targetId = initial.fromScheduleId < initial.toScheduleId ? initial.toScheduleId : initial.fromScheduleId;
        await tx.findSchedule(sourceId, true);
        await tx.findSchedule(targetId, true);
        const booking = await tx.findBooking(initial.bookingId, true);
        const request = initial;
        if (!request) throw new AppError("NOT_FOUND", "Reschedule request not found", 404);
         if (request.status !== "pending" && request.status !== "held") throw new AppError("CONFLICT", "Reschedule request has already been reviewed", 409);
        if (!booking || booking.memberId !== request.memberId || booking.scheduleId !== request.fromScheduleId || booking.status !== "booked") throw new AppError("CONFLICT", "Booking no longer matches the request", 409);
        if (input.decision === "approved") {
          const target = await tx.findSchedule(request.toScheduleId, true);
          if (!target) throw new AppError("NOT_FOUND", "Target schedule not found", 404);
          if (target.status === "cancelled") throw new AppError("CONFLICT", "Target schedule is cancelled", 409);
          if ((await tx.countBooked(target.id)) >= target.capacity) throw new AppError("CONFLICT", "Target schedule is full", 409);
          await tx.updateBookingSchedule(booking.id, target.id);
          await repairSchedule(tx, request.fromScheduleId);
          await repairSchedule(tx, request.toScheduleId);
        }
        return tx.updateRequest(id, { status: input.decision, adminNote: input.adminNote ?? null, reviewedBy: user.userId, reviewedAt: new Date() });
      });
      return serialize(result!);
    } catch (error) {
      const conflict = mapConflict(error);
      if (conflict) throw conflict;
      throw error;
    }
  }
}

async function repairSchedule(repository: RescheduleRepository, id: string) {
  const schedule = await repository.findSchedule(id);
  if (!schedule || schedule.status === "cancelled") return;
  const count = await repository.countBooked(id);
  await repository.updateScheduleStatus(id, count >= schedule.capacity ? "full" : "available");
}

export { serialize as serializeRescheduleRequest, mapConflict as rescheduleConflict };
