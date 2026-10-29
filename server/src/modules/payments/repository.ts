import { and, eq, sql } from "drizzle-orm";
import { packages, payments, subscriptions } from "../../db/schema";
import type { Database } from "../../db/client";
import { createId } from "../../shared/ids";
import type { CatalogRepository, PackageRecord } from "../coaches/schema";
import type { NewPayment, NewSubscription, PaymentFilters, PaymentPatch, PaymentRecord, PaymentRepository, SubscriptionRecord } from "./schema";

type DbExecutor = any;

function packageRecord(row: typeof packages.$inferSelect): PackageRecord { return row; }

function paymentRecord(row: typeof payments.$inferSelect): PaymentRecord {
  return row;
}

function subscriptionRecord(row: typeof subscriptions.$inferSelect): SubscriptionRecord { return row; }

export class DrizzlePaymentRepository implements PaymentRepository {
  constructor(private readonly db: DbExecutor, private readonly inTransaction = false) {}

  async transaction<T>(fn: (tx: PaymentRepository) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx: DbExecutor) => {
      await tx.execute(sql`select pg_advisory_xact_lock(731005)`);
      return fn(new DrizzlePaymentRepository(tx, true));
    });
  }

  async findPayment(id: string, lock = false) {
    const query = this.db.select().from(payments).where(eq(payments.id, id)).limit(1);
    const rows = (lock && this.inTransaction) ? await query.for("update") : await query;
    return rows[0] ? paymentRecord(rows[0]) : null;
  }

  async listPayments(filters: PaymentFilters = {}) {
    const conditions = [filters.status ? eq(payments.status, filters.status) : undefined, filters.memberId ? eq(payments.memberId, filters.memberId) : undefined].filter(Boolean);
    const rows = await this.db.select().from(payments).where(conditions.length ? and(...conditions as any) : undefined);
    return rows.map(paymentRecord);
  }

  async insertPayment(input: NewPayment) {
    const rows = await this.db.insert(payments).values({ memberId: input.memberId, packageId: input.packageId, amount: input.amount, status: "pending", method: input.method ?? null, reference: input.reference ?? null }).returning();
    return paymentRecord(rows[0]);
  }

  async updatePayment(id: string, patch: PaymentPatch) {
    const rows = await this.db.update(payments).set({ ...patch, updatedAt: new Date() }).where(eq(payments.id, id)).returning();
    return rows[0] ? paymentRecord(rows[0]) : null;
  }

  async findPackage(id: string) {
    const rows = await this.db.select().from(packages).where(eq(packages.id, id)).limit(1);
    return rows[0] ? packageRecord(rows[0]) : null;
  }

  async insertSubscription(input: NewSubscription) {
    const rows = await this.db.insert(subscriptions).values(input).returning();
    return subscriptionRecord(rows[0]);
  }

  async listSubscriptionsByMember(memberId: string) {
    return (await this.db.select().from(subscriptions).where(eq(subscriptions.memberId, memberId))).map(subscriptionRecord);
  }
}

export function createPaymentRepository(db: Database): PaymentRepository { return new DrizzlePaymentRepository(db); }

type PaymentArrays = { payments: PaymentRecord[]; subscriptions: SubscriptionRecord[] };
function cloneArrays(source: PaymentArrays): PaymentArrays {
  return {
    payments: source.payments.map((item) => ({ ...item, paidAt: item.paidAt ? new Date(item.paidAt) : null, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) })),
    subscriptions: source.subscriptions.map((item) => ({ ...item, startsAt: new Date(item.startsAt), expiresAt: new Date(item.expiresAt), createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) })),
  };
}

export class InMemoryPaymentRepository implements PaymentRepository {
  readonly payments: PaymentRecord[] = [];
  readonly subscriptions: SubscriptionRecord[] = [];
  private transactionTail: Promise<void> = Promise.resolve();

  constructor(private readonly catalog: CatalogRepository) {}

  async transaction<T>(fn: (tx: PaymentRepository) => Promise<T>): Promise<T> {
    let release!: () => void;
    const previous = this.transactionTail;
    this.transactionTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    const snapshot = cloneArrays(this);
    try { return await fn(this); } catch (error) {
      this.payments.splice(0, this.payments.length, ...snapshot.payments);
      this.subscriptions.splice(0, this.subscriptions.length, ...snapshot.subscriptions);
      throw error;
    } finally { release(); }
  }

  async findPayment(id: string) { return this.payments.find((item) => item.id === id) ?? null; }
  async listPayments(filters: PaymentFilters = {}) { return this.payments.filter((item) => (!filters.status || item.status === filters.status) && (!filters.memberId || item.memberId === filters.memberId)).map((item) => ({ ...item })); }
  async insertPayment(input: NewPayment) {
    const now = new Date();
    const item: PaymentRecord = { id: createId(), memberId: input.memberId, packageId: input.packageId, subscriptionId: null, amount: input.amount, status: "pending", method: input.method ?? null, reference: input.reference ?? null, paidAt: null, createdAt: now, updatedAt: now };
    this.payments.push(item);
    return { ...item };
  }
  async updatePayment(id: string, patch: PaymentPatch) { const item = this.payments.find((value) => value.id === id); if (!item) return null; Object.assign(item, patch, { updatedAt: new Date() }); return { ...item }; }
  async findPackage(id: string) { return this.catalog.findPackage(id); }
  async insertSubscription(input: NewSubscription) { const now = new Date(); const item: SubscriptionRecord = { ...input, id: createId(), createdAt: now, updatedAt: now }; this.subscriptions.push(item); return { ...item }; }
  async listSubscriptionsByMember(memberId: string) { return this.subscriptions.filter((item) => item.memberId === memberId).map((item) => ({ ...item })); }
}
