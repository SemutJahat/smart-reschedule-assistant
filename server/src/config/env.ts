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
  if (value === undefined || value.trim() === "") return defaultConfig.corsOrigin;

  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) return defaultConfig.corsOrigin;
  return origins.length === 1 ? origins[0] : origins;
}

export function loadConfig(env: Record<string, string | undefined> = Bun.env): AppConfig {
  return {
    nodeEnv: parseNodeEnvironment(env.NODE_ENV),
    port: parsePort(env.PORT),
    corsOrigin: parseCorsOrigin(env.CORS_ORIGIN),
  };
}
