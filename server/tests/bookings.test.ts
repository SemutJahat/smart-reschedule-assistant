import { beforeEach, expect, test } from "bun:test";
import { InMemoryAuthRepository } from "../src/modules/auth/repository";
import { InMemoryCatalogRepository } from "../src/modules/coaches/schema";
import { InMemoryPaymentRepository } from "../src/modules/payments/repository";
import { InMemoryBookingRepository } from "../src/modules/bookings/repository";
import { InMemoryChatRepository } from "../src/modules/chat/repository";
import { createInMemoryChatTransactionCoordinator } from "../src/modules/chat/unit-of-work";
import { InMemoryRescheduleRepository } from "../src/modules/reschedules/repository";
import { bookingDuplicateConflict } from "../src/modules/bookings/service";
import { createTestApp } from "./helpers/app";

const json = (value: unknown, token?: string) => ({ headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(value) });
const credentials = (response: Response) => response.json() as Promise<{ accessToken: string }>;
const id = () => crypto.randomUUID();

let auth: InMemoryAuthRepository;
let catalog: InMemoryCatalogRepository;
let payments: InMemoryPaymentRepository;
let app: ReturnType<typeof createTestApp>;
let customerToken: string;
let otherToken: string;
let adminToken: string;
let memberId: string;
let otherMemberId: string;
let scheduleId: string;
let subscriptionId: string;
let otherSubscriptionId: string;

async function login(email: string) { return credentials(await app.handle(new Request("http://localhost/auth/login", { method: "POST", ...json({ email, password: "password-123" }) }))); }
function dates(offsetDays = 1) { const startsAt = new Date(Date.now() + offsetDays * 86_400_000); startsAt.setUTCHours(12, 0, 0, 0); return { startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000) }; }

test("maps PostgreSQL active-booking duplicate errors with constraint_name to conflict", () => {
  const conflict = bookingDuplicateConflict({ code: "23505", constraint_name: "bookings_member_schedule_active_uidx" });
  expect(conflict?.code).toBe("CONFLICT");
  expect(conflict?.status).toBe(409);
});

test("maps database booking invariant errors to conflicts", () => {
  expect(bookingDuplicateConflict({ code: "P0001", message: "BOOKING_CAPACITY_EXCEEDED: schedule is full" })?.status).toBe(409);
  expect(bookingDuplicateConflict({ code: "P0002", message: "BOOKING_SCHEDULE_CANCELLED: schedule is cancelled" })?.status).toBe(409);
  expect(bookingDuplicateConflict({ code: "P0004", message: "BOOKING_SUBSCRIPTION_QUOTA_EXHAUSTED: no sessions" })?.status).toBe(409);
  expect(bookingDuplicateConflict({ cause: { code: "P0006", message: "BOOKING_CAPACITY_REDUCTION: too many" } })?.status).toBe(409);
});

beforeEach(async () => {
  auth = new InMemoryAuthRepository(); catalog = new InMemoryCatalogRepository(); payments = new InMemoryPaymentRepository(catalog); app = createTestApp({}, auth, catalog, payments);
  const admin = await auth.insertUser({ email: "admin@example.com", passwordHash: await Bun.password.hash("password-123", { algorithm: "argon2id" }), name: "Admin", role: "admin" });
  const customer = await auth.insertUser({ email: "customer@example.com", passwordHash: await Bun.password.hash("password-123", { algorithm: "argon2id" }), name: "Customer" });
  const other = await auth.insertUser({ email: "other@example.com", passwordHash: await Bun.password.hash("password-123", { algorithm: "argon2id" }), name: "Other" });
  const member = await auth.insertMember({ userId: customer.id, memberNumber: "M-1" });
  const otherMember = await auth.insertMember({ userId: other.id, memberNumber: "M-2" });
  memberId = member.id; otherMemberId = otherMember.id;
  adminToken = (await login(admin.email)).accessToken; customerToken = (await login(customer.email)).accessToken; otherToken = (await login(other.email)).accessToken;
  const when = dates(); scheduleId = id();
  catalog.schedules.push({ id: scheduleId, title: "Yoga", coachId: id(), serviceId: id(), ...when, capacity: 1, status: "available", createdAt: new Date(), updatedAt: new Date() });
  subscriptionId = id(); otherSubscriptionId = id();
  const subscription = (sid: string, mid: string, overrides: Partial<typeof payments.subscriptions[number]> = {}) => ({ id: sid, memberId: mid, packageId: id(), status: "active" as const, startsAt: new Date(Date.now() - 86_400_000), expiresAt: new Date(Date.now() + 86_400_000), totalSessions: 2, usedSessions: 0, amountPaid: "10.00", createdAt: new Date(), updatedAt: new Date(), ...overrides });
  payments.subscriptions.push(subscription(subscriptionId, memberId), subscription(otherSubscriptionId, otherMemberId));
});

test("books once, increments quota, and rejects duplicate/over-capacity races", async () => {
  const results = await Promise.all([1, 2].map(() => app.handle(new Request("http://localhost/bookings", { method: "POST", ...json({ scheduleId, subscriptionId }, customerToken) }))));
  expect(results.filter((response) => response.status === 200)).toHaveLength(1);
  expect(results.filter((response) => response.status === 409)).toHaveLength(1);
  expect(payments.subscriptions.find((item) => item.id === subscriptionId)?.usedSessions).toBe(1);
  expect(catalog.bookings.filter((item) => item.status === "booked")).toHaveLength(1);
  expect(await catalog.countBooked(scheduleId)).toBe(1);
  expect((await catalog.findSchedule(scheduleId))?.status).toBe("full");
  expect((await app.handle(new Request("http://localhost/bookings", { method: "POST", ...json({ scheduleId, subscriptionId }, customerToken) }))).status).toBe(409);
});

test("rejects wrong owner, inactive, expired, exhausted and unavailable subscriptions/schedules", async () => {
  expect((await app.handle(new Request("http://localhost/bookings", { method: "POST", ...json({ scheduleId, subscriptionId: otherSubscriptionId }, customerToken) }))).status).toBe(403);
  const subscription = payments.subscriptions.find((item) => item.id === subscriptionId)!;
  subscription.status = "expired";
  expect((await app.handle(new Request("http://localhost/bookings", { method: "POST", ...json({ scheduleId, subscriptionId }, customerToken) }))).status).toBe(409);
  subscription.status = "active"; subscription.expiresAt = new Date(Date.now() - 1);
  expect((await app.handle(new Request("http://localhost/bookings", { method: "POST", ...json({ scheduleId, subscriptionId }, customerToken) }))).status).toBe(409);
  subscription.expiresAt = new Date(Date.now() + 86_400_000); subscription.usedSessions = subscription.totalSessions;
  expect((await app.handle(new Request("http://localhost/bookings", { method: "POST", ...json({ scheduleId, subscriptionId }, customerToken) }))).status).toBe(409);
  catalog.schedules[0]!.status = "cancelled"; subscription.usedSessions = 0;
  expect((await app.handle(new Request("http://localhost/bookings", { method: "POST", ...json({ scheduleId, subscriptionId }, customerToken) }))).status).toBe(409);
});

test("lists only own bookings with status/date filters and authorizes cancellation", async () => {
  catalog.schedules[0]!.capacity = 2;
  const created = await app.handle(new Request("http://localhost/bookings", { method: "POST", ...json({ scheduleId, subscriptionId }, customerToken) }));
  const booking = await created.json() as { id: string };
  const scheduleDate = catalog.schedules[0]!.startsAt.toISOString().slice(0, 10);
  const filtered = await app.handle(new Request(`http://localhost/bookings/me?status=booked&date=${scheduleDate}`, { headers: { authorization: `Bearer ${customerToken}` } }));
  expect(filtered.status).toBe(200);
  expect(await filtered.json()).toHaveLength(1);
  const otherList = await app.handle(new Request("http://localhost/bookings/me", { headers: { authorization: `Bearer ${otherToken}` } }));
  expect(await otherList.json()).toHaveLength(0);
  expect((await app.handle(new Request(`http://localhost/bookings/${booking.id}/cancel`, { method: "PATCH", ...json({}, otherToken) }))).status).toBe(403);
  const cancelled = await app.handle(new Request(`http://localhost/bookings/${booking.id}/cancel`, { method: "PATCH", ...json({}, adminToken) }));
  expect(cancelled.status).toBe(200);
  expect((await cancelled.clone().json()).status).toBe("cancelled");
  expect(payments.subscriptions.find((item) => item.id === subscriptionId)?.usedSessions).toBe(0);
  expect((await catalog.findSchedule(scheduleId))?.status).toBe("available");
  const ownBooking = await app.handle(new Request("http://localhost/bookings", { method: "POST", ...json({ scheduleId, subscriptionId }, customerToken) }));
  const ownBookingBody = await ownBooking.json() as { id: string };
  expect((await app.handle(new Request(`http://localhost/bookings/${ownBookingBody.id}/cancel`, { method: "PATCH", ...json({}, customerToken) }))).status).toBe(200);
  expect((await app.handle(new Request(`http://localhost/bookings/${ownBookingBody.id}/cancel`, { method: "PATCH", ...json({}, customerToken) }))).status).toBe(409);
});

test("failed booking transaction rolls back its writes", async () => {
  catalog.schedules[0]!.capacity = 1;
  const original = payments.subscriptions.find((item) => item.id === subscriptionId)!;
  const before = original.usedSessions;
  class FailingBookingRepository extends InMemoryBookingRepository {
    override async updateSubscriptionUsed(_id: string, _usedSessions: number): Promise<null> {
      throw new Error("quota update failed");
    }
  }
  const failingRepository = new FailingBookingRepository(catalog, payments, catalog.bookings);
  const failingChat = new InMemoryChatRepository();
  const failingReschedules = new InMemoryRescheduleRepository(failingRepository, catalog);
  const failingCoordinator = createInMemoryChatTransactionCoordinator({ chat: failingChat, reschedule: failingReschedules, booking: failingRepository, payment: payments, catalog });
  const failingApp = createTestApp({}, auth, catalog, payments, failingRepository, failingReschedules, failingChat, failingCoordinator);
  const failing = await failingApp.handle(new Request("http://localhost/bookings", { method: "POST", ...json({ scheduleId, subscriptionId }, customerToken) }));
  expect(failing.status).toBe(500);
  expect(payments.subscriptions.find((item) => item.id === subscriptionId)?.usedSessions).toBe(before);
  expect(catalog.bookings).toHaveLength(0);
  expect(catalog.schedules[0]?.status).toBe("available");
});
