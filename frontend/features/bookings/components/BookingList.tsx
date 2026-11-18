"use client";

import { useBookingStore } from "../store/useBookingStore";
import type { BookingWithScheduleDTO } from "../schemas";
import { useModalStore } from "@/stores/useModalStore";
import { useChatStore } from "@/features/reschedule-chat/store/useChatStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleCard } from "@/components/shared/ScheduleCard";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarX2, CalendarCheck, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/format";

export function BookingList() {
  const {
    upcomingBookings,
    historyBookings,
    pendingRescheduleBookingIds,
    status,
    cancelBooking,
    fetchBookings,
  } = useBookingStore();
  const { openModal, closeModal } = useModalStore();
  const { initializeSession } = useChatStore();

  const handleOpenRescheduleChat = (booking: BookingWithScheduleDTO) => {
    // 1. Inisialisasi state chat untuk booking ini
    initializeSession(booking.id);

    // 2. Buka modal dan kirimkan data jadwal ke dalamnya
    openModal("reschedule-chat", { scheduleData: booking.schedule });
  };

  const handleCancel = (booking: BookingWithScheduleDTO) => {
    const { title, startsAt } = booking.schedule;
    const jamMulai = new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(startsAt));
    if (new Date(startsAt).getTime() <= Date.now()) {
      toast.error("Sesi ini sudah lewat dan tidak bisa dibatalkan.");
      void fetchBookings();
      return;
    }
    const message = `Batalkan sesi "${title}" pada ${formatDateTime(startsAt)} pukul ${jamMulai} WIB? 1 sesi kuota akan dikembalikan ke paket Anda.`;

    openModal("confirm", {
      title: "Batalkan Sesi",
      description: "Sesi yang dibatalkan tidak bisa dikembalikan.",
      message,
      isSubmitting: false,
      onConfirm: async () => {
        useModalStore.setState((state) => ({
          props: { ...state.props, isSubmitting: true },
        }));
        try {
          await cancelBooking(booking.id);
          closeModal();
          setTimeout(() => {
            toast.success("Sesi berhasil dibatalkan. Kuota sudah dikembalikan.");
          }, 300);
        } catch (error: unknown) {
          useModalStore.setState((state) => ({
            props: { ...state.props, isSubmitting: false },
          }));
          if (error instanceof ApiError && error.status === 409) {
            toast.error("Sesi ini sudah tidak bisa dibatalkan.");
          } else {
            toast.error("Gagal membatalkan sesi. Silakan coba lagi.");
          }
          void fetchBookings();
        }
      },
    });
  };

  if (status === "loading") {
    return <LoadingSkeleton variant="card" count={3} className="mt-6" />;
  }

  return (
    <Tabs defaultValue="mendatang" className="w-full mt-6">
      {/* Navigasi Tab */}
      <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
        <TabsTrigger value="mendatang">Mendatang</TabsTrigger>
        <TabsTrigger value="riwayat">Riwayat</TabsTrigger>
      </TabsList>

      {/* Konten Tab Mendatang */}
      <TabsContent value="mendatang" className="space-y-4">
        {upcomingBookings.length === 0 ? (
          <EmptyState
            icon={<CalendarX2 size={48} />}
            title="Tidak Ada Jadwal Mendatang"
            description="Anda belum memiliki sesi latihan yang akan datang. Silakan beli paket atau pesan jadwal baru."
            action={
              <Link
                href="/customer/pesan-jadwal"
                className={cn(
                  buttonVariants(),
                  "mt-4 bg-[#65C466] hover:bg-[#52A353] text-white",
                )}>
                Pesan Jadwal
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingBookings.map((booking) => (
              <ScheduleCard
                key={booking.id}
                title={booking.schedule.title}
                coachName={booking.schedule.coachName}
                serviceName={booking.schedule.serviceName}
                startsAt={booking.schedule.startsAt}
                endsAt={booking.schedule.endsAt}
                capacity={booking.schedule.capacity}
                bookedCount={booking.schedule.bookedCount}
                status={booking.status}
                statusType="booking"
                actionButton={
                  <div className="mt-4 flex flex-col gap-2">
                    {pendingRescheduleBookingIds.includes(booking.id) ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-3 py-1.5">
                          <Clock size={14} />
                          Reschedule menunggu admin
                        </span>
                        <p className="text-xs text-[#64748B]">
                          Pembatalan bisa dilakukan setelah pengajuan reschedule diproses admin.
                        </p>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          className="w-full text-orange-600 border-orange-200 hover:bg-orange-50"
                          onClick={() => handleOpenRescheduleChat(booking)}>
                          Ajukan Reschedule
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleCancel(booking)}>
                          <XCircle size={14} className="mr-1.5" />
                          Batalkan
                        </Button>
                      </>
                    )}
                  </div>
                }
              />
            ))}
          </div>
        )}
      </TabsContent>

      {/* Konten Tab Riwayat */}
      <TabsContent value="riwayat" className="space-y-4">
        {historyBookings.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck size={48} />}
            title="Belum Ada Riwayat"
            description="Anda belum pernah menyelesaikan atau membatalkan sesi latihan apa pun."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {historyBookings.map((booking) => (
              <ScheduleCard
                key={booking.id}
                title={booking.schedule.title}
                coachName={booking.schedule.coachName}
                serviceName={booking.schedule.serviceName}
                startsAt={booking.schedule.startsAt}
                endsAt={booking.schedule.endsAt}
                capacity={booking.schedule.capacity}
                bookedCount={booking.schedule.bookedCount}
                status={booking.status}
                statusType="booking"
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
