"use client";

import { useEffect, useRef } from "react";
import { animate, createScope, createTimeline } from "animejs";
import { Calendar, Clock, Sparkles, CheckCircle2 } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const STEPS = [
  {
    number: "01",
    title: "Daftar dan pilih paket",
    description:
      "Buat akun singkat, pilih paket latihan yang sesuai, lalu selesaikan pembayaran otomatis.",
  },
  {
    number: "02",
    title: "Pesan sesi latihan",
    description:
      "Buka menu jadwal tersedia, pilih kelas dan coach, lalu pesan sesi dengan satu klik.",
  },
  {
    number: "03",
    title: "Pindah jadwal lewat chat",
    description:
      "Berhalangan hadir? Tulis permintaan pindah jadwal dengan bahasa sehari-hari di kolom chat.",
  },
  {
    number: "04",
    title: "Admin mengonfirmasi",
    description:
      "Admin memvalidasi jadwal pengganti Anda dan status sesi di aplikasi langsung terbarui.",
  },
];

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const pathRef = useRef<SVGLineElement>(null);
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
          // 1. SVG Path Drawing garis penghubung 4 langkah
          if (pathRef.current) {
            const length = 360;
            pathRef.current.style.strokeDasharray = `${length}`;
            pathRef.current.style.strokeDashoffset = `${length}`;
            animate(pathRef.current, {
              strokeDashoffset: [length, 0],
              duration: 1300,
              ease: "outCubic",
            });
          }

          // 2. Timeline koreografi bubble chat ilustrasi
          const tl = createTimeline({
            defaults: { ease: "outCubic", duration: 520 },
          });

          tl.add(".chat-demo-step-1", {
            opacity: [0, 1],
            translateY: [14, 0],
          })
            .add(
              ".chat-demo-step-2",
              {
                opacity: [0, 1],
                translateY: [14, 0],
              },
              "+=350",
            )
            .add(
              ".chat-demo-step-3",
              {
                opacity: [0, 1],
                translateY: [14, 0],
              },
              "+=300",
            );
        });
      },
      { threshold: 0.2 },
    );

    observer.observe(rootEl);

    return () => {
      observer.disconnect();
      scope?.revert();
    };
  }, [reducedMotion]);

  return (
    <section
      id="cara-kerja"
      ref={sectionRef}
      className="scroll-mt-24 border-y border-[#E2E8F0] bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-wider text-[#52A353]">
            Cara Kerja
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[#1E293B] sm:text-4xl">
            Empat langkah sederhana mulai berlatih.
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
          {/* Kolom Kiri: 4 Langkah + Garis SVG */}
          <div className="relative lg:col-span-6">
            {/* Garis SVG penghubung di desktop/mobile */}
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute left-6 top-6 h-[calc(100%-3rem)] w-1"
              viewBox="0 0 4 360"
              preserveAspectRatio="none">
              <line
                x1="2"
                y1="0"
                x2="2"
                y2="360"
                stroke="#E2E8F0"
                strokeWidth="3"
              />
              <line
                ref={pathRef}
                x1="2"
                y1="0"
                x2="2"
                y2="360"
                stroke="#65C466"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>

            <ol className="relative space-y-8">
              {STEPS.map((step) => (
                <li key={step.number} className="relative flex gap-5">
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[#65C466] bg-white text-base font-black text-[#1E293B] shadow-sm">
                    {step.number}
                  </div>
                  <div className="pt-1">
                    <h3 className="text-xl font-bold text-[#1E293B]">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-base leading-relaxed text-[#64748B]">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:col-span-6 lg:sticky lg:top-28">
            <div className="overflow-hidden rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] shadow-lg shadow-slate-200/60">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#65C466]/15 text-[#52A353]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1E293B]">
                      Asisten Pindah Jadwal
                    </p>
                    <p className="text-xs text-[#64748B]">
                      Smart Reschedule Assistant
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-xs font-semibold text-[#64748B]">
                  Contoh ilustrasi
                </span>
              </div>

              <div className="space-y-4 p-5 sm:p-6">
                <div
                  className="chat-demo-step-1 ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#1E293B] px-4 py-3 text-sm leading-relaxed text-white shadow-sm"
                  style={{ opacity: reducedMotion ? 1 : 0 }}>
                  Besok sore nggak bisa, pindah Sabtu pagi dong
                </div>

                <div
                  className="chat-demo-step-2 max-w-[90%] rounded-2xl rounded-tl-sm border border-[#E2E8F0] bg-white px-4 py-3 text-sm leading-relaxed text-[#1E293B] shadow-sm"
                  style={{ opacity: reducedMotion ? 1 : 0 }}>
                  Baik, saya menemukan jadwal pengganti yang tersedia untuk
                  Sabtu pagi. Silakan pilih slot berikut:
                </div>

                <div
                  className="chat-demo-step-3 rounded-2xl border border-[#65C466]/45 bg-white p-4 shadow-sm"
                  style={{ opacity: reducedMotion ? 1 : 0 }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#1E293B]">
                      Yoga Pagi · Coach Budi
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#65C466]/15 px-2.5 py-0.5 text-xs font-bold text-[#1E293B]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#52A353]" />
                      Tersedia
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#64748B]">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Sabtu, 28 Nov 2026
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      08.00–09.00 WIB
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
