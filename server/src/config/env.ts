export type NodeEnvironment = "development" | "test" | "production";

export interface AppConfig {
  nodeEnv: NodeEnvironment;
  port: number;
  corsOrigin: string | string[];
  jwtSecret: string;
  jwtRefreshSecret: string;
  databaseUrl?: string;
  genAiBaseUrl?: string;
  genAiApiKey?: string;
  genAiModel: string;
  genAiTimeoutMs: number;
  genAiMode: "stub" | "http";
}

const defaultConfig: AppConfig = {
  nodeEnv: "development",
  port: 3000,
  corsOrigin: "http://localhost:5173",
  jwtSecret: "development-jwt-secret-change-me",
  jwtRefreshSecret: "development-refresh-secret-change-me",
  genAiModel: "deterministic-stub",
  genAiTimeoutMs: 10_000,
  genAiMode: "stub",
};

const MAX_GEN_AI_TIMEOUT_MS = 120_000;

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

function parseGenAiMode(value: string | undefined, nodeEnv: NodeEnvironment): "stub" | "http" {
  const mode = value?.trim() || (nodeEnv === "production" ? "http" : "stub");
  if (mode !== "stub" && mode !== "http") {
    throw new Error("GEN_AI_MODE must be stub or http");
  }
  if (nodeEnv === "production" && mode !== "http") {
    throw new Error("GEN_AI_MODE must be http in production");
  }
  if (nodeEnv !== "production" && mode !== "stub") {
    throw new Error("GEN_AI_MODE must be stub outside production");
  }
  return mode;
}

function parseGenAiTimeout(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return defaultConfig.genAiTimeoutMs;
  const timeout = Number(value);
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > MAX_GEN_AI_TIMEOUT_MS) {
    throw new Error(`GEN_AI_TIMEOUT_MS must be an integer between 1 and ${MAX_GEN_AI_TIMEOUT_MS}`);
  }
  return timeout;
}

function parseGenAiBaseUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("GEN_AI_BASE_URL must be a valid HTTP(S) URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("GEN_AI_BASE_URL must be a valid HTTP(S) URL");
  }
  return url.toString().replace(/\/+$/, "");
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
  const genAiMode = parseGenAiMode(env.GEN_AI_MODE, nodeEnv);
  const genAiBaseUrl = parseGenAiBaseUrl(env.GEN_AI_BASE_URL);
  const genAiApiKey = env.GEN_AI_API_KEY?.trim() || undefined;
  const genAiModel = env.GEN_AI_MODEL?.trim() || defaultConfig.genAiModel;
  const genAiTimeoutMs = parseGenAiTimeout(env.GEN_AI_TIMEOUT_MS);
  if (genAiModel === "") throw new Error("GEN_AI_MODEL cannot be empty");
  if (genAiMode === "http" && !genAiBaseUrl) throw new Error("GEN_AI_BASE_URL is required when GEN_AI_MODE is http");
  if (genAiMode === "http" && !genAiApiKey) throw new Error("GEN_AI_API_KEY is required when GEN_AI_MODE is http");
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
    genAiBaseUrl,
    genAiApiKey,
    genAiModel,
    genAiTimeoutMs,
    genAiMode,
  };
}
