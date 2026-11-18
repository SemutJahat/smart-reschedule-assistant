import { create } from "zustand";
import { createBooking, getMyBookings } from "@/lib/api/bookings";
import { getSchedules } from "@/lib/api/schedules";
import { getAllPackages, getMySubscriptions } from "@/lib/api/my-package";
import type { ScheduleDTO } from "@/features/schedules/schemas";
import type { SubscriptionDTO } from "@/features/my-package/schemas";

interface BookScheduleState {
  schedules: ScheduleDTO[];
  bookedScheduleIds: string[];
  subscriptions: SubscriptionDTO[];
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
  bookingScheduleId: string | null;

  fetchData: (signal?: AbortSignal) => Promise<void>;
  bookSchedule: (scheduleId: string) => Promise<void>;
}

const remaining = (s: SubscriptionDTO) =>
  Math.max(0, s.totalSessions - s.usedSessions);

export function usableSubscriptions(subscriptions: SubscriptionDTO[]) {
  return subscriptions
    .filter((s) => s.status === "active" && remaining(s) > 0)
    .sort(
      (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
    );
}

export const useBookScheduleStore = create<BookScheduleState>((set, get) => ({
  schedules: [],
  bookedScheduleIds: [],
  subscriptions: [],
  status: "idle",
  error: null,
  bookingScheduleId: null,

  fetchData: async (signal) => {
    if (get().status !== "success") set({ status: "loading", error: null });
    try {
      const [schedules, bookings, subscriptions, packages] = await Promise.all([
        getSchedules(undefined, signal),
        getMyBookings(signal),
        getMySubscriptions(signal),
        getAllPackages(signal).catch(() => []),
      ]);
      if (signal?.aborted) return;

      const now = Date.now();
      const names = new Map(packages.map((p) => [p.id, p.name]));

      set({
        schedules: schedules
          .filter(
            (s) =>
              s.status !== "cancelled" && new Date(s.startsAt).getTime() > now,
          )
          .sort(
            (a, b) =>
              new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
          ),
        bookedScheduleIds: bookings
          .filter((b) => b.status === "booked")
          .map((b) => b.scheduleId),
        subscriptions: subscriptions.map((s) => ({
          ...s,
          packageName: names.get(s.packageId) ?? "Paket",
        })),
        status: "success",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      set({
        error:
          (error instanceof Error && error.message) ||
          "Gagal memuat jadwal yang tersedia.",
        status: "error",
      });
    }
  },

  bookSchedule: async (scheduleId) => {
    const subscription = usableSubscriptions(get().subscriptions)[0];
    if (!subscription) {
      throw new Error("Anda belum punya paket aktif dengan sisa kuota.");
    }
    set({ bookingScheduleId: scheduleId });
    try {
      await createBooking(scheduleId, subscription.id);
      await get().fetchData();
    } finally {
      set({ bookingScheduleId: null });
    }
  },
}));
