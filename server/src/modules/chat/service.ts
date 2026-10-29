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
import { CHAT_INTENTS } from "./schema";
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
  coordinator: { transaction<T>(fn: (tx: { chat: ChatRepository; reschedule: { insertRequest(input: { bookingId: string; memberId: string; chatSessionId: string | null; fromScheduleId: string; toScheduleId: string; customerMessage: string }): Promise<RescheduleRequestRecord> } }) => Promise<T>): Promise<T> };
  reschedule: { insertRequest(input: { bookingId: string; memberId: string; chatSessionId: string | null; fromScheduleId: string; toScheduleId: string; customerMessage: string }): Promise<RescheduleRequestRecord> };
  member: Pick<MemberRecord, "id" | "userId" | "status">;
  eligibility: { subscriptionStatus: SubscriptionRecord["status"]; subscriptionExpiresAt: Date; remainingQuota: number };
  booking: Pick<BookingRecord, "id" | "memberId" | "scheduleId" | "status">;
  sourceSchedule: Pick<ScheduleRecord, "id" | "serviceId">;
  candidates: Array<Pick<ScheduleRecord, "id" | "serviceId" | "capacity"> & { booked: number; status?: ScheduleRecord["status"] }>;
}

export interface SendMessageInput {
  message: string;
  clientMessageId?: string;
}

export interface SerializedChatSession extends Omit<ChatSessionRecord, "confirmedAt" | "createdAt" | "updatedAt"> {
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedChatMessage extends Omit<ChatMessageRecord, "createdAt"> {
  createdAt: string;
}

export interface SerializedChatAnalysis {
  intent: ChatIntent;
  confidence: number;
  extractedData: Record<string, unknown>;
  recommendedScheduleIds: string[];
  reply: string;
  nextState: ChatAnalysisNextState;
  model: string;
  modelVersion: string;
  createdAt: string;
}

export interface ChatTurn {
  session: SerializedChatSession;
  message: SerializedChatMessage;
  assistantMessage: SerializedChatMessage;
  analysis: SerializedChatAnalysis;
}

export interface ConfirmationResult {
  request: SerializedRescheduleRequest;
  booking: SerializedBooking;
}

export interface SerializedBooking extends Omit<BookingRecord, "bookedAt" | "cancelledAt" | "createdAt" | "updatedAt"> {
  bookedAt: string;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedRescheduleRequest extends Omit<RescheduleRequestRecord, "reviewedAt" | "createdAt" | "updatedAt"> {
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const SAFE_FALLBACK_REPLY = "I couldn't process that request right now. Please try again.";
const POLICY_VERSION = "chat-reschedule-v1";

function isAppError(error: unknown): error is AppError {
  return error instanceof AppError || (typeof error === "object" && error !== null && "code" in error);
}

function serializeSession(item: ChatSessionRecord): SerializedChatSession {
  return {
    ...item,
    confirmedAt: item.confirmedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function serializeMessage(item: ChatMessageRecord): SerializedChatMessage {
  return { ...item, createdAt: item.createdAt.toISOString() };
}

function serializeAnalysis(item: ChatMessageAnalysisRecord): SerializedChatAnalysis {
  return { intent: item.intent, confidence: item.confidence, extractedData: structuredClone(item.extractedData), recommendedScheduleIds: [...item.recommendedScheduleIds], reply: item.reply, nextState: item.nextState, model: item.model, modelVersion: item.modelVersion, createdAt: item.createdAt.toISOString() };
}

function serializeBooking(item: BookingRecord): SerializedBooking {
  return {
    ...item,
    bookedAt: item.bookedAt.toISOString(),
    cancelledAt: item.cancelledAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function serializeRequest(item: RescheduleRequestRecord): SerializedRescheduleRequest {
  return {
    ...item,
    reviewedAt: item.reviewedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
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
function validateAnalysis(value: unknown, session: ChatSessionRecord, candidateIds: Set<string>): GenAiAnalysis {
  if (!isRecord(value)) throw invalidResponse();
  const keys = ["intent", "confidence", "extracted", "recommendedScheduleIds", "reply", "nextState", "model", "modelVersion"];
  if (Object.keys(value).some((key) => !keys.includes(key))) throw invalidResponse();
  if (!isIntent(value.intent) || typeof value.confidence !== "number" || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1 || !isRecord(value.extracted) || !Array.isArray(value.recommendedScheduleIds) || value.recommendedScheduleIds.some((id) => typeof id !== "string") || typeof value.reply !== "string" || value.reply.trim() === "" || value.reply.length > MAX_GEN_AI_REPLY_LENGTH || typeof value.model !== "string" || value.model.trim() === "" || typeof value.modelVersion !== "string" || value.modelVersion.trim() === "" || !isNextState(value.nextState)) throw invalidResponse();
  const recommendations = value.recommendedScheduleIds as string[];
  if (value.nextState === "submitted" || (value.nextState === "awaiting_confirmation" && recommendations.length === 0) || (value.nextState === "active" && recommendations.length > 0) || recommendations.some((id) => !candidateIds.has(id))) throw invalidResponse();
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

function activeSubscription(subscription: SubscriptionRecord | null, memberId: string, now = new Date()): subscription is SubscriptionRecord {
  return !!subscription && subscription.memberId === memberId && subscription.status === "active" && subscription.expiresAt > now && subscription.usedSessions < subscription.totalSessions;
}

function cloneAnalysisForTurn(analysis: ChatMessageAnalysisRecord | null): ChatMessageAnalysisRecord | null {
  return analysis ? { ...analysis, extractedData: structuredClone(analysis.extractedData), recommendedScheduleIds: [...analysis.recommendedScheduleIds] } : null;
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
        findSchedule: async (id: string) => id === dependencies.sourceSchedule.id ? this.scheduleFromPartial(dependencies.sourceSchedule) : this.scheduleFromPartial(dependencies.candidates.find((item) => item.id === id) ?? { id, serviceId: dependencies.sourceSchedule.serviceId }),
        countBooked: async (id: string) => dependencies.candidates.find((item) => item.id === id)?.booked ?? 0,
      } as unknown as BookingRepository;
      const contractPayment = { findSubscription: async () => this.subscriptionFromContract(dependencies) } as unknown as PaymentRepository;
      this.dependencies = {
        auth: { findMemberByUserId: async (userId: string) => userId === dependencies.member.userId ? dependencies.member : null } as unknown as AuthRepository,
        catalog: { findSchedule: async (id: string) => id === dependencies.sourceSchedule.id ? this.scheduleFromPartial(dependencies.sourceSchedule) : null, listSchedules: async () => dependencies.candidates.map((item) => this.scheduleFromPartial(item)), countBooked: async (id: string) => dependencies.candidates.find((item) => item.id === id)?.booked ?? 0 } as unknown as CatalogRepository,
        booking: contractBooking,
        payment: contractPayment,
        reschedule: { listRequests: async () => [] } as unknown as RescheduleRepository,
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
    const booking = await this.dependencies.booking.findBooking(bookingId);
    if (!booking) throw notFound("Booking not found");
    if (booking.memberId !== member.id) throw forbidden("Booking does not belong to the member");
    if (booking.status !== "booked") throw coded("BOOKING_STATE_CHANGED", "Only booked reservations can start a chat session");
    const requests = await this.dependencies.reschedule.listRequests({ memberId: member.id });
    if (requests.some((item) => item.bookingId === booking.id && (item.status === "pending" || item.status === "held"))) throw conflict("An active reschedule request already exists");
    if (await this.dependencies.chat.findActiveSession(booking.id)) throw conflict("An active chat session already exists");
    const session = await this.dependencies.chat.insertSession({ memberId: member.id, bookingId: booking.id, sourceScheduleId: booking.scheduleId, currentIntent: null, status: "active" });
    return serializeSession(session);
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
      session,
      messages: await this.dependencies.chat.listMessages(session.id),
      member: { id: member.id, status: member.status },
      eligibility: {
        subscriptionStatus: subscription?.status ?? "cancelled",
        subscriptionExpiresAt: subscription?.expiresAt ?? new Date(0),
        remainingQuota: subscription ? Math.max(0, subscription.totalSessions - subscription.usedSessions) : 0,
      },
      booking: { id: booking.id, memberId: booking.memberId, scheduleId: booking.scheduleId, status: booking.status },
      sourceSchedule,
      candidateSchedules,
      policy: { policyVersion: this.dependencies.policyVersion ?? POLICY_VERSION, requiresExplicitConfirmation: true },
    };
  }

  private async originalTurn(sessionId: string, userMessage: ChatMessageRecord): Promise<ChatTurn | null> {
    const analysis = await this.dependencies.chat.findAnalysisByMessageId(userMessage.id);
    if (!analysis) return null;
    const messages = await this.dependencies.chat.listMessages(sessionId);
    const assistant = messages.find((item) => item.role === "assistant" && item.sequence > userMessage.sequence);
    const session = await this.dependencies.chat.findSession(sessionId);
    if (!assistant || !session) return null;
    return { session: serializeSession(session), message: serializeMessage(userMessage), assistantMessage: serializeMessage(assistant), analysis: serializeAnalysis(analysis) };
  }

  async sendMessage(user: AuthUser, sessionId: string, input: SendMessageInput): Promise<ChatTurn> {
    const { member, session: initialSession } = await this.ownSession(user, sessionId);
    if (initialSession.status === "submitted" || initialSession.status === "closed") throw coded("CHAT_SESSION_CLOSED", "Chat session is no longer active");
    if (input.clientMessageId) {
      const existing = await this.dependencies.chat.findMessageByClientId(sessionId, input.clientMessageId);
      if (existing) {
        const turn = await this.originalTurn(sessionId, existing);
        if (turn) return turn;
      }
    }

    const message = await this.dependencies.chat.transaction(async (tx) => tx.insertMessage({ sessionId, sequence: await tx.nextMessageSequence(sessionId), role: "user", content: input.message, clientMessageId: input.clientMessageId ?? null }));
    const booking = await this.dependencies.booking.findBooking(initialSession.bookingId);
    if (!booking || booking.memberId !== member.id) throw booking ? forbidden("Booking does not belong to the member") : notFound("Booking not found");
    let context: ChatContext;
    try {
      context = await this.buildContext(member, initialSession, booking);
    } catch (error) {
      throw error;
    }

    let analysis: GenAiAnalysis;
    try {
      analysis = validateAnalysis(await this.dependencies.ai.analyze(context), initialSession, new Set(context.candidateSchedules.map((candidate) => candidate.schedule.id)));
    } catch (error) {
      const mapped = isAppError(error) && (error.code === "AI_SERVICE_UNAVAILABLE" || error.code === "AI_INVALID_RESPONSE") ? error : unavailable();
      const fallbackAnalysis = await this.dependencies.chat.transaction(async (tx) => {
        const fallback = await tx.insertAnalysis({ messageId: message.id, status: "failed", intent: "Other", confidence: 0, extractedData: {}, recommendedScheduleIds: [], reply: SAFE_FALLBACK_REPLY, nextState: "active", model: "unavailable", modelVersion: "unavailable", errorCode: mapped.code });
        const assistant = await tx.insertMessage({ sessionId, sequence: await tx.nextMessageSequence(sessionId), role: "assistant", content: SAFE_FALLBACK_REPLY });
        const updated = await tx.updateSession(sessionId, { status: "active", currentIntent: null, proposedScheduleId: null });
        if (!updated) throw internal();
        return { fallback, assistant };
      });
      void fallbackAnalysis;
      throw mapped;
    }

    const firstRecommendation = analysis.recommendedScheduleIds[0] ?? null;
    const nextStatus = firstRecommendation && analysis.nextState === "awaiting_confirmation" ? "awaiting_confirmation" : "active";
    const persisted = await this.dependencies.chat.transaction(async (tx) => {
      const storedAnalysis = await tx.insertAnalysis({ messageId: message.id, status: "completed", intent: analysis.intent, confidence: analysis.confidence, extractedData: analysis.extracted, recommendedScheduleIds: analysis.recommendedScheduleIds, reply: analysis.reply, nextState: nextStatus, model: analysis.model, modelVersion: analysis.modelVersion });
      const assistant = await tx.insertMessage({ sessionId, sequence: await tx.nextMessageSequence(sessionId), role: "assistant", content: analysis.reply });
      const updated = await tx.updateSession(sessionId, { status: nextStatus, currentIntent: analysis.intent, proposedScheduleId: firstRecommendation });
      if (!updated) throw internal();
      return { storedAnalysis, assistant, updated };
    }).catch((error: unknown) => { throw mapPersistenceError(error) ?? internal(); });
    return { session: serializeSession(persisted.updated), message: serializeMessage(message), assistantMessage: serializeMessage(persisted.assistant), analysis: serializeAnalysis(persisted.storedAnalysis) };
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
        if (session.sourceScheduleId && booking.scheduleId !== session.sourceScheduleId) throw coded("BOOKING_STATE_CHANGED", "Booking source schedule changed");
        const source = await tx.booking.findSchedule(booking.scheduleId, true);
        if (!source) throw conflict("Booking source schedule no longer exists");
        const target = await tx.booking.findSchedule(scheduleId, true);
        if (!target) throw notFound("Target schedule not found");
        if (target.id === booking.scheduleId || target.status === "cancelled" || target.status === "full" || target.serviceId !== source.serviceId) throw coded("SCHEDULE_UNAVAILABLE", "Target schedule is not available");
        if ((await tx.booking.countBooked(target.id)) >= target.capacity) throw coded("SCHEDULE_UNAVAILABLE", "Target schedule is full");
        const requests = "listRequests" in tx.reschedule ? await tx.reschedule.listRequests({ memberId: member.id }) : [];
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
