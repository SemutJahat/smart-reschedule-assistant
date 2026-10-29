import { createApp } from "../../src/app";
import type { AppConfig } from "../../src/config/env";
import type { AuthRepository } from "../../src/modules/auth/schema";
import { InMemoryAuthRepository } from "../../src/modules/auth/repository";
import type { CatalogRepository } from "../../src/modules/coaches/schema";
import type { PaymentRepository } from "../../src/modules/payments/schema";
import { InMemoryPaymentRepository } from "../../src/modules/payments/repository";

export function createTestApp(overrides: Partial<AppConfig> = {}, repository?: AuthRepository, catalogRepository?: CatalogRepository, paymentRepository?: PaymentRepository) {
  const catalog = catalogRepository;
  return createApp({
    nodeEnv: "test",
    port: 3000,
    corsOrigin: "http://localhost:5173",
    jwtSecret: "test-jwt-secret",
    jwtRefreshSecret: "test-refresh-secret",
    ...overrides,
  }, { repository: repository ?? new InMemoryAuthRepository(), catalogRepository: catalog, paymentRepository: paymentRepository ?? (catalog ? new InMemoryPaymentRepository(catalog) : undefined) });
}
