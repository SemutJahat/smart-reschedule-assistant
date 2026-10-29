import { and, count, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../../db/client";
import { bookings, rescheduleRequests, schedules } from "../../db/schema";
import { createId } from "../../shared/ids";
import type { CatalogRepository, ScheduleRecord } from "../coaches/schema";
import type { BookingRecord, BookingRepository } from "../bookings/schema";
import type {
  RescheduleRequestInput,
  RescheduleFilters,
  RescheduleRepository,
  RescheduleRequestPatch,
  RescheduleRequestRecord,
} from "./schema";

type DbExecutor = any;

type RescheduleRequestRow = typeof rescheduleRequests.$inferSelect & { chatSessionId?: string | null };
const requestRecord = (row: RescheduleRequestRow): RescheduleRequestRecord => ({ ...row, chatSessionId: row.chatSessionId ?? null });
const bookingRecord = (row: typeof bookings.$inferSelect): BookingRecord => row;

export class DrizzleRescheduleRepository implements RescheduleRepository {
  readonly databaseEnforcesBookingInvariants = true;
  constructor(private readonly db: DbExecutor, private readonly inTransaction = false) {}

  async transaction<T>(fn: (tx: RescheduleRepository) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx: DbExecutor) => {
      await tx.execute(sql`select pg_advisory_xact_lock(731005)`);
      return fn(new DrizzleRescheduleRepository(tx, true));
    });
  }

  async findRequest(id: string, lock = false) {
    const query = this.db.select().from(rescheduleRequests).where(eq(rescheduleRequests.id, id)).limit(1);
    const rows = lock && this.inTransaction ? await query.for("update") : await query;
    return rows[0] ? requestRecord(rows[0]) : null;
  }

  async listRequests(filters: RescheduleFilters = {}) {
    const conditions = [
      filters.memberId ? eq(rescheduleRequests.memberId, filters.memberId) : undefined,
      filters.status ? eq(rescheduleRequests.status, filters.status) : undefined,
    ].filter(Boolean) as any[];
    const rows = await this.db.select().from(rescheduleRequests).where(conditions.length ? and(...conditions) : undefined);
    return rows.map(requestRecord);
  }

  async insertRequest(input: RescheduleRequestInput) {
    // The nullable chat link is added by the Task 2 migration; keep legacy DB writes unchanged for now.
    const legacyInput = "chatSessionId" in input ? (({ chatSessionId: _chatSessionId, ...rest }) => rest)(input) : input;
    const rows = await this.db.insert(rescheduleRequests).values({ ...legacyInput, customerMessage: input.customerMessage }).returning();
    return requestRecord(rows[0]);
  }

  async updateRequest(id: string, patch: RescheduleRequestPatch) {
    const rows = await this.db.update(rescheduleRequests).set({ ...patch, updatedAt: new Date() }).where(eq(rescheduleRequests.id, id)).returning();
    return rows[0] ? requestRecord(rows[0]) : null;
  }

  async findBooking(id: string, lock = false) {
    const query = this.db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    const rows = lock && this.inTransaction ? await query.for("update") : await query;
    return rows[0] ? bookingRecord(rows[0]) : null;
  }

  async updateBookingSchedule(id: string, scheduleId: string) {
    const rows = await this.db.update(bookings).set({ scheduleId, updatedAt: new Date() }).where(eq(bookings.id, id)).returning();
    return rows[0] ? bookingRecord(rows[0]) : null;
  }

  async findSchedule(id: string, lock = false) {
    const query = this.db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
    const rows = lock && this.inTransaction ? await query.for("update") : await query;
    return rows[0] ? rows[0] as ScheduleRecord : null;
  }

  async updateScheduleStatus(id: string, status: ScheduleRecord["status"]) {
    const rows = await this.db.update(schedules).set({ status, updatedAt: new Date() }).where(eq(schedules.id, id)).returning();
    return rows[0] ? rows[0] as ScheduleRecord : null;
  }

  async countBooked(scheduleId: string) {
    const rows = await this.db.select({ count: count() }).from(bookings).where(and(eq(bookings.scheduleId, scheduleId), eq(bookings.status, "booked")));
    return Number(rows[0]?.count ?? 0);
  }
}

export function createRescheduleRepository(db: Database): RescheduleRepository {
  return new DrizzleRescheduleRepository(db);
}

function cloneRequest(item: RescheduleRequestRecord): RescheduleRequestRecord {
  return { ...item, reviewedAt: item.reviewedAt ? new Date(item.reviewedAt) : null, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) };
}

/** In-memory requests use the same booking and schedule collections as the existing repositories. */
export class InMemoryRescheduleRepository implements RescheduleRepository {
  readonly requests: RescheduleRequestRecord[] = [];
  readonly databaseEnforcesBookingInvariants = false;
  private transactionTail: Promise<void> = Promise.resolve();

  constructor(private readonly bookings: BookingRepository, private readonly catalog: CatalogRepository) {}

  async transaction<T>(fn: (tx: RescheduleRepository) => Promise<T>): Promise<T> {
    let release!: () => void;
    const previous = this.transactionTail;
    this.transactionTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    const snapshot = this.requests.map(cloneRequest);
    try {
      return await this.bookings.transaction(async () => {
        try { return await fn(this); }
        catch (error) { this.requests.splice(0, this.requests.length, ...snapshot); throw error; }
      });
    } finally { release(); }
  }

  async findRequest(id: string) { const item = this.requests.find((value) => value.id === id); return item ? cloneRequest(item) : null; }
  async listRequests(filters: RescheduleFilters = {}) { return this.requests.filter((item) => (!filters.memberId || item.memberId === filters.memberId) && (!filters.status || item.status === filters.status)).map(cloneRequest); }
  async insertRequest(input: RescheduleRequestInput) {
    const now = new Date();
    const chatSessionId = "chatSessionId" in input ? input.chatSessionId : null;
    const item: RescheduleRequestRecord = { ...input, chatSessionId, id: createId(), customerMessage: input.customerMessage, adminNote: null, status: "pending", reviewedBy: null, reviewedAt: null, createdAt: now, updatedAt: now };
    if (this.requests.some((value) => value.bookingId === input.bookingId && (value.status === "pending" || value.status === "held"))) throw { code: "23505", constraint_name: "reschedule_requests_active_booking_uidx" };
    this.requests.push(item);
    return cloneRequest(item);
  }
  async updateRequest(id: string, patch: RescheduleRequestPatch) { const item = this.requests.find((value) => value.id === id); if (!item) return null; Object.assign(item, patch, { updatedAt: new Date() }); return cloneRequest(item); }
  findBooking(id: string, lock = false) { return this.bookings.findBooking(id, lock); }
  updateBookingSchedule(id: string, scheduleId: string) { return this.bookings.updateBooking(id, { scheduleId } as any); }
  findSchedule(id: string, lock = false) { return this.bookings.findSchedule(id, lock); }
  updateScheduleStatus(id: string, status: ScheduleRecord["status"]) { return this.bookings.updateScheduleStatus(id, status); }
  countBooked(scheduleId: string) { return this.bookings.countBooked(scheduleId); }
}
