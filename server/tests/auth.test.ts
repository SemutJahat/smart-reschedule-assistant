import { beforeEach, expect, test } from "bun:test";
import { InMemoryAuthRepository } from "../src/modules/auth/repository";
import { createTestApp } from "./helpers/app";
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL } from "../src/modules/auth/service";

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

test("serializes shared access and refresh TTLs and rejects malformed refresh tokens", async () => {
  const response = await app.handle(new Request("http://localhost/auth/register", { method: "POST", ...json({ email: "ttl@example.com", password: "password-123", name: "TTL" }) }));
  const credentials = await token(response);
  const accessPayload = JSON.parse(Buffer.from(credentials.accessToken.split(".")[1]!, "base64url").toString()) as { exp: number; iat: number };
  expect(accessPayload.exp - accessPayload.iat).toBe(15 * 60);
  const refreshPayload = JSON.parse(Buffer.from(credentials.refreshToken.split(".")[1]!, "base64url").toString()) as { exp: number; iat: number };
  expect(refreshPayload.exp - refreshPayload.iat).toBe(30 * 24 * 60 * 60);
  expect(ACCESS_TOKEN_TTL).toBe("15m");
  expect(REFRESH_TOKEN_TTL).toBe("30d");
  const malformed = await app.handle(new Request("http://localhost/auth/refresh", { method: "POST", ...json({ refreshToken: `${credentials.refreshToken}tampered` }) }));
  expect(malformed.status).toBe(401);
  const expiredRecord = repository.refreshTokens.find((record) => record.userId === String(credentials.user?.id));
  if (expiredRecord) expiredRecord.expiresAt = new Date(Date.now() - 1);
  const expired = await app.handle(new Request("http://localhost/auth/refresh", { method: "POST", ...json({ refreshToken: credentials.refreshToken }) }));
  expect(expired.status).toBe(401);
});

test("rejects a refresh token whose stored owner differs from its signed owner", async () => {
  const first = await app.handle(new Request("http://localhost/auth/register", { method: "POST", ...json({ email: "owner-one@example.com", password: "password-123", name: "One" }) }));
  const credentials = await token(first);
  const other = await app.handle(new Request("http://localhost/auth/register", { method: "POST", ...json({ email: "owner-two@example.com", password: "password-123", name: "Two" }) }));
  const otherCredentials = await token(other);
  const firstRecord = repository.refreshTokens.find((record) => record.tokenHash)!
  const otherRecord = repository.refreshTokens.find((record) => record.tokenHash === firstRecord.tokenHash);
  if (otherRecord) otherRecord.userId = String(otherCredentials.user.id);
  const response = await app.handle(new Request("http://localhost/auth/refresh", { method: "POST", ...json({ refreshToken: credentials.refreshToken }) }));
  expect(response.status).toBe(401);
  expect(otherCredentials.refreshToken).not.toBe(credentials.refreshToken);
});

test("in-memory transaction rolls back failed writes and serializes refresh rotation", async () => {
  await expect(repository.transaction(async (tx) => {
    await tx.insertUser({ email: "rollback@example.com", passwordHash: "hash", name: "Rollback" });
    throw new Error("abort");
  })).rejects.toThrow("abort");
  expect(repository.users).toHaveLength(0);
  const registration = await app.handle(new Request("http://localhost/auth/register", { method: "POST", ...json({ email: "race@example.com", password: "password-123", name: "Race" }) }));
  const credentials = await token(registration);
  const results = await Promise.all([
    app.handle(new Request("http://localhost/auth/refresh", { method: "POST", ...json({ refreshToken: credentials.refreshToken }) })),
    app.handle(new Request("http://localhost/auth/refresh", { method: "POST", ...json({ refreshToken: credentials.refreshToken }) })),
  ]);
  expect(results.filter((result) => result.status === 200)).toHaveLength(1);
  expect(results.filter((result) => result.status === 401)).toHaveLength(1);
});

test("registration rolls back the user when member creation fails", async () => {
  class FailingMemberRepository extends InMemoryAuthRepository {
    override async insertMember(_input: Parameters<InMemoryAuthRepository["insertMember"]>[0]): ReturnType<InMemoryAuthRepository["insertMember"]> { throw new Error("member insert failed"); }
  }
  const failingRepository = new FailingMemberRepository();
  const failingApp = createTestApp({}, failingRepository);
  const response = await failingApp.handle(new Request("http://localhost/auth/register", { method: "POST", ...json({ email: "rollback-route@example.com", password: "password-123", name: "Rollback" }) }));
  expect(response.status).toBe(500);
  expect(failingRepository.users).toHaveLength(0);
  expect(failingRepository.members).toHaveLength(0);
});

test("concurrent registrations with the same normalized email return one success and one conflict", async () => {
  const results = await Promise.all([
    app.handle(new Request("http://localhost/auth/register", { method: "POST", ...json({ email: "  race-email@example.com ", password: "password-123", name: "One" }) })),
    app.handle(new Request("http://localhost/auth/register", { method: "POST", ...json({ email: "RACE-EMAIL@example.com", password: "password-123", name: "Two" }) })),
  ]);
  expect(results.filter((result) => result.status === 200)).toHaveLength(1);
  expect(results.filter((result) => result.status === 409)).toHaveLength(1);
  expect(repository.users).toHaveLength(1);
  expect(repository.members).toHaveLength(1);
});
