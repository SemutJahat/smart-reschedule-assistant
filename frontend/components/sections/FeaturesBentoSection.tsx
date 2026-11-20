"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { animate, createScope, stagger } from "animejs";
import {
  MessageSquare,
  Gauge,
  UserCheck,
  CalendarCheck2,
  Send,
} from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function FeaturesBentoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion || !sectionRef.current) return;

    const rootEl = sectionRef.current;
    let scope: ReturnType<typeof createScope> | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();

        scope = createScope({ root: rootEl }).add(() => {
          animate(".bento-quota-bar", {
            width: ["0%", "70%"],
            duration: 1100,
            ease: "outExpo",
          });

          animate(".bento-typing-dot", {
            translateY: [0, -5, 0],
            opacity: [0.4, 1, 0.4],
            duration: 900,
            delay: stagger(140),
            loop: true,
            ease: "inOutSine",
          });
        });
      },
      { threshold: 0.25 },
    );

    observer.observe(rootEl);

    return () => {
      observer.disconnect();
      scope?.revert();
    };
  }, [reducedMotion]);

  const cardHover = reducedMotion ? undefined : { y: -6 };
  const cardSpring = {
    type: "spring" as const,
    stiffness: 320,
    damping: 24,
  };

  return (
    <section
      id="keunggulan"
      ref={sectionRef}
      className="scroll-mt-24 bg-[#F8FAFC] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-wider text-[#52A353]">
            Keunggulan Utama
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[#1E293B] sm:text-4xl">
            Satu aplikasi untuk jadwal, kuota, dan pindah sesi.
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:grid-rows-2">
          <motion.div
            whileHover={cardHover}
            transition={cardSpring}
            className="flex flex-col justify-between rounded-3xl border border-[#E2E8F0] bg-white p-7 shadow-sm transition-shadow hover:border-[#65C466]/50 hover:shadow-xl hover:shadow-slate-200/70 lg:col-span-2">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#65C466]/15 text-[#52A353]">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-2xl font-bold text-[#1E293B]">
                Smart Reschedule
              </h3>
              <p className="mt-2 max-w-xl text-base leading-relaxed text-[#64748B]">
                Tidak bisa hadir? Ketik permintaan dengan bahasa sehari-hari,
                asisten mengusulkan jadwal pengganti yang tersedia.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-[#1E293B]">
                  <span className="truncate">
                    &ldquo;Bisa pindah ke Sabtu pagi?&rdquo;
                  </span>
                  <span className="inline-flex items-center gap-1 ml-1">
                    <span className="bento-typing-dot h-1.5 w-1.5 rounded-full bg-[#65C466]" />
                    <span className="bento-typing-dot h-1.5 w-1.5 rounded-full bg-[#65C466]" />
                    <span className="bento-typing-dot h-1.5 w-1.5 rounded-full bg-[#65C466]" />
                  </span>
                </div>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#65C466] text-[#1E293B]">
                  <Send className="h-4 w-4" />
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={cardHover}
            transition={cardSpring}
            className="flex flex-col justify-between rounded-3xl border border-[#E2E8F0] bg-[#1E293B] p-7 text-white shadow-sm transition-shadow hover:border-[#65C466]/60 hover:shadow-xl hover:shadow-slate-300/60 lg:row-span-2">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#65C466]/20 text-[#65C466]">
                <Gauge className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-2xl font-bold">Kuota Transparan</h3>
              <p className="mt-2 text-base leading-relaxed text-slate-300">
                Pantau sisa sesi dan masa berlaku paket kapan saja tanpa takut
                lupa jadwal atau kuota hangus.
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-800/70 p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Ilustrasi Kuota Aktif
                </span>
                <span className="text-sm font-bold text-[#65C466]">
                  7 / 10 Sesi
                </span>
              </div>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  className="bento-quota-bar h-full rounded-full bg-[#65C466]"
                  style={{ width: reducedMotion ? "70%" : "0%" }}
                />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-300">
                <span>Sisa 7 sesi latihan</span>
                <span>Aktif 24 hari lagi</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={cardHover}
            transition={cardSpring}
            className="flex flex-col justify-between rounded-3xl border border-[#E2E8F0] bg-white p-7 shadow-sm transition-shadow hover:border-[#65C466]/50 hover:shadow-xl hover:shadow-slate-200/70">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#65C466]/15 text-[#52A353]">
                <UserCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-[#1E293B]">
                Coach Pribadi
              </h3>
              <p className="mt-2 text-base leading-relaxed text-[#64748B]">
                Latihan dibimbing coach yang sesuai kebutuhan dan spesialisasi
                layanan Anda.
              </p>
            </div>
          </motion.div>

          <motion.div
            whileHover={cardHover}
            transition={cardSpring}
            className="flex flex-col justify-between rounded-3xl border border-[#E2E8F0] bg-white p-7 shadow-sm transition-shadow hover:border-[#65C466]/50 hover:shadow-xl hover:shadow-slate-200/70">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#65C466]/15 text-[#52A353]">
                <CalendarCheck2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-[#1E293B]">
                Pesan Sesi Mudah
              </h3>
              <p className="mt-2 text-base leading-relaxed text-[#64748B]">
                Pilih paket, pesan jadwal, dan lihat sesi mendatang di satu
                tempat.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
