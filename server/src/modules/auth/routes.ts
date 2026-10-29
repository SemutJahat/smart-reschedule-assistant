import { t, type AnyElysia } from "elysia";
import { requireAuth } from "../../plugins/auth";
import { AuthService } from "./service";

const credentials = t.Object({ email: t.String(), password: t.String({ minLength: 1 }) });
const userResponse = t.Object({ id: t.String(), email: t.String(), role: t.Union([t.Literal("admin"), t.Literal("customer")]), name: t.String() });
const tokenResponse = t.Object({ user: userResponse, accessToken: t.String(), refreshToken: t.String() });
const successResponse = t.Object({ success: t.Boolean() });

export function authRoutes(app: AnyElysia, service: AuthService) {
  return app
    .post("/auth/register", ({ body }) => service.register(body), {
      body: t.Object({ email: t.String({ minLength: 3 }), password: t.String({ minLength: 8 }), name: t.String({ minLength: 1 }), phone: t.Optional(t.Union([t.String(), t.Null()])) }),
      response: tokenResponse,
    })
    .post("/auth/login", ({ body }) => service.login(body), { body: credentials, response: tokenResponse })
    .post("/auth/refresh", ({ body }) => service.refresh(body.refreshToken), { body: t.Object({ refreshToken: t.String({ minLength: 1 }) }), response: tokenResponse })
    .post("/auth/logout", async ({ body }) => { await service.logout(body.refreshToken); return { success: true }; }, { body: t.Object({ refreshToken: t.String({ minLength: 1 }) }), response: successResponse })
    .get("/auth/me", async (context: any) => service.me((await requireAuth(context, service.repository)).userId), { response: userResponse });
}
