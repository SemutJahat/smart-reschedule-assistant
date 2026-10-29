import { t, type AnyElysia } from "elysia";
import { requireAuth, requireRole } from "../../plugins/auth";
import { ScheduleService } from "./service";
import type { AuthRepository } from "../auth/schema";

const scheduleStatus = t.Union([t.Literal("available"), t.Literal("full"), t.Literal("cancelled")]);
const scheduleBody = t.Object({ title: t.String({ minLength: 1 }), coachId: t.String({ minLength: 1 }), serviceId: t.String({ minLength: 1 }), startsAt: t.String({ format: "date-time" }), endsAt: t.String({ format: "date-time" }), capacity: t.Integer({ minimum: 1 }), status: t.Optional(scheduleStatus) });
const schedulePatch = t.Partial(scheduleBody);
const scheduleResponse = t.Object({ id: t.String(), title: t.String(), coachId: t.String(), serviceId: t.String(), startsAt: t.String(), endsAt: t.String(), capacity: t.Number(), bookedCount: t.Number(), status: scheduleStatus, createdAt: t.String(), updatedAt: t.String() });

export function scheduleRoutes(app: AnyElysia, service: ScheduleService, auth: AuthRepository) {
  return app
    .get("/schedules", (context: any) => service.list(context.query), { beforeHandle: async (context: any) => { await requireAuth(context, auth); }, query: t.Object({ date: t.Optional(t.String({ format: "date" })), status: t.Optional(scheduleStatus) }), response: t.Array(scheduleResponse) })
    .post("/schedules", (context: any) => service.create(context.body), { beforeHandle: async (context: any) => { await requireRole(context, "admin", auth); }, body: scheduleBody, response: scheduleResponse })
    .patch("/schedules/:id", (context: any) => service.update(context.params.id, context.body), { beforeHandle: async (context: any) => { await requireRole(context, "admin", auth); }, params: t.Object({ id: t.String({ format: "uuid" }) }), body: schedulePatch, response: scheduleResponse });
}
