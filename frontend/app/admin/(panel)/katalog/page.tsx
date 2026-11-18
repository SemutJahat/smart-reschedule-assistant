"use client";

import { useRequireRole } from "@/features/auth/hooks/useRequireRole";
import { PageHeader } from "@/components/shared/PageHeader";
import { ServiceTable } from "@/features/catalog/components/ServiceTable";
import { PackageTable } from "@/features/catalog/components/PackageTable";

export default function KatalogPage() {
  const { isAuthorized } = useRequireRole("admin");

  if (!isAuthorized) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Katalog Layanan & Paket"
        description="Kelola daftar paket latihan dan layanan yang ditawarkan kepada member."
      />

      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm">
        <h2 className="text-lg font-semibold text-[#1E293B] mb-4">
          Daftar Layanan
        </h2>
        <ServiceTable />
      </div>

      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm">
        <h2 className="text-lg font-semibold text-[#1E293B] mb-4">
          Daftar Paket
        </h2>
        <PackageTable />
      </div>
    </div>
  );
}
