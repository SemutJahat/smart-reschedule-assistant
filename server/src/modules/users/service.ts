import { AppError } from "../../shared/errors";
import { sanitizeUser } from "../auth/service";
import type { AuthRepository, AuthUser, UserPatch } from "../auth/schema";

export class UserService {
  constructor(private readonly repository: AuthRepository) {}

  async list() {
    return (await this.repository.listUsers()).map(sanitizeUser);
  }

  async get(id: string) {
    const user = await this.repository.findUserById(id);
    if (!user) throw new AppError("NOT_FOUND", "User not found", 404);
    return sanitizeUser(user);
  }

  async update(id: string, patch: UserPatch) {
    if (patch.name !== undefined && patch.name.trim() === "") throw new AppError("BAD_REQUEST", "Name cannot be empty");
    const user = await this.repository.updateUser(id, { ...patch, name: patch.name?.trim() });
    if (!user) throw new AppError("NOT_FOUND", "User not found", 404);
    return sanitizeUser(user);
  }

  assertCanAccess(requestingUser: AuthUser, targetUserId: string): void {
    if (requestingUser.role !== "admin" && requestingUser.userId !== targetUserId) {
      throw new AppError("BAD_REQUEST", "Forbidden", 403);
    }
  }
}
