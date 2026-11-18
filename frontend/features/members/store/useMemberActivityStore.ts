import { create } from "zustand";
import { getBookingsForMember } from "@/lib/api/bookings";
import { getPayments } from "@/lib/api/payments";
import { getSchedules } from "@/lib/api/schedules";
import { getAllPackages } from "@/lib/api/my-package";
import type { BookingDTO } from "@/features/bookings/schemas";
import type { PaymentRecordDTO } from "@/features/my-package/schemas";

export interface MemberBookingRow extends BookingDTO {
  title: string;
  serviceName: string | null;
  coachName: string | null;
  startsAt: string | null;
  endsAt: string | null;
}

export interface MemberPaymentRow extends PaymentRecordDTO {
  packageName: string;
}

interface MemberActivityState {
  memberId: string | null;
  bookings: MemberBookingRow[];
  payments: MemberPaymentRow[];
  status: "idle" | "loading" | "success" | "error";
  error: string | null;

  fetchActivity: (memberId: string, signal?: AbortSignal) => Promise<void>;
}

const time = (value: string | null) =>
  value ? new Date(value).getTime() : Number.NEGATIVE_INFINITY;

export const useMemberActivityStore = create<MemberActivityState>((set, get) => ({
  memberId: null,
  bookings: [],
  payments: [],
  status: "idle",
  error: null,

  fetchActivity: async (memberId, signal) => {
    set({ memberId, bookings: [], payments: [], status: "loading", error: null });
    try {
      const [bookings, payments, schedules, packages] = await Promise.all([
        getBookingsForMember(memberId, signal),
        getPayments({ memberId }, signal),
        getSchedules(undefined, signal),
        getAllPackages(signal),
      ]);
      if (signal?.aborted || get().memberId !== memberId) return;

      const scheduleById = new Map(schedules.map((s) => [s.id, s]));
      const packageById = new Map(packages.map((p) => [p.id, p]));

      const bookingRows = bookings
        .map((booking): MemberBookingRow => {
          const schedule = scheduleById.get(booking.scheduleId);
          return {
            ...booking,
            title: schedule?.title ?? "Jadwal tidak ditemukan",
            serviceName: schedule?.serviceName ?? null,
            coachName: schedule?.coachName ?? null,
            startsAt: schedule?.startsAt ?? null,
            endsAt: schedule?.endsAt ?? null,
          };
        })
        .sort((a, b) => time(b.startsAt) - time(a.startsAt));

      const paymentRows = payments
        .map(
          (payment): MemberPaymentRow => ({
            ...payment,
            packageName: packageById.get(payment.packageId)?.name ?? "-",
          }),
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

      set({ bookings: bookingRows, payments: paymentRows, status: "success" });
    } catch (error) {
      if (signal?.aborted || get().memberId !== memberId) return;
      if (error instanceof Error && error.name === "AbortError") return;
      set({
        error:
          (error instanceof Error && error.message) ||
          "Gagal memuat riwayat member.",
        status: "error",
      });
    }
  },
}));
