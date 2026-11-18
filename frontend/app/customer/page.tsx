"use client";

import { useEffect } from "react";
import { useRequireRole } from "@/features/auth/hooks/useRequireRole";
import { useBookingStore } from "@/features/bookings/store/useBookingStore";
import { useMyPackageStore } from "@/features/my-package/store/useMyPackageStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { BookingList } from "@/features/bookings/components/BookingList";
import { CalendarDays, Dumbbell, RefreshCw } from "lucide-react";

export default function CustomerDashboardPage() {
  // 1. Perlindungan Halaman (Hanya untuk Customer)
  const { isAuthorized, isHydrated } = useRequireRole("customer");

  // 2. Akses Store
  const { upcomingBookings, pendingRescheduleBookingIds, fetchBookings } =
    useBookingStore();
  const { subscriptions, fetchMyPackageData } = useMyPackageStore();

  // 3. Fetching Data Paralel
  useEffect(() => {
    if (!isHydrated || !isAuthorized) return;

    const controller = new AbortController();

    // Tarik data jadwal dan data kuota paket sekaligus
    fetchBookings(controller.signal);
    fetchMyPackageData(controller.signal);

    return () => controller.abort();
  }, [isHydrated, isAuthorized, fetchBookings, fetchMyPackageData]);

  // Tahan render jika sesi belum selesai dimuat atau pengguna tidak berhak
  if (!isHydrated || !isAuthorized) return null;

  // 4. Kalkulasi Angka Statistik
  const activePackages = subscriptions.filter((sub) => sub.status === "active");
  const remainingQuota = activePackages.reduce(
    (total, sub) => total + Math.max(0, sub.totalSessions - sub.usedSessions),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <PageHeader
        title="Jadwal Saya"
        description="Kelola sesi latihan Anda, pantau sisa kuota, dan ajukan perubahan jadwal dengan bantuan asisten pintar kami."
      />

      {/* Ringkasan Statistik (3 StatCard) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Sesi Mendatang"
          value={upcomingBookings.length}
          icon={<CalendarDays size={20} />}
          description="Total sesi yang belum dilaksanakan"
        />
        <StatCard
          title="Sisa Kuota"
          value={`${remainingQuota} Sesi`}
          icon={<Dumbbell size={20} />}
          description={
            activePackages.length === 0
              ? "Belum ada paket aktif"
              : activePackages.length === 1
                ? `Dari: ${activePackages[0].packageName}`
                : `Dari ${activePackages.length} paket aktif`
          }
        />
        <StatCard
          title="Reschedule Berjalan"
          value={pendingRescheduleBookingIds.length}
          icon={<RefreshCw size={20} />}
          description="Menunggu persetujuan admin"
        />
      </div>

      {/* Area Utama: Daftar Sesi Bertab */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm mt-8">
        <h2 className="text-lg font-semibold text-[#1E293B] mb-2">
          Daftar Sesi Latihan
        </h2>
        <p className="text-sm text-[#64748B]">
          Lihat jadwal mendatang Anda atau tinjau riwayat sesi yang sudah lewat.
        </p>

        <BookingList />
      </div>
    </div>
  );
}
