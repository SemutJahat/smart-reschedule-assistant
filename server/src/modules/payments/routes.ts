import { t, type AnyElysia } from "elysia";
import { requireAuth, requireRole } from "../../plugins/auth";
import type { AuthRepository } from "../auth/schema";
import { PaymentService } from "./service";

const status = t.Union([t.Literal("pending"), t.Literal("paid"), t.Literal("failed"), t.Literal("refunded")]);
const nullableString = (maxLength: number) => t.Optional(t.Union([t.String({ maxLength }), t.Null()]));
const paymentBody = t.Object({ packageId: t.String({ format: "uuid" }), method: nullableString(64), reference: nullableString(255) });
const paymentResponse = t.Object({ id: t.String(), memberId: t.String(), packageId: t.String(), subscriptionId: t.Union([t.String(), t.Null()]), amount: t.String(), status, method: t.Union([t.String(), t.Null()]), reference: t.Union([t.String(), t.Null()]), paidAt: t.Union([t.String(), t.Null()]), createdAt: t.String(), updatedAt: t.String() });
const subscriptionResponse = t.Object({ id: t.String(), memberId: t.String(), packageId: t.String(), status: t.Union([t.Literal("pending"), t.Literal("held"), t.Literal("active"), t.Literal("expired"), t.Literal("cancelled")]), startsAt: t.String(), expiresAt: t.String(), totalSessions: t.Number(), usedSessions: t.Number(), amountPaid: t.String(), createdAt: t.String(), updatedAt: t.String() });

export function paymentRoutes(app: AnyElysia, service: PaymentService, auth: AuthRepository) {
  return app
    .post("/payments", async (context: any) => service.create(await requireAuth(context, auth), context.body), { beforeHandle: async (context: any) => { await requireRole(context, "customer", auth); }, body: paymentBody, response: paymentResponse })
    .get("/payments/me", async (context: any) => service.listOwn(await requireAuth(context, auth)), { beforeHandle: async (context: any) => { await requireRole(context, "customer", auth); }, response: t.Array(paymentResponse) })
    .get("/payments", async (context: any) => service.listAdmin({ status: context.query.status, memberId: context.query.memberId }), { beforeHandle: async (context: any) => { await requireRole(context, "admin", auth); }, query: t.Object({ status: t.Optional(status), memberId: t.Optional(t.String({ format: "uuid" })) }), response: t.Array(paymentResponse) })
    .patch("/payments/:id/status", async (context: any) => service.updateStatus(context.params.id, context.body.status), { beforeHandle: async (context: any) => { await requireRole(context, "admin", auth); }, params: t.Object({ id: t.String({ format: "uuid" }) }), body: t.Object({ status: t.Union([t.Literal("paid"), t.Literal("failed"), t.Literal("refunded")]) }), response: paymentResponse })
    .get("/subscriptions/me", async (context: any) => service.subscriptionsOwn(await requireAuth(context, auth)), { beforeHandle: async (context: any) => { await requireRole(context, "customer", auth); }, response: t.Array(subscriptionResponse) });
}
