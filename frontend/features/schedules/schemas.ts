import { z } from "zod";

export const scheduleSchema = z
  .object({
    title: z.string().min(1, "Judul jadwal wajib diisi"),
    coachId: z.string().uuid("Pilih pelatih yang valid"),
    serviceId: z.string().uuid("Pilih layanan yang valid"),
    startsAt: z.string().min(1, "Waktu mulai wajib diisi"),
    endsAt: z.string().min(1, "Waktu selesai wajib diisi"),
    capacity: z.number().int().min(1, "Kapasitas minimal 1 peserta"),
    status: z
      .enum(["available", "full", "cancelled"])
      .default("available")
      .optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startsAt).getTime();
      const end = new Date(data.endsAt).getTime();
      return end > start;
    },
    {
      message: "Waktu selesai harus lebih besar dari waktu mulai",
      path: ["endsAt"], 
    },
  );

export type ScheduleFormData = z.infer<typeof scheduleSchema>;


export interface ScheduleDTO {
  id: string;
  title: string;
  coachId: string;
  coachName?: string;
  serviceId: string;
  serviceName?: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  status: "available" | "full" | "cancelled";
  createdAt: string;
  updatedAt: string;
}
