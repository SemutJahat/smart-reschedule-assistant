import { and, count, eq, inArray, sql } from "drizzle-orm";
import { bookings, coachServices, coaches, packages, schedules, services } from "../../db/schema";
import type { Database } from "../../db/client";
import type { AuthRepository } from "../auth/schema";
import { AppError } from "../../shared/errors";
import type { CatalogRepository, CoachInput, CoachPatch, CoachRecord, PackageRecord, ScheduleRecord } from "./schema";

type DbExecutor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

const cleanNullable = (value: string | null | undefined) => value === undefined || value === null ? null : value.trim() || null;
const uniqueIds = (ids: string[] | undefined) => [...new Set(ids ?? [])];

function coach(row: typeof coaches.$inferSelect, serviceIds: string[] = []): CoachRecord {
  return { ...row, serviceIds };
}

export class DrizzleCatalogRepository implements CatalogRepository {
  constructor(private readonly db: DbExecutor, private readonly inTransaction = false) {}
  async transaction<T>(fn: (tx: CatalogRepository) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx: any) => {
      // Serialize catalog writes so concurrent overlap/association checks see committed changes.
      await tx.execute(sql`select pg_advisory_xact_lock(731004)`);
      return fn(new DrizzleCatalogRepository(tx, true));
    });
  }
  async listCoaches() {
    const rows = await this.db.select().from(coaches);
    return Promise.all(rows.map(async (row: typeof coaches.$inferSelect) => coach(row, (await this.listServicesForCoach(row.id)).map((item) => item.id))));
  }
  async findCoach(id: string) { const rows = await this.db.select().from(coaches).where(eq(coaches.id, id)).limit(1); return rows[0] ? coach(rows[0], (await this.listServicesForCoach(id)).map((item) => item.id)) : null; }
  async insertCoach(input: Omit<CoachRecord, "id" | "serviceIds" | "createdAt" | "updatedAt">) { const rows = await this.db.insert(coaches).values(input).returning(); return coach(rows[0]); }
  async updateCoach(id: string, patch: Partial<Omit<CoachRecord, "id" | "serviceIds" | "createdAt" | "updatedAt">>) { const rows = await this.db.update(coaches).set({ ...patch, updatedAt: new Date() }).where(eq(coaches.id, id)).returning(); return rows[0] ? coach(rows[0], (await this.listServicesForCoach(id)).map((item) => item.id)) : null; }
  async replaceCoachServices(coachId: string, serviceIds: string[]) {
    const current = await this.listServicesForCoach(coachId);
    const removed = current.filter((item) => !serviceIds.includes(item.id)).map((item) => item.id);
    // Preserve unchanged rows: schedules have a composite FK to these associations.
    if (removed.length) await this.db.delete(coachServices).where(and(eq(coachServices.coachId, coachId), inArray(coachServices.serviceId, removed)));
    const added = serviceIds.filter((id) => !current.some((item) => item.id === id));
    if (added.length) await this.db.insert(coachServices).values(added.map((serviceId) => ({ coachId, serviceId })));
  }
  async listServicesByIds(ids: string[]) { if (!ids.length) return []; return this.db.select().from(services).where(inArray(services.id, ids)); }
  async listServicesForCoach(coachId: string) { const rows = await this.db.select({ service: services }).from(coachServices).innerJoin(services, eq(coachServices.serviceId, services.id)).where(eq(coachServices.coachId, coachId)); return rows.map((row) => row.service); }
  async listPackages(status?: PackageRecord["status"]) { return this.db.select().from(packages).where(status ? eq(packages.status, status) : undefined); }
  async findPackage(id: string) { const rows = await this.db.select().from(packages).where(eq(packages.id, id)).limit(1); return rows[0] ?? null; }
  async insertPackage(input: Omit<PackageRecord, "id" | "createdAt" | "updatedAt">) { const rows = await this.db.insert(packages).values(input).returning(); return rows[0]; }
  async updatePackage(id: string, patch: Partial<Omit<PackageRecord, "id" | "createdAt" | "updatedAt">>) { const rows = await this.db.update(packages).set({ ...patch, updatedAt: new Date() }).where(eq(packages.id, id)).returning(); return rows[0] ?? null; }
  async listSchedules() { return this.db.select().from(schedules); }
  async findSchedule(id: string) {
    const query = this.db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
    const rows = await (this.inTransaction ? query.for("update") : query);
    return rows[0] ?? null;
  }
  async insertSchedule(input: Omit<ScheduleRecord, "id" | "createdAt" | "updatedAt">) { const rows = await this.db.insert(schedules).values(input).returning(); return rows[0]; }
  async updateSchedule(id: string, patch: Partial<Omit<ScheduleRecord, "id" | "createdAt" | "updatedAt">>) { const rows = await this.db.update(schedules).set({ ...patch, updatedAt: new Date() }).where(eq(schedules.id, id)).returning(); return rows[0] ?? null; }
  async countBooked(scheduleId: string) { const rows = await this.db.select({ count: count() }).from(bookings).where(and(eq(bookings.scheduleId, scheduleId), eq(bookings.status, "booked"))); return Number(rows[0]?.count ?? 0); }
}

export function createCatalogRepository(db: Database): CatalogRepository { return new DrizzleCatalogRepository(db); }

export class CoachService {
  constructor(readonly repository: CatalogRepository, readonly authRepository: AuthRepository) {}
  async list() { return (await this.repository.listCoaches()).map(serializeCoach); }
  async create(input: CoachInput) {
    const serviceIds = uniqueIds(input.serviceIds);
    validateName(input.name);
    return this.repository.transaction(async (tx) => {
      await assertServices(tx, serviceIds);
      const created = await tx.insertCoach({ name: input.name.trim(), phone: cleanNullable(input.phone), specialty: cleanNullable(input.specialty), bio: cleanNullable(input.bio), status: input.status ?? "active" });
      await tx.replaceCoachServices(created.id, serviceIds);
      return serializeCoach((await tx.findCoach(created.id))!);
    });
  }
  async update(id: string, input: CoachPatch) {
    return this.repository.transaction(async (tx) => {
      const current = await tx.findCoach(id);
      if (!current) throw new AppError("NOT_FOUND", "Coach not found", 404);
      const serviceIds = input.serviceIds === undefined ? current.serviceIds : uniqueIds(input.serviceIds);
      await assertServices(tx, serviceIds);
      if (input.serviceIds !== undefined && (await tx.listSchedules()).some((item) => item.coachId === id && !serviceIds.includes(item.serviceId))) throw new AppError("CONFLICT", "Cannot remove a service referenced by a schedule", 409);
      const patch = { ...(input.name === undefined ? {} : { name: input.name.trim() }), ...(input.phone === undefined ? {} : { phone: cleanNullable(input.phone) }), ...(input.specialty === undefined ? {} : { specialty: cleanNullable(input.specialty) }), ...(input.bio === undefined ? {} : { bio: cleanNullable(input.bio) }), ...(input.status === undefined ? {} : { status: input.status }) };
      if (input.name !== undefined) validateName(input.name);
      await tx.updateCoach(id, patch);
      if (input.serviceIds !== undefined) await tx.replaceCoachServices(id, serviceIds);
      return serializeCoach((await tx.findCoach(id))!);
    });
  }
}

async function assertServices(repository: CatalogRepository, ids: string[]) { const found = await repository.listServicesByIds(ids); if (found.length !== ids.length) throw new AppError("BAD_REQUEST", "One or more services were not found", 400); }
function validateName(name: string) { if (!name.trim()) throw new AppError("BAD_REQUEST", "Coach name is required", 400); }
export function serializeCoach(item: CoachRecord) { return { ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }; }
