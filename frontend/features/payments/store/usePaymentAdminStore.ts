import { create } from "zustand";
import { apiClient } from "@/lib/api/client";
import { getAllPackages } from "@/lib/api/my-package";
import {
  getPayments,
  updatePaymentStatus,
  type PaymentStatusUpdate,
} from "@/lib/api/payments";
import type {
  PaymentRecordDTO,
  PaymentStatus,
} from "@/features/my-package/schemas";
import type { MemberDTO, UserDTO } from "@/features/members/schemas";

export type PaymentFilter = PaymentStatus | "all";

export interface PaymentAdminRow extends PaymentRecordDTO {
  memberName: string;
  memberNumber: string;
  memberEmail: string;
  packageName: string;
}

interface PaymentAdminState {
  payments: PaymentAdminRow[];
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
  filter: PaymentFilter;
  updatingId: string | null;

  fetchPayments: (signal?: AbortSignal) => Promise<void>;
  setFilter: (filter: PaymentFilter) => Promise<void>;
  updateStatus: (id: string, status: PaymentStatusUpdate) => Promise<void>;
}

const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export const usePaymentAdminStore = create<PaymentAdminState>((set, get) => ({
  payments: [],
  status: "idle",
  error: null,
  filter: "pending",
  updatingId: null,

  fetchPayments: async (signal) => {
    const filter = get().filter;
    if (get().status !== "success") set({ status: "loading", error: null });
    try {
      const [payments, members, users, packages] = await Promise.all([
        getPayments(filter === "all" ? {} : { status: filter }, signal),
        apiClient<MemberDTO[]>("/members", { signal }).catch(() => []),
        apiClient<UserDTO[]>("/users", { signal }).catch(() => []),
        getAllPackages(signal).catch(() => []),
      ]);
      if (signal?.aborted || get().filter !== filter) return;

      const memberById = new Map(members.map((m) => [m.id, m]));
      const userById = new Map(users.map((u) => [u.id, u]));
      const packageById = new Map(packages.map((p) => [p.id, p]));

      const rows = payments
        .map((payment) => {
          const member = memberById.get(payment.memberId);
          const user = member ? userById.get(member.userId) : undefined;
          return {
            ...payment,
            memberName: user?.name ?? "-",
            memberNumber: member?.memberNumber ?? "-",
            memberEmail: user?.email ?? "-",
            packageName: packageById.get(payment.packageId)?.name ?? "-",
          };
        })
        .sort(newestFirst);

      set({ payments: rows, status: "success" });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      if (get().filter !== filter) return;
      set({
        error:
          (error instanceof Error && error.message) ||
          "Gagal memuat data pembayaran.",
        status: "error",
      });
    }
  },

  setFilter: async (filter) => {
    set({ filter });
    await get().fetchPayments();
  },

  updateStatus: async (id, status) => {
    set({ updatingId: id });
    try {
      await updatePaymentStatus(id, status);
      await get().fetchPayments();
    } finally {
      set({ updatingId: null });
    }
  },
}));
