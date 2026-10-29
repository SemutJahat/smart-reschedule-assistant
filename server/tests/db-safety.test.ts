import { expect, test } from "bun:test";
import { seedServiceDefinitions, validateSeedEnvironment } from "../src/db/seed";
import { createTestDb } from "./helpers/db";

test("seed environment rejects production and missing explicit passwords", () => {
  expect(() => validateSeedEnvironment({ NODE_ENV: "production", SEED_ADMIN_PASSWORD: "a", SEED_CUSTOMER_PASSWORD: "b" })).toThrow(
    "only allowed",
  );
  expect(() => validateSeedEnvironment({ NODE_ENV: "test", SEED_CUSTOMER_PASSWORD: "b" })).toThrow(
    "SEED_ADMIN_PASSWORD is required",
  );
  expect(() => validateSeedEnvironment({ NODE_ENV: "test", SEED_ADMIN_PASSWORD: "a" })).toThrow(
    "SEED_CUSTOMER_PASSWORD is required",
  );
});

test("test database helper requires TEST_DATABASE_URL", () => {
  if (Bun.env.TEST_DATABASE_URL) return;
  expect(() => createTestDb()).toThrow("TEST_DATABASE_URL is required");
});

test("seed services use distinct stable ids and names", () => {
  expect(new Set(seedServiceDefinitions.map((service) => service.id)).size).toBe(seedServiceDefinitions.length);
  expect(new Set(seedServiceDefinitions.map((service) => service.name)).size).toBe(seedServiceDefinitions.length);
  expect(seedServiceDefinitions).toEqual([
    expect.objectContaining({ id: "00000000-0000-4000-8000-000000000006", name: "Yoga" }),
    expect.objectContaining({ id: "00000000-0000-4000-8000-000000000007", name: "Strength Training" }),
  ]);
});
