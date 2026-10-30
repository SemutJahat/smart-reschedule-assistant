import { beforeEach, expect, test } from "bun:test";
import { AppError } from "../src/shared/errors";
import { ChatService, type ChatServiceContractDependencies } from "../src/modules/chat/service";
import type { GenAiClient } from "../src/modules/chat/client";
import type {
  ChatRepository,
  ChatMessageAnalysisRecord,
  ChatMessageRecord,
  ChatSessionRecord,
  ChatSessionPatch,
  GenAiAnalysis,
  NewChatAnalysis,
  NewChatMessage,
  NewChatSession,
  ChatContext,
} from "../src/modules/chat/schema";
import type { RescheduleRequestRecord } from "../src/modules/reschedules/schema";

/**
 * These tests intentionally target the framework-independent service boundary.
 * The repository, coordinator, and service implementations are introduced by
 * later tasks; keeping the fakes here makes the behavioral contract executable
 * without an Elysia app or a database.
 * These fakes intentionally do not model concurrency or unique constraints;
 * Task 3 repository tests cover those persistence guarantees.
 */
class FakeChatRepository implements ChatRepository {
  readonly sessions: ChatSessionRecord[] = [];
  readonly messages: ChatMessageRecord[] = [];
  readonly analyses: ChatMessageAnalysisRecord[] = [];
  failAnalysis = false;
  failUpdateSession = false;
  failAssistantOnce = false;
  failListMessagesOnce = false;

  async transaction<T>(fn: (tx: ChatRepository) => Promise<T>): Promise<T> {
    const sessions = structuredClone(this.sessions);
    const messages = structuredClone(this.messages);
    const analyses = structuredClone(this.analyses);
    try {
      return await fn(this);
    } catch (error) {
      this.sessions.splice(0, this.sessions.length, ...sessions);
      this.messages.splice(0, this.messages.length, ...messages);
      this.analyses.splice(0, this.analyses.length, ...analyses);
      throw error;
    }
  }

  async findSession(id: string) { return this.sessions.find((item) => item.id === id) ?? null; }
  async findActiveSession(bookingId: string) { return this.sessions.find((item) => item.bookingId === bookingId && (item.status === "active" || item.status === "awaiting_confirmation")) ?? null; }
  async insertSession(input: NewChatSession) {
    const now = new Date();
    const item: ChatSessionRecord = { id: crypto.randomUUID(), memberId: input.memberId, bookingId: input.bookingId, sourceScheduleId: input.sourceScheduleId ?? null, status: input.status ?? "active", currentIntent: input.currentIntent, proposedScheduleId: input.proposedScheduleId ?? null, confirmedAt: input.confirmedAt ?? null, createdAt: now, updatedAt: now };
    this.sessions.push(item);
    return item;
  }
  async updateSession(id: string, patch: ChatSessionPatch) {
    if (this.failUpdateSession) throw new Error("session persistence failed");
    const item = this.sessions.find((value) => value.id === id);
    if (!item) return null;
    Object.assign(item, patch, { updatedAt: new Date() });
    return item;
  }
  async listMessages(sessionId: string) {
    if (this.failListMessagesOnce) { this.failListMessagesOnce = false; throw new Error("context read failed"); }
    return this.messages.filter((item) => item.sessionId === sessionId).sort((a, b) => a.sequence - b.sequence);
  }
  async findMessageByClientId(sessionId: string, clientMessageId: string) { return this.messages.find((item) => item.sessionId === sessionId && item.clientMessageId === clientMessageId) ?? null; }
  async nextMessageSequence(sessionId: string) { return Math.max(0, ...this.messages.filter((item) => item.sessionId === sessionId).map((item) => item.sequence)) + 1; }
  async insertMessage(input: NewChatMessage) {
    if (this.failAssistantOnce && input.role === "assistant") { this.failAssistantOnce = false; throw new Error("assistant persistence failed"); }
    const item: ChatMessageRecord = { ...input, id: crypto.randomUUID(), clientMessageId: input.clientMessageId ?? null, createdAt: new Date() };
    this.messages.push(item);
    return item;
  }
  async insertAnalysis(input: NewChatAnalysis) {
    if (this.failAnalysis) throw new Error("analysis persistence failed");
    const item: ChatMessageAnalysisRecord = { ...input, id: crypto.randomUUID(), errorCode: input.errorCode ?? null, createdAt: new Date() };
    this.analyses.push(item);
    return item;
  }
  async findAnalysisByMessageId(messageId: string) { return this.analyses.find((item) => item.messageId === messageId) ?? null; }
}

class FakeAiClient implements GenAiClient {
  result: GenAiAnalysis = {
    intent: "Reschedule",
    confidence: 0.99,
    extracted: {},
    recommendedScheduleIds: [],
    reply: "Please confirm the proposed schedule.",
    nextState: "awaiting_confirmation",
    model: "fake-model",
    modelVersion: "test",
  };
  error: unknown = null;
  lastContext: ChatContext | null = null;

  async analyze(context: ChatContext) {
    this.lastContext = context;
    if (this.error) throw this.error;
    return this.result;
  }
}

class FakeRescheduleRepository {
  readonly requests: RescheduleRequestRecord[] = [];
  failInsert = false;
  extraRequests: RescheduleRequestRecord[] = [];

  async listRequests() { return [...this.requests, ...this.extraRequests]; }

  async insertRequest(input: { bookingId: string; memberId: string; fromScheduleId: string; toScheduleId: string; customerMessage: string; chatSessionId: string | null }) {
    const now = new Date();
    const request: RescheduleRequestRecord = { ...input, id: crypto.randomUUID(), adminNote: null, status: "pending", reviewedBy: null, reviewedAt: null, createdAt: now, updatedAt: now };
    this.requests.push(request);
    if (this.failInsert) throw new Error("request persistence failed");
    return request;
  }
}

class FakeSharedTransactionCoordinator {
  constructor(private readonly chat: FakeChatRepository, private readonly reschedule: FakeRescheduleRepository) {}

  async transaction<T>(fn: (tx: { chat: FakeChatRepository; reschedule: FakeRescheduleRepository }) => Promise<T>) {
    const sessions = structuredClone(this.chat.sessions);
    const messages = structuredClone(this.chat.messages);
    const analyses = structuredClone(this.chat.analyses);
    const requests = structuredClone(this.reschedule.requests);
    try {
      return await fn({ chat: this.chat, reschedule: this.reschedule });
    } catch (error) {
      this.chat.sessions.splice(0, this.chat.sessions.length, ...sessions);
      this.chat.messages.splice(0, this.chat.messages.length, ...messages);
      this.chat.analyses.splice(0, this.chat.analyses.length, ...analyses);
      this.reschedule.requests.splice(0, this.reschedule.requests.length, ...requests);
      throw error;
    }
  }
}

const user = { userId: "00000000-0000-4000-8000-000000000001", role: "customer" as const };
const memberId = "00000000-0000-4000-8000-000000000002";
const bookingId = "00000000-0000-4000-8000-000000000003";
const sourceScheduleId = "00000000-0000-4000-8000-000000000004";
const candidateScheduleId = "00000000-0000-4000-8000-000000000005";
const otherScheduleId = "00000000-0000-4000-8000-000000000006";
const serviceId = "00000000-0000-4000-8000-000000000007";
const invalidScheduleId = "00000000-0000-4000-8000-000000000008";
const SAFE_FALLBACK_REPLY = "I couldn't process that request right now. Please try again.";

function makeService(chat: FakeChatRepository, ai: FakeAiClient, coordinator: FakeSharedTransactionCoordinator, reschedule: FakeRescheduleRepository, candidates: ChatServiceContractDependencies["candidates"] = [{ id: candidateScheduleId, serviceId, capacity: 2, booked: 0 }], members?: ChatServiceContractDependencies["members"]) {
  const dependencies: ChatServiceContractDependencies = {
    chat,
    ai,
    coordinator,
    reschedule,
    member: { id: memberId, userId: user.userId, status: "active" },
    eligibility: { subscriptionStatus: "active", subscriptionExpiresAt: new Date("2030-01-01T00:00:00.000Z"), remainingQuota: 3 },
    booking,
    sourceSchedule: { id: sourceScheduleId, serviceId },
    candidates,
    members,
  };
  return new ChatService(dependencies);
}

let chat: FakeChatRepository;
let ai: FakeAiClient;
let service: ChatService;
let reschedule: FakeRescheduleRepository;
let coordinator: FakeSharedTransactionCoordinator;
let booking: { id: string; memberId: string; scheduleId: string; status: "booked" };

beforeEach(async () => {
  chat = new FakeChatRepository();
  ai = new FakeAiClient();
  reschedule = new FakeRescheduleRepository();
  coordinator = new FakeSharedTransactionCoordinator(chat, reschedule);
  booking = { id: bookingId, memberId, scheduleId: sourceScheduleId, status: "booked" };
  service = makeService(chat, ai, coordinator, reschedule);
});

test("a valid Reschedule proposal moves the session to awaiting_confirmation", async () => {
  ai.result.recommendedScheduleIds = [candidateScheduleId];
  const session = await service.createSession(user, bookingId);
  const turn = await service.sendMessage(user, session.id, { message: "Please move me", clientMessageId: "00000000-0000-4000-8000-000000000011" });

  expect(turn.analysis?.intent).toBe("Reschedule");
  expect(turn.session.status).toBe("awaiting_confirmation");
  expect(turn.session.currentIntent).toBe("Reschedule");
  expect(turn.session.proposedScheduleId).toBe(candidateScheduleId);
  expect(turn.session).not.toHaveProperty("memberId");
  expect(turn.session).not.toHaveProperty("sourceScheduleId");
  expect(turn.userMessage).not.toHaveProperty("sessionId");
  expect(turn.userMessage).not.toHaveProperty("clientMessageId");
});

test("a recommendation outside the backend candidate set is rejected", async () => {
  ai.result.recommendedScheduleIds = [invalidScheduleId];
  const session = await service.createSession(user, bookingId);

  await expect(service.sendMessage(user, session.id, { message: "Move me", clientMessageId: "00000000-0000-4000-8000-000000000012" })).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
});

test("confirmation creates a pending request without mutating the booking schedule", async () => {
  ai.result.recommendedScheduleIds = [candidateScheduleId];
  const session = await service.createSession(user, bookingId);
  await service.sendMessage(user, session.id, { message: "Move me", clientMessageId: "00000000-0000-4000-8000-000000000013" });
  const result = await service.confirmSchedule(user, session.id, candidateScheduleId);

  expect(result.request.status).toBe("pending");
  expect(result.request.chatSessionId).toBe(session.id);
  expect(booking.scheduleId).toBe(sourceScheduleId);
});

test("confirmation cannot use a schedule different from the proposal", async () => {
  ai.result.recommendedScheduleIds = [candidateScheduleId];
  const session = await service.createSession(user, bookingId);
  await service.sendMessage(user, session.id, { message: "Move me", clientMessageId: "00000000-0000-4000-8000-000000000014" });

  await expect(service.confirmSchedule(user, session.id, otherScheduleId)).rejects.toMatchObject({ code: "CONFIRMATION_MISMATCH" });
});

test("duplicate clientMessageId returns the original turn without another user message", async () => {
  ai.result.recommendedScheduleIds = [candidateScheduleId];
  const session = await service.createSession(user, bookingId);
  const clientMessageId = "00000000-0000-4000-8000-000000000015";
  const first = await service.sendMessage(user, session.id, { message: "Move me", clientMessageId });
  const duplicate = await service.sendMessage(user, session.id, { message: "Move me again", clientMessageId });

  expect(duplicate).toEqual(first);
  expect(chat.messages.filter((item) => item.role === "user")).toHaveLength(1);
});

test("confirmation atomically rolls back the session and request when persistence fails", async () => {
  ai.result.recommendedScheduleIds = [candidateScheduleId];
  const session = await service.createSession(user, bookingId);
  await service.sendMessage(user, session.id, { message: "Move me", clientMessageId: "00000000-0000-4000-8000-000000000016" });
  const before = structuredClone(chat.sessions);
  const beforeRequests = structuredClone(reschedule.requests);
  reschedule.failInsert = true;

  await expect(service.confirmSchedule(user, session.id, candidateScheduleId)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  expect(chat.sessions).toEqual(before);
  expect(reschedule.requests).toEqual(beforeRequests);
});

test("confirmation rolls back the request when session persistence fails after insertion", async () => {
  ai.result.recommendedScheduleIds = [candidateScheduleId];
  const session = await service.createSession(user, bookingId);
  await service.sendMessage(user, session.id, { message: "Move me", clientMessageId: "00000000-0000-4000-8000-000000000018" });
  const before = structuredClone(chat.sessions);
  const beforeRequests = structuredClone(reschedule.requests);
  chat.failUpdateSession = true;

  await expect(service.confirmSchedule(user, session.id, candidateScheduleId)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  expect(chat.sessions).toEqual(before);
  expect(reschedule.requests).toEqual(beforeRequests);
});

test("a failed AI call persists the failed-analysis sentinel", async () => {
  ai.error = new AppError("INTERNAL_SERVER_ERROR", "provider unavailable", 503);
  const session = await service.createSession(user, bookingId);

  const clientMessageId = "00000000-0000-4000-8000-000000000017";
  await expect(service.sendMessage(user, session.id, { message: "Move me", clientMessageId })).rejects.toMatchObject({ code: "AI_SERVICE_UNAVAILABLE" });
  expect(chat.messages).toContainEqual(expect.objectContaining({ role: "user", content: "Move me", clientMessageId }));
  expect(chat.messages).toContainEqual(expect.objectContaining({ role: "assistant", content: SAFE_FALLBACK_REPLY }));
  expect(chat.analyses.at(-1)).toMatchObject({ status: "failed", errorCode: "AI_SERVICE_UNAVAILABLE", intent: "Other", confidence: 0, extractedData: {}, recommendedScheduleIds: [], nextState: "active", reply: SAFE_FALLBACK_REPLY, model: "unavailable", modelVersion: "unavailable" });
  const persistedSession = chat.sessions.find((item) => item.id === session.id);
  expect(persistedSession).toMatchObject({ status: "active", currentIntent: null, proposedScheduleId: null });
  expect(persistedSession?.status).toBe("active");
  expect(reschedule.requests).toHaveLength(0);
});

test("invalid AI retry is idempotent and analysis serialization is public-only", async () => {
  ai.error = new AppError("AI_INVALID_RESPONSE", "bad provider response", 502);
  const session = await service.createSession(user, bookingId);
  const clientMessageId = "00000000-0000-4000-8000-000000000019";
  await expect(service.sendMessage(user, session.id, { message: "Move me", clientMessageId })).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
  const retry = await service.sendMessage(user, session.id, { message: "retry", clientMessageId });
  expect(retry.analysis).not.toHaveProperty("messageId");
  expect(retry.analysis).not.toHaveProperty("status");
  expect(retry.analysis).not.toHaveProperty("errorCode");
  expect(chat.messages.filter((item) => item.role === "user")).toHaveLength(1);
  expect(chat.analyses).toHaveLength(1);
});

test("retries recover after successful-turn persistence failure", async () => {
  ai.result = { ...ai.result, intent: "Reschedule", recommendedScheduleIds: [candidateScheduleId], nextState: "awaiting_confirmation" };
  const session = await service.createSession(user, bookingId);
  const clientMessageId = "00000000-0000-4000-8000-000000000023";
  chat.failUpdateSession = true;
  await expect(service.sendMessage(user, session.id, { message: "retryable", clientMessageId })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  chat.failUpdateSession = false;
  const retry = await service.sendMessage(user, session.id, { message: "retryable again", clientMessageId });
  expect(retry.session.status).toBe("awaiting_confirmation");
  expect(chat.messages.filter((item) => item.role === "user")).toHaveLength(1);
});

test("stale failure does not clear a newer awaiting-confirmation proposal", async () => {
  ai.result = { ...ai.result, intent: "Reschedule", recommendedScheduleIds: [candidateScheduleId], nextState: "awaiting_confirmation" };
  const session = await service.createSession(user, bookingId);
  const firstMessage = "00000000-0000-4000-8000-000000000027";
  let release!: () => void;
  let started!: () => void;
  const startedPromise = new Promise<void>((resolve) => { started = resolve; });
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const originalAnalyze = ai.analyze.bind(ai);
  ai.analyze = async (context) => { started(); await gate; return originalAnalyze(context); };
  const pending = service.sendMessage(user, session.id, { message: "first", clientMessageId: firstMessage });
  await startedPromise;
  await chat.updateSession(session.id, { status: "awaiting_confirmation", currentIntent: "Reschedule", proposedScheduleId: candidateScheduleId });
  expect(chat.sessions.find((item) => item.id === session.id)).toMatchObject({ status: "awaiting_confirmation", proposedScheduleId: candidateScheduleId });
  ai.error = new AppError("INTERNAL_SERVER_ERROR", "transport", 503);
  release();
  await expect(pending).rejects.toMatchObject({ code: "AI_SERVICE_UNAVAILABLE" });
  expect(chat.sessions.find((item) => item.id === session.id)).toMatchObject({ status: "awaiting_confirmation", proposedScheduleId: candidateScheduleId });
});

test("retries recover after context and fallback persistence failures", async () => {
  const session = await service.createSession(user, bookingId);
  const clientMessageId = "00000000-0000-4000-8000-000000000024";
  chat.failListMessagesOnce = true;
  await expect(service.sendMessage(user, session.id, { message: "context retry", clientMessageId })).rejects.toMatchObject({ code: "AI_SERVICE_UNAVAILABLE" });
  const contextRetry = await service.sendMessage(user, session.id, { message: "context retry", clientMessageId });
  expect(contextRetry.analysis.reply).toBe(SAFE_FALLBACK_REPLY);

  await chat.updateSession(session.id, { status: "closed" });
  const fallbackSession = await service.createSession(user, bookingId);
  const fallbackClientMessageId = "00000000-0000-4000-8000-000000000025";
  ai.error = new AppError("INTERNAL_SERVER_ERROR", "transport", 503);
  chat.failAssistantOnce = true;
  await expect(service.sendMessage(user, fallbackSession.id, { message: "fallback retry", clientMessageId: fallbackClientMessageId })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  ai.error = null;
  ai.result = { ...ai.result, intent: "Reschedule", recommendedScheduleIds: [candidateScheduleId], nextState: "awaiting_confirmation" };
  const fallbackRetry = await service.sendMessage(user, fallbackSession.id, { message: "fallback retry", clientMessageId: fallbackClientMessageId });
  expect(fallbackRetry.session.status).toBe("awaiting_confirmation");
  expect(chat.messages.filter((item) => item.clientMessageId === fallbackClientMessageId)).toHaveLength(1);
});

test("retry resumes after successful analysis persistence fails", async () => {
  ai.result = { ...ai.result, intent: "Reschedule", recommendedScheduleIds: [candidateScheduleId], nextState: "awaiting_confirmation" };
  const session = await service.createSession(user, bookingId);
  const clientMessageId = "00000000-0000-4000-8000-000000000026";
  chat.failUpdateSession = true;
  await expect(service.sendMessage(user, session.id, { message: "persist retry", clientMessageId })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  chat.failUpdateSession = false;
  const retry = await service.sendMessage(user, session.id, { message: "persist retry", clientMessageId });
  expect(retry.session.status).toBe("awaiting_confirmation");
  expect(chat.messages.filter((item) => item.role === "user")).toHaveLength(1);
});

test("context filters cancelled, full, wrong-service, capacity-full, and current schedules", async () => {
  const cancelled = "00000000-0000-4000-8000-000000000030";
  const full = "00000000-0000-4000-8000-000000000031";
  const wrong = "00000000-0000-4000-8000-000000000032";
  const capacityFull = "00000000-0000-4000-8000-000000000033";
  const valid = "00000000-0000-4000-8000-000000000034";
  const candidates = [
    { id: sourceScheduleId, serviceId, capacity: 2, booked: 0 },
    { id: cancelled, serviceId, capacity: 2, booked: 0, status: "cancelled" as const },
    { id: full, serviceId, capacity: 2, booked: 0, status: "full" as const },
    { id: wrong, serviceId: otherScheduleId, capacity: 2, booked: 0 },
    { id: capacityFull, serviceId, capacity: 2, booked: 2 },
    { id: valid, serviceId, capacity: 2, booked: 1 },
  ];
  ai.result = { ...ai.result, intent: "Other", recommendedScheduleIds: [], nextState: "active" };
  const local = makeService(chat, ai, coordinator, reschedule, candidates);
  const session = await local.createSession(user, bookingId);
  await local.sendMessage(user, session.id, { message: "available?" });
  expect(ai.lastContext?.candidateSchedules.map((item) => item.schedule.id)).toEqual([valid]);
  expect(ai.lastContext?.candidateSchedules[0]?.remainingCapacity).toBe(1);
  expect(ai.lastContext).not.toHaveProperty("passwordHash");
  expect(ai.lastContext).not.toHaveProperty("medicalHistory");
  expect(ai.lastContext).not.toHaveProperty("paymentReference");
  expect(ai.lastContext?.session).not.toHaveProperty("memberId");
  expect(ai.lastContext?.session).not.toHaveProperty("createdAt");
  expect(ai.lastContext?.messages[0]).not.toHaveProperty("sessionId");
  expect(ai.lastContext?.messages[0]).not.toHaveProperty("clientMessageId");
  expect(ai.lastContext?.booking).not.toHaveProperty("memberId");
  expect(ai.lastContext?.sourceSchedule).not.toHaveProperty("status");
  expect(ai.lastContext?.sourceSchedule).not.toHaveProperty("capacity");
});

test("malformed injected AI payloads persist invalid sentinels", async () => {
  const cases: Array<Partial<GenAiAnalysis>> = [
    { intent: "Bogus" as GenAiAnalysis["intent"] }, { confidence: 2 }, { reply: "   " }, { reply: "x".repeat(2_001) },
    { model: "" }, { modelVersion: "" }, { nextState: "submitted", recommendedScheduleIds: [] },
    { nextState: "awaiting_confirmation", recommendedScheduleIds: [] }, { nextState: "active", recommendedScheduleIds: [candidateScheduleId] },
    { intent: "Cancel" as GenAiAnalysis["intent"], recommendedScheduleIds: [candidateScheduleId] },
    { intent: "Other" as GenAiAnalysis["intent"], recommendedScheduleIds: [candidateScheduleId] },
    { intent: "Schedule inquiry" as GenAiAnalysis["intent"], recommendedScheduleIds: [candidateScheduleId] },
    { intent: "Confirmation" as GenAiAnalysis["intent"], recommendedScheduleIds: [candidateScheduleId] },
  ];
  for (const [index, patch] of cases.entries()) {
    const session = await service.createSession(user, bookingId);
    ai.result = { intent: "Reschedule", confidence: 0.9, extracted: {}, recommendedScheduleIds: [candidateScheduleId], reply: "ok", nextState: "awaiting_confirmation", model: "model", modelVersion: "v1", ...patch };
    await expect(service.sendMessage(user, session.id, { message: `invalid-${index}` })).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
    expect(chat.analyses.at(-1)).toMatchObject({ status: "failed", errorCode: "AI_INVALID_RESPONSE" });
    await chat.updateSession(session.id, { status: "closed" });
  }
});

test("ownership, terminal, source-change, and stale target errors are exact", async () => {
  const session = await service.createSession(user, bookingId);
  const otherUser = { userId: "00000000-0000-4000-8000-000000000099", role: "customer" as const };
  const ownerMember = { id: memberId, userId: user.userId, status: "active" as const };
  const otherMember = { id: "00000000-0000-4000-8000-000000000099", userId: otherUser.userId, status: "active" as const };
  const ownedService = makeService(chat, ai, coordinator, reschedule, undefined, [ownerMember, otherMember]);
  await expect(ownedService.getSession(otherUser, session.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(ownedService.getMessages(otherUser, session.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await chat.updateSession(session.id, { status: "closed" });
  await expect(service.sendMessage(user, session.id, { message: "closed" })).rejects.toMatchObject({ code: "CHAT_SESSION_CLOSED" });

  await chat.updateSession(session.id, { status: "closed" });
  const activeSession = await service.createSession(user, bookingId);
  ai.result = { ...ai.result, recommendedScheduleIds: [candidateScheduleId], nextState: "awaiting_confirmation" };
  await service.sendMessage(user, activeSession.id, { message: "move" });
  await expect(service.confirmSchedule(user, activeSession.id, otherScheduleId)).rejects.toMatchObject({ code: "CONFIRMATION_MISMATCH" });
  booking.scheduleId = otherScheduleId;
  await expect(service.confirmSchedule(user, activeSession.id, candidateScheduleId)).rejects.toMatchObject({ code: "BOOKING_STATE_CHANGED" });
});

test("no candidates return NO_AVAILABLE_SCHEDULE without calling AI", async () => {
  ai.result = { ...ai.result, intent: "Other", recommendedScheduleIds: [], nextState: "active" };
  const localService = makeService(chat, ai, coordinator, reschedule, []);
  const session = await localService.createSession(user, bookingId);
  await expect(localService.sendMessage(user, session.id, { message: "Nothing?" })).rejects.toMatchObject({ code: "NO_AVAILABLE_SCHEDULE" });
  expect(ai.lastContext).toBeNull();
  expect(reschedule.requests).toHaveLength(0);
});

test("stale full, cancelled, and capacity-exhausted targets are unavailable at confirmation", async () => {
  const staleCases: Array<{ label: string; mutate: (candidate: ChatServiceContractDependencies["candidates"][number]) => void }> = [
    { label: "full", mutate: (candidate) => { candidate.status = "full"; } },
    { label: "cancelled", mutate: (candidate) => { candidate.status = "cancelled"; } },
    { label: "capacity", mutate: (candidate) => { candidate.booked = candidate.capacity; } },
  ];
  for (const staleCase of staleCases) {
    const candidates: ChatServiceContractDependencies["candidates"] = [{ id: candidateScheduleId, serviceId, capacity: 2, booked: 0, status: "available" }];
    const localAi = new FakeAiClient();
    localAi.result = { ...localAi.result, recommendedScheduleIds: [candidateScheduleId], nextState: "awaiting_confirmation" };
    const local = makeService(chat, localAi, coordinator, reschedule, candidates);
    const session = await local.createSession(user, bookingId);
    await local.sendMessage(user, session.id, { message: `move-${staleCase.label}` });
    staleCase.mutate(candidates[0]);
    await expect(local.confirmSchedule(user, session.id, candidateScheduleId)).rejects.toMatchObject({ code: "SCHEDULE_UNAVAILABLE" });
    await chat.updateSession(session.id, { status: "closed" });
  }
});

test("duplicate confirmation is rejected after the session is submitted", async () => {
  ai.result = { ...ai.result, intent: "Reschedule", recommendedScheduleIds: [candidateScheduleId], nextState: "awaiting_confirmation" };
  const session = await service.createSession(user, bookingId);
  await service.sendMessage(user, session.id, { message: "move" });
  await service.confirmSchedule(user, session.id, candidateScheduleId);
  await expect(service.confirmSchedule(user, session.id, candidateScheduleId)).rejects.toMatchObject({ code: "CHAT_SESSION_CLOSED" });
});

test("non-booked bookings cannot create chat sessions", async () => {
  booking.status = "cancelled" as "booked";
  await expect(service.createSession(user, bookingId)).rejects.toMatchObject({ code: "BOOKING_STATE_CHANGED" });
});

test("duplicate active chat sessions are rejected", async () => {
  await service.createSession(user, bookingId);
  await expect(service.createSession(user, bookingId)).rejects.toMatchObject({ code: "CONFLICT" });
  expect(chat.sessions).toHaveLength(1);
});

test("active reschedule requests are checked inside session creation transaction", async () => {
  const activeRequest: RescheduleRequestRecord = {
    id: crypto.randomUUID(), bookingId, memberId, chatSessionId: null, fromScheduleId: sourceScheduleId, toScheduleId: candidateScheduleId,
    customerMessage: "pending", adminNote: null, status: "pending", reviewedBy: null, reviewedAt: null, createdAt: new Date(), updatedAt: new Date(),
  };
  reschedule.extraRequests.push(activeRequest);
  const dependencies = {
    chat, ai, coordinator, reschedule, member: { id: memberId, userId: user.userId, status: "active" as const },
    eligibility: { subscriptionStatus: "active" as const, subscriptionExpiresAt: new Date("2030-01-01"), remainingQuota: 3 }, booking,
    sourceSchedule: { id: sourceScheduleId, serviceId }, candidates: [{ id: candidateScheduleId, serviceId, capacity: 2, booked: 0 }], activeRequests: [activeRequest],
  } satisfies ChatServiceContractDependencies;
  const guarded = new ChatService(dependencies);
  await expect(guarded.createSession(user, bookingId)).rejects.toMatchObject({ code: "CONFLICT" });
});
