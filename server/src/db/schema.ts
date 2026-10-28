import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const userRole = pgEnum("user_role", ["admin", "customer", "coach"]);
export const memberStatus = pgEnum("member_status", ["active", "inactive", "suspended"]);
export const coachStatus = pgEnum("coach_status", ["active", "inactive", "suspended"]);
export const packageStatus = pgEnum("package_status", ["active", "inactive", "archived"]);
export const subscriptionStatus = pgEnum("subscription_status", [
  "pending",
  "active",
  "expired",
  "cancelled",
]);
export const scheduleStatus = pgEnum("schedule_status", [
  "scheduled",
  "cancelled",
  "completed",
]);
export const bookingStatus = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);
export const rescheduleStatus = pgEnum("reschedule_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);
export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("customer"),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_uidx").on(table.email)],
);

export const members = pgTable(
  "members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 32 }),
    status: memberStatus("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("members_user_uidx").on(table.userId)],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("refresh_tokens_hash_uidx").on(table.tokenHash),
    index("refresh_tokens_user_idx").on(table.userId),
  ],
);

export const coaches = pgTable(
  "coaches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bio: text("bio"),
    status: coachStatus("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [uniqueIndex("coaches_user_uidx").on(table.userId)],
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [uniqueIndex("services_name_uidx").on(table.name)],
);

export const coachServices = pgTable(
  "coach_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => coaches.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("coach_services_coach_service_uidx").on(table.coachId, table.serviceId),
    index("coach_services_service_idx").on(table.serviceId),
  ],
);

export const packages = pgTable(
  "packages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    totalSessions: integer("total_sessions").notNull(),
    validityDays: integer("validity_days").notNull(),
    status: packageStatus("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [
    check("packages_price_nonnegative_chk", sql`${table.price} >= 0`),
    check("packages_sessions_positive_chk", sql`${table.totalSessions} > 0`),
    check("packages_validity_positive_chk", sql`${table.validityDays} > 0`),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    packageId: uuid("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "restrict" }),
    status: subscriptionStatus("status").notNull().default("pending"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    totalSessions: integer("total_sessions").notNull(),
    usedSessions: integer("used_sessions").notNull().default(0),
    amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("subscriptions_member_idx").on(table.memberId),
    check("subscriptions_total_sessions_nonnegative_chk", sql`${table.totalSessions} >= 0`),
    check("subscriptions_used_sessions_nonnegative_chk", sql`${table.usedSessions} >= 0`),
    check(
      "subscriptions_used_sessions_lte_total_chk",
      sql`${table.usedSessions} <= ${table.totalSessions}`,
    ),
    check("subscriptions_amount_paid_nonnegative_chk", sql`${table.amountPaid} >= 0`),
    check("subscriptions_expiry_after_start_chk", sql`${table.expiresAt} > ${table.startsAt}`),
  ],
);

export const schedules = pgTable(
  "schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => coaches.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    capacity: integer("capacity").notNull().default(1),
    status: scheduleStatus("status").notNull().default("scheduled"),
    ...timestamps,
  },
  (table) => [
    index("schedules_coach_start_idx").on(table.coachId, table.startsAt),
    index("schedules_service_start_idx").on(table.serviceId, table.startsAt),
    check("schedules_capacity_positive_chk", sql`${table.capacity} > 0`),
    check("schedules_end_after_start_chk", sql`${table.endsAt} > ${table.startsAt}`),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    scheduleId: uuid("schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "restrict" }),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "restrict" }),
    status: bookingStatus("status").notNull().default("pending"),
    bookedAt: timestamp("booked_at", { withTimezone: true }).defaultNow().notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    // PostgreSQL partial unique indexes enforce one active booking per member/session.
    uniqueIndex("bookings_member_schedule_active_uidx")
      .on(table.memberId, table.scheduleId)
      .where(sql`${table.status} in ('pending', 'confirmed')`),
    index("bookings_schedule_status_idx").on(table.scheduleId, table.status),
    index("bookings_member_idx").on(table.memberId),
  ],
);

export const rescheduleRequests = pgTable(
  "reschedule_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    fromScheduleId: uuid("from_schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "restrict" }),
    toScheduleId: uuid("to_schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "restrict" }),
    reason: text("reason"),
    status: rescheduleStatus("status").notNull().default("pending"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("reschedule_requests_booking_idx").on(table.bookingId),
    index("reschedule_requests_status_idx").on(table.status),
    check("reschedule_requests_different_schedule_chk", sql`${table.fromScheduleId} <> ${table.toScheduleId}`),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: paymentStatus("status").notNull().default("pending"),
    provider: varchar("provider", { length: 64 }),
    providerReference: varchar("provider_reference", { length: 255 }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("payments_member_idx").on(table.memberId),
    index("payments_subscription_idx").on(table.subscriptionId),
    uniqueIndex("payments_provider_reference_uidx").on(table.provider, table.providerReference),
    check("payments_amount_nonnegative_chk", sql`${table.amount} >= 0`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
