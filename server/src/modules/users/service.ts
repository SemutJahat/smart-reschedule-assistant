import { AppError } from "../../shared/errors";
import { sanitizeUser } from "../auth/service";
import type { AuthRepository, AuthUser, UserPatch } from "../auth/schema";

export class UserService {
  constructor(private readonly repository: AuthRepository) {}

  get authRepository(): AuthRepository { return this.repository; }

  async list() {
    return (await this.repository.listUsers()).map(sanitizeUser);
  }

  async get(id: string) {
    const user = await this.repository.findUserById(id);
    if (!user) throw new AppError("NOT_FOUND", "User not found", 404);
    return sanitizeUser(user);
  }

  async update(requestingUser: AuthUser, id: string, patch: UserPatch) {
    this.assertCanAccess(requestingUser, id);
    if (requestingUser.role !== "admin" && patch.role !== undefined) throw new AppError("FORBIDDEN", "Forbidden", 403);
    if (patch.name !== undefined && patch.name.trim() === "") throw new AppError("BAD_REQUEST", "Name cannot be empty");
    const normalizedPatch: UserPatch = { ...patch };
    if (patch.name !== undefined) normalizedPatch.name = patch.name.trim();
    const user = await this.repository.updateUser(id, normalizedPatch);
    if (!user) throw new AppError("NOT_FOUND", "User not found", 404);
    return sanitizeUser(user);
  }

  assertCanAccess(requestingUser: AuthUser, targetUserId: string): void {
    if (requestingUser.role !== "admin" && requestingUser.userId !== targetUserId) {
      throw new AppError("FORBIDDEN", "Forbidden", 403);
    }
  }
}
