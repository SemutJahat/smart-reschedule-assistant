import { create } from "zustand";
import { cancelBooking as cancelBookingRequest, getMyBookings } from "@/lib/api/bookings";
import { getSchedules } from "@/lib/api/schedules";
import { getMyRescheduleRequests } from "@/lib/api/reschedules";
import { useMyPackageStore } from "@/features/my-package/store/useMyPackageStore";
import type { ScheduleDTO } from "@/features/schedules/schemas";
import type { BookingDTO, BookingWithScheduleDTO } from "../schemas";

interface BookingState {
  upcomingBookings: BookingWithScheduleDTO[];
  historyBookings: BookingWithScheduleDTO[];
  pendingRescheduleBookingIds: string[];
  status: "idle" | "loading" | "success" | "error";
  error: string | null;

  fetchBookings: (signal?: AbortSignal) => Promise<void>;
  cancelBooking: (id: string) => Promise<void>;
  reset: () => void;
}

function withSchedule(
  booking: BookingDTO,
  schedules: Map<string, ScheduleDTO>,
): BookingWithScheduleDTO {
  const schedule = schedules.get(booking.scheduleId);
  return {
    ...booking,
    schedule: {
      title: schedule?.title ?? "Jadwal tidak ditemukan",
      coachName: schedule?.coachName ?? "-",
      serviceName: schedule?.serviceName ?? "-",
      startsAt: schedule?.startsAt ?? booking.bookedAt,
      endsAt: schedule?.endsAt ?? booking.bookedAt,
      capacity: schedule?.capacity ?? 0,
      bookedCount: schedule?.bookedCount ?? 0,
      status: schedule?.status ?? "cancelled",
    },
  };
}

const byStartAsc = (a: BookingWithScheduleDTO, b: BookingWithScheduleDTO) =>
  new Date(a.schedule.startsAt).getTime() -
  new Date(b.schedule.startsAt).getTime();

export const useBookingStore = create<BookingState>((set, get) => ({
  upcomingBookings: [],
  historyBookings: [],
  pendingRescheduleBookingIds: [],
  status: "idle",
  error: null,

  fetchBookings: async (signal) => {
    if (get().status !== "success") set({ status: "loading", error: null });

    try {
      const [bookings, schedules, requests] = await Promise.all([
        getMyBookings(signal),
        getSchedules(undefined, signal),
        getMyRescheduleRequests(signal).catch(() => []),
      ]);

      if (signal?.aborted) return;

      const scheduleMap = new Map(schedules.map((s) => [s.id, s]));
      const joined = bookings.map((b) => withSchedule(b, scheduleMap));
      const now = Date.now();
      const isUpcoming = (b: BookingWithScheduleDTO) =>
        b.status === "booked" &&
        scheduleMap.has(b.scheduleId) &&
        new Date(b.schedule.startsAt).getTime() > now;

      set({
        upcomingBookings: joined
          .filter(isUpcoming)
          .sort(byStartAsc),
        historyBookings: joined
          .filter((b) => !isUpcoming(b))
          .sort((a, b) => byStartAsc(b, a)),
        pendingRescheduleBookingIds: requests
          .filter((r) => r.status === "pending" || r.status === "held")
          .map((r) => r.bookingId),
        status: "success",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      set({
        error:
          (error instanceof Error && error.message) ||
          "Gagal memuat daftar jadwal.",
        status: "error",
      });
    }
  },

  cancelBooking: async (id) => {
    await cancelBookingRequest(id);
    await get().fetchBookings();
    void useMyPackageStore.getState().fetchMyPackageData();
  },

  reset: () =>
    set({
      upcomingBookings: [],
      historyBookings: [],
      pendingRescheduleBookingIds: [],
      status: "idle",
      error: null,
    }),
}));
