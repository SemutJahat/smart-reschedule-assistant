import { AppError } from "../../shared/errors";

type DatabaseErrorShape = {
  code?: unknown;
  message?: unknown;
  constraint?: unknown;
  constraint_name?: unknown;
  cause?: DatabaseErrorShape;
};

/** Converts booking trigger/index errors from postgres-js (including wrapped causes). */
export function mapBookingInvariantError(error: unknown): AppError | null {
  if (!error || typeof error !== "object") return null;
  const root = error as DatabaseErrorShape;
  const candidates: DatabaseErrorShape[] = [root];
  if (root.cause && typeof root.cause === "object") candidates.push(root.cause);

  const codes = new Set(candidates.map((item) => item.code).filter((value): value is string => typeof value === "string"));
  const messages = candidates.map((item) => item.message).filter((value): value is string => typeof value === "string");
  const constraints = new Set(
    candidates
      .flatMap((item) => [item.constraint, item.constraint_name])
      .filter((value): value is string => typeof value === "string"),
  );

  if (codes.has("23505") && constraints.has("bookings_member_schedule_active_uidx")) {
    return new AppError("CONFLICT", "Member already has an active booking for this schedule", 409);
  }
  const message = messages.join(" ");
  if (codes.has("P0001") && message.includes("BOOKING_CAPACITY_EXCEEDED")) return new AppError("CONFLICT", "Schedule is full", 409);
  if (codes.has("P0002") && message.includes("BOOKING_SCHEDULE_CANCELLED")) return new AppError("CONFLICT", "Schedule is cancelled", 409);
  if (codes.has("P0003") && message.includes("BOOKING_SUBSCRIPTION_INACTIVE_OR_EXPIRED")) return new AppError("CONFLICT", "Subscription is not active or has expired", 409);
  if (codes.has("P0004") && message.includes("BOOKING_SUBSCRIPTION_QUOTA_EXHAUSTED")) return new AppError("CONFLICT", "Subscription has no remaining sessions", 409);
  if (codes.has("P0005") && message.includes("BOOKING_SUBSCRIPTION_OWNERSHIP")) return new AppError("CONFLICT", "Subscription does not belong to the member", 409);
  if (codes.has("P0006") && message.includes("BOOKING_CAPACITY_REDUCTION")) return new AppError("CONFLICT", "Capacity cannot be lower than existing bookings", 409);
  return null;
}
