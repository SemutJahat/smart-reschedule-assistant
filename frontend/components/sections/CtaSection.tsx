"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

export function CtaSection() {
  const containerRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [0.95, 1]);
  const borderRadius = useTransform(scrollYProgress, [0, 1], [36, 24]);

  return (
    <section ref={containerRef} className="bg-[#F8FAFC] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          style={reducedMotion ? undefined : { scale, borderRadius }}
          className="relative overflow-hidden rounded-3xl bg-[#1E293B] px-6 py-14 text-center text-white shadow-2xl shadow-slate-900/15 sm:px-12 sm:py-20">
          {/* Glow aksen hijau lembut */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#65C466]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#65C466]/15 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Siap mulai latihan?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
              Bergabung dengan Gymnasyum sekarang, pilih paket sesuai kebutuhan
              Anda, dan nikmati kemudahan atur ulang jadwal lewat asisten chat.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className={cn(
                  buttonVariants(),
                  "min-h-[52px] rounded-xl bg-[#65C466] px-8 text-base font-bold text-[#1E293B] shadow-lg shadow-[#65C466]/20 transition-all hover:bg-[#52A653] active:scale-[0.97] active:translate-y-[1px] active:shadow-inner",
                )}>
                Daftar Sekarang
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "min-h-[52px] rounded-xl border-slate-600 bg-transparent px-8 text-base font-semibold text-white transition-all hover:bg-white/10 hover:text-white active:scale-[0.97] active:translate-y-[1px]",
                )}>
                Masuk ke Akun
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
