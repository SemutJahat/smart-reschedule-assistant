import { AppError } from "../../shared/errors";
import type { AuthRepository } from "../auth/schema";
import type { CatalogRepository, ScheduleRecord } from "../coaches/schema";
import { mapBookingInvariantError } from "../bookings/errors";

export interface ScheduleInput { title: string; coachId: string; serviceId: string; startsAt: string; endsAt: string; capacity: number; status?: ScheduleRecord["status"]; }
export interface SchedulePatch { title?: string; coachId?: string; serviceId?: string; startsAt?: string; endsAt?: string; capacity?: number; status?: ScheduleRecord["status"]; }

function date(value: string, label: string) { const parsed = new Date(value); if (!Number.isFinite(parsed.getTime())) throw new AppError("BAD_REQUEST", `${label} must be a valid date-time`, 400); return parsed; }
function title(value: string) { const result = value.trim(); if (!result) throw new AppError("BAD_REQUEST", "Schedule title is required", 400); return result; }
function capacity(value: number) { if (!Number.isInteger(value) || value <= 0) throw new AppError("BAD_REQUEST", "capacity must be positive", 400); }

export class ScheduleService {
  constructor(readonly repository: CatalogRepository, readonly authRepository: AuthRepository) {}
  async list(filters: { date?: string; status?: ScheduleRecord["status"] }) {
    let rows = await this.repository.listSchedules();
    if (filters.date !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.date)) throw new AppError("BAD_REQUEST", "date must use YYYY-MM-DD", 400);
      const start = new Date(`${filters.date}T00:00:00.000Z`); const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
      rows = rows.filter((item) => item.startsAt < end && item.endsAt > start);
    }
    const result = await Promise.all(rows.map((item) => this.withDerivedStatus(item)));
    return result.filter((item) => !filters.status || item.status === filters.status).map(serializeSchedule);
  }
  async create(input: ScheduleInput) {
    const values = validateInput(input);
    return this.repository.transaction(async (tx) => {
      await assertActiveAssociation(tx, values.coachId, values.serviceId);
      if (input.status !== "cancelled") await assertNoOverlap(tx, values.startsAt, values.endsAt, values.coachId);
      const created = await tx.insertSchedule({ ...values, status: input.status === "cancelled" ? "cancelled" : "available" });
      return serializeSchedule(await this.withDerivedStatus(created, tx));
    });
  }
  async update(id: string, input: SchedulePatch) {
    try {
      return await this.repository.transaction(async (tx) => {
      const current = await tx.findSchedule(id); if (!current) throw new AppError("NOT_FOUND", "Schedule not found", 404);
      const values = { title: input.title === undefined ? current.title : title(input.title), coachId: input.coachId ?? current.coachId, serviceId: input.serviceId ?? current.serviceId, startsAt: input.startsAt === undefined ? current.startsAt : date(input.startsAt, "startsAt"), endsAt: input.endsAt === undefined ? current.endsAt : date(input.endsAt, "endsAt"), capacity: input.capacity ?? current.capacity };
      if (values.endsAt.getTime() <= values.startsAt.getTime()) throw new AppError("BAD_REQUEST", "endsAt must be after startsAt", 400);
      capacity(values.capacity);
      await assertActiveAssociation(tx, values.coachId, values.serviceId);
      const booked = await tx.countBooked(id);
      if (values.capacity < booked) throw new AppError("CONFLICT", "Capacity cannot be lower than existing bookings", 409);
      const cancelled = (input.status ?? current.status) === "cancelled";
      if (!cancelled) await assertNoOverlap(tx, values.startsAt, values.endsAt, values.coachId, id);
      await tx.updateSchedule(id, { ...values, status: cancelled ? "cancelled" : booked >= values.capacity ? "full" : "available" });
        return serializeSchedule(await this.withDerivedStatus((await tx.findSchedule(id))!, tx));
      });
    } catch (error) {
      const conflict = mapBookingInvariantError(error);
      if (conflict) throw conflict;
      throw error;
    }
  }
  private async withDerivedStatus(item: ScheduleRecord, repository = this.repository) { const booked = await repository.countBooked(item.id); const status: ScheduleRecord["status"] = item.status === "cancelled" ? "cancelled" : booked >= item.capacity ? "full" : "available"; return { ...item, bookedCount: booked, status }; }
}

async function assertActiveAssociation(repository: CatalogRepository, coachId: string, serviceId: string) { const coach = await repository.findCoach(coachId); if (!coach || coach.status !== "active") throw new AppError("BAD_REQUEST", "Coach must exist and be active", 400); const services = await repository.listServicesByIds([serviceId]); if (!services[0] || !services[0].active) throw new AppError("BAD_REQUEST", "Service must exist and be active", 400); const associated = coach.serviceIds.includes(serviceId) || (await repository.listServicesForCoach(coachId)).some((item) => item.id === serviceId); if (!associated) throw new AppError("BAD_REQUEST", "Coach is not associated with this service", 400); }
async function assertNoOverlap(repository: CatalogRepository, startsAt: Date, endsAt: Date, coachId: string, excludeId?: string) { const rows = await repository.listSchedules(); if (rows.some((item) => item.id !== excludeId && item.coachId === coachId && item.status !== "cancelled" && startsAt < item.endsAt && endsAt > item.startsAt)) throw new AppError("CONFLICT", "Schedule overlaps another schedule for this coach", 409); }
function validateInput(input: ScheduleInput) { const startsAt = date(input.startsAt, "startsAt"); const endsAt = date(input.endsAt, "endsAt"); if (endsAt.getTime() <= startsAt.getTime()) throw new AppError("BAD_REQUEST", "endsAt must be after startsAt", 400); capacity(input.capacity); return { title: title(input.title), coachId: input.coachId, serviceId: input.serviceId, startsAt, endsAt, capacity: input.capacity }; }
function serializeSchedule(item: ScheduleRecord & { bookedCount?: number }) { return { ...item, bookedCount: item.bookedCount ?? 0, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }; }
