import { beforeEach, expect, test } from "bun:test";
import { InMemoryAuthRepository } from "../src/modules/auth/repository";
import { InMemoryCatalogRepository } from "../src/modules/coaches/schema";
import { createTestApp } from "./helpers/app";

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
});

test("admin can create coaches and packages, with service validation and package filters", async () => {
  const admin = await login("admin@example.com");
  const serviceId = catalog.services[0]!.id;
  const coachResponse = await app.handle(new Request("http://localhost/coaches", { method: "POST", ...json({ name: "Coach One", serviceIds: [serviceId] }, admin.accessToken) }));
  expect(coachResponse.status).toBe(200);
  const coach = await coachResponse.json() as { id: string; serviceIds: string[] };
  expect(coach.serviceIds).toEqual([serviceId]);
  expect((await app.handle(new Request("http://localhost/coaches", { method: "POST", ...json({ name: "Bad", serviceIds: [crypto.randomUUID()] }, admin.accessToken) }))).status).toBe(400);
  const packageResponse = await app.handle(new Request("http://localhost/packages", { method: "POST", ...json({ name: "Starter", category: "General", price: 25, totalSessions: 5, validityDays: 30 }, admin.accessToken) }));
  expect(packageResponse.status).toBe(200);
  expect((await app.handle(new Request("http://localhost/packages", { method: "POST", ...json({ name: "Invalid", category: "General", price: 0, totalSessions: 5, validityDays: 30 }, admin.accessToken) }))).status).toBe(422);
  const archived = await app.handle(new Request(`http://localhost/packages/${(await packageResponse.clone().json()).id}`, { method: "PATCH", ...json({ status: "archived" }, admin.accessToken) }));
  expect(archived.status).toBe(200);
  expect((await app.handle(new Request("http://localhost/packages?status=archived", { headers: { authorization: `Bearer ${admin.accessToken}` } }))).status).toBe(200);
});

test("schedules validate association, times, overlap, and filters", async () => {
  const admin = await login("admin@example.com");
  const serviceId = catalog.services[0]!.id;
  const otherServiceId = catalog.services[1]!.id;
  const coachResponse = await app.handle(new Request("http://localhost/coaches", { method: "POST", ...json({ name: "Coach One", serviceIds: [serviceId] }, admin.accessToken) }));
  const coach = await coachResponse.json() as { id: string };
  const base = { title: "Morning", coachId: coach.id, serviceId, startsAt: "2030-01-01T10:00:00.000Z", endsAt: "2030-01-01T11:00:00.000Z", capacity: 2 };
  expect((await app.handle(new Request("http://localhost/schedules", { method: "POST", ...json({ ...base, endsAt: base.startsAt }, admin.accessToken) }))).status).toBe(400);
  expect((await app.handle(new Request("http://localhost/schedules", { method: "POST", ...json({ ...base, serviceId: otherServiceId }, admin.accessToken) }))).status).toBe(400);
  expect((await app.handle(new Request("http://localhost/schedules", { method: "POST", ...json(base, admin.accessToken) }))).status).toBe(200);
  expect((await app.handle(new Request("http://localhost/schedules", { method: "POST", ...json({ ...base, title: "Overlap", startsAt: "2030-01-01T10:30:00.000Z", endsAt: "2030-01-01T12:00:00.000Z" }, admin.accessToken) }))).status).toBe(409);
  expect((await app.handle(new Request("http://localhost/schedules?date=2030-01-01&status=available", { headers: { authorization: `Bearer ${admin.accessToken}` } }))).status).toBe(200);
});
