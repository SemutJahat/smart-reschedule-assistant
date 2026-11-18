"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  serviceFormSchema,
  type ServiceFormData,
  type ServiceFormInput,
} from "../schemas";
import { useCatalogStore } from "../store/useCatalogStore";
import { useModalStore } from "@/stores/useModalStore";
import { FormField } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/errors";
import type { ServiceDTO } from "@/lib/api/services";

interface ServiceFormProps {
  serviceData?: ServiceDTO;
}

export function ServiceForm({ serviceData }: ServiceFormProps) {
  const isEditing = !!serviceData;
  const { createService, updateService } = useCatalogStore();
  const { closeModal } = useModalStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ServiceFormInput, unknown, ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: isEditing
      ? {
          name: serviceData.name,
          description: serviceData.description || "",
          active: serviceData.active,
        }
      : { name: "", description: "", active: true },
  });

  const onSubmit = async (data: ServiceFormData) => {
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateService(serviceData.id, data);
        closeModal();
        setTimeout(() => toast.success("Layanan berhasil diperbarui!"), 300);
      } else {
        await createService(data);
        closeModal();
        setTimeout(
          () => toast.success("Layanan baru berhasil ditambahkan!"),
          300,
        );
      }
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        toast.error("Nama layanan sudah digunakan.");
      } else {
        toast.error("Terjadi kesalahan saat menyimpan layanan.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Nama Layanan" error={errors.name?.message}>
        <input
          {...register("name")}
          className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-sm"
          placeholder="Misal: Personal Training"
        />
      </FormField>

      <FormField label="Deskripsi" error={errors.description?.message}>
        <textarea
          {...register("description")}
          rows={3}
          className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-sm resize-none"
          placeholder="Penjelasan singkat layanan..."
        />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-[#1E293B]">
        <input type="checkbox" {...register("active")} />
        Status Aktif
      </label>

      <div className="flex justify-end gap-3 pt-4 border-t mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={closeModal}
          disabled={isSubmitting}>
          Batal
        </Button>
        <Button
          type="submit"
          className="bg-[#65C466] hover:bg-[#52A353] text-white"
          disabled={isSubmitting}>
          {isSubmitting
            ? "Menyimpan..."
            : isEditing
              ? "Simpan Perubahan"
              : "Tambah Layanan"}
        </Button>
      </div>
    </form>
  );
}
