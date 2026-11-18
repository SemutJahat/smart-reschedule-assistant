"use client";

import { useBookingStore } from "../store/useBookingStore";
import { useModalStore } from "@/stores/useModalStore";
import { useChatStore } from "@/features/reschedule-chat/store/useChatStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleCard } from "@/components/shared/ScheduleCard";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { CalendarX2, CalendarCheck } from "lucide-react";

export function BookingList() {
  const { upcomingBookings, historyBookings, status } = useBookingStore();
  const { openModal } = useModalStore();
  const { initializeSession } = useChatStore();

  const handleOpenRescheduleChat = (booking: any) => {
    // 1. Inisialisasi state chat untuk booking ini
    initializeSession(booking.id);

    // 2. Buka modal dan kirimkan data jadwal ke dalamnya
    openModal("reschedule-chat", { scheduleData: booking.schedule });
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
                  <Button
                    variant="outline"
                    className="w-full text-orange-600 border-orange-200 hover:bg-orange-50 mt-4"
                    onClick={() => handleOpenRescheduleChat(booking)}>
                    Ajukan Reschedule
                  </Button>
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
