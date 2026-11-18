import { z } from "zod";

export const coachSchema = z.object({
  name: z.string().min(1, "Nama pelatih wajib diisi"),
  phone: z.string().nullable().optional(),
  specialty: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
  serviceIds: z.array(z.string().uuid("ID Layanan tidak valid")).default([]),
});

export type CoachFormData = z.output<typeof coachSchema>;
export type CoachFormInput = z.input<typeof coachSchema>;

export interface CoachDTO {
  id: string;
  name: string;
  phone: string | null;
  specialty: string | null;
  bio: string | null;
  status: "active" | "inactive" | "suspended";
  serviceIds: string[];
  createdAt: string;
  updatedAt: string;
}
