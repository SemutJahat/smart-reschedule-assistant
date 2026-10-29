import { AppError } from "../../shared/errors";
import { sanitizeMember } from "../auth/service";
import type { AuthRepository, AuthUser, MemberPatch } from "../auth/schema";

export class MemberService {
  constructor(private readonly repository: AuthRepository) {}

  async getForUser(user: AuthUser) {
    const member = await this.repository.findMemberByUserId(user.userId);
    if (!member) throw new AppError("NOT_FOUND", "Member not found", 404);
    return sanitizeMember(member);
  }

  async getById(user: AuthUser, id: string) {
    const member = await this.repository.findMemberById(id);
    if (!member) throw new AppError("NOT_FOUND", "Member not found", 404);
    if (user.role !== "admin" && member.userId !== user.userId) throw new AppError("FORBIDDEN", "Forbidden", 403);
    return sanitizeMember(member);
  }

  async list(user: AuthUser) {
    if (user.role !== "admin") throw new AppError("FORBIDDEN", "Forbidden", 403);
    return (await this.repository.listMembers()).map(sanitizeMember);
  }

  async update(user: AuthUser, id: string, patch: MemberPatch) {
    const existing = await this.repository.findMemberById(id);
    if (!existing) throw new AppError("NOT_FOUND", "Member not found", 404);
    if (user.role !== "admin" && existing.userId !== user.userId) throw new AppError("FORBIDDEN", "Forbidden", 403);
    const member = await this.repository.updateMember(id, patch);
    if (!member) throw new AppError("NOT_FOUND", "Member not found", 404);
    return sanitizeMember(member);
  }
}
