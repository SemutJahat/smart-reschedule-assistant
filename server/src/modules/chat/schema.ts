import type { BookingRecord } from "../bookings/schema";
import type { MemberRecord } from "../auth/schema";
import type { ScheduleRecord } from "../coaches/schema";
import type { SubscriptionStatus } from "../payments/schema";

export const CHAT_INTENTS = [
  "Reschedule",
  "Cancel",
  "Schedule inquiry",
  "Confirmation",
  "Other",
] as const;

export type ChatIntent = (typeof CHAT_INTENTS)[number];

export const CHAT_SESSION_STATUSES = [
  "active",
  "awaiting_confirmation",
  "submitted",
  "closed",
] as const;

export type ChatSessionStatus = (typeof CHAT_SESSION_STATUSES)[number];

export const CHAT_MESSAGE_ROLES = ["user", "assistant", "system"] as const;
export type ChatMessageRole = (typeof CHAT_MESSAGE_ROLES)[number];

export const CHAT_ANALYSIS_STATUSES = ["pending", "completed", "failed"] as const;
export type ChatAnalysisStatus = (typeof CHAT_ANALYSIS_STATUSES)[number];

/** The AI may suggest submission, but it can never close a session. */
export type ChatAnalysisNextState = "active" | "awaiting_confirmation" | "submitted";

export interface ChatSessionRecord {
  id: string;
  memberId: string;
  bookingId: string;
  sourceScheduleId?: string | null;
  status: ChatSessionStatus;
  currentIntent: ChatIntent | null;
  proposedScheduleId: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatSessionPatch {
  status?: ChatSessionStatus;
  currentIntent?: ChatIntent | null;
  proposedScheduleId?: string | null;
  confirmedAt?: Date | null;
}

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  sequence: number;
  role: ChatMessageRole;
  content: string;
  clientMessageId: string | null;
  createdAt: Date;
}

export interface ChatMessageAnalysisRecord {
  id: string;
  messageId: string;
  status: ChatAnalysisStatus;
  intent: ChatIntent;
  confidence: number;
  extractedData: Record<string, unknown>;
  recommendedScheduleIds: string[];
  reply: string;
  nextState: ChatAnalysisNextState;
  model: string;
  modelVersion: string;
  errorCode: string | null;
  createdAt: Date;
}

export interface ChatScheduleCandidate {
  schedule: ScheduleRecord;
  remainingCapacity: number;
}

/** The deliberately narrow, backend-curated context sent to the AI client. */
export interface ChatContext {
  session: ChatSessionRecord;
  messages: ChatMessageRecord[];
  member: Pick<MemberRecord, "id" | "status">;
  eligibility: {
    subscriptionStatus: SubscriptionStatus;
    subscriptionExpiresAt: Date;
    remainingQuota: number;
  };
  booking: Pick<BookingRecord, "id" | "memberId" | "scheduleId" | "status">;
  sourceSchedule: ScheduleRecord;
  candidateSchedules: ChatScheduleCandidate[];
  policy: {
    policyVersion: string;
    requiresExplicitConfirmation: true;
  };
}

export interface GenAiAnalysis {
  intent: ChatIntent;
  confidence: number;
  extracted: Record<string, unknown>;
  recommendedScheduleIds: string[];
  reply: string;
  nextState: ChatAnalysisNextState;
  model: string;
  modelVersion: string;
}

export interface NewChatSession {
  memberId: string;
  bookingId: string;
  sourceScheduleId?: string | null;
  status?: ChatSessionStatus;
  currentIntent: ChatIntent | null;
  proposedScheduleId?: string | null;
  confirmedAt?: Date | null;
}

export interface NewChatMessage {
  sessionId: string;
  sequence: number;
  role: ChatMessageRole;
  content: string;
  clientMessageId?: string | null;
}

export interface NewChatAnalysis {
  messageId: string;
  status: ChatAnalysisStatus;
  intent: ChatIntent;
  confidence: number;
  extractedData: Record<string, unknown>;
  recommendedScheduleIds: string[];
  reply: string;
  nextState: ChatAnalysisNextState;
  model: string;
  modelVersion: string;
  errorCode?: string | null;
}

export interface ChatRepository {
  transaction<T>(fn: (tx: ChatRepository) => Promise<T>): Promise<T>;
  findSession(id: string, lock?: boolean): Promise<ChatSessionRecord | null>;
  findActiveSession(bookingId: string): Promise<ChatSessionRecord | null>;
  insertSession(input: NewChatSession): Promise<ChatSessionRecord>;
  updateSession(id: string, patch: ChatSessionPatch): Promise<ChatSessionRecord | null>;
  listMessages(sessionId: string): Promise<ChatMessageRecord[]>;
  findMessageByClientId(sessionId: string, clientMessageId: string): Promise<ChatMessageRecord | null>;
  nextMessageSequence(sessionId: string): Promise<number>;
  insertMessage(input: NewChatMessage): Promise<ChatMessageRecord>;
  insertAnalysis(input: NewChatAnalysis): Promise<ChatMessageAnalysisRecord>;
  findAnalysisByMessageId(messageId: string): Promise<ChatMessageAnalysisRecord | null>;
}
