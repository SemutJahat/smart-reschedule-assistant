import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { Database } from "../../db/client";
import { bookings, schedules, subscriptions } from "../../db/schema";
import { createId } from "../../shared/ids";
import type { CatalogBookingRecord, CatalogRepository, ScheduleRecord } from "../coaches/schema";
import type { PaymentRepository, SubscriptionRecord } from "../payments/schema";
import type { BookingFilters, BookingPatch, BookingRecord, BookingRepository, NewBooking } from "./schema";

type DbExecutor = any;

function booking(row: typeof bookings.$inferSelect): BookingRecord { return row; }

export class DrizzleBookingRepository implements BookingRepository {
  constructor(private readonly db: DbExecutor, private readonly inTransaction = false) {}

  async transaction<T>(fn: (tx: BookingRepository) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx: DbExecutor) => {
      // A single advisory lock serializes booking writes across all schedules. The
      // schedule and subscription row locks below still protect direct DB writers.
      await tx.execute(sql`select pg_advisory_xact_lock(731005)`);
      return fn(new DrizzleBookingRepository(tx, true));
    });
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

  async findSubscription(id: string, lock = false) {
    const query = this.db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
    const rows = lock && this.inTransaction ? await query.for("update") : await query;
    return rows[0] ? rows[0] as SubscriptionRecord : null;
  }

  async updateSubscriptionUsed(id: string, usedSessions: number) {
    const rows = await this.db.update(subscriptions).set({ usedSessions, updatedAt: new Date() }).where(eq(subscriptions.id, id)).returning();
    return rows[0] ? rows[0] as SubscriptionRecord : null;
  }

  async countBooked(scheduleId: string) {
    const rows = await this.db.select({ count: sql<number>`count(*)` }).from(bookings).where(and(eq(bookings.scheduleId, scheduleId), eq(bookings.status, "booked")));
    return Number(rows[0]?.count ?? 0);
  }

  async findActiveByMemberSchedule(memberId: string, scheduleId: string, lock = false) {
    const query = this.db.select().from(bookings).where(and(eq(bookings.memberId, memberId), eq(bookings.scheduleId, scheduleId), eq(bookings.status, "booked"))).limit(1);
    const rows = lock && this.inTransaction ? await query.for("update") : await query;
    return rows[0] ? booking(rows[0]) : null;
  }

  async findBooking(id: string, lock = false) {
    const query = this.db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    const rows = lock && this.inTransaction ? await query.for("update") : await query;
    return rows[0] ? booking(rows[0]) : null;
  }

  async listBookings(filters: BookingFilters = {}) {
    const conditions = [
      filters.memberId ? eq(bookings.memberId, filters.memberId) : undefined,
      filters.status ? eq(bookings.status, filters.status) : undefined,
    ].filter(Boolean) as any[];
    if (filters.date) {
      const start = new Date(`${filters.date}T00:00:00.000Z`);
      const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
      conditions.push(gte(schedules.startsAt, start), lt(schedules.startsAt, end));
    }
    const query = this.db.select({ booking: bookings }).from(bookings).innerJoin(schedules, eq(bookings.scheduleId, schedules.id));
    const rows = await query.where(conditions.length ? and(...conditions) : undefined);
    return rows.map((row: { booking: typeof bookings.$inferSelect }) => booking(row.booking));
  }

  async insertBooking(input: NewBooking) {
    const rows = await this.db.insert(bookings).values(input).returning();
    return booking(rows[0]);
  }

  async updateBooking(id: string, patch: BookingPatch) {
    const rows = await this.db.update(bookings).set({ ...patch, updatedAt: new Date() }).where(eq(bookings.id, id)).returning();
    return rows[0] ? booking(rows[0]) : null;
  }
}

export function createBookingRepository(db: Database): BookingRepository { return new DrizzleBookingRepository(db); }

type Snapshot = { bookings: BookingRecord[]; schedules: ScheduleRecord[]; subscriptions: SubscriptionRecord[] };
function cloneBooking(item: BookingRecord): BookingRecord { return { ...item, bookedAt: new Date(item.bookedAt), cancelledAt: item.cancelledAt ? new Date(item.cancelledAt) : null, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) }; }
function cloneSchedule(item: ScheduleRecord): ScheduleRecord { return { ...item, startsAt: new Date(item.startsAt), endsAt: new Date(item.endsAt), createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) }; }
function cloneSubscription(item: SubscriptionRecord): SubscriptionRecord { return { ...item, startsAt: new Date(item.startsAt), expiresAt: new Date(item.expiresAt), createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) }; }

/** In-memory implementation intentionally serializes the whole transaction. */
export class InMemoryBookingRepository implements BookingRepository {
  readonly bookings: BookingRecord[];
  private transactionTail: Promise<void> = Promise.resolve();

  constructor(private readonly catalog: CatalogRepository, private readonly payments: PaymentRepository, sharedBookings?: CatalogBookingRecord[]) {
    this.bookings = (sharedBookings ?? catalog.bookings ?? []) as BookingRecord[];
  }

  async transaction<T>(fn: (tx: BookingRepository) => Promise<T>): Promise<T> {
    let release!: () => void;
    const previous = this.transactionTail;
    this.transactionTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    const schedules = await this.catalog.listSchedules();
    const subscriptions = await this.payments.listSubscriptions();
    const snapshot: Snapshot = { bookings: this.bookings.map(cloneBooking), schedules: schedules.map(cloneSchedule), subscriptions: subscriptions.map(cloneSubscription) };
    try { return await fn(this); }
    catch (error) {
      this.bookings.splice(0, this.bookings.length, ...snapshot.bookings);
      for (const old of snapshot.schedules) await this.catalog.updateSchedule(old.id, { status: old.status });
      for (const old of snapshot.subscriptions) await this.payments.updateSubscription(old.id, { usedSessions: old.usedSessions });
      throw error;
    } finally { release(); }
  }

  findSchedule(id: string) { return this.catalog.findSchedule(id); }
  updateScheduleStatus(id: string, status: ScheduleRecord["status"]) { return this.catalog.updateSchedule(id, { status }); }
  findSubscription(id: string) { return this.payments.findSubscription(id); }
  updateSubscriptionUsed(id: string, usedSessions: number) { return this.payments.updateSubscription(id, { usedSessions }); }
  async countBooked(scheduleId: string) { return this.bookings.filter((item) => item.scheduleId === scheduleId && item.status === "booked").length; }
  async findActiveByMemberSchedule(memberId: string, scheduleId: string) { return this.bookings.find((item) => item.memberId === memberId && item.scheduleId === scheduleId && item.status === "booked") ? cloneBooking(this.bookings.find((item) => item.memberId === memberId && item.scheduleId === scheduleId && item.status === "booked")!) : null; }
  async findBooking(id: string) { const item = this.bookings.find((value) => value.id === id); return item ? cloneBooking(item) : null; }
  async listBookings(filters: BookingFilters = {}) {
    let result = this.bookings.filter((item) => (!filters.memberId || item.memberId === filters.memberId) && (!filters.status || item.status === filters.status));
    if (filters.date) {
      const start = new Date(`${filters.date}T00:00:00.000Z`); const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
      const schedules = await this.catalog.listSchedules();
      result = result.filter((item) => { const schedule = schedules.find((value) => value.id === item.scheduleId); return !!schedule && schedule.startsAt >= start && schedule.startsAt < end; });
    }
    return result.map(cloneBooking);
  }
  async insertBooking(input: NewBooking) { const now = new Date(); const item: BookingRecord = { ...input, id: createId(), status: "booked", bookedAt: now, cancelledAt: null, createdAt: now, updatedAt: now }; this.bookings.push(item); return cloneBooking(item); }
  async updateBooking(id: string, patch: BookingPatch) { const item = this.bookings.find((value) => value.id === id); if (!item) return null; Object.assign(item, patch, { updatedAt: new Date() }); return cloneBooking(item); }
}
