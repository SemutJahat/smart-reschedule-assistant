import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ApiError } from "@/lib/api/errors";
import * as chatApi from "@/lib/api/chat";
import { getSchedules } from "@/lib/api/schedules";
import { getMyRescheduleRequests } from "@/lib/api/reschedules";
import { useBookingStore } from "@/features/bookings/store/useBookingStore";
import type { ScheduleDTO } from "@/features/schedules/schemas";
import {
  WELCOME_MESSAGE,
  type ChatAnalysis,
  type ChatMessage,
  type ChatSessionStatus,
  type RecommendedSchedule,
} from "../schemas";

interface ChatState {
  bookingId: string | null;
  sessionId: string | null;
  sessionStatus: ChatSessionStatus | null;
  proposedScheduleId: string | null;
  messages: ChatMessage[];
  isInitializing: boolean;
  initError: string | null;
  isTyping: boolean;
  isConfirming: boolean;
  currentAnalysis: ChatAnalysis | null;
  sessionsByBooking: Record<string, string>;
  scheduleCache: Record<string, ScheduleDTO>;

  initializeSession: (bookingId: string) => Promise<void>;
  sendMessage: (content: string, clientMessageId: string) => Promise<void>;
  confirmSchedule: (scheduleId: string) => Promise<void>;
  reset: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  NO_AVAILABLE_SCHEDULE:
    "Belum ada jadwal pengganti yang tersedia untuk layanan ini.",
  CHAT_SESSION_CLOSED: "Sesi chat ini sudah tidak aktif.",
  SCHEDULE_UNAVAILABLE:
    "Jadwal tersebut sudah tidak tersedia. Silakan minta slot lain.",
  BOOKING_STATE_CHANGED:
    "Status booking sudah berubah, sehingga tidak bisa di-reschedule.",
  CONFIRMATION_MISMATCH:
    "Slot yang dipilih tidak sesuai dengan usulan asisten. Silakan coba lagi.",
  AI_SERVICE_UNAVAILABLE:
    "Asisten sedang tidak tersedia. Silakan coba beberapa saat lagi.",
  AI_INVALID_RESPONSE:
    "Asisten gagal memproses permintaan. Silakan coba lagi.",
};

function errorCode(error: unknown): string | undefined {
  return error instanceof ApiError ? error.data?.error?.code : undefined;
}

function describeError(error: unknown): string {
  const code = errorCode(error);
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  const message = error instanceof Error ? error.message : "";
  if (/active reschedule request/i.test(message))
    return "Booking ini sudah punya pengajuan reschedule yang menunggu persetujuan admin.";
  if (/active chat session/i.test(message))
    return "Sesi chat untuk booking ini masih aktif di perangkat lain.";
  if (/subscription/i.test(message))
    return "Paket Anda tidak memenuhi syarat untuk reschedule.";
  return message || "Terjadi kesalahan. Silakan coba lagi.";
}

function systemMessage(content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "system",
    content,
    createdAt: new Date().toISOString(),
  };
}

function toRecommended(
  ref: { id: string; startsAt: string; endsAt: string },
  cache: Record<string, ScheduleDTO>,
): RecommendedSchedule {
  const s = cache[ref.id];
  return {
    id: ref.id,
    title: s?.title ?? "Jadwal pengganti",
    serviceName: s?.serviceName ?? "-",
    coachName: s?.coachName ?? "-",
    startsAt: s?.startsAt ?? ref.startsAt,
    endsAt: s?.endsAt ?? ref.endsAt,
    capacity: s?.capacity ?? 0,
    bookedCount: s?.bookedCount ?? 0,
  };
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => {
      const ensureSchedules = async (ids: string[]) => {
        const cache = get().scheduleCache;
        if (ids.every((id) => cache[id])) return cache;
        try {
          const schedules = await getSchedules();
          const next = { ...cache };
          for (const s of schedules) next[s.id] = s;
          set({ scheduleCache: next });
          return next;
        } catch {
          return cache;
        }
      };

      const isCurrent = (bookingId: string) => get().bookingId === bookingId;

      const forgetSession = (bookingId: string) => {
        const rest = { ...get().sessionsByBooking };
        delete rest[bookingId];
        set({ sessionsByBooking: rest });
      };

      const loadExisting = async (bookingId: string, sessionId: string) => {
        const [session, messages] = await Promise.all([
          chatApi.getChatSession(sessionId),
          chatApi.getChatMessages(sessionId),
        ]);
        if (session.status === "closed") return false;

        if (session.status === "submitted") {
          const requests = await getMyRescheduleRequests();
          const request = requests.find((r) => r.chatSessionId === session.id);
          if (!request || (request.status !== "pending" && request.status !== "held"))
            return false;
        }

        let currentAnalysis: ChatAnalysis | null = null;
        if (
          session.status === "awaiting_confirmation" &&
          session.proposedScheduleId
        ) {
          const cache = await ensureSchedules([session.proposedScheduleId]);
          const s = cache[session.proposedScheduleId];
          if (s) {
            currentAnalysis = {
              intent: "Reschedule",
              confidence: 1,
              recommendedSchedules: [toRecommended(s, cache)],
            };
          }
        }

        if (!isCurrent(bookingId)) return true;
        set({
          sessionId: session.id,
          sessionStatus: session.status,
          proposedScheduleId: session.proposedScheduleId,
          messages: [
            WELCOME_MESSAGE,
            ...messages,
            ...(session.status === "submitted"
              ? [
                  systemMessage(
                    "Permintaan reschedule sudah dikirim dan menunggu persetujuan admin.",
                  ),
                ]
              : []),
          ],
          currentAnalysis,
        });
        return true;
      };

      return {
        bookingId: null,
        sessionId: null,
        sessionStatus: null,
        proposedScheduleId: null,
        messages: [WELCOME_MESSAGE],
        isInitializing: false,
        initError: null,
        isTyping: false,
        isConfirming: false,
        currentAnalysis: null,
        sessionsByBooking: {},
        scheduleCache: {},

        initializeSession: async (bookingId) => {
          set({
            bookingId,
            sessionId: null,
            sessionStatus: null,
            proposedScheduleId: null,
            messages: [WELCOME_MESSAGE],
            isInitializing: true,
            initError: null,
            isTyping: false,
            isConfirming: false,
            currentAnalysis: null,
          });

          try {
            const storedId = get().sessionsByBooking[bookingId];
            if (storedId) {
              try {
                if (await loadExisting(bookingId, storedId)) return;
              } catch (error) {
                if (
                  !(error instanceof ApiError) ||
                  (error.status !== 404 && error.status !== 403)
                )
                  throw error;
              }
              forgetSession(bookingId);
            }

            const session = await chatApi.createChatSession(bookingId);
            set({
              sessionsByBooking: {
                ...get().sessionsByBooking,
                [bookingId]: session.id,
              },
            });
            if (!isCurrent(bookingId)) return;
            set({
              sessionId: session.id,
              sessionStatus: session.status,
              proposedScheduleId: session.proposedScheduleId,
            });
          } catch (error) {
            if (isCurrent(bookingId)) set({ initError: describeError(error) });
          } finally {
            if (isCurrent(bookingId)) set({ isInitializing: false });
          }
        },

        sendMessage: async (content, clientMessageId) => {
          const { sessionId, bookingId } = get();
          if (!sessionId || !bookingId) return;
          const text = content.trim();
          if (!text) return;

          set((state) => ({
            messages: [
              ...state.messages,
              {
                id: clientMessageId,
                role: "user",
                content: text,
                createdAt: new Date().toISOString(),
              },
            ],
            isTyping: true,
            currentAnalysis: null,
          }));

          try {
            const turn = await chatApi.sendChatMessage(
              sessionId,
              text,
              clientMessageId,
            );
            const ids = turn.analysis.recommendedSchedules.map((r) => r.id);
            const cache = ids.length ? await ensureSchedules(ids) : get().scheduleCache;
            if (!isCurrent(bookingId)) return;

            const now = new Date().toISOString();
            set((state) => ({
              messages: [
                ...state.messages.map((m) =>
                  m.id === clientMessageId
                    ? { ...m, id: turn.userMessage.id }
                    : m,
                ),
                { ...turn.assistantMessage, createdAt: now },
              ],
              sessionStatus: turn.session.status,
              proposedScheduleId: turn.session.proposedScheduleId,
              currentAnalysis: {
                intent: turn.analysis.intent,
                confidence: turn.analysis.confidence,
                recommendedSchedules: turn.analysis.recommendedSchedules.map(
                  (r) => toRecommended(r, cache),
                ),
              },
            }));
          } catch (error) {
            if (!isCurrent(bookingId)) return;
            const code = errorCode(error);

            if (code === "AI_SERVICE_UNAVAILABLE" || code === "AI_INVALID_RESPONSE") {
              try {
                const messages = await chatApi.getChatMessages(sessionId);
                if (isCurrent(bookingId))
                  set({ messages: [WELCOME_MESSAGE, ...messages] });
              } catch {}
            }

            set((state) => ({
              messages: [...state.messages, systemMessage(describeError(error))],
              ...(code === "CHAT_SESSION_CLOSED"
                ? { sessionStatus: "closed" as const }
                : {}),
            }));
          } finally {
            if (isCurrent(bookingId)) set({ isTyping: false });
          }
        },

        confirmSchedule: async (scheduleId) => {
          const { sessionId, bookingId } = get();
          if (!sessionId || !bookingId) return;
          set({ isConfirming: true });

          try {
            const result = await chatApi.confirmChatSchedule(
              sessionId,
              scheduleId,
            );
            void useBookingStore.getState().fetchBookings();
            if (!isCurrent(bookingId)) return;
            set((state) => ({
              messages: [...state.messages, systemMessage(result.message)],
              sessionStatus: "submitted",
              currentAnalysis: null,
            }));
          } catch (error) {
            if (!isCurrent(bookingId)) return;
            set((state) => ({
              messages: [...state.messages, systemMessage(describeError(error))],
            }));
          } finally {
            if (isCurrent(bookingId)) set({ isConfirming: false });
          }
        },

        reset: () =>
          set({
            bookingId: null,
            sessionId: null,
            sessionStatus: null,
            proposedScheduleId: null,
            messages: [WELCOME_MESSAGE],
            isInitializing: false,
            initError: null,
            isTyping: false,
            isConfirming: false,
            currentAnalysis: null,
          }),
      };
    },
    {
      name: "gymnasyum-chat-sessions",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ sessionsByBooking: state.sessionsByBooking }),
    },
  ),
);
