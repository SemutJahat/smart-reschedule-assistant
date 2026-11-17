import { AppError } from "../../shared/errors";
import type { AuthRepository, AuthUser } from "../auth/schema";
import type { MidtransNotification, PaymentGateway } from "./gateway";
import type { PaymentFilters, PaymentRecord, PaymentRepository, SubscriptionRecord } from "./schema";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function money(value: string): string { const parsed = Number(value); return Number.isFinite(parsed) ? parsed.toFixed(2) : value; }
function rupiah(value: string): number { return Math.round(Number(value)); }
function serializePayment(item: PaymentRecord) { return { ...item, paidAt: item.paidAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }; }
function serializeSubscription(item: SubscriptionRecord) { return { ...item, startsAt: item.startsAt.toISOString(), expiresAt: item.expiresAt.toISOString(), createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }; }

type NotificationTarget = "paid" | "failed" | "refunded" | null;

function notificationTarget(notification: MidtransNotification): NotificationTarget {
  switch (notification.transaction_status) {
    case "settlement": return "paid";
    case "capture": return notification.fraud_status === "challenge" || notification.fraud_status === "deny" ? null : "paid";
    case "deny":
    case "cancel":
    case "expire":
    case "failure": return "failed";
    case "refund": return "refunded";
    default: return null;
  }
}

export class PaymentService {
  constructor(readonly repository: PaymentRepository, readonly authRepository: AuthRepository, readonly gateway: PaymentGateway) {}

  async create(user: AuthUser, input: { packageId: string; method?: string | null; reference?: string | null }) {
    const member = await this.authRepository.findMemberByUserId(user.userId);
    if (!member) throw new AppError("NOT_FOUND", "Member not found", 404);
    const account = await this.authRepository.findUserById(user.userId);
    if (!account) throw new AppError("NOT_FOUND", "User not found", 404);
    const packageItem = await this.repository.findPackage(input.packageId);
    if (!packageItem || packageItem.status !== "active") throw new AppError("NOT_FOUND", "Package not found", 404);
    const method = input.method === undefined || input.method === null ? null : input.method.trim() || null;
    const reference = input.reference?.trim() || null;
    if (method && method.length > 64) throw new AppError("BAD_REQUEST", "Payment method is too long", 400);
    if (reference && reference.length > 255) throw new AppError("BAD_REQUEST", "Payment reference is too long", 400);
    const payment = await this.repository.transaction((tx) => tx.insertPayment({ memberId: member.id, packageId: packageItem.id, amount: money(packageItem.price), method, reference }));
    const grossAmount = rupiah(payment.amount);
    let snap;
    try {
      snap = await this.gateway.createTransaction({
        orderId: payment.id,
        grossAmount,
        item: { id: packageItem.id, name: packageItem.name, price: grossAmount },
        customer: { name: account.name, email: account.email, phone: member.phone },
      });
    } catch (error) {
      await this.repository.transaction((tx) => tx.updatePayment(payment.id, { status: "failed" }));
      throw error;
    }
    const updated = await this.repository.transaction((tx) => tx.updatePayment(payment.id, { snapToken: snap.token, snapRedirectUrl: snap.redirectUrl }));
    return { ...serializePayment(updated!), snapToken: snap.token, snapRedirectUrl: snap.redirectUrl };
  }

  async listOwn(user: AuthUser) {
    const member = await this.authRepository.findMemberByUserId(user.userId);
    if (!member) throw new AppError("NOT_FOUND", "Member not found", 404);
    return (await this.repository.listPayments({ memberId: member.id })).map(serializePayment);
  }

  async getById(user: AuthUser, id: string) {
    const payment = await this.repository.findPayment(id);
    if (!payment) throw new AppError("NOT_FOUND", "Payment not found", 404);
    if (user.role !== "admin") {
      const member = await this.authRepository.findMemberByUserId(user.userId);
      if (!member || member.id !== payment.memberId) throw new AppError("NOT_FOUND", "Payment not found", 404);
    }
    return serializePayment(payment);
  }

  async listAdmin(filters: PaymentFilters) { return (await this.repository.listPayments(filters)).map(serializePayment); }

  async updateStatus(id: string, status: "paid" | "failed" | "refunded") {
    return this.repository.transaction(async (tx) => {
      const payment = await tx.findPayment(id, true);
      if (!payment) throw new AppError("NOT_FOUND", "Payment not found", 404);
      if (payment.status === "pending" && status === "failed") return serializePayment((await tx.updatePayment(id, { status: "failed", paidAt: null }))!);
      if (payment.status === "paid" && status === "refunded") return serializePayment((await tx.updatePayment(id, { status: "refunded" }))!);
      if (payment.status !== "pending" || status !== "paid") throw new AppError("CONFLICT", `Cannot transition payment from ${payment.status} to ${status}`, 409);
      return serializePayment(await this.markPaid(tx, payment));
    });
  }

  async handleNotification(notification: MidtransNotification) {
    if (!this.gateway.verifyNotification(notification)) throw new AppError("FORBIDDEN", "Invalid notification signature", 403);
    if (!UUID_PATTERN.test(notification.order_id)) throw new AppError("NOT_FOUND", "Payment not found", 404);
    return this.repository.transaction(async (tx) => {
      const payment = await tx.findPayment(notification.order_id, true);
      if (!payment) throw new AppError("NOT_FOUND", "Payment not found", 404);
      if (Number(notification.gross_amount) !== rupiah(payment.amount)) throw new AppError("CONFLICT", "Notification amount does not match payment amount", 409);
      const method = payment.method ?? notification.payment_type?.trim().slice(0, 64) ?? null;
      const target = notificationTarget(notification);
      let current = payment;
      if (method !== payment.method) current = (await tx.updatePayment(payment.id, { method }))!;
      if (target === "paid" && current.status === "pending") current = await this.markPaid(tx, current);
      else if (target === "failed" && current.status === "pending") current = (await tx.updatePayment(current.id, { status: "failed", paidAt: null }))!;
      else if (target === "refunded" && current.status === "paid") current = (await tx.updatePayment(current.id, { status: "refunded" }))!;
      return { received: true, paymentId: current.id, status: current.status };
    });
  }

  async subscriptionsOwn(user: AuthUser) {
    const member = await this.authRepository.findMemberByUserId(user.userId);
    if (!member) throw new AppError("NOT_FOUND", "Member not found", 404);
    return (await this.repository.listSubscriptionsByMember(member.id)).map(serializeSubscription);
  }

  private async markPaid(tx: PaymentRepository, payment: PaymentRecord) {
    if (payment.subscriptionId) throw new AppError("CONFLICT", "Payment has already created a subscription", 409);
    const packageItem = await tx.findPackage(payment.packageId);
    if (!packageItem) throw new AppError("NOT_FOUND", "Package not found", 404);
    if (money(payment.amount) !== money(packageItem.price)) throw new AppError("CONFLICT", "Payment amount does not match package price", 409);
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + packageItem.validityDays * 24 * 60 * 60 * 1000);
    const subscription = await tx.insertSubscription({ memberId: payment.memberId, packageId: packageItem.id, status: "active", startsAt, expiresAt, totalSessions: packageItem.totalSessions, usedSessions: 0, amountPaid: money(packageItem.price) });
    return (await tx.updatePayment(payment.id, { status: "paid", subscriptionId: subscription.id, paidAt: startsAt }))!;
  }
}

export { serializePayment, serializeSubscription };
