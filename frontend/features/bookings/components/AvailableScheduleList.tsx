"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarSearch, Check, Dumbbell, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScheduleCard } from "@/components/shared/ScheduleCard";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { cn } from "@/lib/utils";
import type { ScheduleDTO } from "@/features/schedules/schemas";
import {
  useBookScheduleStore,
  usableSubscriptions,
} from "../store/useBookScheduleStore";

const dayFormat = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const shortDate = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const BOOKING_ERRORS: [RegExp, string][] = [
  [/full/i, "Jadwal ini sudah penuh."],
  [/already has an active booking/i, "Anda sudah memesan jadwal ini."],
  [/no remaining sessions/i, "Kuota paket Anda sudah habis."],
  [/expired/i, "Paket Anda sudah kedaluwarsa."],
  [/not active/i, "Paket Anda belum aktif."],
  [/cancelled/i, "Jadwal ini sudah dibatalkan."],
];

function describeBookingError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const match = BOOKING_ERRORS.find(([pattern]) => pattern.test(message));
  return match?.[1] ?? (message || "Gagal memesan jadwal.");
}

function groupByDay(schedules: ScheduleDTO[]) {
  const groups = new Map<string, ScheduleDTO[]>();
  for (const s of schedules) {
    const key = dayFormat.format(new Date(s.startsAt));
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups.entries()];
}

export function AvailableScheduleList() {
  const {
    schedules,
    bookedScheduleIds,
    subscriptions,
    status,
    error,
    bookingScheduleId,
    fetchData,
    bookSchedule,
  } = useBookScheduleStore();
  const [service, setService] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const services = useMemo(
    () =>
      [...new Set(schedules.map((s) => s.serviceName).filter(Boolean))] as string[],
    [schedules],
  );
  const visible = service
    ? schedules.filter((s) => s.serviceName === service)
    : schedules;
  const usable = usableSubscriptions(subscriptions);
  const totalRemaining = usable.reduce(
    (sum, s) => sum + (s.totalSessions - s.usedSessions),
    0,
  );

  const handleBook = async (schedule: ScheduleDTO) => {
    try {
      await bookSchedule(schedule.id);
      toast.success(`Berhasil memesan ${schedule.title}.`);
    } catch (err) {
      toast.error(describeBookingError(err));
    } finally {
      setConfirmingId(null);
    }
  };

  if (status === "loading" || status === "idle") {
    return <LoadingSkeleton variant="card" count={4} />;
  }

  if (status === "error") {
    return (
      <ErrorState message={error ?? undefined} onRetry={() => fetchData()} />
    );
  }

  const renderAction = (schedule: ScheduleDTO) => {
    const isBooked = bookedScheduleIds.includes(schedule.id);
    const isFull =
      schedule.status === "full" || schedule.bookedCount >= schedule.capacity;
    const isBusy = bookingScheduleId === schedule.id;

    if (isBooked) {
      return (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-[#52A353]">
          <Check size={16} /> Sudah dipesan
        </span>
      );
    }
    if (isFull) {
      return <span className="text-sm text-[#64748B]">Penuh</span>;
    }
    if (usable.length === 0) return null;
    if (confirmingId === schedule.id) {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => setConfirmingId(null)}>
            Batal
          </Button>
          <Button
            size="sm"
            className="bg-[#65C466] hover:bg-[#52A353] text-white"
            disabled={isBusy}
            onClick={() => handleBook(schedule)}>
            {isBusy && <Loader2 className="animate-spin" size={14} />}
            Ya, pesan
          </Button>
        </div>
      );
    }
    return (
      <Button
        size="sm"
        className="bg-[#1E293B] hover:bg-slate-800 text-white"
        disabled={bookingScheduleId !== null}
        onClick={() => setConfirmingId(schedule.id)}>
        Pesan
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      {usable.length > 0 ? (
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm text-sm text-[#1E293B]">
          Sisa kuota <span className="font-semibold">{totalRemaining} sesi</span>{" "}
          dari {usable[0].packageName}, berlaku sampai{" "}
          {shortDate.format(new Date(usable[0].expiresAt))}. Setiap pemesanan
          memakai 1 sesi.
        </div>
      ) : (
        <EmptyState
          icon={<Dumbbell size={48} className="text-[#64748B]" />}
          title="Belum Ada Paket Aktif"
          description="Anda perlu paket aktif dengan sisa kuota untuk memesan jadwal latihan."
          action={
            <Link
              href="/customer/beli-paket"
              className={cn(
                buttonVariants(),
                "mt-4 bg-[#65C466] hover:bg-[#52A353] text-white",
              )}>
              Beli Paket
            </Link>
          }
        />
      )}

      {services.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {[null, ...services].map((name) => (
            <button
              key={name ?? "all"}
              onClick={() => setService(name)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer",
                service === name
                  ? "bg-[#65C466] text-white border-[#65C466]"
                  : "bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]",
              )}>
              {name ?? "Semua layanan"}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={<CalendarSearch size={48} />}
          title="Belum Ada Jadwal"
          description="Belum ada jadwal latihan mendatang yang bisa dipesan."
        />
      ) : (
        groupByDay(visible).map(([day, items]) => (
          <section key={day} className="space-y-3">
            <h2 className="text-sm font-semibold text-[#64748B] capitalize">
              {day}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((schedule) => (
                <ScheduleCard
                  key={schedule.id}
                  title={schedule.title}
                  coachName={schedule.coachName ?? "-"}
                  serviceName={schedule.serviceName ?? "-"}
                  startsAt={schedule.startsAt}
                  endsAt={schedule.endsAt}
                  capacity={schedule.capacity}
                  bookedCount={schedule.bookedCount}
                  status={schedule.status}
                  actionButton={renderAction(schedule)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
