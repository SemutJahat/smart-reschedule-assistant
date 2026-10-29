export type UserRole = "admin" | "customer";

export interface AuthUser {
  userId: string;
  role: UserRole;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberRecord {
  id: string;
  memberNumber: string;
  userId: string;
  phone: string | null;
  emergencyContact: string | null;
  weight: string | null;
  height: string | null;
  bloodType: string | null;
  medicalHistory: string | null;
  status: "active" | "inactive" | "suspended";
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewUser {
  email: string;
  passwordHash: string;
  role?: UserRole;
  name: string;
}

export interface NewMember {
  userId: string;
  memberNumber: string;
  phone?: string | null;
  emergencyContact?: string | null;
}

export interface MemberPatch {
  phone?: string | null;
  emergencyContact?: string | null;
  weight?: string | null;
  height?: string | null;
  bloodType?: string | null;
  medicalHistory?: string | null;
  status?: MemberRecord["status"];
}

export interface UserPatch {
  name?: string;
  role?: UserRole;
}

export interface AuthRepository {
  transaction<T>(fn: (tx: AuthRepository) => Promise<T>): Promise<T>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  listUsers(): Promise<UserRecord[]>;
  insertUser(user: NewUser): Promise<UserRecord>;
  updateUser(id: string, patch: UserPatch): Promise<UserRecord | null>;
  insertMember(member: NewMember): Promise<MemberRecord>;
  findMemberById(id: string): Promise<MemberRecord | null>;
  findMemberByUserId(userId: string): Promise<MemberRecord | null>;
  listMembers(): Promise<MemberRecord[]>;
  updateMember(id: string, patch: MemberPatch): Promise<MemberRecord | null>;
  insertRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshTokenRecord>;
  findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revokeRefreshToken(id: string, revokedAt?: Date): Promise<boolean>;
}
