import { beforeEach, expect, test } from "bun:test";
import { InMemoryAuthRepository } from "../src/modules/auth/repository";
import { createTestApp } from "./helpers/app";

const json = (value: unknown) => ({ headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
const token = (response: Response) => response.json() as Promise<{ accessToken: string; refreshToken: string; user: Record<string, unknown> }>;

let repository: InMemoryAuthRepository;
let app: ReturnType<typeof createTestApp>;

beforeEach(() => {
  repository = new InMemoryAuthRepository();
  app = createTestApp({}, repository);
});

test("registers a customer, normalizes email, creates a member, and sanitizes credentials", async () => {
  const response = await app.handle(new Request("http://localhost/auth/register", { method: "POST", ...json({ email: "  User@Example.COM ", password: "password-123", name: "User", phone: "555" }) }));
  expect(response.status).toBe(200);
  const body = await token(response);
  expect(body.user).toEqual(expect.objectContaining({ email: "user@example.com", role: "customer", name: "User" }));
  expect(body.user).not.toHaveProperty("passwordHash");
  expect(body).toHaveProperty("accessToken");
  expect(body).toHaveProperty("refreshToken");
  expect(repository.users).toHaveLength(1);
  expect(repository.members).toHaveLength(1);
  expect(repository.members[0]?.phone).toBe("555");
});

test("rejects duplicate email and weak credentials", async () => {
  const first = { email: "a@example.com", password: "password-123", name: "A" };
  expect((await app.handle(new Request("http://localhost/auth/register", { method: "POST", ...json(first) }))).status).toBe(200);
  expect((await app.handle(new Request("http://localhost/auth/register", { method: "POST", ...json({ ...first, email: " A@EXAMPLE.COM " }) }))).status).toBe(409);
  expect((await app.handle(new Request("http://localhost/auth/register", { method: "POST", ...json({ ...first, email: "b@example.com", password: "short" }) }))).status).toBe(422);
});

test("login, auth guard, invalid credentials, and refresh rotation work", async () => {
  await app.handle(new Request("http://localhost/auth/register", { method: "POST", ...json({ email: "login@example.com", password: "password-123", name: "Login" }) }));
  const invalid = await app.handle(new Request("http://localhost/auth/login", { method: "POST", ...json({ email: "login@example.com", password: "wrong-password" }) }));
  expect(invalid.status).toBe(401);
  expect(await invalid.json()).toEqual({ error: { code: "UNAUTHORIZED", message: "Invalid credentials" } });
  const login = await app.handle(new Request("http://localhost/auth/login", { method: "POST", ...json({ email: " LOGIN@EXAMPLE.COM ", password: "password-123" }) }));
  const loggedIn = await token(login);
  const missing = await app.handle(new Request("http://localhost/auth/me"));
  expect(missing.status).toBe(401);
  expect((await missing.json()).error.code).toBe("UNAUTHORIZED");
  const me = await app.handle(new Request("http://localhost/auth/me", { headers: { authorization: `Bearer ${loggedIn.accessToken}` } }));
  expect(await me.json()).toEqual(loggedIn.user);
  const refreshed = await app.handle(new Request("http://localhost/auth/refresh", { method: "POST", ...json({ refreshToken: loggedIn.refreshToken }) }));
  expect(refreshed.status).toBe(200);
  const rotated = await token(refreshed);
  expect(rotated.refreshToken).not.toBe(loggedIn.refreshToken);
  const reused = await app.handle(new Request("http://localhost/auth/refresh", { method: "POST", ...json({ refreshToken: loggedIn.refreshToken }) }));
  expect(reused.status).toBe(401);
  expect((await reused.json()).error.code).toBe("UNAUTHORIZED");
});

test("logout revokes the refresh token", async () => {
  const registration = await app.handle(new Request("http://localhost/auth/register", { method: "POST", ...json({ email: "logout@example.com", password: "password-123", name: "Logout" }) }));
  const credentials = await token(registration);
  const logout = await app.handle(new Request("http://localhost/auth/logout", { method: "POST", ...json({ refreshToken: credentials.refreshToken }) }));
  expect(logout.status).toBe(200);
  const refresh = await app.handle(new Request("http://localhost/auth/refresh", { method: "POST", ...json({ refreshToken: credentials.refreshToken }) }));
  expect(refresh.status).toBe(401);
});
