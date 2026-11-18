import { create } from "zustand";
import { apiClient } from "@/lib/api/client";
import { getSchedules } from "@/lib/api/schedules";
import {
  getRescheduleRequests,
  reviewRescheduleRequest,
  type RescheduleDecision,
  type RescheduleRequestDTO,
} from "@/lib/api/reschedules";
import type { MemberDTO, UserDTO } from "@/features/members/schemas";
import type { ScheduleDTO } from "@/features/schedules/schemas";

export interface RescheduleRequestView extends RescheduleRequestDTO {
  memberName: string;
  memberNumber: string | null;
  memberEmail: string | null;
  fromSchedule: ScheduleDTO | null;
  toSchedule: ScheduleDTO | null;
}

interface RescheduleReviewState {
  requests: RescheduleRequestView[];
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
  reviewingId: string | null;

  fetchRequests: (signal?: AbortSignal) => Promise<void>;
  review: (
    id: string,
    decision: RescheduleDecision,
    adminNote?: string,
  ) => Promise<void>;
}

const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export const useRescheduleReviewStore = create<RescheduleReviewState>(
  (set, get) => ({
    requests: [],
    status: "idle",
    error: null,
    reviewingId: null,

    fetchRequests: async (signal) => {
      set({ status: "loading", error: null });
      try {
        const [requests, members, users, schedules] = await Promise.all([
          getRescheduleRequests(signal),
          apiClient<MemberDTO[]>("/members", { signal }).catch(() => []),
          apiClient<UserDTO[]>("/users", { signal }).catch(() => []),
          getSchedules(undefined, signal).catch(() => []),
        ]);
        if (signal?.aborted) return;

        const memberById = new Map(members.map((m) => [m.id, m]));
        const userById = new Map(users.map((u) => [u.id, u]));
        const scheduleById = new Map(schedules.map((s) => [s.id, s]));

        const views = requests
          .map((r) => {
            const member = memberById.get(r.memberId);
            const user = member ? userById.get(member.userId) : undefined;
            return {
              ...r,
              memberName: user?.name ?? "Member tidak dikenal",
              memberNumber: member?.memberNumber ?? null,
              memberEmail: user?.email ?? null,
              fromSchedule: scheduleById.get(r.fromScheduleId) ?? null,
              toSchedule: scheduleById.get(r.toScheduleId) ?? null,
            };
          })
          .sort(newestFirst);

        set({ requests: views, status: "success" });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        set({
          error:
            (error instanceof Error && error.message) ||
            "Gagal memuat pengajuan reschedule.",
          status: "error",
        });
      }
    },

    review: async (id, decision, adminNote) => {
      set({ reviewingId: id });
      try {
        await reviewRescheduleRequest(id, decision, adminNote?.trim());
        await get().fetchRequests();
      } finally {
        set({ reviewingId: null });
      }
    },
  }),
);
