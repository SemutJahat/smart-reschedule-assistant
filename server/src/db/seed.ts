import { eq, sql } from "drizzle-orm";
import { createDb } from "./client";
import {
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

const dbConnection = createDb();
const { db, client } = dbConnection;
const now = new Date();

const adminPassword = Bun.env.SEED_ADMIN_PASSWORD ?? "change-me-admin";
const customerPassword = Bun.env.SEED_CUSTOMER_PASSWORD ?? "change-me-customer";

async function seed(): Promise<void> {
  const [adminHash, customerHash] = await Promise.all([
    Bun.password.hash(adminPassword, { algorithm: "argon2id" }),
    Bun.password.hash(customerPassword, { algorithm: "argon2id" }),
  ]);

  await db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values([
        {
          id: seedIds.adminUser,
          email: "admin@example.com",
          passwordHash: adminHash,
          role: "admin",
          name: "Admin User",
        },
        {
          id: seedIds.customerUser,
          email: "customer@example.com",
          passwordHash: customerHash,
          role: "customer",
          name: "Demo Customer",
        },
      ])
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: sql`excluded.email`,
          passwordHash: sql`excluded.password_hash`,
          role: sql`excluded.role`,
          name: sql`excluded.name`,
          updatedAt: now,
        },
      });

    await tx
      .insert(members)
      .values({
        id: seedIds.member,
        memberNumber: "MEM-0001",
        userId: seedIds.customerUser,
        phone: "+1-555-0100",
        status: "active",
      })
      .onConflictDoUpdate({ target: members.userId, set: { status: "active", updatedAt: now } });

    await tx
      .insert(coaches)
      .values([
        {
          id: seedIds.coachOne,
          name: "Alex Morgan",
          phone: "+1-555-0101",
          specialty: "Yoga",
          status: "active",
        },
        {
          id: seedIds.coachTwo,
          name: "Taylor Reed",
          phone: "+1-555-0102",
          specialty: "Strength Training",
          status: "active",
        },
      ])
      .onConflictDoUpdate({ target: coaches.id, set: { status: "active", updatedAt: now } });

    await tx
      .insert(services)
      .values([
        { id: seedIds.serviceYoga, name: "Yoga", description: "Mobility and balance" },
        { id: seedIds.serviceStrength, name: "Strength Training", description: "Personal strength coaching" },
      ])
      .onConflictDoUpdate({ target: services.name, set: { active: true, updatedAt: now } });

    await tx
      .insert(coachServices)
      .values([
        { coachId: seedIds.coachOne, serviceId: seedIds.serviceYoga },
        { coachId: seedIds.coachTwo, serviceId: seedIds.serviceStrength },
      ])
      .onConflictDoNothing();

    await tx
      .insert(packages)
      .values([
        {
          id: seedIds.packageStarter,
          name: "Starter 5",
          category: "personal_training",
          description: "Five coached sessions",
          price: "75.00",
          totalSessions: 5,
          validityDays: 45,
          status: "active",
        },
        {
          id: seedIds.packageUnlimited,
          name: "Unlimited 30",
          category: "personal_training",
          description: "Unlimited sessions for thirty days",
          price: "199.00",
          totalSessions: 30,
          validityDays: 30,
          status: "active",
        },
      ])
      .onConflictDoUpdate({
        target: packages.id,
        set: { status: "active", updatedAt: now },
      });

    await tx
      .insert(subscriptions)
      .values({
        id: seedIds.subscription,
        memberId: seedIds.member,
        packageId: seedIds.packageStarter,
        status: "active",
        startsAt: now,
        expiresAt: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
        totalSessions: 5,
        usedSessions: 0,
        amountPaid: "75.00",
      })
      .onConflictDoUpdate({
        target: subscriptions.id,
        set: { status: "active", updatedAt: now },
      });

    await tx
      .insert(payments)
      .values({
        id: seedIds.payment,
        memberId: seedIds.member,
        subscriptionId: seedIds.subscription,
        amount: "75.00",
        status: "paid",
        method: "seed",
        reference: "seed-payment-0001",
        paidAt: now,
      })
      .onConflictDoUpdate({
        target: payments.id,
        set: { status: "paid", updatedAt: now },
      });

    await tx
      .insert(schedules)
      .values([
        {
          id: seedIds.scheduleYoga,
          title: "Morning Yoga",
          coachId: seedIds.coachOne,
          serviceId: seedIds.serviceYoga,
          startsAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          endsAt: new Date(now.getTime() + 25 * 60 * 60 * 1000),
          capacity: 10,
          status: "available",
        },
        {
          id: seedIds.scheduleStrength,
          title: "Evening Strength Training",
          coachId: seedIds.coachTwo,
          serviceId: seedIds.serviceStrength,
          startsAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
          endsAt: new Date(now.getTime() + 49 * 60 * 60 * 1000),
          capacity: 8,
          status: "available",
        },
      ])
      .onConflictDoUpdate({ target: schedules.id, set: { status: "available", updatedAt: now } });
  });

  // Verify the member upsert remains linked to the expected customer in local runs.
  const seededMember = await db.query.members.findFirst({
    where: eq(members.id, seedIds.member),
  });
  if (!seededMember || seededMember.userId !== seedIds.customerUser) {
    throw new Error("Seed verification failed for the demo member");
  }
}

try {
  await seed();
  console.log("Database seed complete");
} finally {
  await client.end({ timeout: 5 });
}
