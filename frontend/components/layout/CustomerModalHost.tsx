"use client";

import { useModalStore } from "@/stores/useModalStore";
import { DynamicModal } from "@/components/shared/DynamicModal";
import { ConfirmModalContent } from "@/components/shared/ConfirmModalContent";
import { ChatPanel } from "@/features/reschedule-chat/components/ChatPanel";
import { ScheduleCard } from "@/components/shared/ScheduleCard";

export function CustomerModalHost() {
  const { type, props: modalProps, closeModal } = useModalStore();

  if (!type) return null;

  const renderContent = () => {
    switch (type) {
      case "confirm":
        return <ConfirmModalContent {...modalProps} />;
      case "reschedule-chat":
        const s = modalProps.scheduleData;
        return (
          <div className="space-y-3">
            {s && (
              <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                <p className="text-[11px] font-semibold uppercase text-[#64748B] mb-1.5 tracking-wider">
                  Sesi yang akan diubah:
                </p>
                {/* Render versi lebih compact atau ScheduleCard standar */}
                <div className="scale-95 origin-left">
                  <ScheduleCard
                    title={s.title}
                    coachName={s.coachName}
                    serviceName={s.serviceName}
                    startsAt={s.startsAt}
                    endsAt={s.endsAt}
                    capacity={s.capacity}
                    bookedCount={s.bookedCount}
                    status="booked"
                    statusType="booking"
                  />
                </div>
              </div>
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
    if (type === "reschedule-chat") return "Ajukan Pindah Jadwal";
    return "";
  };

  return (
    <DynamicModal
      title={getTitle()}
      description={
        type === "reschedule-chat"
          ? "Asisten pintar kami akan membantu mencarikan jadwal pengganti."
          : modalProps.description
      }
      isOpen={!!type}
      onClose={closeModal}
      className={type === "reschedule-chat" ? "sm:max-w-[620px]" : undefined}>
      {renderContent()}
    </DynamicModal>
  );
}
