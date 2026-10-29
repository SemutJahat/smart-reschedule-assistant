import type { PackageRecord } from "../coaches/schema";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type SubscriptionStatus = "pending" | "held" | "active" | "expired" | "cancelled";

export interface PaymentRecord {
  id: string;
  memberId: string;
  packageId: string;
  subscriptionId: string | null;
  amount: string;
  status: PaymentStatus;
  method: string | null;
  reference: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionRecord {
  id: string;
  memberId: string;
  packageId: string;
  status: SubscriptionStatus;
  startsAt: Date;
  expiresAt: Date;
  totalSessions: number;
  usedSessions: number;
  amountPaid: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentFilters {
  status?: PaymentStatus;
  memberId?: string;
}

export interface NewPayment {
  memberId: string;
  packageId: string;
  amount: string;
  method?: string | null;
  reference?: string | null;
}

export interface PaymentPatch {
  status?: PaymentStatus;
  subscriptionId?: string | null;
  paidAt?: Date | null;
}

export interface NewSubscription {
  memberId: string;
  packageId: string;
  status: "active";
  startsAt: Date;
  expiresAt: Date;
  totalSessions: number;
  usedSessions: number;
  amountPaid: string;
}

export interface PaymentRepository {
  transaction<T>(fn: (tx: PaymentRepository) => Promise<T>): Promise<T>;
  findPayment(id: string, lock?: boolean): Promise<PaymentRecord | null>;
  listPayments(filters?: PaymentFilters): Promise<PaymentRecord[]>;
  insertPayment(input: NewPayment): Promise<PaymentRecord>;
  updatePayment(id: string, patch: PaymentPatch): Promise<PaymentRecord | null>;
  findPackage(id: string): Promise<PackageRecord | null>;
  insertSubscription(input: NewSubscription): Promise<SubscriptionRecord>;
  findSubscription(id: string, lock?: boolean): Promise<SubscriptionRecord | null>;
  updateSubscription(id: string, patch: { usedSessions?: number }): Promise<SubscriptionRecord | null>;
  listSubscriptions(): Promise<SubscriptionRecord[]>;
  listSubscriptionsByMember(memberId: string): Promise<SubscriptionRecord[]>;
}
