"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, MessageSquareQuote, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ScheduleDTO } from "@/features/schedules/schemas";
import type { RescheduleDecision } from "@/lib/api/reschedules";
import {
  useRescheduleReviewStore,
  type RescheduleRequestView,
} from "../store/useRescheduleReviewStore";

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
});

const SUCCESS_MESSAGES: Record<RescheduleDecision, string> = {
  approved: "Pengajuan disetujui. Booking member sudah dipindahkan.",
  rejected: "Pengajuan ditolak.",
  held: "Pengajuan ditunda.",
};

function ScheduleSummary({
  label,
  schedule,
}: {
  label: string;
  schedule: ScheduleDTO | null;
}) {
  return (
    <div className="flex-1 min-w-0 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">
        {label}
      </p>
      {schedule ? (
        <>
          <p className="font-semibold text-[#1E293B] truncate">
            {schedule.title}
          </p>
          <p className="text-xs text-[#64748B] mt-0.5">
            {dateFormat.format(new Date(schedule.startsAt))},{" "}
            {timeFormat.format(new Date(schedule.startsAt))} -{" "}
            {timeFormat.format(new Date(schedule.endsAt))} WIB
          </p>
          <p className="text-xs text-[#64748B]">
            {schedule.serviceName ?? "-"} · Coach {schedule.coachName ?? "-"} ·{" "}
            {schedule.bookedCount}/{schedule.capacity} terisi
          </p>
        </>
      ) : (
        <p className="text-sm text-[#64748B]">Jadwal tidak ditemukan</p>
      )}
    </div>
  );
}

export function RescheduleRequestCard({
  request,
}: {
  request: RescheduleRequestView;
}) {
  const { review, reviewingId } = useRescheduleReviewStore();
  const [note, setNote] = useState("");
  const [pendingDecision, setPendingDecision] =
    useState<RescheduleDecision | null>(null);

  const isOpen = request.status === "pending" || request.status === "held";
  const isBusy = reviewingId === request.id;

  const handleReview = async (decision: RescheduleDecision) => {
    if (decision === "rejected" && !note.trim()) {
      toast.error("Isi catatan alasan penolakan untuk member.");
      return;
    }
    setPendingDecision(decision);
    try {
      await review(request.id, decision, note);
      toast.success(SUCCESS_MESSAGES[decision]);
      setNote("");
    } catch (error) {
      toast.error(
        (error instanceof Error && error.message) ||
          "Gagal memproses pengajuan.",
      );
    } finally {
      setPendingDecision(null);
    }
  };

  const spinner = (decision: RescheduleDecision) =>
    isBusy && pendingDecision === decision ? (
      <Loader2 className="animate-spin" size={14} />
    ) : null;

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <UserCircle size={36} className="text-[#64748B] shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-[#1E293B] truncate">
              {request.memberName}
            </p>
            <p className="text-xs text-[#64748B] truncate">
              {[request.memberNumber, request.memberEmail]
                .filter(Boolean)
                .join(" · ") || "-"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge type="reschedule" status={request.status} />
          <span className="text-[11px] text-[#64748B]">
            Diajukan {dateFormat.format(new Date(request.createdAt))},{" "}
            {timeFormat.format(new Date(request.createdAt))}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <ScheduleSummary label="Jadwal asal" schedule={request.fromSchedule} />
        <ArrowRight
          size={18}
          className="text-[#64748B] shrink-0 self-center rotate-90 sm:rotate-0"
        />
        <ScheduleSummary label="Jadwal tujuan" schedule={request.toSchedule} />
      </div>

      {request.customerMessage && (
        <div className="flex gap-2 text-sm text-[#1E293B]">
          <MessageSquareQuote size={16} className="text-[#64748B] shrink-0 mt-0.5" />
          <p className="italic">&ldquo;{request.customerMessage}&rdquo;</p>
        </div>
      )}

      {!isOpen && request.adminNote && (
        <p className="text-sm text-[#64748B]">
          <span className="font-medium text-[#1E293B]">Catatan admin:</span>{" "}
          {request.adminNote}
        </p>
      )}

      {isOpen && (
        <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Catatan untuk member (wajib jika menolak)"
            className="min-h-[60px] text-sm bg-[#F8FAFC]"
            disabled={isBusy}
          />
          <div className="flex flex-wrap justify-end gap-2">
            {request.status !== "held" && (
              <Button
                variant="outline"
                disabled={isBusy}
                onClick={() => handleReview("held")}>
                {spinner("held")}
                Tunda
              </Button>
            )}
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              disabled={isBusy}
              onClick={() => handleReview("rejected")}>
              {spinner("rejected")}
              Tolak
            </Button>
            <Button
              className="bg-[#65C466] hover:bg-[#52A353] text-white"
              disabled={isBusy}
              onClick={() => handleReview("approved")}>
              {spinner("approved")}
              Setujui
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
