"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { animate, createScope, stagger } from "animejs";
import { ArrowRight, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SceneLoader } from "@/components/three/SceneLoader";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

export function HeroSection() {
  const containerRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion || !containerRef.current) return;

    const scope = createScope({ root: containerRef.current }).add(() => {
      animate(".hero-reveal-line", {
        translateY: ["110%", "0%"],
        opacity: [0, 1],
        duration: 780,
        delay: stagger(110),
        ease: "outExpo",
      });

      animate(".hero-cta-group", {
        translateY: [18, 0],
        opacity: [0, 1],
        duration: 620,
        delay: 420,
        ease: "outCubic",
      });
    });

    return () => scope.revert();
  }, [reducedMotion]);

  return (
    <section
      id="beranda"
      ref={containerRef}
      className="relative overflow-hidden bg-[#F8FAFC] pt-8 pb-16 sm:pt-12 sm:pb-24">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.12]"
        style={{ backgroundImage: "url('/bg-gymnasyum.webp')" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#F8FAFC]/85 via-[#F8FAFC]/75 to-[#F8FAFC]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Kolom Kiri (55% -> 7/12) */}
          <div className="lg:col-span-7">
            <div className="overflow-hidden">
              <div className="hero-reveal-line inline-block">
                <Badge
                  variant="outline"
                  className="inline-flex items-center gap-1.5 rounded-full border-[#65C466]/40 bg-[#65C466]/10 px-4 py-1.5 text-sm font-semibold text-[#1E293B]">
                  <Sparkles className="h-4 w-4 text-[#52A353]" />
                  Gym & Private Coaching
                </Badge>
              </div>
            </div>

            <h1 className="mt-5 text-4xl font-black leading-[1.12] tracking-tight text-[#1E293B] sm:text-5xl lg:text-[54px]">
              <span className="block overflow-hidden">
                <span className="hero-reveal-line block">Latihan bersama</span>
              </span>
              <span className="block overflow-hidden">
                <span className="hero-reveal-line block">
                  coach pribadi, <span className="text-[#52A353]">jadwal</span>
                </span>
              </span>
              <span className="block overflow-hidden">
                <span className="hero-reveal-line block text-[#52A353]">
                  tetap fleksibel.
                </span>
              </span>
            </h1>

            <div className="mt-5 overflow-hidden">
              <p className="hero-reveal-line max-w-xl text-base leading-relaxed text-[#64748B] sm:text-lg">
                Pesan sesi, pantau sisa kuota, dan pindah jadwal cukup lewat
                chat. Dirancang sederhana, jelas, dan nyaman untuk semua usia.
              </p>
            </div>

            <div className="hero-cta-group mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className={cn(
                  buttonVariants(),
                  "min-h-[52px] rounded-xl bg-[#65C466] px-7 text-base font-bold text-[#1E293B] shadow-md shadow-[#65C466]/20 transition-all hover:bg-[#52A653] active:scale-[0.97] active:translate-y-[1px] active:shadow-inner",
                )}>
                Daftar Sekarang
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>

              <a
                href="#paket"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "min-h-[52px] rounded-xl border-[#E2E8F0] bg-white px-7 text-base font-semibold text-[#1E293B] shadow-sm transition-all hover:border-[#65C466]/50 hover:bg-[#F8FAFC] active:scale-[0.97] active:translate-y-[1px]",
                )}>
                Lihat Harga Paket
              </a>
            </div>

            <p className="hero-cta-group mt-5 text-[15px] text-[#64748B]">
              Sudah punya akun?{" "}
              <Link
                href="/login"
                className="font-bold text-[#1E293B] underline decoration-[#65C466] decoration-2 underline-offset-4 transition-colors hover:text-[#52A353]">
                Masuk di sini
              </Link>
            </p>
          </div>

          <div className="lg:col-span-5">
            <SceneLoader />
          </div>
        </div>
      </div>
    </section>
  );
}
