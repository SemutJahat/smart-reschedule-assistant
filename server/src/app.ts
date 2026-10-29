import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";
import { loadConfig, type AppConfig } from "./config/env";
import { errors } from "./plugins/errors";
import { authPlugin } from "./plugins/auth";
import { createDb, getDefaultDb } from "./db/client";
import { createAuthRepository, InMemoryAuthRepository } from "./modules/auth/repository";
import { AuthService } from "./modules/auth/service";
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL } from "./modules/auth/service";
import { authRoutes } from "./modules/auth/routes";
import { UserService } from "./modules/users/service";
import { userRoutes } from "./modules/users/routes";
import { MemberService } from "./modules/members/service";
import { memberRoutes } from "./modules/members/routes";
import type { AuthRepository } from "./modules/auth/schema";
import { createCatalogRepository } from "./modules/coaches/service";
import { InMemoryCatalogRepository, type CatalogRepository } from "./modules/coaches/schema";
import { CoachService } from "./modules/coaches/service";
import { coachRoutes } from "./modules/coaches/routes";
import { PackageService } from "./modules/packages/service";
import { packageRoutes } from "./modules/packages/routes";
import { ScheduleService } from "./modules/schedules/service";
import { scheduleRoutes } from "./modules/schedules/routes";

const healthResponse = t.Object({
  status: t.Literal("ok"),
});

export interface AppOptions {
  repository?: AuthRepository;
  catalogRepository?: CatalogRepository;
}

export function createApp(config: AppConfig = loadConfig(), options: AppOptions = {}) {
  if (config.nodeEnv === "production" && !config.databaseUrl) {
    throw new Error("DATABASE_URL is required in production");
  }
  const jwtSecret = config.jwtSecret;
  const refreshSecret = config.jwtRefreshSecret;
  const db = options.repository ? null : config.databaseUrl ? createDb(config.databaseUrl) : getDefaultDb();
  if (config.nodeEnv === "production" && !db) throw new Error("DATABASE_URL is required in production");
  const repository = options.repository ?? (db ? createAuthRepository(db.db) : new InMemoryAuthRepository());
  const catalogRepository = options.catalogRepository ?? (db ? createCatalogRepository(db.db) : new InMemoryCatalogRepository());
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
      signAccessToken = (user) => jwt.sign({ userId: user.userId, role: user.role, jti: crypto.randomUUID(), exp: ACCESS_TOKEN_TTL });
      signRefreshToken = (user) => refreshJwt.sign({ userId: user.userId, role: user.role, jti: crypto.randomUUID(), exp: REFRESH_TOKEN_TTL });
      verifyRefreshToken = (token) => refreshJwt.verify(token) as Promise<{ userId?: string } | false>;
      return {};
    });
  const withCoaches = coachRoutes(configured, new CoachService(catalogRepository, repository), repository);
  const withPackages = packageRoutes(withCoaches, new PackageService(catalogRepository, repository), repository);
  const catalog = scheduleRoutes(withPackages, new ScheduleService(catalogRepository, repository), repository);
  return authRoutes(userRoutes(memberRoutes(catalog, new MemberService(repository)), new UserService(repository)), auth);
}
