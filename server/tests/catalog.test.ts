import { beforeEach, expect, test } from "bun:test";
import { InMemoryAuthRepository } from "../src/modules/auth/repository";
import { InMemoryCatalogRepository } from "../src/modules/coaches/schema";
import { createTestApp } from "./helpers/app";
import { ScheduleService } from "../src/modules/schedules/service";
import type { CatalogRepository } from "../src/modules/coaches/schema";

const json = (value: unknown, token?: string) => ({ headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(value) });
const credentials = (response: Response) => response.json() as Promise<{ accessToken: string }>;
let repository: InMemoryAuthRepository;
let catalog: InMemoryCatalogRepository;
let app: ReturnType<typeof createTestApp>;

async function register(email: string, name: string, role?: "admin" | "customer") {
  if (role) {
    const user = await repository.insertUser({ email, passwordHash: await Bun.password.hash("password-123", { algorithm: "argon2id" }), name, role });
    return user;
  }
  const response = await app.handle(new Request("http://localhost/auth/register", { method: "POST", ...json({ email, password: "password-123", name }) }));
  return credentials(response);
}
async function login(email: string) { return credentials(await app.handle(new Request("http://localhost/auth/login", { method: "POST", ...json({ email, password: "password-123" }) }))); }

beforeEach(async () => {
  repository = new InMemoryAuthRepository();
  catalog = new InMemoryCatalogRepository();
  catalog.services.push({ id: crypto.randomUUID(), name: "Yoga", description: null, active: true, createdAt: new Date(), updatedAt: new Date() });
  catalog.services.push({ id: crypto.randomUUID(), name: "Strength", description: null, active: true, createdAt: new Date(), updatedAt: new Date() });
  app = createTestApp({}, repository, catalog);
  await register("admin@example.com", "Admin", "admin");
  await register("customer@example.com", "Customer");
});

test("customers can read catalog but cannot write", async () => {
  const customer = await login("customer@example.com");
  expect((await app.handle(new Request("http://localhost/coaches", { headers: { authorization: `Bearer ${customer.accessToken}` } }))).status).toBe(200);
  expect((await app.handle(new Request("http://localhost/packages", { headers: { authorization: `Bearer ${customer.accessToken}` } }))).status).toBe(200);
  expect((await app.handle(new Request("http://localhost/coaches", { method: "POST", ...json({ name: "Nope" }, customer.accessToken) }))).status).toBe(403);
  expect((await app.handle(new Request("http://localhost/packages", { method: "POST", ...json({ name: "Nope", category: "x", price: 1, totalSessions: 1, validityDays: 1 }, customer.accessToken) }))).status).toBe(403);
  expect((await app.handle(new Request("http://localhost/schedules"))).status).toBe(401);
  expect((await app.handle(new Request("http://localhost/coaches"))).status).toBe(401);
  expect((await app.handle(new Request("http://localhost/packages"))).status).toBe(401);
  expect((await app.handle(new Request("http://localhost/schedules", { headers: { authorization: `Bearer ${customer.accessToken}` } }))).status).toBe(200);
  expect((await app.handle(new Request("http://localhost/schedules", { method: "POST", ...json({ title: "Nope", coachId: crypto.randomUUID(), serviceId: crypto.randomUUID(), startsAt: "2030-01-01T10:00:00.000Z", endsAt: "2030-01-01T11:00:00.000Z", capacity: 1 }, customer.accessToken) }))).status).toBe(403);
});

test("schedule capacity trigger conflicts map to HTTP conflicts", async () => {
  const schedule = { id: crypto.randomUUID(), title: "Capacity", coachId: crypto.randomUUID(), serviceId: crypto.randomUUID(), startsAt: new Date("2030-01-01T10:00:00.000Z"), endsAt: new Date("2030-01-01T11:00:00.000Z"), capacity: 2, status: "available" as const, createdAt: new Date(), updatedAt: new Date() };
  const repository = {
    transaction: async (fn: (tx: CatalogRepository) => Promise<unknown>) => fn(repository as CatalogRepository),
    findSchedule: async () => schedule,
    findCoach: async () => ({ id: schedule.coachId, name: "Coach", phone: null, specialty: null, bio: null, status: "active" as const, serviceIds: [schedule.serviceId], createdAt: new Date(), updatedAt: new Date() }),
    listServicesByIds: async () => [{ id: schedule.serviceId, name: "Service", description: null, active: true, createdAt: new Date(), updatedAt: new Date() }],
    listServicesForCoach: async () => [],
    listSchedules: async () => [schedule],
    countBooked: async () => 1,
    updateSchedule: async () => { throw { code: "P0006", message: "BOOKING_CAPACITY_REDUCTION: schedule has booked rows" }; },
  } as unknown as CatalogRepository;
  const service = new ScheduleService(repository, {} as never);
  await expect(service.update(schedule.id, { capacity: 2 })).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
});

test("admin can create coaches and packages, with service validation and package filters", async () => {
  const admin = await login("admin@example.com");
  const serviceId = catalog.services[0]!.id;
  const coachResponse = await app.handle(new Request("http://localhost/coaches", { method: "POST", ...json({ name: "Coach One", serviceIds: [serviceId, serviceId] }, admin.accessToken) }));
  expect(coachResponse.status).toBe(200);
  const coach = await coachResponse.json() as { id: string; serviceIds: string[] };
  expect(coach.serviceIds).toEqual([serviceId]);
  expect((await app.handle(new Request("http://localhost/coaches", { method: "POST", ...json({ name: "Bad", serviceIds: [crypto.randomUUID()] }, admin.accessToken) }))).status).toBe(400);
  const packageResponse = await app.handle(new Request("http://localhost/packages", { method: "POST", ...json({ name: "Starter", category: "General", price: 25, totalSessions: 5, validityDays: 30 }, admin.accessToken) }));
  expect(packageResponse.status).toBe(200);
  expect((await app.handle(new Request("http://localhost/packages", { method: "POST", ...json({ name: "Invalid", category: "General", price: 0, totalSessions: 5, validityDays: 30 }, admin.accessToken) }))).status).toBe(422);
  for (const invalid of [
    { totalSessions: 0 },
    { totalSessions: 1.5 },
    { validityDays: 0 },
    { validityDays: 1.5 },
    { price: "not-a-price" },
    { price: "0" },
  ]) {
    expect([400, 422]).toContain((await app.handle(new Request("http://localhost/packages", { method: "POST", ...json({ name: "Invalid", category: "General", price: 10, totalSessions: 5, validityDays: 30, ...invalid }, admin.accessToken) }))).status);
  }
  await app.handle(new Request("http://localhost/packages", { method: "POST", ...json({ name: "Inactive", category: "General", price: 10, totalSessions: 5, validityDays: 30, status: "inactive" }, admin.accessToken) }));
  const archived = await app.handle(new Request(`http://localhost/packages/${(await packageResponse.clone().json()).id}`, { method: "PATCH", ...json({ status: "archived" }, admin.accessToken) }));
  expect(archived.status).toBe(200);
  expect((await app.handle(new Request("http://localhost/packages?status=archived", { headers: { authorization: `Bearer ${admin.accessToken}` } }))).status).toBe(200);
  const defaultPackages = await app.handle(new Request("http://localhost/packages", { headers: { authorization: `Bearer ${admin.accessToken}` } }));
  const defaultPackageBody = await defaultPackages.json() as Array<{ name: string }>;
  expect(defaultPackageBody.map((item) => item.name)).toEqual([]);
});

test("schedules validate association, times, overlap, and filters", async () => {
  const admin = await login("admin@example.com");
  const serviceId = catalog.services[0]!.id;
  const otherServiceId = catalog.services[1]!.id;
  const coachResponse = await app.handle(new Request("http://localhost/coaches", { method: "POST", ...json({ name: "Coach One", serviceIds: [serviceId] }, admin.accessToken) }));
  const coach = await coachResponse.json() as { id: string };
  const base = { title: "Morning", coachId: coach.id, serviceId, startsAt: "2030-01-01T10:00:00.000Z", endsAt: "2030-01-01T11:00:00.000Z", capacity: 2 };
  const inactiveCoach = await app.handle(new Request("http://localhost/coaches", { method: "POST", ...json({ name: "Inactive Coach", status: "inactive", serviceIds: [serviceId] }, admin.accessToken) }));
  const inactiveCoachBody = await inactiveCoach.json() as { id: string };
  expect((await app.handle(new Request("http://localhost/schedules", { method: "POST", ...json({ ...base, coachId: inactiveCoachBody.id }, admin.accessToken) }))).status).toBe(400);
  catalog.services[1]!.active = false;
  const inactiveServiceCoach = await app.handle(new Request("http://localhost/coaches", { method: "POST", ...json({ name: "Inactive Service Coach", serviceIds: [otherServiceId] }, admin.accessToken) }));
  const inactiveServiceCoachBody = await inactiveServiceCoach.json() as { id: string };
  expect((await app.handle(new Request("http://localhost/schedules", { method: "POST", ...json({ ...base, coachId: inactiveServiceCoachBody.id, serviceId: otherServiceId }, admin.accessToken) }))).status).toBe(400);
  catalog.services[1]!.active = true;
  for (const invalidCapacity of [0, -1, 1.5]) {
    expect((await app.handle(new Request("http://localhost/schedules", { method: "POST", ...json({ ...base, capacity: invalidCapacity }, admin.accessToken) }))).status).toBe(422);
  }
  expect((await app.handle(new Request("http://localhost/schedules", { method: "POST", ...json({ ...base, endsAt: base.startsAt }, admin.accessToken) }))).status).toBe(400);
  expect((await app.handle(new Request("http://localhost/schedules", { method: "POST", ...json({ ...base, serviceId: otherServiceId }, admin.accessToken) }))).status).toBe(400);
  const created = await app.handle(new Request("http://localhost/schedules", { method: "POST", ...json(base, admin.accessToken) }));
  expect(created.status).toBe(200);
  const createdBody = await created.json() as { id: string; status: string };
  expect(createdBody.status).toBe("available");
  catalog.bookings.push({ id: crypto.randomUUID(), scheduleId: createdBody.id, status: "booked" }, { id: crypto.randomUUID(), scheduleId: createdBody.id, status: "booked" });
  const full = await app.handle(new Request("http://localhost/schedules?status=full", { headers: { authorization: `Bearer ${admin.accessToken}` } }));
  expect((await full.json() as Array<{ id: string; status: string }>).find((item) => item.id === createdBody.id)?.status).toBe("full");
  expect((await app.handle(new Request(`http://localhost/schedules/${createdBody.id}`, { method: "PATCH", ...json({ capacity: 1 }, admin.accessToken) }))).status).toBe(409);
  expect((await app.handle(new Request(`http://localhost/schedules/${createdBody.id}`, { method: "PATCH", ...json({ endsAt: base.startsAt }, admin.accessToken) }))).status).toBe(400);
  const cancelled = await app.handle(new Request("http://localhost/schedules", { method: "POST", ...json({ ...base, title: "Cancelled", status: "cancelled", startsAt: "2030-01-02T10:00:00.000Z", endsAt: "2030-01-02T11:00:00.000Z" }, admin.accessToken) }));
  expect(cancelled.status).toBe(200);
  expect((await cancelled.json() as { status: string }).status).toBe("cancelled");
  const afterCancelled = await app.handle(new Request("http://localhost/schedules", { method: "POST", ...json({ ...base, title: "After Cancelled", startsAt: "2030-01-02T10:00:00.000Z", endsAt: "2030-01-02T11:00:00.000Z" }, admin.accessToken) }));
  expect(afterCancelled.status).toBe(200);
  expect((await afterCancelled.json() as { status: string }).status).toBe("available");
  const later = await app.handle(new Request("http://localhost/schedules", { method: "POST", ...json({ ...base, title: "Available", startsAt: "2030-01-01T11:00:00.000Z", endsAt: "2030-01-01T12:00:00.000Z" }, admin.accessToken) }));
  expect(later.status).toBe(200);
  expect((await app.handle(new Request("http://localhost/schedules", { method: "POST", ...json({ ...base, title: "Overlap", startsAt: "2030-01-01T10:30:00.000Z", endsAt: "2030-01-01T12:00:00.000Z" }, admin.accessToken) }))).status).toBe(409);
  expect((await app.handle(new Request("http://localhost/schedules?date=2030-01-01&status=available", { headers: { authorization: `Bearer ${admin.accessToken}` } }))).status).toBe(200);
});
