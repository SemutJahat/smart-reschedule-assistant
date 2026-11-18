"use client";

import { useRequireRole } from "@/features/auth/hooks/useRequireRole";
import { PageHeader } from "@/components/shared/PageHeader";
import { PaymentTable } from "@/features/payments/components/PaymentTable";

export default function PembayaranPage() {
  const { isAuthorized } = useRequireRole("admin");

  if (!isAuthorized) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pembayaran"
        description="Pantau transaksi pembelian paket dan perbarui statusnya bila notifikasi pembayaran tidak masuk otomatis."
      />
      <PaymentTable />
    </div>
  );
}
