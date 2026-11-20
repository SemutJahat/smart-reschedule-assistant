"use client";

import { useAuthStore } from "@/stores/useAuthStore";
import { PackagesSection } from "@/components/sections/PackagesSection";
import type { PublicPackagesResult } from "@/lib/api/public-packages";

interface LandingPackagesBridgeProps {
  initialResult: PublicPackagesResult;
}

export function LandingPackagesBridge({
  initialResult,
}: LandingPackagesBridgeProps) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  let ctaHref = "/register";
  let ctaLabel = "Pilih Paket";

  if (hasHydrated && isAuthenticated && user) {
    if (user.role === "admin") {
      ctaHref = "/admin/katalog";
      ctaLabel = "Kelola di Katalog";
    } else {
      ctaHref = "/customer/beli-paket";
      ctaLabel = "Beli Paket Ini";
    }
  }

  return (
    <PackagesSection
      initialResult={initialResult}
      ctaHref={ctaHref}
      ctaLabel={ctaLabel}
    />
  );
}
