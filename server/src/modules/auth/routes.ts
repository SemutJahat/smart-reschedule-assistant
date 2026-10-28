import { t, type AnyElysia } from "elysia";
import { requireAuth } from "../../plugins/auth";
import { AuthService } from "./service";

const credentials = t.Object({ email: t.String(), password: t.String({ minLength: 1 }) });
const userResponse = t.Object({ id: t.String(), email: t.String(), role: t.Union([t.Literal("admin"), t.Literal("customer")]), name: t.String() });

export function authRoutes(app: AnyElysia, service: AuthService) {
  return app
    .post("/auth/register", ({ body }) => service.register(body), {
      body: t.Object({ email: t.String(), password: t.String({ minLength: 1 }), name: t.Optional(t.String()) }),
    })
    .post("/auth/login", ({ body }) => service.login(body), { body: credentials })
    .post("/auth/refresh", ({ body }) => service.refresh(body.refreshToken), { body: t.Object({ refreshToken: t.String() }) })
    .post("/auth/logout", async ({ body }) => { await service.logout(body.refreshToken); return { success: true }; }, { body: t.Object({ refreshToken: t.String() }) })
    .get("/auth/me", async (context: any) => service.me((await requireAuth(context)).userId), { response: userResponse });
}
