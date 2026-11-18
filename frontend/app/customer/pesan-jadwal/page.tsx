"use client";

import { useRequireRole } from "@/features/auth/hooks/useRequireRole";
import { PageHeader } from "@/components/shared/PageHeader";
import { AvailableScheduleList } from "@/features/bookings/components/AvailableScheduleList";

export default function PesanJadwalPage() {
  const { isAuthorized, isHydrated } = useRequireRole("customer");

  if (!isHydrated || !isAuthorized) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pesan Jadwal"
        description="Pilih sesi latihan yang tersedia. Setiap pemesanan memakai satu sesi dari paket aktif Anda."
      />
      <AvailableScheduleList />
    </div>
  );
}
