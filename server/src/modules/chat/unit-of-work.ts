import { sql } from "drizzle-orm";
import type { Database } from "../../db/client";
import { DrizzleBookingRepository, InMemoryBookingRepository } from "../bookings/repository";
import type { BookingRepository } from "../bookings/schema";
import type { InMemoryCatalogRepository } from "../coaches/schema";
import { DrizzlePaymentRepository, InMemoryPaymentRepository } from "../payments/repository";
import type { PaymentRepository } from "../payments/schema";
import { DrizzleRescheduleRepository, InMemoryRescheduleRepository } from "../reschedules/repository";
import type { RescheduleRepository } from "../reschedules/schema";
import { DrizzleChatRepository, InMemoryChatRepository } from "./repository";
import type { ChatRepository } from "./schema";

export interface ChatRescheduleUnitOfWork { chat: ChatRepository; reschedule: RescheduleRepository; booking: BookingRepository; payment: PaymentRepository; }
export type ChatTransactionCallback<T> = (tx: ChatRescheduleUnitOfWork) => Promise<T>;
export interface ChatTransactionCoordinator { transaction<T>(fn: ChatTransactionCallback<T>): Promise<T>; }
export class DrizzleChatTransactionCoordinator implements ChatTransactionCoordinator {
  constructor(private readonly db: Database) {}
  async transaction<T>(fn: ChatTransactionCallback<T>): Promise<T> { return this.db.transaction(async (dbTx: any) => { await dbTx.execute(sql`select pg_advisory_xact_lock(731005)`); return fn({ chat: new DrizzleChatRepository(dbTx, true), reschedule: new DrizzleRescheduleRepository(dbTx, true), booking: new DrizzleBookingRepository(dbTx, true), payment: new DrizzlePaymentRepository(dbTx, true) }); }); }
}

export type InMemoryChatRepositories = { chat: InMemoryChatRepository; reschedule: InMemoryRescheduleRepository; booking: InMemoryBookingRepository; payment: InMemoryPaymentRepository; catalog: InMemoryCatalogRepository };
export class InMemoryChatTransactionCoordinator implements ChatTransactionCoordinator {
  readonly chat: InMemoryChatRepository; readonly reschedule: InMemoryRescheduleRepository; readonly booking: InMemoryBookingRepository; readonly payment: InMemoryPaymentRepository; private readonly catalog: InMemoryCatalogRepository; private tail: Promise<void> = Promise.resolve();
  constructor(repositories: InMemoryChatRepositories) {
    this.chat = repositories.chat;
    this.reschedule = repositories.reschedule;
    this.booking = repositories.booking;
    this.payment = repositories.payment;
    this.catalog = repositories.catalog;
  }
  private state() { return { chat: { sessions: structuredClone(this.chat.sessions), messages: structuredClone(this.chat.messages), analyses: structuredClone(this.chat.analyses) }, requests: structuredClone(this.reschedule.requests), bookings: structuredClone(this.booking.bookings), payments: structuredClone(this.payment.payments), subscriptions: structuredClone(this.payment.subscriptions), catalog: { services: structuredClone(this.catalog.services), coaches: structuredClone(this.catalog.coaches), coachServices: structuredClone(this.catalog.coachServices), packages: structuredClone(this.catalog.packages), schedules: structuredClone(this.catalog.schedules), bookings: structuredClone(this.catalog.bookings) } }; }
  private restore(s: ReturnType<InMemoryChatTransactionCoordinator["state"]>) { const put = <T>(a: T[], b: T[]) => a.splice(0, a.length, ...b); put(this.chat.sessions, s.chat.sessions); put(this.chat.messages, s.chat.messages); put(this.chat.analyses, s.chat.analyses); put(this.reschedule.requests, s.requests); put(this.booking.bookings, s.bookings); put(this.payment.payments, s.payments); put(this.payment.subscriptions, s.subscriptions); put(this.catalog.services, s.catalog.services); put(this.catalog.coaches, s.catalog.coaches); put(this.catalog.coachServices, s.catalog.coachServices); put(this.catalog.packages, s.catalog.packages); put(this.catalog.schedules, s.catalog.schedules); put(this.catalog.bookings, s.catalog.bookings); }
  async transaction<T>(fn: ChatTransactionCallback<T>): Promise<T> { let release!: () => void; const previous = this.tail; this.tail = new Promise((resolve) => { release = resolve; }); await previous; const old = this.state(); try { return await fn({ chat: this.chat, reschedule: this.reschedule, booking: this.booking, payment: this.payment }); } catch (error) { this.restore(old); throw error; } finally { release(); } }
}
export const createChatTransactionCoordinator = (db: Database): ChatTransactionCoordinator => new DrizzleChatTransactionCoordinator(db);
export const createInMemoryChatTransactionCoordinator = (repositories: InMemoryChatRepositories): ChatTransactionCoordinator => new InMemoryChatTransactionCoordinator(repositories);
