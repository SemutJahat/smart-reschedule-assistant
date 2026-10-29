import { sql } from "drizzle-orm";
import type { Database } from "../../db/client";
import { DrizzleBookingRepository, InMemoryBookingRepository } from "../bookings/repository";
import type { BookingRepository } from "../bookings/schema";
import { InMemoryCatalogRepository } from "../coaches/schema";
import type { CatalogRepository } from "../coaches/schema";
import { DrizzlePaymentRepository, InMemoryPaymentRepository } from "../payments/repository";
import type { PaymentRepository } from "../payments/schema";
import { DrizzleRescheduleRepository, InMemoryRescheduleRepository } from "../reschedules/repository";
import type { RescheduleRepository } from "../reschedules/schema";
import { DrizzleChatRepository, InMemoryChatRepository } from "./repository";
import type { ChatRepository } from "./schema";

export interface ChatRescheduleUnitOfWork { chat: ChatRepository; reschedule: RescheduleRepository; booking: BookingRepository; payment: PaymentRepository; }
export type ChatTransactionCallback<T> = (tx: ChatRescheduleUnitOfWork) => Promise<T>;
export class ChatTransactionCoordinator {
  constructor(private readonly db: Database) {}
  async transaction<T>(fn: ChatTransactionCallback<T>) { return this.db.transaction(async (dbTx: any) => { await dbTx.execute(sql`select pg_advisory_xact_lock(731005)`); return fn({ chat: new DrizzleChatRepository(dbTx, true), reschedule: new DrizzleRescheduleRepository(dbTx, true), booking: new DrizzleBookingRepository(dbTx, true), payment: new DrizzlePaymentRepository(dbTx, true) }); }); }
}

export type InMemoryChatRepositories = { chat: InMemoryChatRepository; reschedule: RescheduleRepository; booking: BookingRepository; payment: PaymentRepository; catalog?: CatalogRepository };
export class InMemoryChatTransactionCoordinator {
  readonly chat: InMemoryChatRepository; readonly reschedule: RescheduleRepository; readonly booking: BookingRepository; readonly payment: PaymentRepository; private readonly catalog?: CatalogRepository; private tail: Promise<void> = Promise.resolve();
  constructor(repositories: InMemoryChatRepositories);
  constructor(catalog: InMemoryCatalogRepository, chat?: InMemoryChatRepository);
  constructor(first: InMemoryChatRepositories | InMemoryCatalogRepository, chat?: InMemoryChatRepository) {
    if (first instanceof InMemoryCatalogRepository) { this.catalog = first; this.chat = chat ?? new InMemoryChatRepository(); this.payment = new InMemoryPaymentRepository(first); this.booking = new InMemoryBookingRepository(first, this.payment); this.reschedule = new InMemoryRescheduleRepository(this.booking, first); }
    else { this.chat = first.chat; this.reschedule = first.reschedule; this.booking = first.booking; this.payment = first.payment; this.catalog = first.catalog; }
  }
  private state() { const r = this.reschedule as any, b = this.booking as any, p = this.payment as any, c = this.catalog as any; return { chat: { sessions: structuredClone(this.chat.sessions), messages: structuredClone(this.chat.messages), analyses: structuredClone(this.chat.analyses) }, requests: Array.isArray(r.requests) ? structuredClone(r.requests) : undefined, bookings: Array.isArray(b.bookings) ? structuredClone(b.bookings) : undefined, payments: Array.isArray(p.payments) ? structuredClone(p.payments) : undefined, subscriptions: Array.isArray(p.subscriptions) ? structuredClone(p.subscriptions) : undefined, catalog: c ? { services: structuredClone(c.services), coaches: structuredClone(c.coaches), coachServices: structuredClone(c.coachServices), packages: structuredClone(c.packages), schedules: structuredClone(c.schedules), bookings: structuredClone(c.bookings) } : undefined }; }
  private restore(s: ReturnType<InMemoryChatTransactionCoordinator["state"]>) { const put = (a: any, b: any) => { if (a && b) a.splice(0, a.length, ...b); }; put(this.chat.sessions, s.chat.sessions); put(this.chat.messages, s.chat.messages); put(this.chat.analyses, s.chat.analyses); put((this.reschedule as any).requests, s.requests); put((this.booking as any).bookings, s.bookings); put((this.payment as any).payments, s.payments); put((this.payment as any).subscriptions, s.subscriptions); const c = this.catalog as any; if (c && s.catalog) { put(c.services, s.catalog.services); put(c.coaches, s.catalog.coaches); put(c.coachServices, s.catalog.coachServices); put(c.packages, s.catalog.packages); put(c.schedules, s.catalog.schedules); put(c.bookings, s.catalog.bookings); } }
  async transaction<T>(fn: ChatTransactionCallback<T>) { let release!: () => void; const previous = this.tail; this.tail = new Promise((resolve) => { release = resolve; }); await previous; const old = this.state(); try { return await fn({ chat: this.chat, reschedule: this.reschedule, booking: this.booking, payment: this.payment }); } catch (error) { this.restore(old); throw error; } finally { release(); } }
}
export const createChatTransactionCoordinator = (db: Database) => new ChatTransactionCoordinator(db);
export const createInMemoryChatTransactionCoordinator = (repositories: InMemoryChatRepositories) => new InMemoryChatTransactionCoordinator(repositories);
