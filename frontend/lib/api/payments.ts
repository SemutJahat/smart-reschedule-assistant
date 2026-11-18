import { apiClient } from "./client";
import type {
  PaymentRecordDTO,
  PaymentStatus,
} from "@/features/my-package/schemas";

export interface PaymentFilters {
  status?: PaymentStatus;
  memberId?: string;
}

export type PaymentStatusUpdate = "paid" | "failed" | "refunded";

export async function getPayments(
  filters: PaymentFilters,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.memberId) params.set("memberId", filters.memberId);
  const query = params.toString();
  return apiClient<PaymentRecordDTO[]>(`/payments${query ? `?${query}` : ""}`, {
    signal,
  });
}

export async function updatePaymentStatus(
  id: string,
  status: PaymentStatusUpdate,
) {
  return apiClient<PaymentRecordDTO>(`/payments/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
