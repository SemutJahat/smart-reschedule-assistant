export type SubscriptionStatus =
  | "pending"
  | "held"
  | "active"
  | "expired"
  | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface SubscriptionRecordDTO {
  id: string;
  memberId: string;
  packageId: string;
  status: SubscriptionStatus;
  startsAt: string;
  expiresAt: string;
  totalSessions: number;
  usedSessions: number;
  amountPaid: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionDTO extends SubscriptionRecordDTO {
  packageName: string;
}

export interface PaymentRecordDTO {
  id: string;
  memberId: string;
  packageId: string;
  subscriptionId: string | null;
  amount: string;
  status: PaymentStatus;
  method: string | null;
  reference: string | null;
  snapToken: string | null;
  snapRedirectUrl: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDTO extends PaymentRecordDTO {
  packageName: string;
}
