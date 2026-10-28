import { t, type AnyElysia } from "elysia";
import { requireRole } from "../../plugins/auth";
import { UserService } from "./service";

export function userRoutes(app: AnyElysia, service: UserService) {
  return app
    .get("/users", async (_context: any) => service.list(), { beforeHandle: async (context: any) => { await requireRole(context, "admin"); } })
    .get("/users/:id", async (context: any) => { await requireRole(context, "admin"); return service.get(context.params.id); })
    .patch("/users/:id", async (context: any) => { await requireRole(context, "admin"); return service.update(context.params.id, context.body); }, {
      body: t.Object({ name: t.Optional(t.String()), role: t.Optional(t.Union([t.Literal("admin"), t.Literal("customer")])) }),
    });
}
