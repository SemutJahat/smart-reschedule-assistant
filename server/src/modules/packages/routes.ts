import { t, type AnyElysia } from "elysia";
import { requireAuth, requireRole } from "../../plugins/auth";
import { PackageService } from "./service";
import type { AuthRepository } from "../auth/schema";

const packageStatus = t.Union([t.Literal("active"), t.Literal("inactive"), t.Literal("archived")]);
const price = t.Union([t.Number({ exclusiveMinimum: 0 }), t.String({ minLength: 1 })]);
const packageBody = t.Object({ name: t.String({ minLength: 1 }), category: t.String({ minLength: 1 }), description: t.Optional(t.Union([t.String(), t.Null()])), price, totalSessions: t.Integer({ minimum: 1 }), validityDays: t.Integer({ minimum: 1 }), status: t.Optional(packageStatus) });
const packagePatch = t.Partial(packageBody);
const packageResponse = t.Object({ id: t.String(), name: t.String(), category: t.String(), description: t.Union([t.String(), t.Null()]), price: t.String(), totalSessions: t.Number(), validityDays: t.Number(), status: packageStatus, createdAt: t.String(), updatedAt: t.String() });

export function packageRoutes(app: AnyElysia, service: PackageService, auth: AuthRepository) {
  return app
    .get("/packages", (context: any) => service.list(context.query.status ?? "active"), { beforeHandle: async (context: any) => { await requireAuth(context, auth); }, query: t.Object({ status: t.Optional(packageStatus) }), response: t.Array(packageResponse) })
    .post("/packages", (context: any) => service.create(context.body), { beforeHandle: async (context: any) => { await requireRole(context, "admin", auth); }, body: packageBody, response: packageResponse })
    .patch("/packages/:id", (context: any) => service.update(context.params.id, context.body), { beforeHandle: async (context: any) => { await requireRole(context, "admin", auth); }, params: t.Object({ id: t.String({ format: "uuid" }) }), body: packagePatch, response: packageResponse });
}
