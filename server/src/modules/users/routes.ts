import { t, type AnyElysia } from "elysia";
import { requireAuth, requireRole } from "../../plugins/auth";
import { UserService } from "./service";

export function userRoutes(app: AnyElysia, service: UserService) {
  const userResponse = t.Object({ id: t.String(), email: t.String(), role: t.Union([t.Literal("admin"), t.Literal("customer")]), name: t.String() });
  return app
    .get("/users", async (_context: any) => service.list(), { beforeHandle: async (context: any) => { await requireRole(context, "admin"); }, response: t.Array(userResponse) })
    .get("/users/:id", async (context: any) => service.get(context.params.id), { beforeHandle: async (context: any) => { const user = await requireAuth(context); service.assertCanAccess(user, context.params.id); }, response: userResponse })
    .patch("/users/:id", async (context: any) => service.update(await requireAuth(context), context.params.id, context.body), {
      body: t.Object({ name: t.Optional(t.String()), role: t.Optional(t.Union([t.Literal("admin"), t.Literal("customer")])) }),
      response: t.Object({ id: t.String(), email: t.String(), role: t.Union([t.Literal("admin"), t.Literal("customer")]), name: t.String() }),
      beforeHandle: async (context: any) => { const user = await requireAuth(context); service.assertCanAccess(user, context.params.id); },
    });
}
