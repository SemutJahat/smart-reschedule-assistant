export type CoachStatus = "active" | "inactive" | "suspended";

export interface ServiceRecord {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CoachRecord {
  id: string;
  name: string;
  phone: string | null;
  specialty: string | null;
  bio: string | null;
  status: CoachStatus;
  serviceIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CoachInput {
  name: string;
  phone?: string | null;
  specialty?: string | null;
  bio?: string | null;
  status?: CoachStatus;
  serviceIds?: string[];
}

export interface CoachPatch {
  name?: string;
  phone?: string | null;
  specialty?: string | null;
  bio?: string | null;
  status?: CoachStatus;
  serviceIds?: string[];
}

export interface PackageRecord {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: string;
  totalSessions: number;
  validityDays: number;
  status: "active" | "inactive" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleRecord {
  id: string;
  title: string;
  coachId: string;
  serviceId: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  status: "available" | "full" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

export interface CatalogBookingRecord {
  id: string;
  scheduleId: string;
  status: "booked" | "cancelled" | "attended" | "no_show";
}

export interface CatalogRepository {
  transaction<T>(fn: (tx: CatalogRepository) => Promise<T>): Promise<T>;
  listCoaches(): Promise<CoachRecord[]>;
  findCoach(id: string): Promise<CoachRecord | null>;
  insertCoach(input: Omit<CoachRecord, "id" | "serviceIds" | "createdAt" | "updatedAt">): Promise<CoachRecord>;
  updateCoach(id: string, patch: Partial<Omit<CoachRecord, "id" | "serviceIds" | "createdAt" | "updatedAt">>): Promise<CoachRecord | null>;
  replaceCoachServices(coachId: string, serviceIds: string[]): Promise<void>;
  listServicesByIds(ids: string[]): Promise<ServiceRecord[]>;
  listServicesForCoach(coachId: string): Promise<ServiceRecord[]>;
  listPackages(status?: PackageRecord["status"]): Promise<PackageRecord[]>;
  findPackage(id: string): Promise<PackageRecord | null>;
  insertPackage(input: Omit<PackageRecord, "id" | "createdAt" | "updatedAt">): Promise<PackageRecord>;
  updatePackage(id: string, patch: Partial<Omit<PackageRecord, "id" | "createdAt" | "updatedAt">>): Promise<PackageRecord | null>;
  listSchedules(): Promise<ScheduleRecord[]>;
  findSchedule(id: string): Promise<ScheduleRecord | null>;
  insertSchedule(input: Omit<ScheduleRecord, "id" | "createdAt" | "updatedAt">): Promise<ScheduleRecord>;
  updateSchedule(id: string, patch: Partial<Omit<ScheduleRecord, "id" | "createdAt" | "updatedAt">>): Promise<ScheduleRecord | null>;
  countBooked(scheduleId: string): Promise<number>;
}

type CatalogArrays = {
  services: ServiceRecord[];
  coaches: CoachRecord[];
  coachServices: { coachId: string; serviceId: string }[];
  packages: PackageRecord[];
  schedules: ScheduleRecord[];
  bookings: CatalogBookingRecord[];
};

function cloneDate(value: Date): Date { return new Date(value); }

function cloneArrays(source: CatalogArrays): CatalogArrays {
  return {
    services: source.services.map((item) => ({ ...item, createdAt: cloneDate(item.createdAt), updatedAt: cloneDate(item.updatedAt) })),
    coaches: source.coaches.map((item) => ({ ...item, serviceIds: [...item.serviceIds], createdAt: cloneDate(item.createdAt), updatedAt: cloneDate(item.updatedAt) })),
    coachServices: source.coachServices.map((item) => ({ ...item })),
    packages: source.packages.map((item) => ({ ...item, createdAt: cloneDate(item.createdAt), updatedAt: cloneDate(item.updatedAt) })),
    schedules: source.schedules.map((item) => ({ ...item, startsAt: cloneDate(item.startsAt), endsAt: cloneDate(item.endsAt), createdAt: cloneDate(item.createdAt), updatedAt: cloneDate(item.updatedAt) })),
    bookings: source.bookings.map((item) => ({ ...item })),
  };
}

/** Injectable repository for route tests and local development without PostgreSQL. */
export class InMemoryCatalogRepository implements CatalogRepository {
  readonly services: ServiceRecord[] = [];
  readonly coaches: CoachRecord[] = [];
  readonly coachServices: { coachId: string; serviceId: string }[] = [];
  readonly packages: PackageRecord[] = [];
  readonly schedules: ScheduleRecord[] = [];
  readonly bookings: CatalogBookingRecord[] = [];
  private transactionTail: Promise<void> = Promise.resolve();

  async transaction<T>(fn: (tx: CatalogRepository) => Promise<T>): Promise<T> {
    let release!: () => void;
    const previous = this.transactionTail;
    this.transactionTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    const snapshot = cloneArrays(this);
    try {
      return await fn(this);
    } catch (error) {
      this.services.splice(0, this.services.length, ...snapshot.services);
      this.coaches.splice(0, this.coaches.length, ...snapshot.coaches);
      this.coachServices.splice(0, this.coachServices.length, ...snapshot.coachServices);
      this.packages.splice(0, this.packages.length, ...snapshot.packages);
      this.schedules.splice(0, this.schedules.length, ...snapshot.schedules);
      this.bookings.splice(0, this.bookings.length, ...snapshot.bookings);
      throw error;
    } finally {
      release();
    }
  }

  async listCoaches() { return this.coaches.map((item) => ({ ...item, serviceIds: [...item.serviceIds] })); }
  async findCoach(id: string) { const item = this.coaches.find((coach) => coach.id === id); return item ? { ...item, serviceIds: [...item.serviceIds] } : null; }
  async insertCoach(input: Omit<CoachRecord, "id" | "serviceIds" | "createdAt" | "updatedAt">) {
    const now = new Date();
    const item: CoachRecord = { ...input, id: crypto.randomUUID(), serviceIds: [], createdAt: now, updatedAt: now };
    this.coaches.push(item);
    return { ...item, serviceIds: [] };
  }
  async updateCoach(id: string, patch: Partial<Omit<CoachRecord, "id" | "serviceIds" | "createdAt" | "updatedAt">>) {
    const item = this.coaches.find((coach) => coach.id === id);
    if (!item) return null;
    Object.assign(item, patch, { updatedAt: new Date() });
    return { ...item, serviceIds: [...item.serviceIds] };
  }
  async replaceCoachServices(coachId: string, serviceIds: string[]) {
    this.coachServices.splice(0, this.coachServices.length, ...this.coachServices.filter((item) => item.coachId !== coachId));
    this.coachServices.push(...serviceIds.map((serviceId) => ({ coachId, serviceId })));
    const coach = this.coaches.find((item) => item.id === coachId);
    if (coach) coach.serviceIds = [...serviceIds];
  }
  async listServicesByIds(ids: string[]) { return this.services.filter((item) => ids.includes(item.id)); }
  async listServicesForCoach(coachId: string) {
    const ids = this.coachServices.filter((item) => item.coachId === coachId).map((item) => item.serviceId);
    return this.listServicesByIds(ids);
  }
  async listPackages(status?: PackageRecord["status"]) { return this.packages.filter((item) => !status || item.status === status).map((item) => ({ ...item })); }
  async findPackage(id: string) { const item = this.packages.find((value) => value.id === id); return item ? { ...item } : null; }
  async insertPackage(input: Omit<PackageRecord, "id" | "createdAt" | "updatedAt">) { const now = new Date(); const item = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now }; this.packages.push(item); return { ...item }; }
  async updatePackage(id: string, patch: Partial<Omit<PackageRecord, "id" | "createdAt" | "updatedAt">>) { const item = this.packages.find((value) => value.id === id); if (!item) return null; Object.assign(item, patch, { updatedAt: new Date() }); return { ...item }; }
  async listSchedules() { return this.schedules.map((item) => ({ ...item, startsAt: cloneDate(item.startsAt), endsAt: cloneDate(item.endsAt) })); }
  async findSchedule(id: string) { const item = this.schedules.find((value) => value.id === id); return item ? { ...item, startsAt: cloneDate(item.startsAt), endsAt: cloneDate(item.endsAt) } : null; }
  async insertSchedule(input: Omit<ScheduleRecord, "id" | "createdAt" | "updatedAt">) { const now = new Date(); const item = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now }; this.schedules.push(item); return { ...item, startsAt: cloneDate(item.startsAt), endsAt: cloneDate(item.endsAt) }; }
  async updateSchedule(id: string, patch: Partial<Omit<ScheduleRecord, "id" | "createdAt" | "updatedAt">>) { const item = this.schedules.find((value) => value.id === id); if (!item) return null; Object.assign(item, patch, { updatedAt: new Date() }); return { ...item, startsAt: cloneDate(item.startsAt), endsAt: cloneDate(item.endsAt) }; }
  async countBooked(scheduleId: string) { return this.bookings.filter((item) => item.scheduleId === scheduleId && item.status === "booked").length; }
}
