import { expect, test } from "bun:test";
import { validateSeedEnvironment } from "../src/db/seed";
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
