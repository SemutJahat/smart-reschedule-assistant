import { apiClient } from "./client";
import type { BookingDTO } from "@/features/bookings/schemas";

export async function getMyBookings(signal?: AbortSignal) {
  return apiClient<BookingDTO[]>("/bookings/me", { signal });
}

export async function createBooking(scheduleId: string, subscriptionId: string) {
  return apiClient<BookingDTO>("/bookings", {
    method: "POST",
    body: JSON.stringify({ scheduleId, subscriptionId }),
  });
}

export async function cancelBooking(id: string) {
  return apiClient<BookingDTO>(`/bookings/${id}/cancel`, { method: "PATCH" });
}

export async function getBookingsForMember(
  memberId: string,
  signal?: AbortSignal,
): Promise<BookingDTO[]> {
  return apiClient<BookingDTO[]>(
    `/bookings?memberId=${encodeURIComponent(memberId)}`,
    { signal },
  );
}
