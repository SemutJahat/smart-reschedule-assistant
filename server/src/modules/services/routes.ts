import { t, type AnyElysia } from "elysia";
import { requireAuth, requireRole } from "../../plugins/auth";
import { AppError } from "../../shared/errors";
import type { AuthRepository } from "../auth/schema";
import { ServiceCatalogService } from "./service";

const serviceBody = t.Object({ name: t.String({ minLength: 1, maxLength: 120 }), description: t.Optional(t.Union([t.String(), t.Null()])), active: t.Optional(t.Boolean()) });
const servicePatch = t.Partial(serviceBody);
const serviceResponse = t.Object({ id: t.String(), name: t.String(), description: t.Union([t.String(), t.Null()]), active: t.Boolean(), createdAt: t.String(), updatedAt: t.String() });

export function serviceRoutes(app: AnyElysia, service: ServiceCatalogService, auth: AuthRepository) {
  return app
    .get("/services", async (context: any) => {
      const user = await requireAuth(context, auth);
      const includeInactive = context.query.includeInactive === "true";
      if (includeInactive && user.role !== "admin") throw new AppError("FORBIDDEN", "Forbidden", 403);
      return service.list(includeInactive);
    }, { query: t.Object({ includeInactive: t.Optional(t.Union([t.Literal("true"), t.Literal("false")])) }), response: t.Array(serviceResponse) })
    .post("/services", (context: any) => service.create(context.body), { beforeHandle: async (context: any) => { await requireRole(context, "admin", auth); }, body: serviceBody, response: serviceResponse })
    .patch("/services/:id", (context: any) => service.update(context.params.id, context.body), { beforeHandle: async (context: any) => { await requireRole(context, "admin", auth); }, params: t.Object({ id: t.String({ format: "uuid" }) }), body: servicePatch, response: serviceResponse });
}
