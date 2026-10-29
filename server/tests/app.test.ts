import { expect, test } from "bun:test";
import { t } from "elysia";
import { loadConfig } from "../src/config/env";
import { createTestApp } from "./helpers/app";

test("GET /health returns a healthy response without listening on a port", async () => {
  const response = await createTestApp().handle(new Request("http://localhost/health"));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});

test("unknown routes return the consistent error envelope", async () => {
  const response = await createTestApp().handle(new Request("http://localhost/missing"));

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({
    error: {
      code: "NOT_FOUND",
      message: "The requested resource was not found",
    },
  });
});

test("invalid environment values fail fast", () => {
  for (const corsOrigin of [
    "",
    ",",
    "http://localhost:5173,,https://example.com",
    "localhost:5173",
    "ftp://example.com",
    "*",
  ]) {
    expect(() => loadConfig({ CORS_ORIGIN: corsOrigin })).toThrow();
  }

  expect(() => loadConfig({ PORT: "0" })).toThrow();
  expect(() => loadConfig({ PORT: "not-a-port" })).toThrow();
  expect(() => loadConfig({ NODE_ENV: "staging" })).toThrow();
  expect(loadConfig({}).corsOrigin).toBe("http://localhost:5173");
});

test("production configuration requires database, strong JWT secrets, and explicit CORS", () => {
  expect(() => loadConfig({ NODE_ENV: "production" })).toThrow();
  expect(() => loadConfig({
    NODE_ENV: "production",
    DATABASE_URL: "postgres://localhost/app",
    CORS_ORIGIN: "https://example.com",
    JWT_SECRET: "short",
    JWT_REFRESH_SECRET: "also-short",
  })).toThrow();

  const valid = loadConfig({
    NODE_ENV: "production",
    DATABASE_URL: "postgres://localhost/app",
    CORS_ORIGIN: "https://example.com",
    JWT_SECRET: "a".repeat(32),
    JWT_REFRESH_SECRET: "b".repeat(32),
    GEN_AI_MODE: "http",
    GEN_AI_BASE_URL: "https://ai.example",
    GEN_AI_API_KEY: "test-key",
  });
  expect(valid.databaseUrl).toBe("postgres://localhost/app");
  expect(() => createTestApp({ ...valid, databaseUrl: undefined })).toThrow("DATABASE_URL is required in production");
});

test("CORS allows configured origins and rejects unconfigured origins", async () => {
  const app = createTestApp({
    corsOrigin: ["http://allowed.example", "https://also-allowed.example"],
  });

  const allowed = await app.handle(
    new Request("http://localhost/health", {
      headers: { Origin: "http://allowed.example" },
    }),
  );
  expect(allowed.headers.get("access-control-allow-origin")).toBe("http://allowed.example");

  const rejected = await app.handle(
    new Request("http://localhost/health", {
      headers: { Origin: "http://rejected.example" },
    }),
  );
  expect(rejected.headers.get("access-control-allow-origin")).toBeNull();
});

test("TypeBox validation failures use the consistent error envelope", async () => {
  const app = createTestApp().post(
    "/validated",
    ({ body }) => body,
    { body: t.Object({ name: t.String() }) },
  );

  const response = await app.handle(
    new Request("http://localhost/validated", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: 42 }),
    }),
  );

  expect(response.status).toBe(422);
  expect(await response.json()).toEqual({
    error: {
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
    },
  });
});

test("unexpected internal errors are generic and do not open a listener", async () => {
  const app = createTestApp().get("/unexpected", () => {
    throw new Error("sensitive internal detail");
  });

  expect(app.server).toBeNull();
  const response = await app.handle(new Request("http://localhost/unexpected"));

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
});
