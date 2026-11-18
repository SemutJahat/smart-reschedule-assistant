"use client";

import { useRequireRole } from "@/features/auth/hooks/useRequireRole";
import { PageHeader } from "@/components/shared/PageHeader";
import { RescheduleQueue } from "@/features/reschedule-review/components/RescheduleQueue";

export default function AdminDashboardPage() {
  const { isAuthorized } = useRequireRole("admin");

  if (!isAuthorized) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Validasi Reschedule"
        description="Tinjau pengajuan pindah jadwal dari member yang dikirim lewat asisten chat."
      />
      <RescheduleQueue />
    </div>
  );
}
