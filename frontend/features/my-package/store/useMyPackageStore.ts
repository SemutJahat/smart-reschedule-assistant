import { create } from "zustand";
import {
  getAllPackages,
  getMyPayments,
  getMySubscriptions,
} from "@/lib/api/my-package";
import type { PaymentDTO, SubscriptionDTO } from "../schemas";

interface MyPackageState {
  subscriptions: SubscriptionDTO[];
  payments: PaymentDTO[];
  status: "idle" | "loading" | "success" | "error";
  error: string | null;

  fetchMyPackageData: (signal?: AbortSignal) => Promise<void>;
  reset: () => void;
}

const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export const useMyPackageStore = create<MyPackageState>((set) => ({
  subscriptions: [],
  payments: [],
  status: "idle",
  error: null,

  fetchMyPackageData: async (signal) => {
    set({ status: "loading", error: null });

    try {
      const [subs, payments, packages] = await Promise.all([
        getMySubscriptions(signal),
        getMyPayments(signal),
        getAllPackages(signal).catch(() => []),
      ]);

      if (signal?.aborted) return;

      const names = new Map(packages.map((p) => [p.id, p.name]));
      const nameOf = (id: string) => names.get(id) ?? "Paket";

      set({
        subscriptions: subs
          .map((s) => ({ ...s, packageName: nameOf(s.packageId) }))
          .sort(newestFirst),
        payments: payments
          .map((p) => ({ ...p, packageName: nameOf(p.packageId) }))
          .sort(newestFirst),
        status: "success",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      set({
        error:
          (error instanceof Error && error.message) ||
          "Gagal memuat data paket dan riwayat transaksi.",
        status: "error",
      });
    }
  },

  reset: () =>
    set({
      subscriptions: [],
      payments: [],
      status: "idle",
      error: null,
    }),
}));
