import { beforeEach, expect, test } from "bun:test";
import { InMemoryAuthRepository } from "../src/modules/auth/repository";
import { InMemoryCatalogRepository } from "../src/modules/coaches/schema";
import { InMemoryPaymentRepository } from "../src/modules/payments/repository";
import { createTestApp } from "./helpers/app";

const id = () => crypto.randomUUID();
const json = (value: unknown, token?: string) => ({ headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(value) });
const credentials = (response: Response) => response.json() as Promise<{ accessToken: string }>;

let auth: InMemoryAuthRepository;
let catalog: InMemoryCatalogRepository;
let payments: InMemoryPaymentRepository;
let app: ReturnType<typeof createTestApp>;
let customerToken: string;
let otherToken: string;
let adminToken: string;
let bookingId: string;
let memberId: string;
let sourceId: string;
let targetId: string;

async function login(email: string) { return credentials(await app.handle(new Request("http://localhost/auth/login", { method: "POST", ...json({ email, password: "password-123" }) }))); }
function schedule(scheduleId: string, capacity = 2, status: "available" | "full" | "cancelled" = "available") {
  const startsAt = new Date(Date.now() + 86_400_000); startsAt.setUTCHours(12, 0, 0, 0);
  return { id: scheduleId, title: "Class", coachId: id(), serviceId: id(), startsAt, endsAt: new Date(startsAt.getTime() + 3_600_000), capacity, status, createdAt: new Date(), updatedAt: new Date() };
}

beforeEach(async () => {
  auth = new InMemoryAuthRepository(); catalog = new InMemoryCatalogRepository(); payments = new InMemoryPaymentRepository(catalog); app = createTestApp({}, auth, catalog, payments);
  const passwordHash = await Bun.password.hash("password-123", { algorithm: "argon2id" });
  const admin = await auth.insertUser({ email: "admin@example.com", passwordHash, name: "Admin", role: "admin" });
  const customer = await auth.insertUser({ email: "customer@example.com", passwordHash, name: "Customer" });
  const other = await auth.insertUser({ email: "other@example.com", passwordHash, name: "Other" });
  const member = await auth.insertMember({ userId: customer.id, memberNumber: "M-1" });
  memberId = member.id;
  await auth.insertMember({ userId: other.id, memberNumber: "M-2" });
  adminToken = (await login(admin.email)).accessToken; customerToken = (await login(customer.email)).accessToken; otherToken = (await login(other.email)).accessToken;
  sourceId = id(); targetId = id(); catalog.schedules.push(schedule(sourceId, 2), schedule(targetId, 2));
  const subscriptionId = id();
  payments.subscriptions.push({ id: subscriptionId, memberId: member.id, packageId: id(), status: "active", startsAt: new Date(Date.now() - 86_400_000), expiresAt: new Date(Date.now() + 86_400_000), totalSessions: 2, usedSessions: 1, amountPaid: "10.00", createdAt: new Date(), updatedAt: new Date() });
  const booking = await (await app.handle(new Request("http://localhost/bookings", { method: "POST", ...json({ scheduleId: sourceId, subscriptionId }, customerToken) }))).json() as { id: string };
  bookingId = booking.id;
});

test("creates requests only for the owner and isolates customer lists", async () => {
  expect((await app.handle(new Request("http://localhost/reschedule-requests", { method: "POST", ...json({ bookingId, requestedScheduleId: targetId, customerMessage: "Please move me" }, otherToken) }))).status).toBe(403);
  const created = await app.handle(new Request("http://localhost/reschedule-requests", { method: "POST", ...json({ bookingId, requestedScheduleId: targetId, customerMessage: "Please move me" }, customerToken) }));
  expect(created.status).toBe(200);
  expect((await app.handle(new Request("http://localhost/reschedule-requests/me", { headers: { authorization: `Bearer ${otherToken}` } }))).json()).resolves.toHaveLength(0);
  expect((await app.handle(new Request("http://localhost/reschedule-requests", { headers: { authorization: `Bearer ${adminToken}` } }))).status).toBe(200);
});

test("rejects a reschedule request for a non-booked booking", async () => {
  const cancelled = await app.handle(new Request(`http://localhost/bookings/${bookingId}/cancel`, { method: "PATCH", headers: { authorization: `Bearer ${customerToken}` } }));
  expect(cancelled.status).toBe(200);
  const response = await app.handle(new Request("http://localhost/reschedule-requests", { method: "POST", ...json({ bookingId, requestedScheduleId: targetId, customerMessage: "x" }, customerToken) }));
  expect(response.status).toBe(409);
});

test("admin filters by status and member while customers cannot use admin endpoints", async () => {
  const created = await app.handle(new Request("http://localhost/reschedule-requests", { method: "POST", ...json({ bookingId, requestedScheduleId: targetId, customerMessage: "x" }, customerToken) }));
  const request = await created.json() as { id: string };
  await app.handle(new Request(`http://localhost/reschedule-requests/${request.id}/review`, { method: "PATCH", ...json({ decision: "held" }, adminToken) }));
  const filtered = await app.handle(new Request(`http://localhost/reschedule-requests?status=held&memberId=${memberId}`, { headers: { authorization: `Bearer ${adminToken}` } }));
  expect(filtered.status).toBe(200);
  expect(await filtered.json()).toHaveLength(1);
  expect((await app.handle(new Request("http://localhost/reschedule-requests", { headers: { authorization: `Bearer ${customerToken}` } }))).status).toBe(403);
});

test("rejects same, cancelled, full, and duplicate requests", async () => {
  for (const requestedScheduleId of [sourceId]) expect((await app.handle(new Request("http://localhost/reschedule-requests", { method: "POST", ...json({ bookingId, requestedScheduleId, customerMessage: "x" }, customerToken) }))).status).toBe(409);
  catalog.schedules.find((item) => item.id === targetId)!.status = "cancelled";
  expect((await app.handle(new Request("http://localhost/reschedule-requests", { method: "POST", ...json({ bookingId, requestedScheduleId: targetId, customerMessage: "x" }, customerToken) }))).status).toBe(409);
  catalog.schedules.find((item) => item.id === targetId)!.status = "available";
  catalog.schedules.find((item) => item.id === targetId)!.capacity = 1;
  catalog.bookings.push({ id: id(), scheduleId: targetId, status: "booked" });
  expect((await app.handle(new Request("http://localhost/reschedule-requests", { method: "POST", ...json({ bookingId, requestedScheduleId: targetId, customerMessage: "x" }, customerToken) }))).status).toBe(409);
  catalog.bookings.splice(catalog.bookings.findIndex((item) => item.scheduleId === targetId), 1);
  expect((await app.handle(new Request("http://localhost/reschedule-requests", { method: "POST", ...json({ bookingId, requestedScheduleId: targetId, customerMessage: "x" }, customerToken) }))).status).toBe(200);
  expect((await app.handle(new Request("http://localhost/reschedule-requests", { method: "POST", ...json({ bookingId, requestedScheduleId: targetId, customerMessage: "x" }, customerToken) }))).status).toBe(409);
});

test("held requests can be rejected without moving the booking", async () => {
  const created = await app.handle(new Request("http://localhost/reschedule-requests", { method: "POST", ...json({ bookingId, requestedScheduleId: targetId, customerMessage: "x" }, customerToken) }));
  const request = await created.json() as { id: string };
  const held = await app.handle(new Request(`http://localhost/reschedule-requests/${request.id}/review`, { method: "PATCH", ...json({ decision: "held", adminNote: "Need to verify" }, adminToken) }));
  expect(held.status).toBe(200); expect(catalog.bookings.find((item) => item.id === bookingId)?.scheduleId).toBe(sourceId);
  const rejected = await app.handle(new Request(`http://localhost/reschedule-requests/${request.id}/review`, { method: "PATCH", ...json({ decision: "rejected" }, adminToken) }));
  expect(rejected.status).toBe(200);
  expect(catalog.bookings.find((item) => item.id === bookingId)?.scheduleId).toBe(sourceId);
});

test("held requests can later be approved", async () => {
  const created = await app.handle(new Request("http://localhost/reschedule-requests", { method: "POST", ...json({ bookingId, requestedScheduleId: targetId, customerMessage: "x" }, customerToken) }));
  const request = await created.json() as { id: string };
  expect((await app.handle(new Request(`http://localhost/reschedule-requests/${request.id}/review`, { method: "PATCH", ...json({ decision: "held" }, adminToken) }))).status).toBe(200);
  expect((await app.handle(new Request(`http://localhost/reschedule-requests/${request.id}/review`, { method: "PATCH", ...json({ decision: "approved" }, adminToken) }))).status).toBe(200);
  expect(catalog.bookings.find((item) => item.id === bookingId)?.scheduleId).toBe(targetId);
});

test("approved request moves booking, updates both schedule statuses, and records reviewer", async () => {
  const created = await app.handle(new Request("http://localhost/reschedule-requests", { method: "POST", ...json({ bookingId, requestedScheduleId: targetId, customerMessage: "x" }, customerToken) }));
  const request = await created.json() as { id: string };
  const reviewed = await app.handle(new Request(`http://localhost/reschedule-requests/${request.id}/review`, { method: "PATCH", ...json({ decision: "approved", adminNote: "Approved" }, adminToken) }));
  const body = await reviewed.json() as { status: string; reviewedBy: string; adminNote: string };
  expect(reviewed.status).toBe(200); expect(body.status).toBe("approved"); expect(body.reviewedBy).toBeDefined(); expect(body.adminNote).toBe("Approved");
  expect(catalog.bookings.find((item) => item.id === bookingId)?.scheduleId).toBe(targetId);
  expect(await catalog.countBooked(sourceId)).toBe(0); expect(await catalog.countBooked(targetId)).toBe(1);
});
