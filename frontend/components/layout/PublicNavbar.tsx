"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, LayoutDashboard, ArrowRight } from "lucide-react";
import { motion, useScroll, useMotionValueEvent } from "motion/react";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Layanan", href: "#layanan" },
  { label: "Keunggulan", href: "#keunggulan" },
  { label: "Cara Kerja", href: "#cara-kerja" },
  { label: "Harga Paket", href: "#paket" },
];

export function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 24);
  });

  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  const dashboardHref = user?.role === "admin" ? "/admin" : "/customer";
  const showDashboardCta = hasHydrated && isAuthenticated && Boolean(user);

  return (
    <header className="sticky top-0 z-50 w-full px-4 pt-3 pb-2 pointer-events-none">
      <motion.nav
        aria-label="Navigasi utama"
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "pointer-events-auto mx-auto flex items-center justify-between transition-colors duration-300",
          scrolled
            ? "max-w-5xl rounded-full border border-[#E2E8F0] bg-white/90 px-5 py-2.5 shadow-lg shadow-slate-900/5 backdrop-blur-md"
            : "max-w-6xl rounded-2xl border border-transparent bg-white/75 px-5 py-3 backdrop-blur-sm",
        )}>
        <a
          href="#beranda"
          className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#65C466] rounded-lg">
          <div className="relative h-9 w-9 shrink-0">
            <Image
              src="/logo-gymnasyum.webp"
              alt="Logo Gymnasyum"
              fill
              sizes="36px"
              className="object-contain"
              priority
            />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-[#1E293B]">
            Gymnasyum
          </span>
        </a>

        <ul className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="inline-flex min-h-[44px] items-center rounded-full px-4 text-[15px] font-medium text-[#1E293B]/80 transition-colors hover:bg-[#F8FAFC] hover:text-[#1E293B]">
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden lg:flex items-center gap-2.5">
          {showDashboardCta ? (
            <Link
              href={dashboardHref}
              className={cn(
                buttonVariants(),
                "min-h-[44px] rounded-full bg-[#65C466] px-5 text-[15px] font-bold text-[#1E293B] shadow-sm transition-all hover:bg-[#52A653] active:scale-[0.97] active:translate-y-[1px] active:shadow-inner",
              )}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Buka Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "min-h-[44px] rounded-full px-4 text-[15px] font-semibold text-[#1E293B] hover:bg-[#F8FAFC] active:scale-[0.97] active:translate-y-[1px]",
                )}>
                Masuk
              </Link>
              <Link
                href="/register"
                className={cn(
                  buttonVariants(),
                  "min-h-[44px] rounded-full bg-[#65C466] px-5 text-[15px] font-bold text-[#1E293B] shadow-sm transition-all hover:bg-[#52A653] active:scale-[0.97] active:translate-y-[1px] active:shadow-inner",
                )}>
                Daftar
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        {/* Tombol Drawer Mobile */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Buka menu navigasi"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#1E293B] transition-all hover:bg-[#F8FAFC] active:scale-[0.96] lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
      </motion.nav>

      {/* Mobile Sheet Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[340px] bg-white">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2.5 text-[#1E293B]">
              <div className="relative h-8 w-8">
                <Image
                  src="/logo-gymnasyum.webp"
                  alt="Logo Gymnasyum"
                  fill
                  sizes="32px"
                  className="object-contain"
                />
              </div>
              Gymnasyum
            </SheetTitle>
            <SheetDescription className="text-[#64748B]">
              Navigasi cepat dan akses akun Anda.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 flex flex-col gap-2 px-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[48px] items-center rounded-xl px-4 text-base font-semibold text-[#1E293B] transition-colors hover:bg-[#F8FAFC]">
                {item.label}
              </a>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-[#E2E8F0] pt-6 px-1">
            {showDashboardCta ? (
              <Link
                href={dashboardHref}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  buttonVariants(),
                  "min-h-[48px] w-full rounded-xl bg-[#65C466] text-base font-bold text-[#1E293B] hover:bg-[#52A653] active:scale-[0.97] active:translate-y-[1px]",
                )}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Buka Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    buttonVariants(),
                    "min-h-[48px] w-full rounded-xl bg-[#65C466] text-base font-bold text-[#1E293B] hover:bg-[#52A653] active:scale-[0.97] active:translate-y-[1px]",
                  )}>
                  Daftar Sekarang
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "min-h-[48px] w-full rounded-xl border-[#E2E8F0] text-base font-semibold text-[#1E293B] hover:bg-[#F8FAFC] active:scale-[0.97] active:translate-y-[1px]",
                  )}>
                  Masuk ke Akun
                </Link>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
