import { t, type AnyElysia } from "elysia";
import { requireAuth, requireRole } from "../../plugins/auth";
import type { AuthRepository } from "../auth/schema";
import { RescheduleService } from "./service";

const status = t.Union([t.Literal("pending"), t.Literal("held"), t.Literal("approved"), t.Literal("rejected"), t.Literal("cancelled")]);
const requestBody = t.Object({ bookingId: t.String({ format: "uuid" }), requestedScheduleId: t.String({ format: "uuid" }), customerMessage: t.String({ minLength: 1 }) });
const response = t.Object({ id: t.String(), bookingId: t.String(), memberId: t.String(), fromScheduleId: t.String(), toScheduleId: t.String(), customerMessage: t.Union([t.String(), t.Null()]), adminNote: t.Union([t.String(), t.Null()]), status, reviewedBy: t.Union([t.String(), t.Null()]), reviewedAt: t.Union([t.String(), t.Null()]), createdAt: t.String(), updatedAt: t.String() });

export function rescheduleRoutes(app: AnyElysia, service: RescheduleService, auth: AuthRepository) {
  return app
    .post("/reschedule-requests", async (context: any) => service.create(await requireAuth(context, auth), context.body), { beforeHandle: async (context: any) => { await requireRole(context, "customer", auth); }, body: requestBody, response })
    .get("/reschedule-requests/me", async (context: any) => service.listOwn(await requireAuth(context, auth)), { beforeHandle: async (context: any) => { await requireRole(context, "customer", auth); }, response: t.Array(response) })
    .get("/reschedule-requests", async (context: any) => service.listAdmin(context.query), { beforeHandle: async (context: any) => { await requireRole(context, "admin", auth); }, query: t.Object({ status: t.Optional(status), memberId: t.Optional(t.String({ format: "uuid" })) }), response: t.Array(response) })
    .patch("/reschedule-requests/:id/review", async (context: any) => service.review(await requireAuth(context, auth), context.params.id, context.body), { beforeHandle: async (context: any) => { await requireRole(context, "admin", auth); }, params: t.Object({ id: t.String({ format: "uuid" }) }), body: t.Object({ decision: t.Union([t.Literal("approved"), t.Literal("rejected"), t.Literal("held")]), adminNote: t.Optional(t.String()) }), response });
}
