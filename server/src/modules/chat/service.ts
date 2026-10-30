import { AppError } from "../../shared/errors";
import type { AuthRepository, AuthUser, MemberRecord } from "../auth/schema";
import type { BookingRecord, BookingRepository } from "../bookings/schema";
import type { CatalogRepository, ScheduleRecord } from "../coaches/schema";
import type { PaymentRepository, SubscriptionRecord } from "../payments/schema";
import type { RescheduleRepository, RescheduleRequestRecord } from "../reschedules/schema";
import { MAX_GEN_AI_REPLY_LENGTH, type GenAiClient } from "./client";
import type {
  ChatContext,
  ChatAnalysisNextState,
  ChatMessageAnalysisRecord,
  ChatMessageRecord,
  ChatRepository,
  ChatSessionRecord,
  ChatSessionStatus,
  ChatIntent,
  GenAiAnalysis,
} from "./schema";
import { CHAT_INTENTS, isChatUuid } from "./schema";
import type { ChatRescheduleUnitOfWork, ChatTransactionCoordinator } from "./unit-of-work";

export interface ChatServiceDependencies {
  auth: AuthRepository;
  catalog: CatalogRepository;
  booking: BookingRepository;
  payment: PaymentRepository;
  reschedule: RescheduleRepository;
  chat: ChatRepository;
  coordinator: ChatTransactionCoordinator;
  ai: GenAiClient;
  policyVersion?: string;
}

/** Compatibility adapter for the framework-independent Task 1 contract fakes. */
export interface ChatServiceContractDependencies {
  chat: ChatRepository;
  ai: GenAiClient;
  coordinator: { transaction<T>(fn: (tx: { chat: ChatRepository; reschedule: LegacyRescheduleAdapter }) => Promise<T>): Promise<T> };
  reschedule: LegacyRescheduleAdapter;
  member: Pick<MemberRecord, "id" | "userId" | "status">;
  members?: Array<Pick<MemberRecord, "id" | "userId" | "status">>;
  activeRequests?: RescheduleRequestRecord[];
  eligibility: { subscriptionStatus: SubscriptionRecord["status"]; subscriptionExpiresAt: Date; remainingQuota: number };
  booking: Pick<BookingRecord, "id" | "memberId" | "scheduleId" | "status">;
  sourceSchedule: Pick<ScheduleRecord, "id" | "serviceId">;
  candidates: Array<Pick<ScheduleRecord, "id" | "serviceId" | "capacity"> & { booked: number; status?: ScheduleRecord["status"] }>;
}

export interface LegacyRescheduleAdapter {
  listRequests(filters?: { memberId?: string }): Promise<RescheduleRequestRecord[]>;
  insertRequest(input: { bookingId: string; memberId: string; chatSessionId: string | null; fromScheduleId: string; toScheduleId: string; customerMessage: string }): Promise<RescheduleRequestRecord>;
}

export interface SendMessageInput {
  message: string;
  clientMessageId?: string;
}

export interface SerializedChatSession {
  id: string;
  bookingId: string;
  status: ChatSessionStatus;
  currentIntent: ChatIntent | null;
  proposedScheduleId: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedChatMessage {
  id: string;
  role: ChatMessageRecord["role"];
  content: string;
}

export interface SerializedChatSchedule {
  id: string;
  startsAt: string;
  endsAt: string;
}

export interface SerializedChatAnalysis {
  intent: ChatIntent;
  confidence: number;
  recommendedSchedules: SerializedChatSchedule[];
}

export interface ChatTurn {
  session: SerializedChatSession;
  userMessage: SerializedChatMessage;
  assistantMessage: SerializedChatMessage;
  analysis: SerializedChatAnalysis;
}

export interface ConfirmationResult {
  request: SerializedRescheduleRequest;
  booking: SerializedBooking;
}

export interface ConfirmationResponse {
  sessionId: string;
  status: "submitted";
  rescheduleRequest: SerializedRescheduleRequest;
  message: string;
}

export interface SerializedBooking {
  id: string;
  scheduleId: string;
  status: BookingRecord["status"];
  bookedAt: string;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toConfirmationResponse(result: ConfirmationResult, sessionId: string): ConfirmationResponse {
  return {
    sessionId,
    status: "submitted",
    rescheduleRequest: result.request,
    message: "Permintaan reschedule sudah dikirim ke admin untuk ditinjau.",
  };
}

export interface SerializedRescheduleRequest {
  id: string;
  bookingId: string;
  chatSessionId: string | null;
  fromScheduleId: string;
  toScheduleId: string;
  status: RescheduleRequestRecord["status"];
}

const SAFE_FALLBACK_REPLY = "I couldn't process that request right now. Please try again.";
const POLICY_VERSION = "chat-reschedule-v1";

function isAppError(error: unknown): error is AppError {
  return error instanceof AppError || (typeof error === "object" && error !== null && "code" in error);
}

function serializeSession(item: ChatSessionRecord): SerializedChatSession {
  return {
    id: item.id,
    bookingId: item.bookingId,
    status: item.status,
    currentIntent: item.currentIntent,
    proposedScheduleId: item.proposedScheduleId,
    confirmedAt: item.confirmedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function serializeMessage(item: ChatMessageRecord): SerializedChatMessage {
  return { id: item.id, role: item.role, content: item.content };
}

function serializeSchedule(item: ScheduleRecord): SerializedChatSchedule {
  return { id: item.id, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() };
}

function serializeAnalysis(item: ChatMessageAnalysisRecord, recommendedSchedules: SerializedChatSchedule[]): SerializedChatAnalysis {
  return { intent: item.intent, confidence: item.confidence, recommendedSchedules };
}

async function serializeRecommendedSchedules(ids: string[], catalog: CatalogRepository): Promise<SerializedChatSchedule[]> {
  return (await Promise.all(ids.map((id) => catalog.findSchedule(id)))).filter((schedule): schedule is ScheduleRecord => schedule !== null).map(serializeSchedule);
}

function serializeBooking(item: BookingRecord): SerializedBooking {
  return { id: item.id, scheduleId: item.scheduleId, status: item.status, bookedAt: item.bookedAt.toISOString(), cancelledAt: item.cancelledAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() };
}

function serializeRequest(item: RescheduleRequestRecord): SerializedRescheduleRequest {
  return {
    id: item.id,
    bookingId: item.bookingId,
    chatSessionId: item.chatSessionId,
    fromScheduleId: item.fromScheduleId,
    toScheduleId: item.toScheduleId,
    status: item.status,
  };
}

function notFound(message: string): AppError { return new AppError("NOT_FOUND", message, 404); }
function forbidden(message: string): AppError { return new AppError("FORBIDDEN", message, 403); }
function conflict(message: string): AppError { return new AppError("CONFLICT", message, 409); }
function coded(code: "CHAT_SESSION_CLOSED" | "NO_AVAILABLE_SCHEDULE" | "SCHEDULE_UNAVAILABLE" | "BOOKING_STATE_CHANGED" | "CONFIRMATION_MISMATCH", message: string): AppError { return new AppError(code, message, 409); }
function invalidResponse(): AppError { return new AppError("AI_INVALID_RESPONSE", "The AI service returned an invalid response", 502); }
function unavailable(): AppError { return new AppError("AI_SERVICE_UNAVAILABLE", "The AI service is temporarily unavailable", 503); }
function internal(): AppError { return new AppError("INTERNAL_SERVER_ERROR", "Unable to complete the chat operation", 500); }

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isIntent(value: unknown): value is ChatIntent { return typeof value === "string" && (CHAT_INTENTS as readonly string[]).includes(value); }
function isNextState(value: unknown): value is ChatAnalysisNextState { return value === "active" || value === "awaiting_confirmation" || value === "submitted"; }
function scheduleView(schedule: ScheduleRecord) {
  return { id: schedule.id, title: schedule.title, serviceId: schedule.serviceId, startsAt: schedule.startsAt, endsAt: schedule.endsAt, coachId: schedule.coachId };
}
function validateAnalysis(value: unknown, session: ChatSessionRecord, candidateIds: Set<string>): GenAiAnalysis {
  if (!isRecord(value)) throw invalidResponse();
  const keys = ["intent", "confidence", "extracted", "recommendedScheduleIds", "reply", "nextState", "model", "modelVersion"];
  if (Object.keys(value).some((key) => !keys.includes(key))) throw invalidResponse();
  if (!isIntent(value.intent) || typeof value.confidence !== "number" || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1 || !isRecord(value.extracted) || !Array.isArray(value.recommendedScheduleIds) || value.recommendedScheduleIds.some((id) => !isChatUuid(id)) || typeof value.reply !== "string" || value.reply.trim() === "" || value.reply.length > MAX_GEN_AI_REPLY_LENGTH || typeof value.model !== "string" || value.model.trim() === "" || typeof value.modelVersion !== "string" || value.modelVersion.trim() === "" || !isNextState(value.nextState)) throw invalidResponse();
  const recommendations = value.recommendedScheduleIds as string[];
  if (value.nextState === "submitted" || (value.nextState === "awaiting_confirmation" && (recommendations.length === 0 || value.intent !== "Reschedule")) || (value.nextState === "active" && recommendations.length > 0) || recommendations.some((id) => !candidateIds.has(id)) || (recommendations.length > 0 && value.intent !== "Reschedule")) throw invalidResponse();
  const transitions: Record<ChatSessionStatus, ChatAnalysisNextState[]> = { active: ["active", "awaiting_confirmation"], awaiting_confirmation: ["active", "awaiting_confirmation"], submitted: [], closed: [] };
  if (!transitions[session.status].includes(value.nextState)) throw invalidResponse();
  return { intent: value.intent, confidence: value.confidence, extracted: value.extracted, recommendedScheduleIds: recommendations, reply: value.reply, nextState: value.nextState, model: value.model, modelVersion: value.modelVersion };
}

function mapPersistenceError(error: unknown): AppError | null {
  if (isAppError(error)) return error.code === "CONFLICT" || error.code === "NOT_FOUND" || error.code === "FORBIDDEN" ? error : null;
  const value = error as { code?: string; constraint_name?: string };
  if (value.code === "23505" || value.constraint_name === "reschedule_requests_active_booking_uidx" || value.constraint_name === "chat_sessions_active_member_booking_uidx") return conflict("The request conflicts with the current state");
  return null;
}

function isAnalysisUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const value = error as { code?: string; constraint_name?: string; constraint?: string };
  return value.code === "23505" && (value.constraint_name === "chat_message_analyses_message_uidx" || value.constraint === "chat_message_analyses_message_uidx");
}

function publicFailureCode(error: unknown): "AI_INVALID_RESPONSE" | "AI_SERVICE_UNAVAILABLE" {
  return isAppError(error) && error.code === "AI_INVALID_RESPONSE" ? "AI_INVALID_RESPONSE" : "AI_SERVICE_UNAVAILABLE";
}

function isTerminal(session: ChatSessionRecord): boolean {
  return session.status === "submitted" || session.status === "closed";
}

function activeSubscription(subscription: SubscriptionRecord | null, memberId: string, now = new Date()): subscription is SubscriptionRecord {
  return !!subscription && subscription.memberId === memberId && subscription.status === "active" && subscription.expiresAt > now && subscription.usedSessions < subscription.totalSessions;
}

export class ChatService {
  private readonly dependencies: ChatServiceDependencies;
  private readonly contract?: ChatServiceContractDependencies;

  constructor(dependencies: ChatServiceDependencies);
  constructor(dependencies: ChatServiceContractDependencies);
  constructor(dependencies: ChatServiceDependencies | ChatServiceContractDependencies) {
    if ("auth" in dependencies) this.dependencies = dependencies;
    else {
      this.contract = dependencies;
      const contractBooking = {
        findBooking: async () => this.bookingFromPartial(dependencies.booking),
        findSchedule: async (id: string) => {
          if (id === dependencies.sourceSchedule.id) return this.scheduleFromPartial(dependencies.sourceSchedule);
          const candidate = dependencies.candidates.find((item) => item.id === id);
          return candidate ? this.scheduleFromPartial(candidate) : null;
        },
        countBooked: async (id: string) => dependencies.candidates.find((item) => item.id === id)?.booked ?? 0,
      } as unknown as BookingRepository;
      const contractPayment = { findSubscription: async () => this.subscriptionFromContract(dependencies) } as unknown as PaymentRepository;
      this.dependencies = {
        auth: { findMemberByUserId: async (userId: string) => (dependencies.members ?? [dependencies.member]).find((candidate) => candidate.userId === userId) ?? null } as unknown as AuthRepository,
        catalog: { findSchedule: async (id: string) => id === dependencies.sourceSchedule.id ? this.scheduleFromPartial(dependencies.sourceSchedule) : null, listSchedules: async () => dependencies.candidates.map((item) => this.scheduleFromPartial(item)), countBooked: async (id: string) => dependencies.candidates.find((item) => item.id === id)?.booked ?? 0 } as unknown as CatalogRepository,
        booking: contractBooking,
        payment: contractPayment,
        reschedule: { listRequests: async () => dependencies.activeRequests ?? [] } as unknown as RescheduleRepository,
        chat: dependencies.chat,
        coordinator: {
          transaction: async <T>(fn: (tx: ChatRescheduleUnitOfWork) => Promise<T>) => dependencies.coordinator.transaction((legacyTx) => fn({
            chat: legacyTx.chat,
            reschedule: legacyTx.reschedule as RescheduleRepository,
            booking: contractBooking,
            payment: contractPayment,
          })),
        },
        ai: dependencies.ai,
      };
    }
  }

  private scheduleFromPartial(value: Pick<ScheduleRecord, "id" | "serviceId"> & Partial<Pick<ScheduleRecord, "capacity" | "status" | "title" | "coachId" | "startsAt" | "endsAt">>): ScheduleRecord {
    const now = new Date();
    return { id: value.id, title: value.title ?? "Schedule", coachId: value.coachId ?? "coach", serviceId: value.serviceId, startsAt: value.startsAt ?? now, endsAt: value.endsAt ?? new Date(now.getTime() + 3600000), capacity: value.capacity ?? 1, status: value.status ?? "available", createdAt: now, updatedAt: now };
  }

  private bookingFromPartial(value: Pick<BookingRecord, "id" | "memberId" | "scheduleId" | "status"> & Partial<BookingRecord>): BookingRecord {
    const now = new Date();
    return { id: value.id, memberId: value.memberId, scheduleId: value.scheduleId, status: value.status, subscriptionId: value.subscriptionId ?? "subscription", bookedAt: value.bookedAt ?? now, cancelledAt: value.cancelledAt ?? null, createdAt: value.createdAt ?? now, updatedAt: value.updatedAt ?? now };
  }

  private subscriptionFromContract(value: ChatServiceContractDependencies): SubscriptionRecord {
    const now = new Date();
    return { id: "subscription", memberId: value.member.id, packageId: "package", status: value.eligibility.subscriptionStatus, startsAt: new Date(now.getTime() - 86400000), expiresAt: value.eligibility.subscriptionExpiresAt, totalSessions: value.eligibility.remainingQuota, usedSessions: 0, amountPaid: "0", createdAt: now, updatedAt: now };
  }

  private async memberFor(user: AuthUser): Promise<MemberRecord> {
    const member = await this.dependencies.auth.findMemberByUserId(user.userId);
    if (!member) throw notFound("Member not found");
    return member;
  }

  private async ownSession(user: AuthUser, id: string): Promise<{ member: MemberRecord; session: ChatSessionRecord }> {
    const member = await this.memberFor(user);
    const session = await this.dependencies.chat.findSession(id);
    if (!session) throw notFound("Chat session not found");
    if (session.memberId !== member.id) throw forbidden("Chat session does not belong to the member");
    return { member, session };
  }

  async createSession(user: AuthUser, bookingId: string): Promise<SerializedChatSession> {
    const member = await this.memberFor(user);
    try {
      const session = await this.dependencies.coordinator.transaction(async (tx) => {
        const booking = await tx.booking.findBooking(bookingId, true);
        if (!booking) throw notFound("Booking not found");
        if (booking.memberId !== member.id) throw forbidden("Booking does not belong to the member");
        if (booking.status !== "booked") throw coded("BOOKING_STATE_CHANGED", "Only booked reservations can start a chat session");
        if (!await tx.booking.findSchedule(booking.scheduleId, true)) throw coded("BOOKING_STATE_CHANGED", "Booking source schedule no longer exists");
        const requests = await tx.reschedule.listRequests({ memberId: member.id });
        if (requests.some((item) => item.bookingId === booking.id && (item.status === "pending" || item.status === "held"))) throw conflict("An active reschedule request already exists");
        if (await tx.chat.findActiveSession(booking.id)) throw conflict("An active chat session already exists");
        return tx.chat.insertSession({ memberId: member.id, bookingId: booking.id, sourceScheduleId: booking.scheduleId, currentIntent: null, status: "active" });
      });
      return serializeSession(session);
    } catch (error) {
      throw mapPersistenceError(error) ?? error;
    }
  }

  private async eligibility(memberId: string, booking: BookingRecord): Promise<SubscriptionRecord | null> {
    const subscription = await this.dependencies.payment.findSubscription(booking.subscriptionId);
    return activeSubscription(subscription, memberId) ? subscription : subscription;
  }

  private async buildContext(member: MemberRecord, session: ChatSessionRecord, booking: BookingRecord): Promise<ChatContext> {
    const sourceSchedule = await this.dependencies.catalog.findSchedule(booking.scheduleId);
    if (!sourceSchedule) throw conflict("Booking source schedule no longer exists");
    const subscription = await this.eligibility(member.id, booking);
    const valid = activeSubscription(subscription, member.id);
    const schedules = valid ? await this.dependencies.catalog.listSchedules() : [];
    const candidateSchedules = [];
    for (const schedule of schedules) {
      if (schedule.id === sourceSchedule.id || schedule.status === "cancelled" || schedule.status === "full" || schedule.serviceId !== sourceSchedule.serviceId) continue;
      const booked = await this.dependencies.catalog.countBooked(schedule.id);
      if (booked >= schedule.capacity) continue;
      candidateSchedules.push({ schedule, remainingCapacity: Math.max(0, schedule.capacity - booked) });
    }
    return {
      session: { id: session.id, status: session.status, currentIntent: session.currentIntent, proposedScheduleId: session.proposedScheduleId },
      messages: (await this.dependencies.chat.listMessages(session.id)).map((message) => ({ role: message.role, content: message.content, sequence: message.sequence })),
      member: { id: member.id, status: member.status },
      eligibility: {
        subscriptionStatus: subscription?.status ?? "cancelled",
        subscriptionExpiresAt: subscription?.expiresAt ?? new Date(0),
        remainingQuota: subscription ? Math.max(0, subscription.totalSessions - subscription.usedSessions) : 0,
      },
      booking: { id: booking.id, scheduleId: booking.scheduleId, status: booking.status },
      sourceSchedule: scheduleView(sourceSchedule),
      candidateSchedules: candidateSchedules.map((candidate) => ({ schedule: scheduleView(candidate.schedule), remainingCapacity: candidate.remainingCapacity })),
      policy: { policyVersion: this.dependencies.policyVersion ?? POLICY_VERSION, requiresExplicitConfirmation: true },
    };
  }

  private async originalTurn(sessionId: string, userMessage: ChatMessageRecord): Promise<ChatTurn | null> {
    const analysis = await this.dependencies.chat.findAnalysisByMessageId(userMessage.id);
    if (!analysis) return null;
    const messages = await this.dependencies.chat.listMessages(sessionId);
    let assistant = messages.find((item) => item.role === "assistant" && item.sequence > userMessage.sequence);
    if (!assistant) {
      assistant = await this.dependencies.chat.transaction(async (tx) => tx.insertMessage({ sessionId, sequence: await tx.nextMessageSequence(sessionId), role: "assistant", content: analysis.reply }));
    }
    const session = await this.dependencies.chat.findSession(sessionId);
    if (!session) return null;
    const recommendedSchedules = await serializeRecommendedSchedules(analysis.recommendedScheduleIds, this.dependencies.catalog);
    return { session: serializeSession(session), userMessage: serializeMessage(userMessage), assistantMessage: serializeMessage(assistant), analysis: serializeAnalysis(analysis, recommendedSchedules) };
  }

  private async persistFailure(sessionId: string, messageId: string, errorCode: "AI_INVALID_RESPONSE" | "AI_SERVICE_UNAVAILABLE", origin: ChatSessionRecord): Promise<void> {
    try {
      await this.dependencies.coordinator.transaction(async (unit) => {
        const current = await unit.chat.findSession(sessionId, true);
        if (!current || isTerminal(current)) throw coded("CHAT_SESSION_CLOSED", "Chat session is no longer active");
        if (current.updatedAt.getTime() !== origin.updatedAt.getTime() || current.status !== origin.status || current.currentIntent !== origin.currentIntent || current.proposedScheduleId !== origin.proposedScheduleId) return;
        const latestMessages = await unit.chat.listMessages(sessionId);
        if (latestMessages.some((message) => message.sequence > 0 && message.role === "assistant" && message.sequence > (latestMessages.find((item) => item.id === messageId)?.sequence ?? 0))) return;
        if (await unit.chat.findAnalysisByMessageId(messageId)) return;
        const fallback = await unit.chat.insertAnalysis({ messageId, status: "failed", intent: "Other", confidence: 0, extractedData: {}, recommendedScheduleIds: [], reply: SAFE_FALLBACK_REPLY, nextState: "active", model: "unavailable", modelVersion: "unavailable", errorCode });
        void fallback;
        await unit.chat.insertMessage({ sessionId, sequence: await unit.chat.nextMessageSequence(sessionId), role: "assistant", content: SAFE_FALLBACK_REPLY });
        if (!await unit.chat.updateSession(sessionId, { status: "active", currentIntent: null, proposedScheduleId: null })) throw internal();
      });
    } catch (error) {
      throw mapPersistenceError(error) ?? (isAppError(error) ? error : internal());
    }
  }

  async sendMessage(user: AuthUser, sessionId: string, input: SendMessageInput): Promise<ChatTurn> {
    const { member, session: initialSession } = await this.ownSession(user, sessionId);
    const origin = structuredClone(initialSession);
    if (isTerminal(initialSession)) throw coded("CHAT_SESSION_CLOSED", "Chat session is no longer active");
    if (input.clientMessageId) {
      const existing = await this.dependencies.chat.findMessageByClientId(sessionId, input.clientMessageId);
      if (existing) {
        const turn = await this.originalTurn(sessionId, existing);
        if (turn) return turn;
      }
    }

    let message: ChatMessageRecord;
    if (input.clientMessageId) {
      const existing = await this.dependencies.chat.findMessageByClientId(sessionId, input.clientMessageId);
      if (existing) message = existing;
      else {
        try {
          message = await this.dependencies.chat.transaction(async (tx) => tx.insertMessage({ sessionId, sequence: await tx.nextMessageSequence(sessionId), role: "user", content: input.message, clientMessageId: input.clientMessageId }));
        } catch (error) {
          const raced = await this.dependencies.chat.findMessageByClientId(sessionId, input.clientMessageId);
          if (!raced) throw mapPersistenceError(error) ?? internal();
          message = raced;
        }
      }
    } else {
      message = await this.dependencies.chat.transaction(async (tx) => tx.insertMessage({ sessionId, sequence: await tx.nextMessageSequence(sessionId), role: "user", content: input.message, clientMessageId: null }));
    }
    const booking = await this.dependencies.booking.findBooking(initialSession.bookingId);
    if (!booking || booking.memberId !== member.id) throw booking ? forbidden("Booking does not belong to the member") : notFound("Booking not found");
    let analysis: GenAiAnalysis;
    try {
      const context = await this.buildContext(member, initialSession, booking);
      if (context.candidateSchedules.length === 0) throw coded("NO_AVAILABLE_SCHEDULE", "No available schedule matches the booking");
      analysis = validateAnalysis(await this.dependencies.ai.analyze(context), initialSession, new Set(context.candidateSchedules.map((candidate) => candidate.schedule.id)));
    } catch (error) {
      if (isAppError(error) && error.code === "NO_AVAILABLE_SCHEDULE") throw error;
      const mapped = isAppError(error) && (error.code === "AI_SERVICE_UNAVAILABLE" || error.code === "AI_INVALID_RESPONSE") ? error : unavailable();
      await this.persistFailure(sessionId, message.id, publicFailureCode(mapped), origin);
      throw mapped;
    }

    const firstRecommendation = analysis.recommendedScheduleIds[0] ?? null;
    const nextStatus = firstRecommendation && analysis.nextState === "awaiting_confirmation" ? "awaiting_confirmation" : "active";
    let persisted: { storedAnalysis: ChatMessageAnalysisRecord; assistant: ChatMessageRecord; updated: ChatSessionRecord };
    try {
      persisted = await this.dependencies.coordinator.transaction(async (unit) => {
      const current = await unit.chat.findSession(sessionId, true);
      if (!current || isTerminal(current)) throw coded("CHAT_SESSION_CLOSED", "Chat session is no longer active");
      const tx = unit.chat;
      const storedAnalysis = await tx.insertAnalysis({ messageId: message.id, status: "completed", intent: analysis.intent, confidence: analysis.confidence, extractedData: analysis.extracted, recommendedScheduleIds: analysis.recommendedScheduleIds, reply: analysis.reply, nextState: nextStatus, model: analysis.model, modelVersion: analysis.modelVersion });
      const assistant = await tx.insertMessage({ sessionId, sequence: await tx.nextMessageSequence(sessionId), role: "assistant", content: analysis.reply });
      const updated = await tx.updateSession(sessionId, { status: nextStatus, currentIntent: analysis.intent, proposedScheduleId: firstRecommendation });
      if (!updated) throw internal();
      return { storedAnalysis, assistant, updated };
      });
    } catch (error) {
      if (isAnalysisUniqueViolation(error)) {
        const stored = await this.originalTurn(sessionId, message);
        if (stored) return stored;
      }
      throw mapPersistenceError(error) ?? (isAppError(error) ? error : internal());
    }
    const recommendedSchedules = await serializeRecommendedSchedules(analysis.recommendedScheduleIds, this.dependencies.catalog);
    return { session: serializeSession(persisted.updated), userMessage: serializeMessage(message), assistantMessage: serializeMessage(persisted.assistant), analysis: serializeAnalysis(persisted.storedAnalysis, recommendedSchedules) };
  }

  async confirmSchedule(user: AuthUser, sessionId: string, scheduleId: string): Promise<ConfirmationResult> {
    try {
      return await this.dependencies.coordinator.transaction(async (tx: ChatRescheduleUnitOfWork) => {
        const member = await this.memberFor(user);
        const session = await tx.chat.findSession(sessionId, true);
        if (!session) throw notFound("Chat session not found");
        if (session.memberId !== member.id) throw forbidden("Chat session does not belong to the member");
        if (session.status !== "awaiting_confirmation") throw coded("CHAT_SESSION_CLOSED", "Chat session is not awaiting confirmation");
        if (session.proposedScheduleId !== scheduleId) throw new AppError("CONFIRMATION_MISMATCH", "Confirmation does not match the proposed schedule", 409);
        const booking = await tx.booking.findBooking(session.bookingId, true);
        if (!booking) throw notFound("Booking not found");
        if (booking.memberId !== member.id) throw forbidden("Booking does not belong to the member");
        if (booking.status !== "booked") throw coded("BOOKING_STATE_CHANGED", "Only booked reservations can be rescheduled");
        if (!session.sourceScheduleId || booking.scheduleId !== session.sourceScheduleId) throw coded("BOOKING_STATE_CHANGED", "Booking source schedule changed");
        const source = await tx.booking.findSchedule(booking.scheduleId, true);
        if (!source) throw conflict("Booking source schedule no longer exists");
        const target = await tx.booking.findSchedule(scheduleId, true);
        if (!target) throw notFound("Target schedule not found");
        if (target.id === booking.scheduleId || target.status === "cancelled" || target.status === "full" || target.serviceId !== source.serviceId) throw coded("SCHEDULE_UNAVAILABLE", "Target schedule is not available");
        if ((await tx.booking.countBooked(target.id)) >= target.capacity) throw coded("SCHEDULE_UNAVAILABLE", "Target schedule is full");
         const requests = await tx.reschedule.listRequests({ memberId: member.id });
        if (requests.some((item) => item.bookingId === booking.id && (item.status === "pending" || item.status === "held"))) throw conflict("An active reschedule request already exists");
        const subscription = await tx.payment.findSubscription(booking.subscriptionId, true);
        if (!activeSubscription(subscription, member.id)) throw conflict("Subscription is not eligible for rescheduling");
        const messages = await tx.chat.listMessages(session.id);
        const customerMessage = [...messages].reverse().find((item) => item.role === "user")?.content ?? "Please confirm this reschedule.";
        const request = await tx.reschedule.insertRequest({ bookingId: booking.id, memberId: member.id, chatSessionId: session.id, fromScheduleId: booking.scheduleId, toScheduleId: target.id, customerMessage });
        const updated = await tx.chat.updateSession(session.id, { status: "submitted", confirmedAt: new Date() });
        if (!updated) throw internal();
        return { request: serializeRequest(request), booking: serializeBooking(booking) };
      });
    } catch (error) {
      const mapped = mapPersistenceError(error);
      if (mapped) throw mapped;
      if (isAppError(error)) throw error;
      throw internal();
    }
  }

  async getSession(user: AuthUser, sessionId: string): Promise<SerializedChatSession> {
    const { session } = await this.ownSession(user, sessionId);
    return serializeSession(session);
  }

  async getMessages(user: AuthUser, sessionId: string): Promise<SerializedChatMessage[]> {
    await this.ownSession(user, sessionId);
    return (await this.dependencies.chat.listMessages(sessionId)).map(serializeMessage);
  }
}
