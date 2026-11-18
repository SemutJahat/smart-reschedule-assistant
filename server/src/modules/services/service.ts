import { AppError } from "../../shared/errors";
import type { AuthRepository } from "../auth/schema";
import type { CatalogRepository, ServiceInput, ServiceRecord } from "../coaches/schema";

export interface ServiceCreateInput { name: string; description?: string | null; active?: boolean; }
export interface ServicePatchInput { name?: string; description?: string | null; active?: boolean; }

const MAX_NAME_LENGTH = 120;

function name(value: string) {
  const result = value.trim();
  if (!result) throw new AppError("BAD_REQUEST", "Service name is required", 400);
  if (result.length > MAX_NAME_LENGTH) throw new AppError("BAD_REQUEST", `Service name must be at most ${MAX_NAME_LENGTH} characters`, 400);
  return result;
}

function description(value: string | null | undefined) { return value?.trim() || null; }

function isUniqueViolation(error: unknown) { return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505"); }

export class ServiceCatalogService {
  constructor(readonly repository: CatalogRepository, readonly authRepository: AuthRepository) {}

  async list(includeInactive = false) { return (await this.repository.listServices(!includeInactive)).map(serializeService); }

  async create(input: ServiceCreateInput) {
    const values: ServiceInput = { name: name(input.name), description: description(input.description), active: input.active ?? true };
    return this.write(() => this.repository.transaction(async (tx) => {
      if (await tx.findServiceByName(values.name)) throw duplicate();
      return serializeService(await tx.insertService(values));
    }));
  }

  async update(id: string, input: ServicePatchInput) {
    return this.write(() => this.repository.transaction(async (tx) => {
      if (!await tx.findService(id)) throw new AppError("NOT_FOUND", "Service not found", 404);
      const patch: Partial<ServiceInput> = {};
      if (input.name !== undefined) {
        patch.name = name(input.name);
        const existing = await tx.findServiceByName(patch.name);
        if (existing && existing.id !== id) throw duplicate();
      }
      if (input.description !== undefined) patch.description = description(input.description);
      if (input.active !== undefined) patch.active = input.active;
      return serializeService((await tx.updateService(id, patch))!);
    }));
  }

  private async write<T>(fn: () => Promise<T>) {
    try {
      return await fn();
    } catch (error) {
      if (isUniqueViolation(error)) throw duplicate();
      throw error;
    }
  }
}

function duplicate() { return new AppError("CONFLICT", "Service name already exists", 409); }

export function serializeService(item: ServiceRecord) { return { id: item.id, name: item.name, description: item.description, active: item.active, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }; }
