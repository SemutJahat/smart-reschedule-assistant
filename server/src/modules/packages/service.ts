import { AppError } from "../../shared/errors";
import type { AuthRepository } from "../auth/schema";
import type { CatalogRepository, PackageRecord } from "../coaches/schema";

export interface PackageInput { name: string; category: string; description?: string | null; price: string | number; totalSessions: number; validityDays: number; status?: PackageRecord["status"]; }
export interface PackagePatch { name?: string; category?: string; description?: string | null; price?: string | number; totalSessions?: number; validityDays?: number; status?: PackageRecord["status"]; }

function decimal(value: string | number): string {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || Math.round(parsed * 100) <= 0) throw new AppError("BAD_REQUEST", "Price must be positive", 400);
  return parsed.toFixed(2);
}
function text(value: string, label: string) { const result = value.trim(); if (!result) throw new AppError("BAD_REQUEST", `${label} is required`, 400); return result; }
function validateCounts(totalSessions: number, validityDays: number) { if (!Number.isInteger(totalSessions) || totalSessions <= 0) throw new AppError("BAD_REQUEST", "totalSessions must be positive", 400); if (!Number.isInteger(validityDays) || validityDays < 1) throw new AppError("BAD_REQUEST", "validityDays must be at least 1", 400); }

export class PackageService {
  constructor(readonly repository: CatalogRepository, readonly authRepository: AuthRepository) {}
  async list(status: PackageRecord["status"] = "active") { return (await this.repository.listPackages(status)).map(serializePackage); }
  async create(input: PackageInput) {
    const name = text(input.name, "Package name"); const category = text(input.category, "Package category"); const price = decimal(input.price); validateCounts(input.totalSessions, input.validityDays);
    return this.repository.transaction(async (tx) => serializePackage(await tx.insertPackage({ name, category, description: input.description?.trim() || null, price, totalSessions: input.totalSessions, validityDays: input.validityDays, status: input.status ?? "active" })));
  }
  async update(id: string, input: PackagePatch) {
    return this.repository.transaction(async (tx) => {
      if (!await tx.findPackage(id)) throw new AppError("NOT_FOUND", "Package not found", 404);
      const patch: Partial<PackageRecord> = {};
      if (input.name !== undefined) patch.name = text(input.name, "Package name");
      if (input.category !== undefined) patch.category = text(input.category, "Package category");
      if (input.description !== undefined) patch.description = input.description?.trim() || null;
      if (input.price !== undefined) patch.price = decimal(input.price);
      if (input.totalSessions !== undefined) { if (!Number.isInteger(input.totalSessions) || input.totalSessions <= 0) throw new AppError("BAD_REQUEST", "totalSessions must be positive", 400); patch.totalSessions = input.totalSessions; }
      if (input.validityDays !== undefined) { if (!Number.isInteger(input.validityDays) || input.validityDays < 1) throw new AppError("BAD_REQUEST", "validityDays must be at least 1", 400); patch.validityDays = input.validityDays; }
      if (input.status !== undefined) patch.status = input.status;
      return serializePackage((await tx.updatePackage(id, patch))!);
    });
  }
}

export function serializePackage(item: PackageRecord) { return { ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }; }
