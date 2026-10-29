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
  async listMessages(sessionId: string) { return this.messages.filter((item) => item.sessionId === sessionId).sort((a, b) => a.sequence - b.sequence); }
  async findMessageByClientId(sessionId: string, clientMessageId: string) { return this.messages.find((item) => item.sessionId === sessionId && item.clientMessageId === clientMessageId) ?? null; }
  async nextMessageSequence(sessionId: string) { return Math.max(0, ...this.messages.filter((item) => item.sessionId === sessionId).map((item) => item.sequence)) + 1; }
  async insertMessage(input: NewChatMessage) {
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

  async analyze() {
    if (this.error) throw this.error;
    return this.result;
  }
}

class FakeRescheduleRepository {
  readonly requests: RescheduleRequestRecord[] = [];
  failInsert = false;

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

function makeService(chat: FakeChatRepository, ai: FakeAiClient, coordinator: FakeSharedTransactionCoordinator, reschedule: FakeRescheduleRepository) {
  const dependencies: ChatServiceContractDependencies = {
    chat,
    ai,
    coordinator,
    reschedule,
    member: { id: memberId, userId: user.userId, status: "active" },
    eligibility: { subscriptionStatus: "active", subscriptionExpiresAt: new Date("2030-01-01T00:00:00.000Z"), remainingQuota: 3 },
    booking,
    sourceSchedule: { id: sourceScheduleId, serviceId },
    candidates: [{ id: candidateScheduleId, serviceId, capacity: 2, booked: 0 }],
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
