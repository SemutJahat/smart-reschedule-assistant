export type ChatRole = "user" | "assistant" | "system";
export type ChatIntent =
  | "Reschedule"
  | "Cancel"
  | "Schedule inquiry"
  | "Confirmation"
  | "Other";
export type ChatSessionStatus =
  | "active"
  | "awaiting_confirmation"
  | "submitted"
  | "closed";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
}

export interface RecommendedSchedule {
  id: string;
  title: string;
  serviceName: string;
  coachName: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
}

export interface ChatAnalysis {
  intent: ChatIntent;
  confidence: number;
  recommendedSchedules: RecommendedSchedule[];
}

export interface ChatSessionDTO {
  id: string;
  bookingId: string;
  status: ChatSessionStatus;
  currentIntent: ChatIntent | null;
  proposedScheduleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageDTO {
  id: string;
  role: ChatRole;
  content: string;
}

export interface ChatTurnDTO {
  session: Pick<
    ChatSessionDTO,
    "id" | "status" | "currentIntent" | "proposedScheduleId"
  >;
  userMessage: ChatMessageDTO;
  assistantMessage: ChatMessageDTO;
  analysis: {
    intent: ChatIntent;
    confidence: number;
    recommendedSchedules: { id: string; startsAt: string; endsAt: string }[];
  };
}

export interface ChatConfirmationDTO {
  sessionId: string;
  status: "submitted";
  rescheduleRequest: {
    id: string;
    bookingId: string;
    chatSessionId: string | null;
    fromScheduleId: string;
    toScheduleId: string;
    status: "pending" | "held" | "approved" | "rejected" | "cancelled";
  };
  message: string;
}

export const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Halo! Ceritakan kapan Anda ingin pindah jadwal, nanti saya carikan slot pengganti yang tersedia.",
};
