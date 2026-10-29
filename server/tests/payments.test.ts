import { beforeEach, expect, test } from "bun:test";
import { InMemoryAuthRepository } from "../src/modules/auth/repository";
import { InMemoryCatalogRepository } from "../src/modules/coaches/schema";
import { InMemoryPaymentRepository } from "../src/modules/payments/repository";
import { createTestApp } from "./helpers/app";

const json = (value: unknown, token?: string) => ({ headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(value) });
const credentials = (response: Response) => response.json() as Promise<{ accessToken: string }>;
let auth: InMemoryAuthRepository;
let catalog: InMemoryCatalogRepository;
let payments: InMemoryPaymentRepository;
let app: ReturnType<typeof createTestApp>;

async function register(email: string, name: string, role?: "admin" | "customer") {
  if (role) return auth.insertUser({ email, passwordHash: await Bun.password.hash("password-123", { algorithm: "argon2id" }), name, role });
  return credentials(await app.handle(new Request("http://localhost/auth/register", { method: "POST", ...json({ email, password: "password-123", name }) })));
}
async function login(email: string) { return credentials(await app.handle(new Request("http://localhost/auth/login", { method: "POST", ...json({ email, password: "password-123" }) }))); }
async function createPackage(token: string, price = 25) {
  const response = await app.handle(new Request("http://localhost/packages", { method: "POST", ...json({ name: "Starter", category: "General", price, totalSessions: 5, validityDays: 30 }, token) }));
  expect(response.status).toBe(200);
  return response.json() as Promise<{ id: string; price: string }>;
}

beforeEach(async () => {
  auth = new InMemoryAuthRepository();
  catalog = new InMemoryCatalogRepository();
  payments = new InMemoryPaymentRepository(catalog);
  app = createTestApp({}, auth, catalog, payments);
  await register("admin@example.com", "Admin", "admin");
  await register("customer@example.com", "Customer");
  await register("other@example.com", "Other");
});

test("customer creates and reads only their pending payment, with sanitized input", async () => {
  const admin = await login("admin@example.com");
  const customer = await login("customer@example.com");
  const packageItem = await createPackage(admin.accessToken);
  const created = await app.handle(new Request("http://localhost/payments", { method: "POST", ...json({ packageId: packageItem.id, method: "  cash  ", reference: "  receipt-1  " }, customer.accessToken) }));
  expect(created.status).toBe(200);
  const payment = await created.json() as Record<string, unknown>;
  expect(payment).toMatchObject({ amount: "25.00", status: "pending", method: "cash", reference: "receipt-1", subscriptionId: null });
  expect(payment).not.toHaveProperty("passwordHash");
  expect(payments.subscriptions).toHaveLength(0);
  expect((await app.handle(new Request("http://localhost/payments/me", { headers: { authorization: `Bearer ${customer.accessToken}` } }))).status).toBe(200);
  expect((await app.handle(new Request("http://localhost/payments", { headers: { authorization: `Bearer ${customer.accessToken}` } }))).status).toBe(403);
});

test("admin filters payments and paid transition creates one expiring subscription", async () => {
  const admin = await login("admin@example.com");
  const customer = await login("customer@example.com");
  const packageItem = await createPackage(admin.accessToken);
  const create = await app.handle(new Request("http://localhost/payments", { method: "POST", ...json({ packageId: packageItem.id }, customer.accessToken) }));
  const payment = await create.json() as { id: string };
  const paid = await app.handle(new Request(`http://localhost/payments/${payment.id}/status`, { method: "PATCH", ...json({ status: "paid" }, admin.accessToken) }));
  expect(paid.status).toBe(200);
  const paidBody = await paid.json() as { subscriptionId: string; status: string };
  expect(paidBody.status).toBe("paid");
  expect(paidBody.subscriptionId).toBeString();
  expect(payments.subscriptions).toHaveLength(1);
  expect(payments.subscriptions[0]?.totalSessions).toBe(5);
  expect(payments.subscriptions[0]?.expiresAt.getTime() - payments.subscriptions[0]!.startsAt.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  expect((await app.handle(new Request("http://localhost/payments?status=paid", { headers: { authorization: `Bearer ${admin.accessToken}` } }))).status).toBe(200);
  expect((await app.handle(new Request(`http://localhost/payments/${payment.id}/status`, { method: "PATCH", ...json({ status: "paid" }, admin.accessToken) }))).status).toBe(409);
  expect((await app.handle(new Request("http://localhost/subscriptions/me", { headers: { authorization: `Bearer ${customer.accessToken}` } }))).status).toBe(200);
});

test("failed payments do not create subscriptions and refund only follows paid", async () => {
  const admin = await login("admin@example.com");
  const customer = await login("customer@example.com");
  const packageItem = await createPackage(admin.accessToken);
  const create = await app.handle(new Request("http://localhost/payments", { method: "POST", ...json({ packageId: packageItem.id }, customer.accessToken) }));
  const payment = await create.json() as { id: string };
  expect((await app.handle(new Request(`http://localhost/payments/${payment.id}/status`, { method: "PATCH", ...json({ status: "refunded" }, admin.accessToken) }))).status).toBe(409);
  expect((await app.handle(new Request(`http://localhost/payments/${payment.id}/status`, { method: "PATCH", ...json({ status: "failed" }, admin.accessToken) }))).status).toBe(200);
  expect(payments.subscriptions).toHaveLength(0);
  expect((await app.handle(new Request(`http://localhost/payments/${payment.id}/status`, { method: "PATCH", ...json({ status: "paid" }, admin.accessToken) }))).status).toBe(409);
  const other = await login("other@example.com");
  expect((await app.handle(new Request(`http://localhost/payments/${payment.id}/status`, { method: "PATCH", ...json({ status: "failed" }, other.accessToken) }))).status).toBe(403);
});

test("refund keeps the paid subscription and cannot be repeated", async () => {
  const admin = await login("admin@example.com");
  const customer = await login("customer@example.com");
  const packageItem = await createPackage(admin.accessToken);
  const create = await app.handle(new Request("http://localhost/payments", { method: "POST", ...json({ packageId: packageItem.id }, customer.accessToken) }));
  const payment = await create.json() as { id: string };
  expect((await app.handle(new Request(`http://localhost/payments/${payment.id}/status`, { method: "PATCH", ...json({ status: "paid" }, admin.accessToken) }))).status).toBe(200);
  const subscriptionId = payments.subscriptions[0]?.id;
  expect((await app.handle(new Request(`http://localhost/payments/${payment.id}/status`, { method: "PATCH", ...json({ status: "refunded" }, admin.accessToken) }))).status).toBe(200);
  expect(payments.subscriptions).toHaveLength(1);
  expect(payments.subscriptions[0]?.id).toBe(subscriptionId);
  expect((await app.handle(new Request(`http://localhost/payments/${payment.id}/status`, { method: "PATCH", ...json({ status: "refunded" }, admin.accessToken) }))).status).toBe(409);
});

test("rejects missing package and does not accept memberId", async () => {
  const customer = await login("customer@example.com");
  const missing = await app.handle(new Request("http://localhost/payments", { method: "POST", ...json({ packageId: crypto.randomUUID(), memberId: crypto.randomUUID() }, customer.accessToken) }));
  expect(missing.status).toBe(404);
});
