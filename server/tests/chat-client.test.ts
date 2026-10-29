import { expect, test } from "bun:test";
import { loadConfig } from "../src/config/env";
import {
  HttpGenAiClient,
  StubGenAiClient,
} from "../src/modules/chat/client";
import type { ChatContext } from "../src/modules/chat/schema";

const scheduleId = "00000000-0000-4000-8000-000000000001";

function context(candidate = true): ChatContext {
  return {
    session: {} as ChatContext["session"],
    messages: [],
    member: { id: "00000000-0000-4000-8000-000000000002", status: "active" },
    eligibility: { subscriptionStatus: "active", subscriptionExpiresAt: new Date(), remainingQuota: 1 },
    booking: {} as ChatContext["booking"],
    sourceSchedule: {} as ChatContext["sourceSchedule"],
    candidateSchedules: candidate ? [{ schedule: { id: scheduleId } as ChatContext["sourceSchedule"], remainingCapacity: 1 }] : [],
    policy: { policyVersion: "2026-01", requiresExplicitConfirmation: true },
  };
}

test("development and test configs use the deterministic stub defaults", () => {
  expect(loadConfig({}).genAiMode).toBe("stub");
  expect(loadConfig({ NODE_ENV: "test" }).genAiMode).toBe("stub");
  expect(loadConfig({}).genAiTimeoutMs).toBe(10_000);
  expect(() => loadConfig({ NODE_ENV: "test", GEN_AI_MODE: "http" })).toThrow("GEN_AI_MODE must be stub outside production");
});

test("production requires HTTP Gen AI configuration and validates timeout", () => {
  const base = {
    NODE_ENV: "production",
    DATABASE_URL: "postgres://localhost/app",
    CORS_ORIGIN: "https://example.com",
    JWT_SECRET: "a".repeat(32),
    JWT_REFRESH_SECRET: "b".repeat(32),
  } as const;
  expect(() => loadConfig(base)).toThrow("GEN_AI_BASE_URL");
  expect(() => loadConfig({ ...base, GEN_AI_MODE: "http", GEN_AI_BASE_URL: "https://ai.example", GEN_AI_API_KEY: "secret", GEN_AI_TIMEOUT_MS: "0" })).toThrow("GEN_AI_TIMEOUT_MS");
  expect(() => loadConfig({ ...base, GEN_AI_MODE: "http", GEN_AI_BASE_URL: "https://ai.example", GEN_AI_API_KEY: "secret", GEN_AI_TIMEOUT_MS: "120001" })).toThrow("GEN_AI_TIMEOUT_MS");
  expect(() => loadConfig({ ...base, GEN_AI_MODE: "stub", GEN_AI_BASE_URL: "https://ai.example", GEN_AI_API_KEY: "secret" })).toThrow("GEN_AI_MODE must be http");
  const config = loadConfig({ ...base, GEN_AI_MODE: "http", GEN_AI_BASE_URL: "https://ai.example/", GEN_AI_API_KEY: " secret ", GEN_AI_TIMEOUT_MS: "5000" });
  expect(config.genAiBaseUrl).toBe("https://ai.example");
  expect(config.genAiApiKey).toBe("secret");
  expect(config.genAiTimeoutMs).toBe(5000);
  expect(() => loadConfig({ NODE_ENV: "test", GEN_AI_MODEL: "   " })).not.toThrow();
});

test("stub returns deterministic candidate and no-candidate analyses", async () => {
  const client = new StubGenAiClient();
  await expect(client.analyze(context())).resolves.toEqual({
    intent: "Reschedule",
    confidence: 0.99,
    extracted: {},
    recommendedScheduleIds: [scheduleId],
    reply: "Please confirm the proposed schedule.",
    nextState: "awaiting_confirmation",
    model: "deterministic-stub",
    modelVersion: "v1",
  });
  await expect(client.analyze(context(false))).resolves.toMatchObject({
    intent: "Other",
    recommendedScheduleIds: [],
    nextState: "active",
  });
});

test("HTTP client sends bearer/model/context and maps failures without leaking secrets", async () => {
  let request: RequestInit | undefined;
  const client = new HttpGenAiClient({
    baseUrl: "https://ai.example/",
    apiKey: "top-secret-key",
    model: "model-1",
    timeoutMs: 25,
    fetchImpl: async (_input, init) => {
      request = init;
      return new Response(JSON.stringify({
        intent: "Other", confidence: 0.5, extracted: {}, recommendedScheduleIds: [scheduleId],
        reply: "No change.", nextState: "active", model: "model-1", modelVersion: "v1",
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  await expect(client.analyze(context())).resolves.toMatchObject({
    intent: "Other",
    recommendedScheduleIds: [scheduleId],
    nextState: "active",
  });
  expect(request?.method).toBe("POST");
  expect(new Headers(request?.headers).get("authorization")).toBe("Bearer top-secret-key");
  expect(JSON.parse(String(request?.body))).toMatchObject({ model: "model-1", context: { policy: { policyVersion: "2026-01" } } });
  expect(request?.signal).toBeInstanceOf(AbortSignal);

  const timeout = new HttpGenAiClient({ baseUrl: "https://ai.example", apiKey: "secret-value", model: "m", timeoutMs: 1, fetchImpl: async (_input, init) => {
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    throw new DOMException("timed out", "TimeoutError");
  } });
  await expect(timeout.analyze(context())).rejects.toMatchObject({ code: "AI_SERVICE_UNAVAILABLE", status: 503 });
  await expect(timeout.analyze(context())).rejects.not.toThrow("secret-value");
});

test("HTTP client rejects non-OK, non-JSON, and malformed responses without provider leakage", async () => {
  const cases = [
    new Response("provider secret", { status: 500 }),
    new Response("not-json", { status: 200 }),
    new Response(JSON.stringify({ intent: "not-an-intent" }), { status: 200 }),
    new Response(JSON.stringify({ intent: "Other", confidence: 0.5, extracted: {}, recommendedScheduleIds: ["not-a-uuid"], reply: "ok", nextState: "active", model: "m", modelVersion: "v" }), { status: 200 }),
    new Response(JSON.stringify({ intent: "Other", confidence: 0.5, extracted: {}, recommendedScheduleIds: [], reply: " ", nextState: "active", model: "m", modelVersion: "v" }), { status: 200 }),
  ];
  for (const response of cases) {
    const client = new HttpGenAiClient({ baseUrl: "https://ai.example", apiKey: "provider-key", model: "m", timeoutMs: 25, fetchImpl: async () => response });
    const error = await client.analyze(context()).catch((value) => value);
    expect(error).toMatchObject({ code: "AI_INVALID_RESPONSE", status: 502 });
    expect(error.message).not.toContain("provider");
    expect(error.message).not.toContain("provider-key");
  }
});
