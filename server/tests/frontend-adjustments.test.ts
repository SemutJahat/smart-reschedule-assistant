import { beforeEach, expect, test } from "bun:test";
import { createApp } from "../src/app";
import { InMemoryAuthRepository } from "../src/modules/auth/repository";
import { InMemoryCatalogRepository } from "../src/modules/coaches/schema";
import { InMemoryPaymentRepository } from "../src/modules/payments/repository";
import { InMemoryBookingRepository } from "../src/modules/bookings/repository";
import { InMemoryRescheduleRepository } from "../src/modules/reschedules/repository";
import { InMemoryChatRepository } from "../src/modules/chat/repository";
import { createInMemoryChatTransactionCoordinator } from "../src/modules/chat/unit-of-work";
import { StubGenAiClient } from "../src/modules/chat/client";
import { DEVELOPMENT_MIDTRANS_SERVER_KEY, MidtransSnapGateway, StubPaymentGateway, midtransSignature } from "../src/modules/payments/gateway";

const json = (value: unknown, token?: string) => ({ headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(value) });
const bearer = (token: string) => ({ headers: { authorization: `Bearer ${token}` } });
let auth: InMemoryAuthRepository;
let catalog: InMemoryCatalogRepository;
let payments: InMemoryPaymentRepository;
let gateway: StubPaymentGateway;
let app: ReturnType<typeof createApp>;
let admin: string;
let customer: string;

const call = (path: string, init?: RequestInit) => app.handle(new Request(`http://localhost${path}`, init));
async function login(email: string, password = "password-123") {
  const response = await call("/auth/login", { method: "POST", ...json({ email, password }) });
  return response.json() as Promise<{ accessToken: string; refreshToken: string }>;
}

beforeEach(async () => {
  auth = new InMemoryAuthRepository();
  catalog = new InMemoryCatalogRepository();
  payments = new InMemoryPaymentRepository(catalog);
  gateway = new StubPaymentGateway();
  const bookings = new InMemoryBookingRepository(catalog, payments, catalog.bookings);
  const reschedules = new InMemoryRescheduleRepository(bookings, catalog);
  const chat = new InMemoryChatRepository();
  app = createApp(
    { nodeEnv: "test", port: 3000, corsOrigin: "http://localhost:5173", jwtSecret: "test-jwt-secret", jwtRefreshSecret: "test-refresh-secret", genAiModel: "deterministic-stub", genAiTimeoutMs: 10_000, genAiMode: "stub" },
    { repository: auth, catalogRepository: catalog, paymentRepository: payments, bookingRepository: bookings, rescheduleRepository: reschedules, chatRepository: chat, chatTransactionCoordinator: createInMemoryChatTransactionCoordinator({ chat, reschedule: reschedules, booking: bookings, payment: payments, catalog }), genAiClient: new StubGenAiClient(), paymentGateway: gateway },
  );
  await auth.insertUser({ email: "admin@example.com", passwordHash: await Bun.password.hash("password-123", { algorithm: "argon2id" }), name: "Admin", role: "admin" });
  await call("/auth/register", { method: "POST", ...json({ email: "customer@example.com", password: "password-123", name: "Customer", phone: "08123" }) });
  admin = (await login("admin@example.com")).accessToken;
  customer = (await login("customer@example.com")).accessToken;
});

test("services CRUD: admin manages catalog, customers see active services only", async () => {
  const created = await call("/services", { method: "POST", ...json({ name: "  Yoga  ", description: "Flow" }, admin) });
  expect(created.status).toBe(200);
  const yoga = await created.json() as { id: string };
  expect(yoga).toMatchObject({ name: "Yoga", description: "Flow", active: true });
  const hidden = await (await call("/services", { method: "POST", ...json({ name: "Boxing", active: false }, admin) })).json() as { id: string };
  expect((await call("/services", { method: "POST", ...json({ name: "yoga" }, admin) })).status).toBe(409);
  expect((await call("/services", { method: "POST", ...json({ name: "Nope" }, customer) })).status).toBe(403);
  expect((await call("/services")).status).toBe(401);

  const visible = await (await call("/services", bearer(customer))).json() as { id: string }[];
  expect(visible.map((item) => item.id)).toEqual([yoga.id]);
  expect((await call("/services?includeInactive=true", bearer(customer))).status).toBe(403);
  expect(await (await call("/services?includeInactive=true", bearer(admin))).json()).toHaveLength(2);

  const patched = await call(`/services/${hidden.id}`, { method: "PATCH", ...json({ active: true, description: null }, admin) });
  expect(patched.status).toBe(200);
  expect(await patched.json()).toMatchObject({ id: hidden.id, active: true, description: null });
  expect((await call(`/services/${hidden.id}`, { method: "PATCH", ...json({ name: "Yoga" }, admin) })).status).toBe(409);
  expect((await call(`/services/${crypto.randomUUID()}`, { method: "PATCH", ...json({ active: false }, admin) })).status).toBe(404);
  expect((await call(`/services/${yoga.id}`, { method: "PATCH", ...json({ active: false }, customer) })).status).toBe(403);
});

test("coaches include service names and schedules include coach and service names", async () => {
  const yoga = await (await call("/services", { method: "POST", ...json({ name: "Yoga" }, admin) })).json() as { id: string };
  const coach = await (await call("/coaches", { method: "POST", ...json({ name: "Budi", serviceIds: [yoga.id] }, admin) })).json() as { id: string; services: unknown };
  expect(coach.services).toEqual([{ id: yoga.id, name: "Yoga" }]);
  const coaches = await (await call("/coaches", bearer(customer))).json() as { serviceIds: string[]; services: unknown }[];
  expect(coaches[0]).toMatchObject({ serviceIds: [yoga.id], services: [{ id: yoga.id, name: "Yoga" }] });

  const schedule = await call("/schedules", { method: "POST", ...json({ title: "Morning", coachId: coach.id, serviceId: yoga.id, startsAt: "2030-01-01T10:00:00.000Z", endsAt: "2030-01-01T11:00:00.000Z", capacity: 3 }, admin) });
  expect(schedule.status).toBe(200);
  expect(await schedule.json()).toMatchObject({ coachName: "Budi", serviceName: "Yoga" });
  const list = await (await call("/schedules", bearer(customer))).json() as unknown[];
  expect(list[0]).toMatchObject({ coachId: coach.id, coachName: "Budi", serviceId: yoga.id, serviceName: "Yoga", bookedCount: 0 });
});

test("PATCH /members/me updates the token owner's profile and ignores status", async () => {
  const response = await call("/members/me", { method: "PATCH", ...json({ weight: "70", height: "175", bloodType: "O", medicalHistory: "Asma", status: "suspended" }, customer) });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ weight: "70", height: "175", bloodType: "O", medicalHistory: "Asma", status: "active" });
  expect(await (await call("/members/me", bearer(customer))).json()).toMatchObject({ weight: "70", bloodType: "O" });
  expect((await call("/members/me", { method: "PATCH", ...json({ weight: "abc" }, customer) })).status).toBe(422);
  expect((await call("/members/me", { method: "PATCH", ...json({ height: "-5" }, customer) })).status).toBe(422);
  expect((await call("/members/me", { method: "PATCH", ...json({ bloodType: "AB-positive-x" }, customer) })).status).toBe(422);
  expect((await call("/members/me", { method: "PATCH", ...json({ weight: "1" }, admin) })).status).toBe(403);
  expect((await call("/members/me", { method: "PATCH", ...json({ weight: "1" }) })).status).toBe(401);
});

test("PATCH /users/me renames the current user", async () => {
  const response = await call("/users/me", { method: "PATCH", ...json({ name: "  Super Admin " }, admin) });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ email: "admin@example.com", role: "admin", name: "Super Admin" });
  expect((await call("/users/me", { method: "PATCH", ...json({ name: "   " }, admin) })).status).toBe(400);
  expect((await call("/users/me", { method: "PATCH", ...json({ name: "X", role: "customer" }, admin) })).status).toBe(200);
  expect((await auth.findUserByEmail("admin@example.com"))?.role).toBe("admin");
});

test("POST /auth/change-password verifies the current password and rotates sessions", async () => {
  const session = await login("admin@example.com");
  expect((await call("/auth/change-password", { method: "POST", ...json({ currentPassword: "wrong-password", newPassword: "new-password-123" }, admin) })).status).toBe(400);
  expect((await call("/auth/change-password", { method: "POST", ...json({ currentPassword: "password-123", newPassword: "password-123" }, admin) })).status).toBe(400);
  const changed = await call("/auth/change-password", { method: "POST", ...json({ currentPassword: "password-123", newPassword: "new-password-123" }, admin) });
  expect(changed.status).toBe(200);
  const tokens = await changed.json() as { accessToken: string; refreshToken: string };
  expect(tokens.accessToken).toBeString();
  expect((await call("/auth/refresh", { method: "POST", ...json({ refreshToken: session.refreshToken }) })).status).toBe(401);
  expect((await call("/auth/refresh", { method: "POST", ...json({ refreshToken: tokens.refreshToken }) })).status).toBe(200);
  expect((await call("/auth/login", { method: "POST", ...json({ email: "admin@example.com", password: "password-123" }) })).status).toBe(401);
  expect((await call("/auth/login", { method: "POST", ...json({ email: "admin@example.com", password: "new-password-123" }) })).status).toBe(200);
});

async function createPackage(price = 250000) {
  const response = await call("/packages", { method: "POST", ...json({ name: "Starter", category: "General", price, totalSessions: 8, validityDays: 30 }, admin) });
  return response.json() as Promise<{ id: string }>;
}

function notification(orderId: string, transactionStatus: string, grossAmount = "250000.00", extra: Record<string, string> = {}) {
  const statusCode = transactionStatus === "pending" ? "201" : "200";
  return { order_id: orderId, status_code: statusCode, gross_amount: grossAmount, signature_key: midtransSignature(orderId, statusCode, grossAmount, DEVELOPMENT_MIDTRANS_SERVER_KEY), transaction_status: transactionStatus, payment_type: "bank_transfer", ...extra };
}

test("POST /payments registers a Snap transaction and returns the snap token", async () => {
  const packageItem = await createPackage();
  const response = await call("/payments", { method: "POST", ...json({ packageId: packageItem.id }, customer) });
  expect(response.status).toBe(200);
  const payment = await response.json() as { id: string; snapToken: string; status: string };
  expect(payment).toMatchObject({ status: "pending", amount: "250000.00", snapToken: `stub-snap-${payment.id}` });
  expect(gateway.requests[0]).toMatchObject({ orderId: payment.id, grossAmount: 250000, item: { id: packageItem.id, name: "Starter", price: 250000 }, customer: { name: "Customer", email: "customer@example.com", phone: "08123" } });
  const polled = await call(`/payments/${payment.id}`, bearer(customer));
  expect(polled.status).toBe(200);
  expect(await polled.json()).toMatchObject({ id: payment.id, status: "pending", snapToken: payment.snapToken });
});

test("gateway failures mark the payment failed and surface a 502", async () => {
  const packageItem = await createPackage();
  gateway.createTransaction = async () => { throw new (await import("../src/shared/errors")).AppError("PAYMENT_GATEWAY_UNAVAILABLE", "down", 502); };
  const response = await call("/payments", { method: "POST", ...json({ packageId: packageItem.id }, customer) });
  expect(response.status).toBe(502);
  expect(payments.payments[0].status).toBe("failed");
});

test("Midtrans webhook settles payments, creates the subscription once, and is public", async () => {
  const packageItem = await createPackage();
  const payment = await (await call("/payments", { method: "POST", ...json({ packageId: packageItem.id }, customer) })).json() as { id: string };

  const pending = await call("/payments/webhook", { method: "POST", ...json(notification(payment.id, "pending")) });
  expect(pending.status).toBe(200);
  expect(await pending.json()).toEqual({ received: true, paymentId: payment.id, status: "pending" });

  const settled = await call("/payments/webhook", { method: "POST", ...json(notification(payment.id, "settlement")) });
  expect(settled.status).toBe(200);
  expect(await settled.json()).toMatchObject({ status: "paid" });
  expect((await call("/payments/webhook", { method: "POST", ...json(notification(payment.id, "settlement")) })).status).toBe(200);
  expect(payments.subscriptions).toHaveLength(1);
  expect(payments.subscriptions[0]).toMatchObject({ status: "active", totalSessions: 8, usedSessions: 0 });
  expect(payments.payments[0]).toMatchObject({ status: "paid", method: "bank_transfer", subscriptionId: payments.subscriptions[0].id });
  expect(await (await call("/subscriptions/me", bearer(customer))).json()).toHaveLength(1);
});

test("Midtrans webhook rejects bad signatures and amounts, and handles failure statuses", async () => {
  const packageItem = await createPackage();
  const payment = await (await call("/payments", { method: "POST", ...json({ packageId: packageItem.id }, customer) })).json() as { id: string };
  expect((await call("/payments/webhook", { method: "POST", ...json({ ...notification(payment.id, "settlement"), signature_key: "f".repeat(128) }) })).status).toBe(403);
  expect((await call("/payments/webhook", { method: "POST", ...json(notification(payment.id, "settlement", "1000.00")) })).status).toBe(409);
  expect((await call("/payments/webhook", { method: "POST", ...json(notification(crypto.randomUUID(), "settlement")) })).status).toBe(404);
  expect((await call("/payments/webhook", { method: "POST", ...json(notification("not-a-uuid", "settlement")) })).status).toBe(404);

  const challenged = await call("/payments/webhook", { method: "POST", ...json(notification(payment.id, "capture", "250000.00", { fraud_status: "challenge" })) });
  expect(await challenged.json()).toMatchObject({ status: "pending" });
  const expired = await call("/payments/webhook", { method: "POST", ...json(notification(payment.id, "expire")) });
  expect(await expired.json()).toMatchObject({ status: "failed" });
  const late = await call("/payments/webhook", { method: "POST", ...json(notification(payment.id, "settlement")) });
  expect(await late.json()).toMatchObject({ status: "failed" });
  expect(payments.subscriptions).toHaveLength(0);
});

test("customers cannot poll another customer's payment", async () => {
  const packageItem = await createPackage();
  const payment = await (await call("/payments", { method: "POST", ...json({ packageId: packageItem.id }, customer) })).json() as { id: string };
  await call("/auth/register", { method: "POST", ...json({ email: "other@example.com", password: "password-123", name: "Other" }) });
  const other = (await login("other@example.com")).accessToken;
  expect((await call(`/payments/${payment.id}`, bearer(other))).status).toBe(404);
  expect((await call(`/payments/${payment.id}`, bearer(admin))).status).toBe(200);
});

test("MidtransSnapGateway calls the Snap API with server key basic auth", async () => {
  let captured: { url: string; init: RequestInit } | undefined;
  const fetchImpl = (async (url: string, init: RequestInit) => {
    captured = { url, init };
    return new Response(JSON.stringify({ token: "snap-token", redirect_url: "https://app.sandbox.midtrans.com/snap/v4/redirection/snap-token" }), { status: 201 });
  }) as unknown as typeof fetch;
  const snap = new MidtransSnapGateway("SB-Mid-server-key", false, fetchImpl);
  const result = await snap.createTransaction({ orderId: "order-1", grossAmount: 1000, item: { id: "pkg", name: "Paket", price: 1000 }, customer: { name: "A", email: "a@example.com", phone: null } });
  expect(result).toEqual({ token: "snap-token", redirectUrl: "https://app.sandbox.midtrans.com/snap/v4/redirection/snap-token" });
  expect(captured?.url).toBe("https://app.sandbox.midtrans.com/snap/v1/transactions");
  expect((captured?.init.headers as Record<string, string>).authorization).toBe(`Basic ${btoa("SB-Mid-server-key:")}`);
  expect(JSON.parse(String(captured?.init.body))).toMatchObject({ transaction_details: { order_id: "order-1", gross_amount: 1000 } });

  const failing = new MidtransSnapGateway("key", true, (async () => new Response("{}", { status: 401 })) as unknown as typeof fetch);
  await expect(failing.createTransaction({ orderId: "o", grossAmount: 1, item: { id: "p", name: "n", price: 1 }, customer: { name: "A", email: "a@example.com", phone: null } })).rejects.toMatchObject({ status: 502 });
});
