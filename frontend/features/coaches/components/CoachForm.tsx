"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCoachStore } from "../store/useCoachStore";
import { useCatalogStore } from "@/features/catalog/store/useCatalogStore";
import { useModalStore } from "@/stores/useModalStore";
import {
  coachSchema,
  type CoachFormData,
  type CoachFormInput,
  type CoachDTO,
} from "../schemas";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CoachFormProps {
  coachData?: CoachDTO;
}

export function CoachForm({ coachData }: CoachFormProps) {
  const { createCoach, updateCoach, fetchCoaches } = useCoachStore();
  // Hanya ambil data dari store, JANGAN panggil fetchServices dari sini lagi
  const { services } = useCatalogStore();
  const { closeModal } = useModalStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CoachFormInput, unknown, CoachFormData>({
    resolver: zodResolver(coachSchema),
    defaultValues: {
      name: coachData?.name || "",
      phone: coachData?.phone || "",
      specialty: coachData?.specialty || "",
      bio: coachData?.bio || "",
      status: coachData?.status || "active",
      serviceIds: coachData?.serviceIds || [],
    },
  });

  const onSubmit = async (data: CoachFormData) => {
    setIsSubmitting(true);
    try {
      if (coachData) {
        await updateCoach(coachData.id, data);
        toast.success("Data pelatih berhasil diperbarui");
      } else {
        await createCoach(data);
        toast.success("Pelatih baru berhasil ditambahkan");
      }
      fetchCoaches();
      closeModal();
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#1E293B] mb-1">
          Nama Lengkap
        </label>
        <input
          type="text"
          {...register("name")}
          className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#65C466]"
          placeholder="Contoh: Budi Santoso"
        />
        {errors.name && (
          <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1">
            Nomor Telepon
          </label>
          <input
            type="text"
            {...register("phone")}
            className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#65C466]"
            placeholder="+62..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1">
            Status
          </label>
          <select
            {...register("status")}
            className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#65C466]">
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="suspended">Diberhentikan</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1E293B] mb-1">
          Spesialisasi
        </label>
        <input
          type="text"
          {...register("specialty")}
          className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#65C466]"
          placeholder="Contoh: Powerlifting, Yoga"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1E293B] mb-1">
          Layanan yang Ditangani (Relasi)
        </label>
        <div className="p-3 border border-[#E2E8F0] rounded-md max-h-32 overflow-y-auto bg-gray-50">
          {services.length === 0 ? (
            <p className="text-xs text-[#64748B]">
              Belum ada layanan tersedia.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {services.map((service) => (
                <label
                  key={service.id}
                  className="flex items-center space-x-2 text-sm text-[#1E293B] cursor-pointer">
                  <input
                    type="checkbox"
                    value={service.id}
                    {...register("serviceIds")}
                    className="rounded text-[#65C466] focus:ring-[#65C466]"
                  />
                  <span>{service.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {errors.serviceIds && (
          <p className="text-red-500 text-xs mt-1">
            {errors.serviceIds.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1E293B] mb-1">
          Bio / Catatan
        </label>
        <textarea
          {...register("bio")}
          className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#65C466]"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
        <Button
          type="button"
          variant="outline"
          onClick={closeModal}
          disabled={isSubmitting}>
          Batal
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#65C466] hover:bg-green-600 text-white">
          {isSubmitting ? "Menyimpan..." : "Simpan Pelatih"}
        </Button>
      </div>
    </form>
  );
}
