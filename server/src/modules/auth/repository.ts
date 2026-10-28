import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db/client";
import { createId } from "../../shared/ids";
import { members, refreshTokens, users } from "../../db/schema";
import type {
  AuthRepository,
  MemberPatch,
  MemberRecord,
  NewMember,
  NewUser,
  RefreshTokenRecord,
  UserPatch,
  UserRecord,
} from "./schema";
import { normalizeEmail } from "./service";

type DbExecutor = any;

function user(row: typeof users.$inferSelect): UserRecord {
  return row;
}

function member(row: typeof members.$inferSelect): MemberRecord {
  return row;
}

function refresh(row: typeof refreshTokens.$inferSelect): RefreshTokenRecord {
  return row;
}

export class DrizzleAuthRepository implements AuthRepository {
  constructor(private readonly db: DbExecutor) {}

  async transaction<T>(fn: (tx: AuthRepository) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx: DbExecutor) => fn(new DrizzleAuthRepository(tx)));
  }

  async findUserByEmail(email: string) {
    const rows = await this.db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);
    return rows[0] ? user(rows[0]) : null;
  }

  async findUserById(id: string) {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ? user(rows[0]) : null;
  }

  async listUsers() {
    return (await this.db.select().from(users)).map(user);
  }

  async insertUser(input: NewUser) {
    const rows = await this.db.insert(users).values({ ...input, email: normalizeEmail(input.email) }).returning();
    return user(rows[0]);
  }

  async updateUser(id: string, patch: UserPatch) {
    const rows = await this.db.update(users).set({ ...patch, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return rows[0] ? user(rows[0]) : null;
  }

  async insertMember(input: NewMember) {
    const rows = await this.db.insert(members).values(input).returning();
    return member(rows[0]);
  }

  async findMemberById(id: string) {
    const rows = await this.db.select().from(members).where(eq(members.id, id)).limit(1);
    return rows[0] ? member(rows[0]) : null;
  }

  async findMemberByUserId(userId: string) {
    const rows = await this.db.select().from(members).where(eq(members.userId, userId)).limit(1);
    return rows[0] ? member(rows[0]) : null;
  }

  async listMembers() {
    return (await this.db.select().from(members)).map(member);
  }

  async updateMember(id: string, patch: MemberPatch) {
    const rows = await this.db.update(members).set({ ...patch, updatedAt: new Date() }).where(eq(members.id, id)).returning();
    return rows[0] ? member(rows[0]) : null;
  }

  async insertRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    const rows = await this.db.insert(refreshTokens).values({ userId, tokenHash, expiresAt }).returning();
    return refresh(rows[0]);
  }

  async findRefreshToken(tokenHash: string) {
    const rows = await this.db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).limit(1);
    return rows[0] ? refresh(rows[0]) : null;
  }

  async revokeRefreshToken(id: string, revokedAt = new Date()) {
    const rows = await this.db
      .update(refreshTokens)
      .set({ revokedAt, updatedAt: new Date() })
      .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)))
      .returning({ id: refreshTokens.id });
    return rows.length > 0;
  }
}

export function createAuthRepository(db: Database): AuthRepository {
  return new DrizzleAuthRepository(db);
}

/** Explicitly injectable repository used by app-factory tests and local development without a DB. */
export class InMemoryAuthRepository implements AuthRepository {
  readonly users: UserRecord[] = [];
  readonly members: MemberRecord[] = [];
  readonly refreshTokens: RefreshTokenRecord[] = [];

  async transaction<T>(fn: (tx: AuthRepository) => Promise<T>): Promise<T> { return fn(this); }
  async findUserByEmail(email: string) { return this.users.find((item) => item.email === normalizeEmail(email)) ?? null; }
  async findUserById(id: string) { return this.users.find((item) => item.id === id) ?? null; }
  async listUsers() { return [...this.users]; }
  async insertUser(input: NewUser) {
    const email = normalizeEmail(input.email);
    if (this.users.some((item) => item.email === email)) throw new Error("duplicate email");
    const now = new Date();
    const item: UserRecord = { id: createId(), email, passwordHash: input.passwordHash, role: input.role ?? "customer", name: input.name, createdAt: now, updatedAt: now };
    this.users.push(item);
    return item;
  }
  async updateUser(id: string, patch: UserPatch) { const item = await this.findUserById(id); if (!item) return null; Object.assign(item, patch, { updatedAt: new Date() }); return item; }
  async insertMember(input: NewMember) {
    if (this.members.some((item) => item.userId === input.userId)) throw new Error("duplicate member");
    const now = new Date();
    const item: MemberRecord = { id: createId(), memberNumber: input.memberNumber, userId: input.userId, phone: input.phone ?? null, emergencyContact: input.emergencyContact ?? null, weight: null, height: null, bloodType: null, medicalHistory: null, status: "active", joinedAt: now, createdAt: now, updatedAt: now };
    this.members.push(item);
    return item;
  }
  async findMemberById(id: string) { return this.members.find((item) => item.id === id) ?? null; }
  async findMemberByUserId(userId: string) { return this.members.find((item) => item.userId === userId) ?? null; }
  async listMembers() { return [...this.members]; }
  async updateMember(id: string, patch: MemberPatch) { const item = await this.findMemberById(id); if (!item) return null; Object.assign(item, patch, { updatedAt: new Date() }); return item; }
  async insertRefreshToken(userId: string, tokenHash: string, expiresAt: Date) { const now = new Date(); const item: RefreshTokenRecord = { id: createId(), userId, tokenHash, expiresAt, revokedAt: null, createdAt: now, updatedAt: now }; this.refreshTokens.push(item); return item; }
  async findRefreshToken(tokenHash: string) { return this.refreshTokens.find((item) => item.tokenHash === tokenHash) ?? null; }
  async revokeRefreshToken(id: string, revokedAt = new Date()) { const item = this.refreshTokens.find((token) => token.id === id && !token.revokedAt); if (!item) return false; item.revokedAt = revokedAt; item.updatedAt = new Date(); return true; }
}
