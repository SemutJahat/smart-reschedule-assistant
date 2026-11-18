"use client";

import { Calendar, Clock, UserCircle } from "lucide-react";
import { useModalStore } from "@/stores/useModalStore";
import { DynamicModal } from "@/components/shared/DynamicModal";
import { ConfirmModalContent } from "@/components/shared/ConfirmModalContent";
import { ChatPanel } from "@/features/reschedule-chat/components/ChatPanel";

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

interface SessionSummary {
  title: string;
  serviceName: string;
  coachName: string;
  startsAt: string;
  endsAt: string;
}

function RescheduleSessionSummary({ schedule }: { schedule: SessionSummary }) {
  return (
    <div className="shrink-0 bg-[#F8FAFC] px-3 py-2.5 rounded-xl border border-[#E2E8F0]">
      <p className="text-[11px] font-semibold uppercase text-[#64748B] tracking-wider mb-1">
        Sesi yang akan diubah
      </p>
      <p className="font-semibold text-[#1E293B] truncate">
        {schedule.title}
        <span className="ml-2 text-xs font-normal text-[#64748B]">
          {schedule.serviceName}
        </span>
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-[#64748B]">
        <span className="inline-flex items-center gap-1">
          <Calendar size={13} />
          {dateFormat.format(new Date(schedule.startsAt))}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock size={13} />
          {timeFormat.format(new Date(schedule.startsAt))} -{" "}
          {timeFormat.format(new Date(schedule.endsAt))} WIB
        </span>
        <span className="inline-flex items-center gap-1">
          <UserCircle size={13} />
          Coach {schedule.coachName}
        </span>
      </div>
    </div>
  );
}

export function CustomerModalHost() {
  const { type, props: modalProps, closeModal } = useModalStore();

  if (!type) return null;

  const isChat = type === "reschedule-chat";

  const renderContent = () => {
    switch (type) {
      case "confirm":
        return <ConfirmModalContent {...modalProps} />;
      case "reschedule-chat":
        return (
          <div className="flex flex-col h-full min-h-0 gap-3">
            {modalProps.scheduleData && (
              <RescheduleSessionSummary schedule={modalProps.scheduleData} />
            )}
            <ChatPanel />
          </div>
        );
      default:
        return null;
    }
  };

  const getTitle = () => {
    if (type === "confirm") return modalProps.title || "Konfirmasi";
    if (isChat) return "Ajukan Pindah Jadwal";
    return "";
  };

  return (
    <DynamicModal
      title={getTitle()}
      description={
        isChat
          ? "Asisten pintar kami akan membantu mencarikan jadwal pengganti."
          : modalProps.description
      }
      isOpen={!!type}
      onClose={closeModal}
      className={isChat ? "sm:max-w-[620px] h-[85vh]" : undefined}
      bodyClassName={isChat ? "overflow-hidden flex flex-col pr-0" : undefined}>
      {renderContent()}
    </DynamicModal>
  );
}
