import { createApp } from "../../src/app";
import type { AppConfig } from "../../src/config/env";

export function createTestApp(overrides: Partial<AppConfig> = {}) {
  return createApp({
    nodeEnv: "test",
    port: 3000,
    corsOrigin: "http://localhost:5173",
    ...overrides,
  });
}
