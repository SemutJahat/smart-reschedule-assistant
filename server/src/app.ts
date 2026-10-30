import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";
import { loadConfig, type AppConfig } from "./config/env";
import { errors } from "./plugins/errors";
import { authPlugin } from "./plugins/auth";
import type { DatabaseConnection } from "./db/client";
import { createAuthRepository, InMemoryAuthRepository } from "./modules/auth/repository";
import { AuthService } from "./modules/auth/service";
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL } from "./modules/auth/service";
import { authRoutes } from "./modules/auth/routes";
import { UserService } from "./modules/users/service";
import { userRoutes } from "./modules/users/routes";
import { MemberService } from "./modules/members/service";
import { memberRoutes } from "./modules/members/routes";
import type { AuthRepository } from "./modules/auth/schema";
import { createCatalogRepository } from "./modules/coaches/service";
import { InMemoryCatalogRepository, type CatalogRepository } from "./modules/coaches/schema";
import { CoachService } from "./modules/coaches/service";
import { coachRoutes } from "./modules/coaches/routes";
import { PackageService } from "./modules/packages/service";
import { packageRoutes } from "./modules/packages/routes";
import { ScheduleService } from "./modules/schedules/service";
import { scheduleRoutes } from "./modules/schedules/routes";
import { createPaymentRepository, InMemoryPaymentRepository } from "./modules/payments/repository";
import type { PaymentRepository } from "./modules/payments/schema";
import { PaymentService } from "./modules/payments/service";
import { paymentRoutes } from "./modules/payments/routes";
import { createBookingRepository, InMemoryBookingRepository } from "./modules/bookings/repository";
import type { BookingRepository } from "./modules/bookings/schema";
import { BookingService } from "./modules/bookings/service";
import { bookingRoutes } from "./modules/bookings/routes";
import { createRescheduleRepository, InMemoryRescheduleRepository } from "./modules/reschedules/repository";
import type { RescheduleRepository } from "./modules/reschedules/schema";
import { RescheduleService } from "./modules/reschedules/service";
import { rescheduleRoutes } from "./modules/reschedules/routes";
import { ChatService } from "./modules/chat/service";
import { chatRoutes } from "./modules/chat/routes";
import { createChatRepository, InMemoryChatRepository } from "./modules/chat/repository";
import type { ChatRepository } from "./modules/chat/schema";
import { createChatTransactionCoordinator, createInMemoryChatTransactionCoordinator } from "./modules/chat/unit-of-work";
import type { ChatTransactionCoordinator } from "./modules/chat/unit-of-work";
import { createGenAiClient, StubGenAiClient, type GenAiClient } from "./modules/chat/client";

const healthResponse = t.Object({
  status: t.Literal("ok"),
});

export interface AppOptions {
  /** The connection is created and owned by the process entry point. */
  database?: DatabaseConnection | null;
  repository?: AuthRepository;
  catalogRepository?: CatalogRepository;
  paymentRepository?: PaymentRepository;
  bookingRepository?: BookingRepository;
  rescheduleRepository?: RescheduleRepository;
  chatRepository?: ChatRepository;
  chatTransactionCoordinator?: ChatTransactionCoordinator;
  genAiClient?: GenAiClient;
}

export function createApp(config: AppConfig = loadConfig(), options: AppOptions = {}) {
  if (config.nodeEnv === "production" && !config.databaseUrl) {
    throw new Error("DATABASE_URL is required in production");
  }
  const db = options.database ?? null;
  if (config.nodeEnv === "production" && !db) {
    throw new Error("An explicit database connection is required in production");
  }
  if (config.nodeEnv !== "test" && config.databaseUrl && !db) {
    throw new Error("An explicit database connection is required when DATABASE_URL is configured");
  }
  const jwtSecret = config.jwtSecret;
  const refreshSecret = config.jwtRefreshSecret;
  const repository = options.repository ?? (db ? createAuthRepository(db.db) : new InMemoryAuthRepository());
  const catalogRepository = options.catalogRepository ?? (db ? createCatalogRepository(db.db) : new InMemoryCatalogRepository());
  const paymentRepository = options.paymentRepository ?? (db ? createPaymentRepository(db.db) : new InMemoryPaymentRepository(catalogRepository));
  const bookingRepository = options.bookingRepository ?? (db ? createBookingRepository(db.db) : new InMemoryBookingRepository(catalogRepository, paymentRepository, catalogRepository.bookings));
  const rescheduleRepository = options.rescheduleRepository ?? (db ? createRescheduleRepository(db.db) : new InMemoryRescheduleRepository(bookingRepository, catalogRepository));
  const chatRepository = options.chatRepository ?? (db ? createChatRepository(db.db) : new InMemoryChatRepository());
  const chatTransactionCoordinator = options.chatTransactionCoordinator ?? (db
    ? createChatTransactionCoordinator(db.db)
    : chatRepository instanceof InMemoryChatRepository
      && rescheduleRepository instanceof InMemoryRescheduleRepository
      && bookingRepository instanceof InMemoryBookingRepository
      && paymentRepository instanceof InMemoryPaymentRepository
      && catalogRepository instanceof InMemoryCatalogRepository
      ? createInMemoryChatTransactionCoordinator({ chat: chatRepository, reschedule: rescheduleRepository, booking: bookingRepository, payment: paymentRepository, catalog: catalogRepository })
      : (() => { throw new Error("An in-memory chat transaction coordinator is required when custom repositories are configured"); })());
  const genAiClient = options.genAiClient ?? (config.nodeEnv === "test" ? new StubGenAiClient() : createGenAiClient(config));
  let signAccessToken: (user: { userId: string; role: "admin" | "customer" }) => Promise<string> = async () => {
    throw new Error("JWT plugin is not initialized");
  };
  const auth = new AuthService({
    repository,
    issueAccessToken: (user) => signAccessToken(user),
    issueRefreshToken: (user) => signRefreshToken(user),
    verifyRefreshToken: (token) => verifyRefreshToken(token),
  });
  let signRefreshToken: (user: { userId: string; role: "admin" | "customer" }) => Promise<string> = async () => {
    throw new Error("JWT plugin is not initialized");
  };
  let verifyRefreshToken: (token: string) => Promise<{ userId?: string } | false> = async () => false;
  const secured = authPlugin(new Elysia({ name: "smart-reschedule-assistant-api" }), { secret: jwtSecret, refreshSecret })
    .use(
      cors({
        origin: config.corsOrigin,
      }),
    )
    .use(errors)
    .get(
      "/health",
      () => ({ status: "ok" as const }),
      {
        response: healthResponse,
      },
    );
  const configured = secured
    .derive(({ jwt, refreshJwt }) => {
      signAccessToken = (user) => jwt.sign({ userId: user.userId, role: user.role, jti: crypto.randomUUID(), exp: ACCESS_TOKEN_TTL });
      signRefreshToken = (user) => refreshJwt.sign({ userId: user.userId, role: user.role, jti: crypto.randomUUID(), exp: REFRESH_TOKEN_TTL });
      verifyRefreshToken = (token) => refreshJwt.verify(token) as Promise<{ userId?: string } | false>;
      return {};
    });
  const withCoaches = coachRoutes(configured, new CoachService(catalogRepository, repository), repository);
  const withPackages = packageRoutes(withCoaches, new PackageService(catalogRepository, repository), repository);
  const catalog = scheduleRoutes(withPackages, new ScheduleService(catalogRepository, repository), repository);
  const withPayments = paymentRoutes(catalog, new PaymentService(paymentRepository, repository), repository);
  const withBookings = bookingRoutes(withPayments, new BookingService(bookingRepository, repository), repository);
  const withReschedules = rescheduleRoutes(withBookings, new RescheduleService(rescheduleRepository, repository), repository);
  const withChat = chatRoutes(withReschedules, new ChatService({ auth: repository, catalog: catalogRepository, booking: bookingRepository, payment: paymentRepository, reschedule: rescheduleRepository, chat: chatRepository, coordinator: chatTransactionCoordinator, ai: genAiClient }), repository);
  return authRoutes(userRoutes(memberRoutes(withChat, new MemberService(repository)), new UserService(repository)), auth);
}
