import { jwt } from "@elysiajs/jwt";
import type { AnyElysia } from "elysia";
import { AppError } from "../shared/errors";
import type { AuthRepository, AuthUser, UserRole } from "../modules/auth/schema";

export interface AuthPluginOptions {
  secret: string;
  refreshSecret: string;
}

export function authPlugin(app: AnyElysia, options: AuthPluginOptions) {
  return app
    .use(jwt({ name: "jwt", secret: options.secret }))
    .use(jwt({ name: "refreshJwt", secret: options.refreshSecret }));
}

function bearer(headers: Headers | Record<string, string | undefined>): string | undefined {
  const value = headers instanceof Headers ? headers.get("authorization") : headers.authorization;
  return value?.startsWith("Bearer ") ? value.slice(7) : undefined;
}

export async function requireAuth(context: {
  jwt: { verify(token?: string): Promise<Record<string, unknown> | false> };
  headers: Headers | Record<string, string | undefined>;
}, repository?: AuthRepository): Promise<AuthUser> {
  const payload = await context.jwt.verify(bearer(context.headers));
  if (!payload || typeof payload.userId !== "string" || (payload.role !== "admin" && payload.role !== "customer")) {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }
  if (repository) {
    const user = await repository.findUserById(payload.userId);
    if (!user) throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    return { userId: user.id, role: user.role };
  }
  return { userId: payload.userId, role: payload.role };
}

export async function requireRole(
  context: { jwt: { verify(token?: string): Promise<Record<string, unknown> | false> }; headers: Headers | Record<string, string | undefined> },
  role: UserRole,
  repository?: AuthRepository,
): Promise<AuthUser> {
  const user = await requireAuth(context, repository);
  if (user.role !== role) throw new AppError("FORBIDDEN", "Forbidden", 403);
  return user;
}
