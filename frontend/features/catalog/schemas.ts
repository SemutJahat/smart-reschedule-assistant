import { z } from "zod";

export const packageSchema = z.object({
  name: z.string().min(1, "Nama paket wajib diisi"),
  category: z.string().min(1, "Kategori paket wajib diisi"),
  description: z.string().optional().nullable(),
  price: z.coerce
    .number({
      error: (issue) =>
        issue.input === undefined || issue.input === ""
          ? "Harga wajib diisi"
          : "Harga harus berupa angka",
    })
    .positive("Harga harus lebih dari 0"),
  totalSessions: z.coerce
    .number({
      error: (issue) =>
        issue.input === undefined || issue.input === ""
          ? "Total sesi wajib diisi"
          : "Total sesi harus berupa angka",
    })
    .int("Total sesi harus berupa bilangan bulat")
    .positive("Total sesi harus lebih dari 0"),
  validityDays: z.coerce
    .number({
      error: (issue) =>
        issue.input === undefined || issue.input === ""
          ? "Masa berlaku wajib diisi"
          : "Masa berlaku harus berupa angka",
    })
    .int("Masa berlaku harus berupa bilangan bulat")
    .positive("Masa berlaku harus lebih dari 0"),
  status: z.enum(["active", "inactive", "archived"] as const).default("active"),
});

// Input = nilai mentah dari form (sebelum coerce), Data = hasil setelah divalidasi
export type PackageFormInput = z.input<typeof packageSchema>;
export type PackageFormData = z.output<typeof packageSchema>;

export const serviceFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama layanan wajib diisi")
    .max(120, "Nama layanan maksimal 120 karakter"),
  description: z.string().optional(),
  active: z.boolean(),
});

export type ServiceFormInput = z.input<typeof serviceFormSchema>;
export type ServiceFormData = z.output<typeof serviceFormSchema>;

// Tipe data (DTO) yang sesuai dengan respons backend
export interface PackageDTO {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: string; // Backend Drizzle mengembalikan numeric sebagai string
  totalSessions: number;
  validityDays: number;
  status: "active" | "inactive" | "archived";
  createdAt: string;
  updatedAt: string;
}
