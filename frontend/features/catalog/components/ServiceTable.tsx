"use client";

import { useEffect } from "react";
import { useCatalogStore } from "../store/useCatalogStore";
import { useModalStore } from "@/stores/useModalStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { DataTable } from "@/components/shared/DataTable";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Plus, Edit } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ServiceDTO } from "@/lib/api/services";

export function ServiceTable() {
  const {
    adminServices,
    adminServicesStatus,
    adminServicesError,
    fetchAdminServices,
    updateService,
  } = useCatalogStore();
  const { openModal, closeModal } = useModalStore();
  const { _hasHydrated, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated) return;

    const controller = new AbortController();
    fetchAdminServices(controller.signal);
    return () => controller.abort();
  }, [fetchAdminServices, _hasHydrated, isAuthenticated]);

  const handleToggle = (service: ServiceDTO) => {
    const deactivating = service.active;
    openModal("confirm", {
      title: deactivating ? "Nonaktifkan Layanan" : "Aktifkan Layanan",
      description: deactivating
        ? "Layanan tidak akan tersedia untuk jadwal baru."
        : "Layanan akan tersedia kembali untuk jadwal baru.",
      message: deactivating
        ? `Nonaktifkan layanan "${service.name}"? Layanan ini tidak akan muncul lagi saat membuat jadwal baru. Jadwal yang sudah ada tidak terpengaruh.`
        : `Aktifkan kembali layanan "${service.name}"?`,
      isSubmitting: false,
      onConfirm: async () => {
        useModalStore.setState((state) => ({
          props: { ...state.props, isSubmitting: true },
        }));
        try {
          await updateService(service.id, { active: !service.active });
          closeModal();
          setTimeout(() => {
            toast.success(
              deactivating
                ? "Layanan dinonaktifkan."
                : "Layanan diaktifkan kembali.",
            );
          }, 300);
        } catch {
          useModalStore.setState((state) => ({
            props: { ...state.props, isSubmitting: false },
          }));
          toast.error("Gagal memperbarui status layanan.");
        }
      },
    });
  };

  const columns = [
    {
      key: "name",
      header: "Nama Layanan",
      render: (row: ServiceDTO) => (
        <p className="font-semibold text-[#1E293B]">{row.name}</p>
      ),
    },
    {
      key: "description",
      header: "Deskripsi",
      render: (row: ServiceDTO) => (
        <p className="max-w-xs truncate text-sm text-[#64748B]">
          {row.description || "-"}
        </p>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: ServiceDTO) => (
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border",
            row.active
              ? "bg-[#65C466]/10 text-[#52A353] border-[#65C466]/20"
              : "bg-gray-100 text-gray-500 border-gray-200",
          )}>
          {row.active ? "Aktif" : "Nonaktif"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      render: (row: ServiceDTO) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openModal("service-form", { serviceData: row })}>
            <Edit size={14} className="mr-1.5" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={
              row.active
                ? "border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50"
                : "border-[#65C466]/40 text-[#52A353] hover:bg-[#65C466]/10"
            }
            onClick={() => handleToggle(row)}>
            {row.active ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          className="bg-[#65C466] hover:bg-[#52A353] text-white"
          onClick={() => openModal("service-form", {})}>
          <Plus size={16} className="mr-2" /> Tambah Layanan
        </Button>
      </div>

      {!_hasHydrated ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : (
        <DataTable
          columns={columns}
          data={adminServices}
          status={adminServicesStatus}
          error={adminServicesError}
          onRetry={() => fetchAdminServices()}
          emptyMessage="Belum ada layanan yang ditambahkan."
        />
      )}
    </div>
  );
}
