"use client";

import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatDateWIB, formatRupiah, formatTimeRangeWIB } from "@/lib/format";
import {
  useMemberActivityStore,
  type MemberBookingRow,
  type MemberPaymentRow,
} from "../store/useMemberActivityStore";

const bookingColumns = [
  {
    key: "date",
    header: "Tanggal",
    render: (row: MemberBookingRow) => (
      <span className="text-sm font-medium text-[#1E293B]">
        {row.startsAt ? formatDateWIB(row.startsAt) : "-"}
      </span>
    ),
  },
  {
    key: "time",
    header: "Jam",
    render: (row: MemberBookingRow) => (
      <span className="text-sm text-[#1E293B]">
        {row.startsAt && row.endsAt
          ? formatTimeRangeWIB(row.startsAt, row.endsAt)
          : "-"}
      </span>
    ),
  },
  {
    key: "class",
    header: "Kelas",
    render: (row: MemberBookingRow) => (
      <div>
        <p className="font-semibold text-[#1E293B]">{row.title}</p>
        {row.serviceName && (
          <p className="text-xs text-[#64748B]">{row.serviceName}</p>
        )}
      </div>
    ),
  },
  {
    key: "coach",
    header: "Coach",
    render: (row: MemberBookingRow) => (
      <span className="text-sm text-[#64748B]">{row.coachName ?? "-"}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row: MemberBookingRow) => (
      <StatusBadge type="booking" status={row.status} />
    ),
  },
];

const paymentColumns = [
  {
    key: "createdAt",
    header: "Tanggal",
    render: (row: MemberPaymentRow) => (
      <span className="text-sm font-medium text-[#1E293B]">
        {formatDateWIB(row.createdAt)}
      </span>
    ),
  },
  {
    key: "package",
    header: "Paket",
    render: (row: MemberPaymentRow) => (
      <span className="text-sm text-[#1E293B]">{row.packageName}</span>
    ),
  },
  {
    key: "amount",
    header: "Jumlah",
    render: (row: MemberPaymentRow) => (
      <span className="font-medium text-[#1E293B]">
        {formatRupiah(Number(row.amount))}
      </span>
    ),
  },
  {
    key: "method",
    header: "Metode",
    render: (row: MemberPaymentRow) => (
      <span className="text-sm text-[#64748B]">{row.method ?? "-"}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row: MemberPaymentRow) => (
      <StatusBadge type="payment" status={row.status} />
    ),
  },
  {
    key: "paidAt",
    header: "Dibayar",
    render: (row: MemberPaymentRow) => (
      <span className="text-sm text-[#64748B]">
        {row.paidAt ? formatDateWIB(row.paidAt) : "-"}
      </span>
    ),
  },
];

export function MemberActivity({ memberId }: { memberId: string }) {
  const { bookings, payments, status, error, fetchActivity } =
    useMemberActivityStore();

  useEffect(() => {
    const controller = new AbortController();
    fetchActivity(memberId, controller.signal);
    return () => controller.abort();
  }, [memberId, fetchActivity]);

  const renderBody = () => {
    if (status === "idle" || status === "loading") {
      return <LoadingSkeleton variant="table" count={5} />;
    }
    if (status === "error") {
      return (
        <ErrorState
          message={error ?? undefined}
          onRetry={() => fetchActivity(memberId)}
        />
      );
    }
    return (
      <Tabs defaultValue="classes">
        <TabsList>
          <TabsTrigger value="classes">Riwayat Kelas</TabsTrigger>
          <TabsTrigger value="payments">Pembayaran</TabsTrigger>
        </TabsList>
        <TabsContent value="classes">
          <DataTable
            columns={bookingColumns}
            data={bookings}
            status={status}
            emptyMessage="Member ini belum pernah memesan kelas."
          />
        </TabsContent>
        <TabsContent value="payments">
          <DataTable
            columns={paymentColumns}
            data={payments}
            status={status}
            emptyMessage="Member ini belum memiliki riwayat pembayaran."
          />
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div className="bg-white p-6 mt-6 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
      <h3 className="text-lg font-medium text-[#1E293B]">
        Riwayat Kelas & Paket
      </h3>
      {renderBody()}
    </div>
  );
}
