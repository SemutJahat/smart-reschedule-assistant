import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
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

export const userRole = pgEnum("user_role", ["admin", "customer"]);
export const memberStatus = pgEnum("member_status", ["active", "inactive", "suspended"]);
export const coachStatus = pgEnum("coach_status", ["active", "inactive", "suspended"]);
export const packageStatus = pgEnum("package_status", ["active", "inactive", "archived"]);
export const subscriptionStatus = pgEnum("subscription_status", [
  "pending",
  "held",
  "active",
  "expired",
  "cancelled",
]);
export const scheduleStatus = pgEnum("schedule_status", [
  "available",
  "full",
  "cancelled",
]);
export const bookingStatus = pgEnum("booking_status", [
  "booked",
  "cancelled",
  "attended",
  "no_show",
]);
export const rescheduleStatus = pgEnum("reschedule_status", [
  "pending",
  "held",
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
export const chatSessionStatus = pgEnum("chat_session_status", [
  "active",
  "awaiting_confirmation",
  "submitted",
  "closed",
]);
export const chatMessageRole = pgEnum("chat_message_role", ["user", "assistant", "system"]);
export const chatAnalysisStatus = pgEnum("chat_analysis_status", ["pending", "completed", "failed"]);
export const chatIntent = pgEnum("chat_intent", [
  "Reschedule",
  "Cancel",
  "Schedule inquiry",
  "Confirmation",
  "Other",
]);
export const chatAnalysisNextState = pgEnum("chat_analysis_next_state", [
  "active",
  "awaiting_confirmation",
  "submitted",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("customer"),
    name: varchar("name", { length: 200 }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_lower_uidx").on(sql`lower(${table.email})`),
    check("users_email_lowercase_chk", sql`${table.email} = lower(${table.email})`),
  ],
);

export const members = pgTable(
  "members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberNumber: varchar("member_number", { length: 32 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 32 }),
    emergencyContact: text("emergency_contact"),
    weight: numeric("weight", { precision: 6, scale: 2 }),
    height: numeric("height", { precision: 6, scale: 2 }),
    bloodType: varchar("blood_type", { length: 8 }),
    medicalHistory: text("medical_history"),
    status: memberStatus("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("members_member_number_uidx").on(table.memberNumber),
    uniqueIndex("members_user_uidx").on(table.userId),
    check("members_weight_nonnegative_chk", sql`${table.weight} >= 0`),
    check("members_height_nonnegative_chk", sql`${table.height} >= 0`),
  ],
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
    name: varchar("name", { length: 200 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    specialty: varchar("specialty", { length: 120 }),
    bio: text("bio"),
    status: coachStatus("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [index("coaches_status_idx").on(table.status)],
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
    category: varchar("category", { length: 80 }).notNull(),
    description: text("description"),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    totalSessions: integer("total_sessions").notNull(),
    validityDays: integer("validity_days").notNull(),
    status: packageStatus("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [
    check("packages_price_positive_chk", sql`${table.price} > 0`),
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
    uniqueIndex("subscriptions_member_id_uidx").on(table.memberId, table.id),
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
    title: varchar("title", { length: 160 }).notNull(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => coaches.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    capacity: integer("capacity").notNull().default(1),
    status: scheduleStatus("status").notNull().default("available"),
    ...timestamps,
  },
  (table) => [
    index("schedules_coach_start_idx").on(table.coachId, table.startsAt),
    index("schedules_service_start_idx").on(table.serviceId, table.startsAt),
    foreignKey({
      columns: [table.coachId, table.serviceId],
      foreignColumns: [coachServices.coachId, coachServices.serviceId],
      name: "schedules_coach_service_fk",
    }),
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
    status: bookingStatus("status").notNull().default("booked"),
    bookedAt: timestamp("booked_at", { withTimezone: true }).defaultNow().notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    // PostgreSQL partial unique indexes enforce one active booking per member/session.
    uniqueIndex("bookings_member_schedule_active_uidx")
      .on(table.memberId, table.scheduleId)
      .where(sql`${table.status} = 'booked'`),
    index("bookings_schedule_status_idx").on(table.scheduleId, table.status),
    index("bookings_member_idx").on(table.memberId),
    uniqueIndex("bookings_id_member_schedule_uidx").on(table.id, table.memberId, table.scheduleId),
    foreignKey({
      columns: [table.memberId, table.subscriptionId],
      foreignColumns: [subscriptions.memberId, subscriptions.id],
      name: "bookings_member_subscription_fk",
    }),
  ],
);

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),
    status: chatSessionStatus("status").notNull().default("active"),
    currentIntent: chatIntent("current_intent"),
    proposedScheduleId: uuid("proposed_schedule_id").references(() => schedules.id, { onDelete: "set null" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("chat_sessions_member_idx").on(table.memberId),
    index("chat_sessions_booking_idx").on(table.bookingId),
    index("chat_sessions_status_idx").on(table.status),
    uniqueIndex("chat_sessions_active_member_booking_uidx")
      .on(table.memberId, table.bookingId)
      .where(sql`${table.status} in ('active', 'awaiting_confirmation')`),
  ],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: chatMessageRole("role").notNull(),
    content: text("content").notNull(),
    sequence: integer("sequence").notNull(),
    clientMessageId: uuid("client_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("chat_messages_session_sequence_uidx").on(table.sessionId, table.sequence),
    uniqueIndex("chat_messages_session_client_message_uidx")
      .on(table.sessionId, table.clientMessageId)
      .where(sql`${table.clientMessageId} is not null`),
    index("chat_messages_session_sequence_idx").on(table.sessionId, table.sequence),
  ],
);

export const chatMessageAnalyses = pgTable(
  "chat_message_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => chatMessages.id, { onDelete: "cascade" }),
    status: chatAnalysisStatus("status").notNull().default("pending"),
    intent: chatIntent("intent").notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
    extractedData: jsonb("extracted_data").$type<Record<string, unknown>>().notNull(),
    recommendedScheduleIds: jsonb("recommended_schedule_ids").$type<string[]>().notNull(),
    nextState: chatAnalysisNextState("next_state").notNull(),
    reply: text("reply").notNull(),
    model: varchar("model", { length: 120 }).notNull(),
    modelVersion: varchar("model_version", { length: 120 }).notNull(),
    errorCode: varchar("error_code", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("chat_message_analyses_message_uidx").on(table.messageId),
    index("chat_message_analyses_status_idx").on(table.status),
    check("chat_message_analyses_confidence_chk", sql`${table.confidence} >= 0 and ${table.confidence} <= 1`),
  ],
);

export const rescheduleRequests = pgTable(
  "reschedule_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatSessionId: uuid("chat_session_id").references(() => chatSessions.id, { onDelete: "set null" }),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    fromScheduleId: uuid("from_schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "restrict" }),
    toScheduleId: uuid("to_schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "restrict" }),
    customerMessage: text("customer_message"),
    adminNote: text("admin_note"),
    status: rescheduleStatus("status").notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("reschedule_requests_booking_idx").on(table.bookingId),
    index("reschedule_requests_status_idx").on(table.status),
    uniqueIndex("reschedule_requests_active_booking_uidx")
      .on(table.bookingId)
      .where(sql`${table.status} in ('pending', 'held')`),
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
    packageId: uuid("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "restrict" }),
    subscriptionId: uuid("subscription_id")
      .references(() => subscriptions.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: paymentStatus("status").notNull().default("pending"),
    method: varchar("method", { length: 64 }),
    reference: varchar("reference", { length: 255 }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("payments_member_idx").on(table.memberId),
    index("payments_package_idx").on(table.packageId),
    index("payments_subscription_idx").on(table.subscriptionId),
    uniqueIndex("payments_reference_uidx").on(table.reference),
    check("payments_amount_nonnegative_chk", sql`${table.amount} >= 0`),
    foreignKey({
      columns: [table.memberId, table.subscriptionId],
      foreignColumns: [subscriptions.memberId, subscriptions.id],
      name: "payments_member_subscription_fk",
    }),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
