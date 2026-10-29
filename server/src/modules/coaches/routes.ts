import { t, type AnyElysia } from "elysia";
import { requireAuth, requireRole } from "../../plugins/auth";
import { CoachService } from "./service";
import type { AuthRepository } from "../auth/schema";

const status = t.Union([t.Literal("active"), t.Literal("inactive"), t.Literal("suspended")]);
const nullableString = t.Optional(t.Union([t.String(), t.Null()]));
const coachBody = t.Object({ name: t.String({ minLength: 1 }), phone: nullableString, specialty: nullableString, bio: nullableString, status: t.Optional(status), serviceIds: t.Optional(t.Array(t.String({ minLength: 1 }))) });
const coachPatch = t.Partial(coachBody);
const coachResponse = t.Object({ id: t.String(), name: t.String(), phone: t.Union([t.String(), t.Null()]), specialty: t.Union([t.String(), t.Null()]), bio: t.Union([t.String(), t.Null()]), status, serviceIds: t.Array(t.String()), createdAt: t.String(), updatedAt: t.String() });

export function coachRoutes(app: AnyElysia, service: CoachService, auth: AuthRepository) {
  return app
    .get("/coaches", () => service.list(), { beforeHandle: async (context: any) => { await requireAuth(context, auth); }, response: t.Array(coachResponse) })
    .post("/coaches", (context: any) => service.create(context.body), { beforeHandle: async (context: any) => { await requireRole(context, "admin", auth); }, body: coachBody, response: coachResponse })
    .patch("/coaches/:id", (context: any) => service.update(context.params.id, context.body), { beforeHandle: async (context: any) => { await requireRole(context, "admin", auth); }, params: t.Object({ id: t.String({ format: "uuid" }) }), body: coachPatch, response: coachResponse });
}
