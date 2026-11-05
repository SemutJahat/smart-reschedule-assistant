import { eq } from "drizzle-orm";
import { closeDb, createDb } from "./client";
import {
  bookings,
  coachServices,
  coaches,
  members,
  packages,
  payments,
  schedules,
  services,
  subscriptions,
  users,
} from "./schema";
import { seedIds } from "../shared/ids";

export function validateSeedEnvironment(env: Record<string, string | undefined> = Bun.env): void {
  if (env.NODE_ENV !== "development" && env.NODE_ENV !== "test") {
    throw new Error("Database seed is only allowed when NODE_ENV is development or test");
  }
  if (!env.SEED_ADMIN_PASSWORD) {
    throw new Error("SEED_ADMIN_PASSWORD is required for database seeding");
  }
  if (!env.SEED_CUSTOMER_PASSWORD) {
    throw new Error("SEED_CUSTOMER_PASSWORD is required for database seeding");
  }
}

export function normalizeSeedEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const seedServiceDefinitions = [
  { id: seedIds.serviceYoga, name: "Yoga", description: "Mobility and balance" },
  { id: seedIds.serviceStrength, name: "Strength Training", description: "Personal strength coaching" },
] as const;

async function seed(): Promise<void> {
  validateSeedEnvironment();

  let connection: ReturnType<typeof createDb> | undefined;
  try {
    connection = createDb();
    const { db } = connection;
    const now = new Date();
    const scheduleTime = (daysAhead: number, hourUtc: number) =>
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysAhead, hourUtc));
    const adminPassword = Bun.env.SEED_ADMIN_PASSWORD!;
    const customerPassword = Bun.env.SEED_CUSTOMER_PASSWORD!;
    // Explicit credentials are required. Existing seed-user password hashes are never reset on reruns.
    const [adminHash, customerHash] = await Promise.all([
      Bun.password.hash(adminPassword, { algorithm: "argon2id" }),
      Bun.password.hash(customerPassword, { algorithm: "argon2id" }),
    ]);

    await db.transaction(async (tx) => {
      const expectedUsers = [
      { id: seedIds.adminUser, email: normalizeSeedEmail("admin@example.com") },
      { id: seedIds.customerUser, email: normalizeSeedEmail("customer@example.com") },
    ];
      for (const expected of expectedUsers) {
      const byId = await tx.query.users.findFirst({ where: eq(users.id, expected.id) });
      if (byId && byId.email !== expected.email) {
        throw new Error(`Seed user ${expected.id} has unexpected email ${byId.email}`);
      }
      const email = expected.email;
      const conflict = await tx.query.users.findFirst({ where: eq(users.email, email) });
      if (conflict && conflict.id !== expected.id) {
        throw new Error(`Seed email ${email} belongs to unexpected user ${conflict.id}`);
      }
      }
      const existingMember = await tx.query.members.findFirst({
      where: eq(members.memberNumber, "MEM-0001"),
    });
      if (existingMember && existingMember.id !== seedIds.member) {
      throw new Error(`Seed member number MEM-0001 belongs to unexpected member ${existingMember.id}`);
      }
      const memberById = await tx.query.members.findFirst({ where: eq(members.id, seedIds.member) });
      if (memberById && (memberById.userId !== seedIds.customerUser || memberById.memberNumber !== "MEM-0001")) {
      throw new Error(`Seed member ${seedIds.member} has conflicting identity fields`);
      }
      for (const expectedService of seedServiceDefinitions) {
      const service = await tx.query.services.findFirst({ where: eq(services.name, expectedService.name) });
      if (service && service.id !== expectedService.id) {
        throw new Error(`Seed service ${expectedService.name} belongs to unexpected service ${service.id}`);
      }
      const serviceById = await tx.query.services.findFirst({ where: eq(services.id, expectedService.id) });
      if (serviceById && serviceById.name !== expectedService.name) {
        throw new Error(`Seed service ${expectedService.id} has unexpected name ${serviceById.name}`);
      }
      }

    // Passwords are intentionally omitted from updates so reruns cannot reset credentials.
    await tx
      .insert(users)
      .values([
        {
          id: seedIds.adminUser,
          email: normalizeSeedEmail("admin@example.com"),
          passwordHash: adminHash,
          role: "admin",
          name: "Admin User",
        },
        {
          id: seedIds.customerUser,
          email: normalizeSeedEmail("customer@example.com"),
          passwordHash: customerHash,
          role: "customer",
          name: "Demo Customer",
        },
      ])
      .onConflictDoNothing({ target: users.id });
    await tx
      .update(users)
      .set({ email: normalizeSeedEmail("admin@example.com"), role: "admin", name: "Admin User", updatedAt: now })
      .where(eq(users.id, seedIds.adminUser));
    await tx
      .update(users)
      .set({ email: normalizeSeedEmail("customer@example.com"), role: "customer", name: "Demo Customer", updatedAt: now })
      .where(eq(users.id, seedIds.customerUser));

    await tx
      .insert(members)
      .values({
        id: seedIds.member,
        memberNumber: "MEM-0001",
        userId: seedIds.customerUser,
        phone: "+1-555-0100",
        emergencyContact: "Demo Emergency +1-555-0199",
        weight: "75.00",
        height: "180.00",
        bloodType: "O+",
        medicalHistory: "",
        status: "active",
      })
      .onConflictDoUpdate({
        target: members.id,
        set: {
          memberNumber: "MEM-0001",
          userId: seedIds.customerUser,
          phone: "+1-555-0100",
          emergencyContact: "Demo Emergency +1-555-0199",
          weight: "75.00",
          height: "180.00",
          bloodType: "O+",
          medicalHistory: "",
          status: "active",
          updatedAt: now,
        },
      });

    await tx
      .insert(coaches)
      .values([
        { id: seedIds.coachOne, name: "Alex Morgan", phone: "+1-555-0101", specialty: "Yoga", status: "active" },
        { id: seedIds.coachTwo, name: "Taylor Reed", phone: "+1-555-0102", specialty: "Strength Training", status: "active" },
      ])
      .onConflictDoUpdate({
        target: coaches.id,
        set: { name: "Alex Morgan", phone: "+1-555-0101", specialty: "Yoga", bio: null, status: "active", updatedAt: now },
      });
    await tx
      .update(coaches)
      .set({ name: "Taylor Reed", phone: "+1-555-0102", specialty: "Strength Training", bio: null, status: "active", updatedAt: now })
      .where(eq(coaches.id, seedIds.coachTwo));

    for (const service of seedServiceDefinitions) {
      await tx.insert(services).values(service).onConflictDoUpdate({
        target: services.id,
        set: { name: service.name, description: service.description, active: true, updatedAt: now },
      });
    }
    await tx
      .insert(coachServices)
      .values([
        { coachId: seedIds.coachOne, serviceId: seedIds.serviceYoga },
        { coachId: seedIds.coachTwo, serviceId: seedIds.serviceStrength },
      ])
      .onConflictDoNothing();

    await tx.insert(packages).values({ id: seedIds.packageStarter, name: "Starter 5", category: "personal_training", description: "Five coached sessions", price: "75.00", totalSessions: 5, validityDays: 45, status: "active" }).onConflictDoUpdate({ target: packages.id, set: { name: "Starter 5", category: "personal_training", description: "Five coached sessions", price: "75.00", totalSessions: 5, validityDays: 45, status: "active", updatedAt: now } });
    await tx.insert(packages).values({ id: seedIds.packageUnlimited, name: "Unlimited 30", category: "personal_training", description: "Unlimited sessions for thirty days", price: "199.00", totalSessions: 30, validityDays: 30, status: "active" }).onConflictDoUpdate({ target: packages.id, set: { name: "Unlimited 30", category: "personal_training", description: "Unlimited sessions for thirty days", price: "199.00", totalSessions: 30, validityDays: 30, status: "active", updatedAt: now } });
    await tx.insert(subscriptions).values({
      id: seedIds.subscription, memberId: seedIds.member, packageId: seedIds.packageStarter, status: "active",
      startsAt: now, expiresAt: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000), totalSessions: 5, usedSessions: 0, amountPaid: "75.00",
    }).onConflictDoUpdate({ target: subscriptions.id, set: { memberId: seedIds.member, packageId: seedIds.packageStarter, status: "active", startsAt: now, expiresAt: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000), totalSessions: 5, amountPaid: "75.00", updatedAt: now } });
    await tx.insert(payments).values({
      id: seedIds.payment, memberId: seedIds.member, packageId: seedIds.packageStarter, subscriptionId: seedIds.subscription, amount: "75.00", status: "paid",
      method: "seed", reference: "seed-payment-0001", paidAt: now,
    }).onConflictDoUpdate({ target: payments.id, set: { memberId: seedIds.member, packageId: seedIds.packageStarter, subscriptionId: seedIds.subscription, amount: "75.00", status: "paid", method: "seed", reference: "seed-payment-0001", paidAt: now, updatedAt: now } });
    const seedSchedules = [
      { id: seedIds.scheduleYoga, title: "Morning Yoga", coachId: seedIds.coachOne, serviceId: seedIds.serviceYoga, startsAt: scheduleTime(1, 8), endsAt: scheduleTime(1, 9), capacity: 10, status: "available" as const },
      { id: seedIds.scheduleStrength, title: "Evening Strength Training", coachId: seedIds.coachTwo, serviceId: seedIds.serviceStrength, startsAt: scheduleTime(2, 18), endsAt: scheduleTime(2, 19), capacity: 8, status: "available" as const },
      { id: seedIds.scheduleYogaEvening, title: "Evening Yoga", coachId: seedIds.coachOne, serviceId: seedIds.serviceYoga, startsAt: scheduleTime(1, 18), endsAt: scheduleTime(1, 19), capacity: 10, status: "available" as const },
      { id: seedIds.scheduleYogaNextWeek, title: "Morning Yoga Next Week", coachId: seedIds.coachOne, serviceId: seedIds.serviceYoga, startsAt: scheduleTime(8, 8), endsAt: scheduleTime(8, 9), capacity: 10, status: "available" as const },
    ];
    for (const schedule of seedSchedules) {
      const { id, ...values } = schedule;
      await tx.insert(schedules).values(schedule).onConflictDoUpdate({ target: schedules.id, set: { ...values, updatedAt: now } });
    }
    await tx
      .insert(bookings)
      .values({ id: seedIds.booking, memberId: seedIds.member, scheduleId: seedIds.scheduleYoga, subscriptionId: seedIds.subscription })
      .onConflictDoNothing({ target: bookings.id });
    });
  } finally {
    await closeDb(connection?.client ?? null);
  }
}

if (import.meta.main) {
  await seed();
  console.log("Database seed complete");
}
