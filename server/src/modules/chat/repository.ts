import { and, asc, eq, max, sql } from "drizzle-orm";
import type { Database } from "../../db/client";
import { chatMessageAnalyses, chatMessages, chatSessions } from "../../db/schema";
import { createId } from "../../shared/ids";
import type { ChatMessageAnalysisRecord, ChatMessageRecord, ChatRepository, ChatSessionPatch, ChatSessionRecord, NewChatAnalysis, NewChatMessage, NewChatSession } from "./schema";

type DbExecutor = any;
type ConstraintError = Error & { code: string; constraint_name: string };
const violation = (constraint_name: string): ConstraintError => Object.assign(new Error(`unique constraint violated: ${constraint_name}`), { code: "23505", constraint_name });
const jsonClone = <T>(value: T): T => structuredClone(value);
const sessionClone = (v: ChatSessionRecord): ChatSessionRecord => ({ ...v, confirmedAt: v.confirmedAt ? new Date(v.confirmedAt) : null, createdAt: new Date(v.createdAt), updatedAt: new Date(v.updatedAt) });
const messageClone = (v: ChatMessageRecord): ChatMessageRecord => ({ ...v, createdAt: new Date(v.createdAt) });
const analysisClone = (v: ChatMessageAnalysisRecord): ChatMessageAnalysisRecord => ({ ...v, extractedData: jsonClone(v.extractedData), recommendedScheduleIds: [...v.recommendedScheduleIds], createdAt: new Date(v.createdAt) });
const mapSession = (v: typeof chatSessions.$inferSelect) => sessionClone(v as ChatSessionRecord);
const mapMessage = (v: typeof chatMessages.$inferSelect) => messageClone(v as ChatMessageRecord);
const mapAnalysis = (v: typeof chatMessageAnalyses.$inferSelect) => analysisClone({ ...(v as unknown as ChatMessageAnalysisRecord), confidence: Number(v.confidence) });

export class DrizzleChatRepository implements ChatRepository {
  constructor(private readonly db: DbExecutor, private readonly inTransaction = false) {}
  async transaction<T>(fn: (tx: ChatRepository) => Promise<T>): Promise<T> {
    if (this.inTransaction) return fn(this);
    return this.db.transaction(async (tx: DbExecutor) => { await tx.execute(sql`select pg_advisory_xact_lock(731005)`); return fn(new DrizzleChatRepository(tx, true)); });
  }
  async findSession(id: string, lock = false) { const q = this.db.select().from(chatSessions).where(eq(chatSessions.id, id)).limit(1); const rows = lock && this.inTransaction ? await q.for("update") : await q; return rows[0] ? mapSession(rows[0]) : null; }
  async findActiveSession(bookingId: string) { const rows = await this.db.select().from(chatSessions).where(and(eq(chatSessions.bookingId, bookingId), sql`${chatSessions.status} in ('active', 'awaiting_confirmation')`)).limit(1); return rows[0] ? mapSession(rows[0]) : null; }
  async insertSession(input: NewChatSession) { const rows = await this.db.insert(chatSessions).values({ id: createId(), memberId: input.memberId, bookingId: input.bookingId, sourceScheduleId: input.sourceScheduleId ?? null, status: input.status ?? "active", currentIntent: input.currentIntent, proposedScheduleId: input.proposedScheduleId ?? null, confirmedAt: input.confirmedAt ?? null }).returning(); return mapSession(rows[0]); }
  async updateSession(id: string, patch: ChatSessionPatch) { const rows = await this.db.update(chatSessions).set({ ...patch, updatedAt: new Date() }).where(eq(chatSessions.id, id)).returning(); return rows[0] ? mapSession(rows[0]) : null; }
  async listMessages(sessionId: string) { return (await this.db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId)).orderBy(asc(chatMessages.sequence))).map(mapMessage); }
  async findMessageByClientId(sessionId: string, clientMessageId: string) { const rows = await this.db.select().from(chatMessages).where(and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.clientMessageId, clientMessageId))).limit(1); return rows[0] ? mapMessage(rows[0]) : null; }
  async nextMessageSequence(sessionId: string) { const rows = await this.db.select({ sequence: max(chatMessages.sequence) }).from(chatMessages).where(eq(chatMessages.sessionId, sessionId)); return Number(rows[0]?.sequence ?? 0) + 1; }
  async insertMessage(input: NewChatMessage) { if (input.sequence !== await this.nextMessageSequence(input.sessionId)) throw violation("chat_messages_session_sequence_uidx"); const rows = await this.db.insert(chatMessages).values({ id: createId(), sessionId: input.sessionId, sequence: input.sequence, role: input.role, content: input.content, clientMessageId: input.clientMessageId ?? null }).returning(); return mapMessage(rows[0]); }
  async insertAnalysis(input: NewChatAnalysis) { const rows = await this.db.insert(chatMessageAnalyses).values({ id: createId(), messageId: input.messageId, status: input.status, intent: input.intent, confidence: input.confidence.toString(), extractedData: jsonClone(input.extractedData), recommendedScheduleIds: [...input.recommendedScheduleIds], nextState: input.nextState, reply: input.reply, model: input.model, modelVersion: input.modelVersion, errorCode: input.errorCode ?? null }).returning(); return mapAnalysis(rows[0]); }
  async findAnalysisByMessageId(messageId: string) { const rows = await this.db.select().from(chatMessageAnalyses).where(eq(chatMessageAnalyses.messageId, messageId)).limit(1); return rows[0] ? mapAnalysis(rows[0]) : null; }
}
export const createChatRepository = (db: Database): ChatRepository => new DrizzleChatRepository(db);

type Arrays = { sessions: ChatSessionRecord[]; messages: ChatMessageRecord[]; analyses: ChatMessageAnalysisRecord[] };
const snapshot = (v: Arrays): Arrays => ({ sessions: v.sessions.map(sessionClone), messages: v.messages.map(messageClone), analyses: v.analyses.map(analysisClone) });
export class InMemoryChatRepository implements ChatRepository {
  readonly sessions: ChatSessionRecord[]; readonly messages: ChatMessageRecord[]; readonly analyses: ChatMessageAnalysisRecord[]; private tail: Promise<void> = Promise.resolve();
  constructor(arrays?: Partial<Arrays>) { this.sessions = arrays?.sessions ?? []; this.messages = arrays?.messages ?? []; this.analyses = arrays?.analyses ?? []; }
  async transaction<T>(fn: (tx: ChatRepository) => Promise<T>): Promise<T> { let release!: () => void; const previous = this.tail; this.tail = new Promise((resolve) => { release = resolve; }); await previous; const old = snapshot(this); try { return await fn(this); } catch (error) { this.sessions.splice(0, this.sessions.length, ...old.sessions); this.messages.splice(0, this.messages.length, ...old.messages); this.analyses.splice(0, this.analyses.length, ...old.analyses); throw error; } finally { release(); } }
  async findSession(id: string) { const v = this.sessions.find((x) => x.id === id); return v ? sessionClone(v) : null; }
  async findActiveSession(bookingId: string) { const v = this.sessions.find((x) => x.bookingId === bookingId && (x.status === "active" || x.status === "awaiting_confirmation")); return v ? sessionClone(v) : null; }
  async insertSession(input: NewChatSession) { const active = input.status === undefined || input.status === "active" || input.status === "awaiting_confirmation"; if (active && this.sessions.some((x) => x.memberId === input.memberId && x.bookingId === input.bookingId && (x.status === "active" || x.status === "awaiting_confirmation"))) throw violation("chat_sessions_active_member_booking_uidx"); const now = new Date(); const v: ChatSessionRecord = { id: createId(), memberId: input.memberId, bookingId: input.bookingId, sourceScheduleId: input.sourceScheduleId ?? null, status: input.status ?? "active", currentIntent: input.currentIntent, proposedScheduleId: input.proposedScheduleId ?? null, confirmedAt: input.confirmedAt ?? null, createdAt: now, updatedAt: now }; this.sessions.push(v); return sessionClone(v); }
  async updateSession(id: string, patch: ChatSessionPatch) { const v = this.sessions.find((x) => x.id === id); if (!v) return null; const next = { ...v, ...patch }; if ((next.status === "active" || next.status === "awaiting_confirmation") && this.sessions.some((x) => x.id !== id && x.memberId === next.memberId && x.bookingId === next.bookingId && (x.status === "active" || x.status === "awaiting_confirmation"))) throw violation("chat_sessions_active_member_booking_uidx"); Object.assign(v, patch, { updatedAt: new Date() }); return sessionClone(v); }
  async listMessages(sessionId: string) { return this.messages.filter((x) => x.sessionId === sessionId).sort((a, b) => a.sequence - b.sequence).map(messageClone); }
  async findMessageByClientId(sessionId: string, clientMessageId: string) { const v = this.messages.find((x) => x.sessionId === sessionId && x.clientMessageId === clientMessageId); return v ? messageClone(v) : null; }
  async nextMessageSequence(sessionId: string) { return Math.max(0, ...this.messages.filter((x) => x.sessionId === sessionId).map((x) => x.sequence)) + 1; }
  async insertMessage(input: NewChatMessage) { if (input.sequence !== await this.nextMessageSequence(input.sessionId)) throw violation("chat_messages_session_sequence_uidx"); if (input.clientMessageId != null && this.messages.some((x) => x.sessionId === input.sessionId && x.clientMessageId === input.clientMessageId)) throw violation("chat_messages_session_client_message_uidx"); const v: ChatMessageRecord = { ...input, id: createId(), clientMessageId: input.clientMessageId ?? null, createdAt: new Date() }; this.messages.push(v); return messageClone(v); }
  async insertAnalysis(input: NewChatAnalysis) { if (this.analyses.some((x) => x.messageId === input.messageId)) throw violation("chat_message_analyses_message_uidx"); const v: ChatMessageAnalysisRecord = { ...input, id: createId(), errorCode: input.errorCode ?? null, extractedData: jsonClone(input.extractedData), recommendedScheduleIds: [...input.recommendedScheduleIds], createdAt: new Date() }; this.analyses.push(v); return analysisClone(v); }
  async findAnalysisByMessageId(messageId: string) { const v = this.analyses.find((x) => x.messageId === messageId); return v ? analysisClone(v) : null; }
}
