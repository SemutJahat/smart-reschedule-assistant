import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";
import { loadConfig, type AppConfig } from "./config/env";
import { errors } from "./plugins/errors";
import { authPlugin } from "./plugins/auth";
import { getDefaultDb } from "./db/client";
import { createAuthRepository, InMemoryAuthRepository } from "./modules/auth/repository";
import { AuthService } from "./modules/auth/service";
import { authRoutes } from "./modules/auth/routes";
import { UserService } from "./modules/users/service";
import { userRoutes } from "./modules/users/routes";
import { MemberService } from "./modules/members/service";
import { memberRoutes } from "./modules/members/routes";
import type { AuthRepository } from "./modules/auth/schema";

const healthResponse = t.Object({
  status: t.Literal("ok"),
});

export interface AppOptions {
  repository?: AuthRepository;
}

export function createApp(config: AppConfig = loadConfig(), options: AppOptions = {}) {
  const jwtSecret = config.jwtSecret;
  const refreshSecret = config.jwtRefreshSecret;
  const db = options.repository ? null : getDefaultDb();
  const repository = options.repository ?? (db ? createAuthRepository(db.db) : new InMemoryAuthRepository());
  let signAccessToken: (user: { userId: string; role: "admin" | "customer" }) => Promise<string> = async () => {
    throw new Error("JWT plugin is not initialized");
  };
  const auth = new AuthService({
    repository,
    issueAccessToken: (user) => signAccessToken(user),
    issueRefreshToken: (user) => signRefreshToken(user),
    verifyRefreshToken: (token) => verifyRefreshToken(token),
  });
  let signRefreshToken: (user: { userId: string; role: "admin" | "customer" }) => Promise<string> = async () => {
    throw new Error("JWT plugin is not initialized");
  };
  let verifyRefreshToken: (token: string) => Promise<{ userId?: string } | false> = async () => false;
  const secured = authPlugin(new Elysia({ name: "smart-reschedule-assistant-api" }), { secret: jwtSecret, refreshSecret })
    .use(
      cors({
        origin: config.corsOrigin,
      }),
    )
    .use(errors)
    .get(
      "/health",
      () => ({ status: "ok" as const }),
      {
        response: healthResponse,
      },
    );
  const configured = secured
    .derive(({ jwt, refreshJwt }) => {
      signAccessToken = (user) => jwt.sign({ userId: user.userId, role: user.role, jti: crypto.randomUUID(), exp: "15m" });
      signRefreshToken = (user) => refreshJwt.sign({ userId: user.userId, role: user.role, jti: crypto.randomUUID(), exp: "30d" });
      verifyRefreshToken = (token) => refreshJwt.verify(token) as Promise<{ userId?: string } | false>;
      return {};
    });
  return authRoutes(userRoutes(memberRoutes(configured, new MemberService(repository)), new UserService(repository)), auth);
}
