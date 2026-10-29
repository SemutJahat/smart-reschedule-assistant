import { createApp } from "../../src/app";
import type { AppConfig } from "../../src/config/env";
import type { AuthRepository } from "../../src/modules/auth/schema";
import { InMemoryAuthRepository } from "../../src/modules/auth/repository";

export function createTestApp(overrides: Partial<AppConfig> = {}, repository?: AuthRepository) {
  return createApp({
    nodeEnv: "test",
    port: 3000,
    corsOrigin: "http://localhost:5173",
    jwtSecret: "test-jwt-secret",
    jwtRefreshSecret: "test-refresh-secret",
    ...overrides,
  }, { repository: repository ?? new InMemoryAuthRepository() });
}
