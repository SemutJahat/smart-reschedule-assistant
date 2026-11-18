import { apiClient } from "./client";
import type {
  ChatConfirmationDTO,
  ChatMessageDTO,
  ChatSessionDTO,
  ChatTurnDTO,
} from "@/features/reschedule-chat/schemas";

export async function createChatSession(bookingId: string) {
  return apiClient<ChatSessionDTO>("/chat/sessions", {
    method: "POST",
    body: JSON.stringify({ bookingId }),
  });
}

export async function getChatSession(sessionId: string) {
  return apiClient<ChatSessionDTO>(`/chat/sessions/${sessionId}`);
}

export async function getChatMessages(sessionId: string) {
  return apiClient<ChatMessageDTO[]>(`/chat/sessions/${sessionId}/messages`);
}

export async function sendChatMessage(
  sessionId: string,
  message: string,
  clientMessageId: string,
) {
  return apiClient<ChatTurnDTO>(`/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify({ message, clientMessageId }),
  });
}

export async function confirmChatSchedule(
  sessionId: string,
  scheduleId: string,
) {
  return apiClient<ChatConfirmationDTO>(`/chat/sessions/${sessionId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ scheduleId }),
  });
}
