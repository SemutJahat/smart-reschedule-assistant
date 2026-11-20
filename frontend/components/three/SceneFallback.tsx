import { Calendar, Clock, MessageSquare, CheckCircle2 } from "lucide-react";

export function SceneFallback() {
  return (
    <div className="relative h-[380px] sm:h-[440px] lg:h-[480px] w-full overflow-hidden rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] shadow-lg shadow-slate-200/70">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: "url('/bg-gymnasyum.webp')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#1E293B]/80 via-[#1E293B]/45 to-[#65C466]/20" />

      <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-8">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-bold text-[#1E293B] shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[#65C466]" />
          Pratinjau Aplikasi Gymnasyum
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/60 bg-white/95 p-4 shadow-md backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#52A353]">
                Jadwal Terdekat
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#65C466]/15 px-2.5 py-0.5 text-xs font-semibold text-[#1E293B]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#52A353]" />
                Terpesan
              </span>
            </div>
            <p className="mt-1.5 text-base font-bold text-[#1E293B]">
              Private Coaching Pagi · Coach Budi
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#64748B]">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Sabtu, 08.00–09.00 WIB
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Sisa kuota 7 sesi
              </span>
            </div>
          </div>

          <div className="ml-auto max-w-[90%] rounded-2xl border border-[#65C466]/40 bg-[#1E293B] p-4 text-white shadow-md">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#65C466]">
              <MessageSquare className="h-3.5 w-3.5" />
              Smart Reschedule Assistant
            </div>
            <p className="mt-1 text-sm text-slate-200">
              Slot pengganti Sabtu 09.00 WIB tersedia. Ingin langsung saya
              ajukan ke admin?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
