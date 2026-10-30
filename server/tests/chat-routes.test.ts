import { beforeEach, expect, test } from "bun:test";
import { InMemoryAuthRepository } from "../src/modules/auth/repository";
import { InMemoryCatalogRepository } from "../src/modules/coaches/schema";
import { InMemoryPaymentRepository } from "../src/modules/payments/repository";
import { InMemoryBookingRepository } from "../src/modules/bookings/repository";
import { createTestApp } from "./helpers/app";

const json = (value: unknown, token?: string) => ({
  headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(value),
});
const credentials = (response: Response) => response.json() as Promise<{ accessToken: string }>;
const id = () => crypto.randomUUID();

let auth: InMemoryAuthRepository;
let catalog: InMemoryCatalogRepository;
let payments: InMemoryPaymentRepository;
let app: ReturnType<typeof createTestApp>;
let customerToken: string;
let otherToken: string;
let bookingId: string;
let targetScheduleId: string;

async function login(email: string) {
  return credentials(await app.handle(new Request("http://localhost/auth/login", { method: "POST", ...json({ email, password: "password-123" }) })));
}

beforeEach(async () => {
  auth = new InMemoryAuthRepository();
  catalog = new InMemoryCatalogRepository();
  payments = new InMemoryPaymentRepository(catalog);
  app = createTestApp({}, auth, catalog, payments);
  const customer = await auth.insertUser({ email: "chat-customer@example.com", passwordHash: await Bun.password.hash("password-123", { algorithm: "argon2id" }), name: "Chat Customer" });
  const other = await auth.insertUser({ email: "chat-other@example.com", passwordHash: await Bun.password.hash("password-123", { algorithm: "argon2id" }), name: "Other Customer" });
  const member = await auth.insertMember({ userId: customer.id, memberNumber: "CHAT-1" });
  await auth.insertMember({ userId: other.id, memberNumber: "CHAT-2" });
  customerToken = (await login(customer.email)).accessToken;
  otherToken = (await login(other.email)).accessToken;

  const serviceId = id();
  const sourceScheduleId = id();
  targetScheduleId = id();
  const schedule = (scheduleId: string, title: string) => ({ id: scheduleId, title, coachId: id(), serviceId, startsAt: new Date("2030-01-02T10:00:00.000Z"), endsAt: new Date("2030-01-02T11:00:00.000Z"), capacity: 2, status: "available" as const, createdAt: new Date(), updatedAt: new Date() });
  catalog.schedules.push(schedule(sourceScheduleId, "Source"), schedule(targetScheduleId, "Target"));
  const subscriptionId = id();
  payments.subscriptions.push({ id: subscriptionId, memberId: member.id, packageId: id(), status: "active", startsAt: new Date("2029-01-01T00:00:00.000Z"), expiresAt: new Date("2030-12-31T00:00:00.000Z"), totalSessions: 5, usedSessions: 1, amountPaid: "10.00", createdAt: new Date(), updatedAt: new Date() });
  bookingId = id();
  catalog.bookings.push({ id: bookingId, memberId: member.id, subscriptionId, scheduleId: sourceScheduleId, status: "booked", bookedAt: new Date(), cancelledAt: null, createdAt: new Date(), updatedAt: new Date() });
});

test("chat routes create, message, confirm, and read a pending reschedule", async () => {
  const created = await app.handle(new Request("http://localhost/chat/sessions", { method: "POST", ...json({ bookingId }, customerToken) }));
  expect(created.status).toBe(201);
  const session = await created.json() as { id: string };

  const message = await app.handle(new Request(`http://localhost/chat/sessions/${session.id}/messages`, { method: "POST", ...json({ message: "Please move me", clientMessageId: id() }, customerToken) }));
  expect(message.status).toBe(200);
  expect((await message.clone().json()).session.status).toBe("awaiting_confirmation");

  const confirmed = await app.handle(new Request(`http://localhost/chat/sessions/${session.id}/confirm`, { method: "POST", ...json({ scheduleId: targetScheduleId }, customerToken) }));
  expect(confirmed.status).toBe(201);
  expect((await confirmed.clone().json()).request.status).toBe("pending");

  expect((await app.handle(new Request(`http://localhost/chat/sessions/${session.id}`, { headers: { authorization: `Bearer ${customerToken}` } }))).status).toBe(200);
  expect((await app.handle(new Request(`http://localhost/chat/sessions/${session.id}/messages`, { headers: { authorization: `Bearer ${customerToken}` } }))).status).toBe(200);
});

test("chat routes enforce authentication and ownership", async () => {
  expect((await app.handle(new Request("http://localhost/chat/sessions", { method: "POST", ...json({ bookingId }) }))).status).toBe(401);
  const created = await app.handle(new Request("http://localhost/chat/sessions", { method: "POST", ...json({ bookingId }, customerToken) }));
  const session = await created.json() as { id: string };
  expect((await app.handle(new Request(`http://localhost/chat/sessions/${session.id}`, { headers: { authorization: `Bearer ${otherToken}` } }))).status).toBe(403);
});

test("chat routes reject malformed requests with validation envelopes", async () => {
  const response = await app.handle(new Request("http://localhost/chat/sessions", { method: "POST", ...json({ bookingId: "not-a-uuid" }, customerToken) }));
  expect(response.status).toBe(422);
  expect(await response.json()).toEqual({ error: { code: "VALIDATION_ERROR", message: "Request validation failed" } });
});

test("chat message returns NO_AVAILABLE_SCHEDULE and terminal sessions reject messages", async () => {
  catalog.schedules.splice(1, 1);
  const created = await app.handle(new Request("http://localhost/chat/sessions", { method: "POST", ...json({ bookingId }, customerToken) }));
  const session = await created.json() as { id: string };
  const unavailable = await app.handle(new Request(`http://localhost/chat/sessions/${session.id}/messages`, { method: "POST", ...json({ message: "Move me" }, customerToken) }));
  expect(unavailable.status).toBe(409);
  expect((await unavailable.json()).error.code).toBe("NO_AVAILABLE_SCHEDULE");

  catalog.schedules.push({ id: targetScheduleId, title: "Target", coachId: id(), serviceId: catalog.schedules[0]!.serviceId, startsAt: new Date("2030-01-02T10:00:00.000Z"), endsAt: new Date("2030-01-02T11:00:00.000Z"), capacity: 2, status: "available", createdAt: new Date(), updatedAt: new Date() });
  const turn = await app.handle(new Request(`http://localhost/chat/sessions/${session.id}/messages`, { method: "POST", ...json({ message: "Move me" }, customerToken) }));
  expect(turn.status).toBe(200);
  await app.handle(new Request(`http://localhost/chat/sessions/${session.id}/confirm`, { method: "POST", ...json({ scheduleId: targetScheduleId }, customerToken) }));
  const terminal = await app.handle(new Request(`http://localhost/chat/sessions/${session.id}/messages`, { method: "POST", ...json({ message: "Again" }, customerToken) }));
  expect(terminal.status).toBe(409);
  expect((await terminal.json()).error.code).toBe("CHAT_SESSION_CLOSED");
});
