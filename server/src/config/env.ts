export type NodeEnvironment = "development" | "test" | "production";

export interface AppConfig {
  nodeEnv: NodeEnvironment;
  port: number;
  corsOrigin: string | string[];
}

const defaultConfig: AppConfig = {
  nodeEnv: "development",
  port: 3000,
  corsOrigin: "http://localhost:5173",
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
  return {
    nodeEnv: parseNodeEnvironment(env.NODE_ENV),
    port: parsePort(env.PORT),
    corsOrigin: parseCorsOrigin(env.CORS_ORIGIN),
  };
}
