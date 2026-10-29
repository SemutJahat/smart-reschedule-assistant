export type NodeEnvironment = "development" | "test" | "production";

export interface AppConfig {
  nodeEnv: NodeEnvironment;
  port: number;
  corsOrigin: string | string[];
  jwtSecret: string;
  jwtRefreshSecret: string;
  databaseUrl?: string;
}

const defaultConfig: AppConfig = {
  nodeEnv: "development",
  port: 3000,
  corsOrigin: "http://localhost:5173",
  jwtSecret: "development-jwt-secret-change-me",
  jwtRefreshSecret: "development-refresh-secret-change-me",
};

function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return defaultConfig.port;

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return port;
}

function parseNodeEnvironment(value: string | undefined): NodeEnvironment {
  if (value === undefined || value.trim() === "") return defaultConfig.nodeEnv;
  if (value === "development" || value === "test" || value === "production") {
    return value;
  }

  throw new Error("NODE_ENV must be development, test, or production");
}

function parseCorsOrigin(value: string | undefined): string | string[] {
  if (value === undefined) return defaultConfig.corsOrigin;

  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .map(validateCorsOrigin);

  // Wildcard CORS is intentionally not supported: the service should only
  // expose browser responses to explicitly configured HTTP(S) origins.
  return origins.length === 1 ? origins[0] : origins;
}

function validateCorsOrigin(origin: string): string {
  if (origin === "*") {
    throw new Error("CORS_ORIGIN does not allow the wildcard origin '*'");
  }
  if (origin === "") {
    throw new Error("CORS_ORIGIN cannot contain empty origins");
  }

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error(`CORS_ORIGIN contains an invalid origin: ${origin}`);
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.hostname === "" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error(`CORS_ORIGIN contains an invalid origin: ${origin}`);
  }

  return parsed.origin;
}

export function loadConfig(env: Record<string, string | undefined> = Bun.env): AppConfig {
  const nodeEnv = parseNodeEnvironment(env.NODE_ENV);
  const jwtSecret = env.JWT_SECRET?.trim() || (nodeEnv === "production" ? "" : defaultConfig.jwtSecret);
  const jwtRefreshSecret = env.JWT_REFRESH_SECRET?.trim() || (nodeEnv === "production" ? "" : defaultConfig.jwtRefreshSecret);
  if (nodeEnv === "production" && (!jwtSecret || jwtSecret.length < 32 || !jwtRefreshSecret || jwtRefreshSecret.length < 32)) {
    throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must each be at least 32 characters in production");
  }
  if (nodeEnv === "production" && !env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL is required in production");
  if (nodeEnv === "production" && !env.CORS_ORIGIN?.trim()) throw new Error("CORS_ORIGIN is required in production");
  return {
    nodeEnv,
    port: parsePort(env.PORT),
    corsOrigin: parseCorsOrigin(env.CORS_ORIGIN),
    jwtSecret,
    jwtRefreshSecret,
    databaseUrl: env.DATABASE_URL?.trim() || undefined,
  };
}
