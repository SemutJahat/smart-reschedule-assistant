"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, HeartHandshake, Dumbbell, CheckCircle2 } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

const AUDIENCES = [
  {
    id: "ibu-ibu",
    title: "Ibu-ibu",
    tagline: "Jadwal fleksibel mengikuti ritme keluarga",
    description:
      "Sesi latihan yang nyaman dan terarah, dengan jadwal yang bisa disesuaikan dengan aktivitas keluarga.",
    highlights: [
      "Pindah jadwal mendadak cukup kirim pesan lewat chat",
      "Pantau sisa kuota paket secara transparan dari HP",
      "Pilihan waktu pagi maupun sore yang ramah agenda rumah",
    ],
    icon: Users,
  },
  {
    id: "lansia",
    title: "Lansia",
    tagline: "Ramah dibaca, aman, dan penuh pendampingan",
    description:
      "Latihan yang ramah dan aman bersama coach, dengan tampilan aplikasi yang mudah dibaca.",
    highlights: [
      "Ukuran tulisan besar, tombol lega, dan kontras warna jelas",
      "Pencatatan riwayat medis & metrik fisik langsung di profil",
      "Pendampingan coach yang menyesuaikan intensitas tubuh",
    ],
    icon: HeartHandshake,
  },
  {
    id: "private-coaching",
    title: "Private Coaching",
    tagline: "Fokus satu per satu menuju target Anda",
    description:
      "Sesi satu per satu dengan coach pilihan sesuai kebutuhan dan target Anda.",
    highlights: [
      "Penjadwalan terstruktur sesuai spesialisasi layanan & coach",
      "Riwayat sesi dan perkembangan latihan tercatat rapi",
      "Validasi reschedule cepat tanpa perlu bolak-balik telepon",
    ],
    icon: Dumbbell,
  },
];

export function AudienceSection() {
  const [activeId, setActiveId] = useState(AUDIENCES[0].id);
  const reducedMotion = useReducedMotion();

  const activeAudience =
    AUDIENCES.find((item) => item.id === activeId) ?? AUDIENCES[0];
  const ActiveIcon = activeAudience.icon;

  return (
    <section
      id="layanan"
      className="scroll-mt-24 bg-white py-16 sm:py-24 border-y border-[#E2E8F0]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-wider text-[#52A353]">
            Layanan & Program
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[#1E293B] sm:text-4xl">
            Untuk Siapa Gymnasyum?
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#64748B] sm:text-lg">
            Dirancang agar siapa pun—mulai dari ibu-ibu, lansia, hingga peserta
            private coaching—merasa nyaman berlatih sekaligus mudah mengatur
            jadwalnya.
          </p>
        </div>

        <div className="mt-10 hidden lg:grid lg:grid-cols-12 lg:gap-8 items-stretch">
          <div className="lg:col-span-5 flex flex-col gap-3">
            {AUDIENCES.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={cn(
                    "relative flex min-h-[84px] items-center gap-4 rounded-2xl border p-5 text-left transition-colors active:scale-[0.98]",
                    isActive
                      ? "border-[#65C466] bg-[#F8FAFC]"
                      : "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]/70",
                  )}>
                  {isActive && (
                    <motion.span
                      layoutId="audience-active-indicator"
                      transition={{
                        type: "spring",
                        stiffness: 340,
                        damping: 30,
                      }}
                      className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-[#65C466]"
                    />
                  )}
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors",
                      isActive
                        ? "bg-[#65C466] text-[#1E293B]"
                        : "bg-[#F8FAFC] text-[#64748B]",
                    )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1E293B]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#64748B]">{item.tagline}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7">
            <div className="relative h-full overflow-hidden rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-8 shadow-sm">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeAudience.id}
                  initial={reducedMotion ? false : { opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, x: -24 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="flex h-full flex-col justify-between">
                  <div>
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#65C466]/15 text-[#52A353]">
                      <ActiveIcon className="h-7 w-7" />
                    </div>
                    <h3 className="mt-5 text-2xl font-black text-[#1E293B]">
                      {activeAudience.title}
                    </h3>
                    <p className="mt-3 text-lg leading-relaxed text-[#64748B]">
                      {activeAudience.description}
                    </p>
                  </div>

                  <ul className="mt-8 space-y-3 border-t border-[#E2E8F0] pt-6">
                    {activeAudience.highlights.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-3 text-base text-[#1E293B]">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#52A353]" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 lg:hidden">
          {AUDIENCES.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                whileHover={reducedMotion ? undefined : { y: -4 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#65C466]/15 text-[#52A353]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1E293B]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#64748B]">{item.tagline}</p>
                  </div>
                </div>
                <p className="mt-4 text-base leading-relaxed text-[#64748B]">
                  {item.description}
                </p>
                <ul className="mt-4 space-y-2 border-t border-[#E2E8F0] pt-4">
                  {item.highlights.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2.5 text-sm text-[#1E293B]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#52A353]" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
