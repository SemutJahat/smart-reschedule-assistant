import { apiClient } from "./client";

export type RescheduleRequestStatus =
  | "pending"
  | "held"
  | "approved"
  | "rejected"
  | "cancelled";

export interface RescheduleRequestDTO {
  id: string;
  bookingId: string;
  memberId: string;
  chatSessionId: string | null;
  fromScheduleId: string;
  toScheduleId: string;
  customerMessage: string | null;
  adminNote: string | null;
  status: RescheduleRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getMyRescheduleRequests(signal?: AbortSignal) {
  return apiClient<RescheduleRequestDTO[]>("/reschedule-requests/me", {
    signal,
  });
}

export type RescheduleDecision = "approved" | "rejected" | "held";

export async function getRescheduleRequests(signal?: AbortSignal) {
  return apiClient<RescheduleRequestDTO[]>("/reschedule-requests", { signal });
}

export async function reviewRescheduleRequest(
  id: string,
  decision: RescheduleDecision,
  adminNote?: string,
) {
  return apiClient<RescheduleRequestDTO>(`/reschedule-requests/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify({ decision, ...(adminNote ? { adminNote } : {}) }),
  });
}
