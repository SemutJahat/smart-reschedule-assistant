import { AppError } from "../../shared/errors";
import type { AuthRepository, AuthUser } from "../auth/schema";
import type { NewPayment, PaymentFilters, PaymentRecord, PaymentRepository, SubscriptionRecord } from "./schema";

function money(value: string): string { const parsed = Number(value); return Number.isFinite(parsed) ? parsed.toFixed(2) : value; }
function serializePayment(item: PaymentRecord) { return { ...item, paidAt: item.paidAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }; }
function serializeSubscription(item: SubscriptionRecord) { return { ...item, startsAt: item.startsAt.toISOString(), expiresAt: item.expiresAt.toISOString(), createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }; }

export class PaymentService {
  constructor(readonly repository: PaymentRepository, readonly authRepository: AuthRepository) {}

  async create(user: AuthUser, input: { packageId: string; method?: string | null; reference?: string | null }) {
    const member = await this.authRepository.findMemberByUserId(user.userId);
    if (!member) throw new AppError("NOT_FOUND", "Member not found", 404);
    const packageItem = await this.repository.findPackage(input.packageId);
    if (!packageItem || packageItem.status !== "active") throw new AppError("NOT_FOUND", "Package not found", 404);
    const method = input.method === undefined || input.method === null ? null : input.method.trim() || null;
    const reference = input.reference?.trim() || null;
    if (method && method.length > 64) throw new AppError("BAD_REQUEST", "Payment method is too long", 400);
    if (reference && reference.length > 255) throw new AppError("BAD_REQUEST", "Payment reference is too long", 400);
    return this.repository.transaction(async (tx) => serializePayment(await tx.insertPayment({ memberId: member.id, packageId: packageItem.id, amount: money(packageItem.price), method, reference })));
  }

  async listOwn(user: AuthUser) {
    const member = await this.authRepository.findMemberByUserId(user.userId);
    if (!member) throw new AppError("NOT_FOUND", "Member not found", 404);
    return (await this.repository.listPayments({ memberId: member.id })).map(serializePayment);
  }

  async listAdmin(filters: PaymentFilters) { return (await this.repository.listPayments(filters)).map(serializePayment); }

  async updateStatus(id: string, status: "paid" | "failed" | "refunded") {
    return this.repository.transaction(async (tx) => {
      const payment = await tx.findPayment(id, true);
      if (!payment) throw new AppError("NOT_FOUND", "Payment not found", 404);
      if (payment.status === "pending" && status === "failed") return serializePayment((await tx.updatePayment(id, { status: "failed", paidAt: null }))!);
      if (payment.status === "paid" && status === "refunded") return serializePayment((await tx.updatePayment(id, { status: "refunded" }))!);
      if (payment.status !== "pending" || status !== "paid") throw new AppError("CONFLICT", `Cannot transition payment from ${payment.status} to ${status}`, 409);
      if (payment.subscriptionId) throw new AppError("CONFLICT", "Payment has already created a subscription", 409);
      const packageItem = await tx.findPackage(payment.packageId);
      if (!packageItem) throw new AppError("NOT_FOUND", "Package not found", 404);
      if (money(payment.amount) !== money(packageItem.price)) throw new AppError("CONFLICT", "Payment amount does not match package price", 409);
      const startsAt = new Date();
      const expiresAt = new Date(startsAt.getTime() + packageItem.validityDays * 24 * 60 * 60 * 1000);
      const subscription = await tx.insertSubscription({ memberId: payment.memberId, packageId: packageItem.id, status: "active", startsAt, expiresAt, totalSessions: packageItem.totalSessions, usedSessions: 0, amountPaid: money(packageItem.price) });
      return serializePayment((await tx.updatePayment(id, { status: "paid", subscriptionId: subscription.id, paidAt: startsAt }))!);
    });
  }

  async subscriptionsOwn(user: AuthUser) {
    const member = await this.authRepository.findMemberByUserId(user.userId);
    if (!member) throw new AppError("NOT_FOUND", "Member not found", 404);
    return (await this.repository.listSubscriptionsByMember(member.id)).map(serializeSubscription);
  }
}

export { serializePayment, serializeSubscription };
