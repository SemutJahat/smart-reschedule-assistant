import { AppError } from "../../shared/errors";
import type { AuthRepository, AuthUser } from "../auth/schema";
import type { BookingFilters, BookingRecord, BookingRepository } from "./schema";

function serialize(item: BookingRecord) {
  return {
    ...item,
    bookedAt: item.bookedAt.toISOString(),
    cancelledAt: item.cancelledAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function validateDate(value: string | undefined) {
  if (value !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AppError("BAD_REQUEST", "date must use YYYY-MM-DD", 400);
}

type DatabaseErrorShape = {
  code?: unknown;
  constraint?: unknown;
  constraint_name?: unknown;
  cause?: {
    code?: unknown;
    constraint?: unknown;
    constraint_name?: unknown;
  };
};

export function bookingDuplicateConflict(error: unknown): AppError | null {
  if (!error || typeof error !== "object") return null;
  const databaseError = error as DatabaseErrorShape;
  const nested = databaseError.cause;
  const code = databaseError.code ?? nested?.code;
  const constraint = databaseError.constraint
    ?? databaseError.constraint_name
    ?? nested?.constraint
    ?? nested?.constraint_name;
  if (code === "23505" && constraint === "bookings_member_schedule_active_uidx") {
    return new AppError("CONFLICT", "Member already has an active booking for this schedule", 409);
  }
  return null;
}

export class BookingService {
  constructor(readonly repository: BookingRepository, readonly authRepository: AuthRepository) {}

  async create(user: AuthUser, input: { scheduleId: string; subscriptionId: string }) {
    const member = await this.authRepository.findMemberByUserId(user.userId);
    if (!member) throw new AppError("NOT_FOUND", "Member not found", 404);
    try {
      return await this.repository.transaction(async (tx) => {
      // Lock in a stable order. PostgreSQL uses the advisory lock in the repository
      // as an additional guard for writers that do not lock the same rows.
      const schedule = await tx.findSchedule(input.scheduleId, true);
      if (!schedule) throw new AppError("NOT_FOUND", "Schedule not found", 404);
      if (schedule.status === "cancelled") throw new AppError("CONFLICT", "Schedule is cancelled", 409);
      const subscription = await tx.findSubscription(input.subscriptionId, true);
      if (!subscription) throw new AppError("NOT_FOUND", "Subscription not found", 404);
      if (subscription.memberId !== member.id) throw new AppError("FORBIDDEN", "Subscription does not belong to the member", 403);
      const now = new Date();
      if (subscription.status !== "active") throw new AppError("CONFLICT", "Subscription is not active", 409);
      if (subscription.expiresAt <= now) throw new AppError("CONFLICT", "Subscription has expired", 409);
      if (subscription.usedSessions >= subscription.totalSessions) throw new AppError("CONFLICT", "Subscription has no remaining sessions", 409);
      const count = await tx.countBooked(schedule.id);
      if (count >= schedule.capacity) throw new AppError("CONFLICT", "Schedule is full", 409);
      if (await tx.findActiveByMemberSchedule(member.id, schedule.id, true)) throw new AppError("CONFLICT", "Member already has an active booking for this schedule", 409);
      const created = await tx.insertBooking({ memberId: member.id, scheduleId: schedule.id, subscriptionId: subscription.id });
      await tx.updateSubscriptionUsed(subscription.id, subscription.usedSessions + 1);
      await tx.updateScheduleStatus(schedule.id, count + 1 >= schedule.capacity ? "full" : "available");
      return serialize(created);
      });
    } catch (error) {
      const duplicateConflict = bookingDuplicateConflict(error);
      if (duplicateConflict) throw duplicateConflict;
      throw error;
    }
  }

  async listOwn(user: AuthUser, filters: Omit<BookingFilters, "memberId"> = {}) {
    const member = await this.authRepository.findMemberByUserId(user.userId);
    if (!member) throw new AppError("NOT_FOUND", "Member not found", 404);
    validateDate(filters.date);
    return (await this.repository.listBookings({ ...filters, memberId: member.id })).map(serialize);
  }

  async listAdmin(filters: BookingFilters = {}) {
    validateDate(filters.date);
    return (await this.repository.listBookings(filters)).map(serialize);
  }

  async cancel(user: AuthUser, id: string) {
    return this.repository.transaction(async (tx) => {
      // Read the key first, then acquire locks in the same schedule ->
      // subscription -> booking order used by creation. Re-check the booking
      // after locking it so cancellation cannot race another booking write.
      const initial = await tx.findBooking(id);
      if (!initial) throw new AppError("NOT_FOUND", "Booking not found", 404);
      if (user.role !== "admin") {
        const member = await this.authRepository.findMemberByUserId(user.userId);
        if (!member || member.id !== initial.memberId) throw new AppError("FORBIDDEN", "You cannot cancel this booking", 403);
      }
      const schedule = await tx.findSchedule(initial.scheduleId, true);
      const subscription = await tx.findSubscription(initial.subscriptionId, true);
      const current = await tx.findBooking(id, true);
      if (!current) throw new AppError("NOT_FOUND", "Booking not found", 404);
      if (current.status !== "booked") throw new AppError("CONFLICT", `Cannot cancel a ${current.status} booking`, 409);
      if (!subscription) throw new AppError("NOT_FOUND", "Subscription not found", 404);
      const updated = await tx.updateBooking(id, { status: "cancelled", cancelledAt: new Date() });
      await tx.updateSubscriptionUsed(subscription.id, Math.max(0, subscription.usedSessions - 1));
      if (schedule && schedule.status === "full") await tx.updateScheduleStatus(schedule.id, "available");
      return serialize(updated!);
    });
  }
}

export { serialize as serializeBooking };
