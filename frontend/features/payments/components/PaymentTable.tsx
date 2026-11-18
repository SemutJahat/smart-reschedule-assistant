"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ApiError } from "@/lib/api/errors";
import type { PaymentStatusUpdate } from "@/lib/api/payments";
import { formatDateWIB, formatRupiah, formatTimeWIB } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { useModalStore } from "@/stores/useModalStore";
import {
  usePaymentAdminStore,
  type PaymentAdminRow,
  type PaymentFilter,
} from "../store/usePaymentAdminStore";

const FILTERS: { value: PaymentFilter; label: string }[] = [
  { value: "pending", label: "Menunggu" },
  { value: "paid", label: "Lunas" },
  { value: "failed", label: "Gagal" },
  { value: "refunded", label: "Refund" },
  { value: "all", label: "Semua" },
];

interface ActionCopy {
  title: string;
  description: string;
  message: (amount: string, row: PaymentAdminRow) => string;
  success: string;
}

const ACTIONS: Record<PaymentStatusUpdate, ActionCopy> = {
  paid: {
    title: "Tandai Lunas",
    description: "Status pembayaran akan diubah menjadi lunas.",
    message: (amount, row) =>
      `Tandai pembayaran ${amount} dari ${row.memberName} sebagai lunas? Paket ${row.packageName} akan langsung aktif untuk member ini.`,
    success: "Pembayaran ditandai lunas. Paket member sudah aktif.",
  },
  failed: {
    title: "Gagalkan Pembayaran",
    description: "Status pembayaran akan diubah menjadi gagal.",
    message: (amount, row) =>
      `Tandai pembayaran ${amount} dari ${row.memberName} sebagai gagal? Member perlu membuat pembayaran baru untuk membeli paket ini.`,
    success: "Pembayaran ditandai gagal.",
  },
  refunded: {
    title: "Refund Pembayaran",
    description: "Status pembayaran akan diubah menjadi refund.",
    message: (amount, row) =>
      `Tandai pembayaran ${amount} dari ${row.memberName} sebagai refund? Ini hanya mengubah status pembayaran; pengembalian dana dilakukan di luar sistem.`,
    success: "Pembayaran ditandai refund.",
  },
};

export function PaymentTable() {
  const {
    payments,
    status,
    error,
    filter,
    updatingId,
    fetchPayments,
    setFilter,
    updateStatus,
  } = usePaymentAdminStore();
  const { openModal, closeModal } = useModalStore();
  const { _hasHydrated, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated) return;
    const controller = new AbortController();
    fetchPayments(controller.signal);
    return () => controller.abort();
  }, [fetchPayments, _hasHydrated, isAuthenticated]);

  const handleAction = (row: PaymentAdminRow, next: PaymentStatusUpdate) => {
    const copy = ACTIONS[next];
    openModal("confirm", {
      title: copy.title,
      description: copy.description,
      message: copy.message(formatRupiah(Number(row.amount)), row),
      isSubmitting: false,
      onConfirm: async () => {
        useModalStore.setState((state) => ({
          props: { ...state.props, isSubmitting: true },
        }));
        try {
          await updateStatus(row.id, next);
          closeModal();
          setTimeout(() => {
            toast.success(copy.success);
          }, 300);
        } catch (err: unknown) {
          if (err instanceof ApiError && err.status === 409) {
            closeModal();
            await fetchPayments();
            const stillPending = usePaymentAdminStore
              .getState()
              .payments.some((p) => p.id === row.id && p.status === "pending");
            if (next === "paid" && stillPending) {
              toast.error(
                "Pembayaran tidak bisa ditandai lunas. Jumlah pembayaran tidak sesuai dengan harga paket saat ini.",
              );
            } else {
              toast.error("Status pembayaran sudah berubah. Data dimuat ulang.");
            }
            return;
          }
          useModalStore.setState((state) => ({
            props: { ...state.props, isSubmitting: false },
          }));
          toast.error("Gagal memperbarui status pembayaran.");
        }
      },
    });
  };

  const columns = [
    {
      key: "createdAt",
      header: "Tanggal",
      render: (row: PaymentAdminRow) => (
        <div>
          <p className="text-sm font-medium text-[#1E293B]">
            {formatDateWIB(row.createdAt)}
          </p>
          <p className="text-xs text-[#64748B]">
            {formatTimeWIB(row.createdAt)}
          </p>
        </div>
      ),
    },
    {
      key: "member",
      header: "Member",
      render: (row: PaymentAdminRow) => (
        <div>
          <p className="font-semibold text-[#1E293B]">{row.memberName}</p>
          <p className="text-xs text-[#64748B]">
            {row.memberNumber} - {row.memberEmail}
          </p>
        </div>
      ),
    },
    {
      key: "package",
      header: "Paket",
      render: (row: PaymentAdminRow) => (
        <span className="text-sm text-[#1E293B]">{row.packageName}</span>
      ),
    },
    {
      key: "amount",
      header: "Jumlah",
      render: (row: PaymentAdminRow) => (
        <span className="font-medium text-[#1E293B]">
          {formatRupiah(Number(row.amount))}
        </span>
      ),
    },
    {
      key: "method",
      header: "Metode",
      render: (row: PaymentAdminRow) => (
        <span className="text-sm text-[#64748B]">{row.method ?? "-"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: PaymentAdminRow) => (
        <StatusBadge type="payment" status={row.status} />
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      render: (row: PaymentAdminRow) => {
        const busy = updatingId === row.id;
        if (row.status === "pending") {
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-[#65C466] hover:bg-[#52A353] text-white"
                disabled={busy}
                onClick={() => handleAction(row, "paid")}>
                Tandai Lunas
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={busy}
                onClick={() => handleAction(row, "failed")}>
                Gagalkan
              </Button>
            </div>
          );
        }
        if (row.status === "paid") {
          return (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => handleAction(row, "refunded")}>
              Refund
            </Button>
          );
        }
        return <span className="text-sm text-[#64748B]">-</span>;
      },
    },
  ];

  const renderBody = () => {
    if (!_hasHydrated || status === "idle" || status === "loading") {
      return <LoadingSkeleton variant="table" count={5} />;
    }
    if (status === "error") {
      return (
        <ErrorState message={error ?? undefined} onRetry={() => fetchPayments()} />
      );
    }
    if (payments.length === 0) {
      return (
        <EmptyState
          icon={<Wallet size={48} />}
          title="Belum Ada Pembayaran"
          description="Tidak ada pembayaran dengan status ini."
        />
      );
    }
    return <DataTable columns={columns} data={payments} status={status} />;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            onClick={() => setFilter(item.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer",
              filter === item.value
                ? "bg-[#65C466] text-white border-[#65C466]"
                : "bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]",
            )}>
            {item.label}
          </button>
        ))}
      </div>
      {renderBody()}
    </div>
  );
}
