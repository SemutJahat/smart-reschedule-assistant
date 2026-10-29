import { createApp } from "../../src/app";
import type { AppConfig } from "../../src/config/env";
import type { AuthRepository } from "../../src/modules/auth/schema";
import { InMemoryAuthRepository } from "../../src/modules/auth/repository";
import type { CatalogRepository } from "../../src/modules/coaches/schema";
import type { PaymentRepository } from "../../src/modules/payments/schema";
import { InMemoryPaymentRepository } from "../../src/modules/payments/repository";
import type { BookingRepository } from "../../src/modules/bookings/schema";
import { InMemoryBookingRepository } from "../../src/modules/bookings/repository";
import type { RescheduleRepository } from "../../src/modules/reschedules/schema";

export function createTestApp(overrides: Partial<AppConfig> = {}, repository?: AuthRepository, catalogRepository?: CatalogRepository, paymentRepository?: PaymentRepository, bookingRepository?: BookingRepository, rescheduleRepository?: RescheduleRepository) {
  const catalog = catalogRepository;
  const payments = paymentRepository ?? (catalog ? new InMemoryPaymentRepository(catalog) : undefined);
  const bookings = bookingRepository ?? (catalog && payments ? new InMemoryBookingRepository(catalog, payments, catalog.bookings) : undefined);
  return createApp({
    nodeEnv: "test",
    port: 3000,
    corsOrigin: "http://localhost:5173",
    jwtSecret: "test-jwt-secret",
    jwtRefreshSecret: "test-refresh-secret",
    genAiModel: "deterministic-stub",
    genAiTimeoutMs: 10_000,
    genAiMode: "stub",
    ...overrides,
  }, { repository: repository ?? new InMemoryAuthRepository(), catalogRepository: catalog, paymentRepository: payments, bookingRepository: bookings, rescheduleRepository });
}
