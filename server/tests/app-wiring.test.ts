import { expect, test } from "bun:test";
import { createApp } from "../src/app";
import type { DatabaseConnection } from "../src/db/client";
import { InMemoryChatRepository } from "../src/modules/chat/repository";
import type { ChatTransactionCallback, ChatTransactionCoordinator } from "../src/modules/chat/unit-of-work";
import { createTestApp } from "./helpers/app";

test("createApp wires every API module without starting a listener", () => {
  const app = createTestApp();
  const paths = new Set(app.routes.map((route) => route.path));

  expect(app.server).toBeNull();
  for (const path of [
    "/health",
    "/auth/login",
    "/users",
    "/members/me",
    "/coaches",
    "/packages",
    "/schedules",
    "/payments",
    "/subscriptions/me",
    "/bookings",
    "/reschedule-requests",
  ]) {
    expect(paths.has(path)).toBe(true);
  }
});

test("rejects mixed database and custom chatbot persistence without a coordinator", () => {
  const database = {} as DatabaseConnection;
  expect(() => createApp({
    nodeEnv: "test",
    port: 3000,
    corsOrigin: "http://localhost:5173",
    jwtSecret: "test-jwt-secret",
    jwtRefreshSecret: "test-refresh-secret",
    genAiModel: "deterministic-stub",
    genAiTimeoutMs: 10_000,
    genAiMode: "stub",
  }, { database, chatRepository: new InMemoryChatRepository() })).toThrow("chatTransactionCoordinator is required");
});

test("accepts custom chatbot persistence with a database when its coordinator is explicit", () => {
  const database = {} as DatabaseConnection;
  const coordinator: ChatTransactionCoordinator = {
    transaction<T>(_fn: ChatTransactionCallback<T>): Promise<T> {
      return Promise.reject(new Error("test coordinator should not execute during app construction"));
    },
  };
  const app = createApp({
    nodeEnv: "test",
    port: 3000,
    corsOrigin: "http://localhost:5173",
    jwtSecret: "test-jwt-secret",
    jwtRefreshSecret: "test-refresh-secret",
    genAiModel: "deterministic-stub",
    genAiTimeoutMs: 10_000,
    genAiMode: "stub",
  }, { database, chatRepository: new InMemoryChatRepository(), chatTransactionCoordinator: coordinator });

  expect(app.server).toBeNull();
});
