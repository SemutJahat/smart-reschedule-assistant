import { beforeEach, expect, test } from "bun:test";
import { InMemoryAuthRepository } from "../src/modules/auth/repository";
import { createTestApp } from "./helpers/app";

const json = (value: unknown) => ({ headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
async function register(app: ReturnType<typeof createTestApp>, email: string, name: string) {
  const response = await app.handle(new Request("http://localhost/auth/register", { method: "POST", ...json({ email, password: "password-123", name }) }));
  return response.json() as Promise<{ accessToken: string; user: { id: string } }>;
}

let repository: InMemoryAuthRepository;
let app: ReturnType<typeof createTestApp>;

beforeEach(() => {
  repository = new InMemoryAuthRepository();
  app = createTestApp({}, repository);
});

test("customer owns its member and cannot access another member", async () => {
  const first = await register(app, "first@example.com", "First");
  const second = await register(app, "second@example.com", "Second");
  const own = await app.handle(new Request("http://localhost/members/me", { headers: { authorization: `Bearer ${first.accessToken}` } }));
  expect(own.status).toBe(200);
  const ownMember = await own.json() as { id: string; phone: string | null };
  expect(ownMember.id).toBe(repository.members.find((member) => member.userId === first.user.id)?.id ?? "");
  const cross = await app.handle(new Request(`http://localhost/members/${repository.members.find((member) => member.userId === second.user.id)?.id}`, { headers: { authorization: `Bearer ${first.accessToken}` } }));
  expect(cross.status).toBe(403);
  expect((await cross.json()).error.code).toBe("FORBIDDEN");
  const updated = await app.handle(new Request(`http://localhost/members/${ownMember.id}`, { method: "PATCH", body: JSON.stringify({ phone: "555-0100" }), headers: { "content-type": "application/json", authorization: `Bearer ${first.accessToken}` } }));
  expect(updated.status).toBe(200);
  expect((await updated.json()).phone).toBe("555-0100");
});

test("admins can list members and access users, while customers can update only themselves", async () => {
  const customer = await register(app, "customer@example.com", "Customer");
  const admin = await repository.insertUser({ email: "admin@example.com", passwordHash: await Bun.password.hash("admin-password", { algorithm: "argon2id" }), role: "admin", name: "Admin" });
  const adminLogin = await app.handle(new Request("http://localhost/auth/login", { method: "POST", ...json({ email: admin.email, password: "admin-password" }) }));
  const adminToken = (await adminLogin.json() as { accessToken: string }).accessToken;
  const list = await app.handle(new Request("http://localhost/members", { headers: { authorization: `Bearer ${adminToken}` } }));
  expect(list.status).toBe(200);
  const users = await app.handle(new Request("http://localhost/users", { headers: { authorization: `Bearer ${adminToken}` } }));
  expect(users.status).toBe(200);
  expect(JSON.stringify(await users.json())).not.toContain("passwordHash");
  const self = await app.handle(new Request(`http://localhost/users/${customer.user.id}`, { method: "PATCH", body: JSON.stringify({ name: "Renamed", role: "admin" }), headers: { "content-type": "application/json", authorization: `Bearer ${customer.accessToken}` } }));
  expect(self.status).toBe(403);
});

test("a customer can read and safely update their own user, but an admin controls roles", async () => {
  const customer = await register(app, "self@example.com", "Self");
  const own = await app.handle(new Request(`http://localhost/users/${customer.user.id}`, { headers: { authorization: `Bearer ${customer.accessToken}` } }));
  expect(own.status).toBe(200);
  const renamed = await app.handle(new Request(`http://localhost/users/${customer.user.id}`, { method: "PATCH", body: JSON.stringify({ name: "Updated Self" }), headers: { "content-type": "application/json", authorization: `Bearer ${customer.accessToken}` } }));
  expect(renamed.status).toBe(200);
  expect((await renamed.json()).name).toBe("Updated Self");
  const admin = await repository.insertUser({ email: "owner@example.com", passwordHash: await Bun.password.hash("admin-password", { algorithm: "argon2id" }), role: "admin", name: "Owner" });
  const adminLogin = await app.handle(new Request("http://localhost/auth/login", { method: "POST", ...json({ email: admin.email, password: "admin-password" }) }));
  const adminToken = (await adminLogin.json() as { accessToken: string }).accessToken;
  const roleUpdate = await app.handle(new Request(`http://localhost/users/${customer.user.id}`, { method: "PATCH", body: JSON.stringify({ role: "admin" }), headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` } }));
  expect(roleUpdate.status).toBe(200);
  expect((await roleUpdate.json()).role).toBe("admin");
});

test("customers cannot update member status", async () => {
  const customer = await register(app, "status@example.com", "Status");
  const member = repository.members.find((item) => item.userId === customer.user.id)!;
  const response = await app.handle(new Request(`http://localhost/members/${member.id}`, { method: "PATCH", body: JSON.stringify({ status: "suspended" }), headers: { "content-type": "application/json", authorization: `Bearer ${customer.accessToken}` } }));
  expect(response.status).toBe(403);
  expect((await response.json()).error.code).toBe("FORBIDDEN");
});

test("demoting an admin immediately removes privileged access despite a still-valid token", async () => {
  const admin = await repository.insertUser({ email: "demote@example.com", passwordHash: await Bun.password.hash("admin-password", { algorithm: "argon2id" }), role: "admin", name: "Demote" });
  const login = await app.handle(new Request("http://localhost/auth/login", { method: "POST", ...json({ email: admin.email, password: "admin-password" }) }));
  const accessToken = (await login.json() as { accessToken: string }).accessToken;
  const customer = await repository.insertUser({ email: "other@example.com", passwordHash: await Bun.password.hash("customer-password", { algorithm: "argon2id" }), role: "customer", name: "Other" });
  await repository.updateUser(admin.id, { role: "customer" });
  const response = await app.handle(new Request("http://localhost/users", { headers: { authorization: `Bearer ${accessToken}` } }));
  expect(response.status).toBe(403);
  expect(customer.role).toBe("customer");
});
