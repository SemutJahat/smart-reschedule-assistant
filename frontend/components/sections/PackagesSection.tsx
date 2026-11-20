"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  CheckCircle2,
  CalendarClock,
  Tag,
  RefreshCw,
  ArrowRight,
  Lock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PackageCardShimmer } from "@/components/shared/ShimmerSkeleton";
import {
  getPublicActivePackages,
  type PublicPackageDTO,
  type PublicPackagesResult,
} from "@/lib/api/public-packages";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface PackagesSectionProps {
  initialResult: PublicPackagesResult;
  ctaHref?: string;
  ctaLabel?: string;
}

const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatRupiah(value: string | number): string {
  const num = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(num)) return "Rp0";
  return idrFormatter.format(num).replace(/\s+/g, "");
}

export function PackagesSection({
  initialResult,
  ctaHref = "/register",
  ctaLabel = "Pilih Paket",
}: PackagesSectionProps) {
  const [packages, setPackages] = useState<PublicPackageDTO[]>(
    initialResult.packages,
  );
  const [requiresAuth, setRequiresAuth] = useState(initialResult.requiresAuth);
  const [error, setError] = useState<string | null>(initialResult.error);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Semua");

  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!initialResult.error) return;
    const controller = new AbortController();

    async function retryOnClient() {
      setIsLoading(true);
      const result = await getPublicActivePackages(controller.signal);
      if (controller.signal.aborted) return;
      setPackages(result.packages);
      setRequiresAuth(result.requiresAuth);
      setError(result.error);
      setIsLoading(false);
    }

    void retryOnClient();
    return () => controller.abort();
  }, [initialResult.error]);

  const handleRetry = async () => {
    setIsLoading(true);
    setError(null);
    const result = await getPublicActivePackages();
    setPackages(result.packages);
    setRequiresAuth(result.requiresAuth);
    setError(result.error);
    setIsLoading(false);
  };

  const categories = [
    "Semua",
    ...Array.from(new Set(packages.map((pkg) => pkg.category).filter(Boolean))),
  ];

  const activeCategory = categories.includes(selectedCategory)
    ? selectedCategory
    : "Semua";

  const filteredPackages =
    activeCategory === "Semua"
      ? packages
      : packages.filter((pkg) => pkg.category === activeCategory);

  return (
    <section id="paket" className="scroll-mt-24 bg-[#F8FAFC] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wider text-[#52A353]">
              Harga Paket
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[#1E293B] sm:text-4xl">
              Pilihan Paket Latihan Gymnasyum
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#64748B] sm:text-lg">
              Data paket dan harga terhubung langsung dengan katalog aktif kami.
              Pilih sesuai target latihan dan kebutuhan sesi Anda.
            </p>
          </div>

          {!isLoading && !error && !requiresAuth && categories.length > 1 && (
            <div
              role="tablist"
              aria-label="Filter kategori paket"
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-sm">
              {categories.map((category) => {
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "relative min-h-[40px] rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                      isActive
                        ? "text-[#1E293B]"
                        : "text-[#64748B] hover:text-[#1E293B]",
                    )}>
                    {isActive && (
                      <motion.span
                        layoutId="packages-category-pill"
                        transition={{
                          type: "spring",
                          stiffness: 360,
                          damping: 30,
                        }}
                        className="absolute inset-0 rounded-xl bg-[#65C466]"
                      />
                    )}
                    <span className="relative z-10">{category}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-10">
          {isLoading ? (
            <PackageCardShimmer count={3} />
          ) : requiresAuth ? (
            <div className="mx-auto max-w-xl rounded-3xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#65C466]/15 text-[#52A353]">
                <Lock className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-[#1E293B]">
                Lihat Daftar Paket & Harga Lengkap
              </h3>
              <p className="mt-2 text-base text-[#64748B]">
                Daftar atau masuk ke akun Anda untuk melihat katalog paket
                terbaru dan melakukan pembayaran otomatis.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants(),
                    "min-h-[48px] rounded-xl bg-[#65C466] px-6 text-base font-bold text-[#1E293B] hover:bg-[#52A653] active:scale-[0.97] active:translate-y-[1px]",
                  )}>
                  Daftar Akun Baru
                </Link>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "min-h-[48px] rounded-xl border-[#E2E8F0] px-6 text-base font-semibold text-[#1E293B] hover:bg-[#F8FAFC]",
                  )}>
                  Masuk
                </Link>
              </div>
            </div>
          ) : error ? (
            <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
              <h3 className="text-xl font-bold text-[#1E293B]">
                Katalog Paket Gagal Dimuat
              </h3>
              <p className="mt-2 text-base text-[#64748B]">{error}</p>
              <button
                type="button"
                onClick={handleRetry}
                className={cn(
                  buttonVariants(),
                  "mt-6 min-h-[48px] rounded-xl bg-[#65C466] px-6 text-base font-bold text-[#1E293B] hover:bg-[#52A653] active:scale-[0.97] active:translate-y-[1px]",
                )}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Coba Lagi
              </button>
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="mx-auto max-w-xl rounded-3xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#64748B]">
                <Tag className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-[#1E293B]">
                Belum Ada Paket Aktif
              </h3>
              <p className="mt-2 text-base text-[#64748B]">
                Paket latihan untuk kategori ini sedang diperbarui. Silakan
                periksa kembali atau buat akun untuk info terbaru.
              </p>
            </div>
          ) : (
            <motion.div
              layout={!reducedMotion}
              className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPackages.map((pkg) => {
                const numericPrice = Number.parseFloat(pkg.price);
                const pricePerSession =
                  pkg.totalSessions > 0 && Number.isFinite(numericPrice)
                    ? Math.round(numericPrice / pkg.totalSessions)
                    : 0;

                return (
                  <motion.div
                    key={pkg.id}
                    layout={!reducedMotion}
                    whileHover={reducedMotion ? undefined : { y: -6 }}
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 24,
                    }}
                    className="h-full">
                    <Card className="flex h-full flex-col justify-between rounded-2xl border-[#E2E8F0] bg-white shadow-sm transition-shadow hover:border-[#65C466]/60 hover:shadow-xl hover:shadow-slate-200/70">
                      <CardHeader className="pb-3">
                        <Badge
                          variant="outline"
                          className="w-fit rounded-full border-[#65C466]/40 bg-[#65C466]/10 px-3 py-1 text-xs font-bold text-[#1E293B]">
                          {pkg.category}
                        </Badge>
                        <CardTitle className="mt-3 text-xl font-extrabold text-[#1E293B]">
                          {pkg.name}
                        </CardTitle>
                        <CardDescription className="min-h-[44px] text-[15px] leading-relaxed text-[#64748B]">
                          {pkg.description ||
                            "Paket latihan terarah bersama coach profesional Gymnasyum."}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="flex-1">
                        <div className="border-y border-[#E2E8F0] py-4">
                          <p className="text-3xl font-black tracking-tight text-[#1E293B]">
                            {formatRupiah(pkg.price)}
                          </p>
                          {pricePerSession > 0 && (
                            <p className="mt-1 text-sm font-medium text-[#52A353]">
                              {formatRupiah(pricePerSession)} / sesi
                            </p>
                          )}
                        </div>

                        <ul className="mt-4 space-y-2.5 text-[15px] text-[#1E293B]">
                          <li className="flex items-center gap-2.5">
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-[#52A353]" />
                            <span>
                              <strong>{pkg.totalSessions} sesi</strong> latihan
                            </span>
                          </li>
                          <li className="flex items-center gap-2.5">
                            <CalendarClock className="h-5 w-5 shrink-0 text-[#52A353]" />
                            <span>
                              Masa berlaku{" "}
                              <strong>{pkg.validityDays} hari</strong>
                            </span>
                          </li>
                        </ul>
                      </CardContent>

                      <CardFooter className="pt-2">
                        <Link
                          href={ctaHref}
                          className={cn(
                            buttonVariants(),
                            "min-h-[48px] w-full rounded-xl bg-[#65C466] text-base font-bold text-[#1E293B] shadow-sm transition-all hover:bg-[#52A653] active:scale-[0.97] active:translate-y-[1px] active:shadow-inner",
                          )}>
                          {ctaLabel}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
