import { AppError } from "../../shared/errors";
import type {
  AuthRepository,
  AuthUser,
  MemberRecord,
  UserPatch,
  UserRecord,
  UserRole,
} from "./schema";

export const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL = "30d";
export const REFRESH_TOKEN_TTL_MS = durationToMilliseconds(REFRESH_TOKEN_TTL);

function durationToMilliseconds(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) throw new Error(`Unsupported token duration: ${duration}`);
  const units = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
  return Number(match[1]) * units[match[2] as keyof typeof units];
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sanitizeUser(user: UserRecord) {
  return { id: user.id, email: user.email, role: user.role, name: user.name };
}

export function sanitizeMember(member: MemberRecord) {
  return {
    ...member,
    joinedAt: member.joinedAt.toISOString(),
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

export async function digestRefreshToken(token: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bad(message: string, status = 400, code: "BAD_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" = "BAD_REQUEST"): never {
  throw new AppError(code, message, status);
}

function validatePassword(password: string): void {
  if (password.length < 8) bad("Password must be at least 8 characters long");
}

export interface TokenIssuer {
  sign(payload: { userId: string; role: UserRole; exp: string }): Promise<string>;
}

export interface AuthServiceOptions {
  repository: AuthRepository;
  issueAccessToken: (user: AuthUser) => Promise<string>;
  issueRefreshToken?: (user: AuthUser) => Promise<string>;
  verifyRefreshToken?: (token: string) => Promise<{ userId?: string } | false>;
  now?: () => Date;
}

export class AuthService {
  readonly repository: AuthRepository;
  private issueAccessToken: AuthServiceOptions["issueAccessToken"];
  private readonly now: () => Date;
  private readonly issueRefreshToken: (user: AuthUser) => Promise<string>;
  private readonly verifyRefreshToken?: AuthServiceOptions["verifyRefreshToken"];

  constructor(options: AuthServiceOptions) {
    this.repository = options.repository;
    this.issueAccessToken = options.issueAccessToken;
    this.issueRefreshToken = options.issueRefreshToken ?? (async () => crypto.randomUUID() + crypto.randomUUID());
    this.verifyRefreshToken = options.verifyRefreshToken;
    this.now = options.now ?? (() => new Date());
  }

  setAccessTokenIssuer(issuer: AuthServiceOptions["issueAccessToken"]): void {
    this.issueAccessToken = issuer;
  }

  async register(input: { email: string; password: string; name: string; phone?: string | null }) {
    validatePassword(input.password);
    const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad("A valid email is required");
    return this.repository.transaction(async (tx) => {
      if (await tx.findUserByEmail(email)) bad("Email is already registered", 409, "CONFLICT");
      const passwordHash = await Bun.password.hash(input.password, { algorithm: "argon2id" });
      const name = input.name.trim();
      if (!name) bad("Name is required");
      const user = await tx.insertUser({ email, passwordHash, role: "customer", name });
      await tx.insertMember({ userId: user.id, memberNumber: `MEM-${user.id.slice(0, 8).toUpperCase()}`, phone: input.phone?.trim() || null });
      return this.issueTokens(tx, user);
    }).catch((error: unknown) => {
      if (isUniqueViolation(error)) throw new AppError("CONFLICT", "Email is already registered", 409);
      throw error;
    });
  }

  async login(input: { email: string; password: string }) {
    const user = await this.repository.findUserByEmail(normalizeEmail(input.email));
    if (!user || !(await Bun.password.verify(input.password, user.passwordHash))) bad("Invalid credentials", 401, "UNAUTHORIZED");
    return this.issueTokens(this.repository, user);
  }

  private async issueTokens(repository: AuthRepository, user: UserRecord) {
    const authUser = { userId: user.id, role: user.role } satisfies AuthUser;
    const accessToken = await this.issueAccessToken(authUser);
    const refreshToken = await this.issueRefreshToken(authUser);
    await repository.insertRefreshToken(user.id, await digestRefreshToken(refreshToken), new Date(this.now().getTime() + REFRESH_TOKEN_TTL_MS));
    return { user: sanitizeUser(user), accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    const claims = this.verifyRefreshToken ? await this.verifyRefreshToken(refreshToken) : undefined;
    if (claims === false) bad("Invalid refresh token", 401, "UNAUTHORIZED");
    const digest = await digestRefreshToken(refreshToken);
    return this.repository.transaction(async (tx) => {
      const old = await tx.findRefreshToken(digest);
      const now = this.now();
      if (!old || old.revokedAt || old.expiresAt.getTime() <= now.getTime()) bad("Invalid refresh token", 401, "UNAUTHORIZED");
      const user = await tx.findUserById(old.userId);
      if (!user) bad("Invalid refresh token", 401, "UNAUTHORIZED");
      if (claims?.userId && claims.userId !== user.id) bad("Invalid refresh token", 401, "UNAUTHORIZED");
      const revoked = await tx.revokeRefreshToken(old.id, now);
      if (!revoked) bad("Invalid refresh token", 401, "UNAUTHORIZED");
      return this.issueTokens(tx, user);
    });
  }

  async logout(refreshToken: string): Promise<void> {
    const digest = await digestRefreshToken(refreshToken);
    const record = await this.repository.findRefreshToken(digest);
    if (record && !record.revokedAt) await this.repository.revokeRefreshToken(record.id, this.now());
  }

  async me(userId: string) {
    const user = await this.repository.findUserById(userId);
    if (!user) bad("User not found", 404);
    return sanitizeUser(user);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && ("code" in error && error.code === "23505" || error instanceof Error && error.message === "duplicate email"));
}

export function assertUserRole(user: AuthUser, role: UserRole): void {
  if (user.role !== role) bad("Forbidden", 403);
}

export type { AuthUser, AuthRepository, MemberRecord, UserPatch, UserRecord };
