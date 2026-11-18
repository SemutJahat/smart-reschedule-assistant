"use client";

import { useChatStore } from "../store/useChatStore";
import { ScheduleCard } from "@/components/shared/ScheduleCard";
import { Button } from "@/components/ui/button";
import { CalendarCheck2, Loader2 } from "lucide-react";

export function ProposedSlotList() {
  const {
    currentAnalysis,
    sessionStatus,
    proposedScheduleId,
    isConfirming,
    confirmSchedule,
  } = useChatStore();

  if (!currentAnalysis || currentAnalysis.recommendedSchedules.length === 0) {
    return null;
  }

  const canConfirm = sessionStatus === "awaiting_confirmation";

  return (
    <div className="my-4 space-y-3 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
      <div className="flex items-center gap-2 text-[#64748B] mb-2">
        <CalendarCheck2 size={16} />
        <span className="text-xs font-semibold uppercase tracking-wider">
          Opsi Jadwal Pengganti
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {currentAnalysis.recommendedSchedules.map((schedule) => {
          const isProposed = schedule.id === proposedScheduleId;
          return (
            <ScheduleCard
              key={schedule.id}
              title={schedule.title}
              coachName={schedule.coachName}
              serviceName={schedule.serviceName}
              startsAt={schedule.startsAt}
              endsAt={schedule.endsAt}
              capacity={schedule.capacity}
              bookedCount={schedule.bookedCount}
              status="available"
              actionButton={
                canConfirm && isProposed ? (
                  <Button
                    className="w-full bg-[#1E293B] hover:bg-slate-800 text-white mt-3"
                    disabled={isConfirming}
                    onClick={() => confirmSchedule(schedule.id)}>
                    {isConfirming ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      "Pilih slot ini"
                    )}
                  </Button>
                ) : (
                  <span className="text-[11px] text-[#64748B]">
                    Sebutkan slot ini di chat untuk memilihnya
                  </span>
                )
              }
            />
          );
        })}
      </div>
    </div>
  );
}
