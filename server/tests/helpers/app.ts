import { createApp } from "../../src/app";
import type { AppConfig } from "../../src/config/env";
import type { AuthRepository } from "../../src/modules/auth/schema";
import { InMemoryAuthRepository } from "../../src/modules/auth/repository";
import { InMemoryCatalogRepository } from "../../src/modules/coaches/schema";
import type { CatalogRepository } from "../../src/modules/coaches/schema";
import type { PaymentRepository } from "../../src/modules/payments/schema";
import { InMemoryPaymentRepository } from "../../src/modules/payments/repository";
import type { BookingRepository } from "../../src/modules/bookings/schema";
import { InMemoryBookingRepository } from "../../src/modules/bookings/repository";
import type { RescheduleRepository } from "../../src/modules/reschedules/schema";
import { InMemoryRescheduleRepository } from "../../src/modules/reschedules/repository";
import { InMemoryChatRepository } from "../../src/modules/chat/repository";
import { createInMemoryChatTransactionCoordinator } from "../../src/modules/chat/unit-of-work";
import type { ChatRepository } from "../../src/modules/chat/schema";
import type { ChatTransactionCoordinator } from "../../src/modules/chat/unit-of-work";
import type { GenAiClient } from "../../src/modules/chat/client";
import { StubGenAiClient } from "../../src/modules/chat/client";

export function createTestApp(overrides: Partial<AppConfig> = {}, repository?: AuthRepository, catalogRepository?: CatalogRepository, paymentRepository?: PaymentRepository, bookingRepository?: BookingRepository, rescheduleRepository?: RescheduleRepository, chatRepository?: ChatRepository, chatTransactionCoordinator?: ChatTransactionCoordinator, genAiClient?: GenAiClient) {
  const catalog = catalogRepository ?? new InMemoryCatalogRepository();
  const payments = paymentRepository ?? new InMemoryPaymentRepository(catalog);
  const bookings = bookingRepository ?? new InMemoryBookingRepository(catalog, payments, catalog.bookings);
  const reschedules = rescheduleRepository ?? new InMemoryRescheduleRepository(bookings, catalog);
  const chat = chatRepository ?? new InMemoryChatRepository();
  const coordinator = chatTransactionCoordinator ?? createInMemoryChatTransactionCoordinator({ chat: chat as InMemoryChatRepository, reschedule: reschedules as InMemoryRescheduleRepository, booking: bookings as InMemoryBookingRepository, payment: payments as InMemoryPaymentRepository, catalog: catalog as InMemoryCatalogRepository });
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
  }, { repository: repository ?? new InMemoryAuthRepository(), catalogRepository: catalog, paymentRepository: payments, bookingRepository: bookings, rescheduleRepository: reschedules, chatRepository: chat, chatTransactionCoordinator: coordinator, genAiClient: genAiClient ?? new StubGenAiClient() });
}
