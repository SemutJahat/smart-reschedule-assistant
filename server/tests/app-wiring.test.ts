import { expect, test } from "bun:test";
import { createTestApp } from "./helpers/app";

test("createApp wires every API module without starting a listener", () => {
  const app = createTestApp();
  const paths = new Set(app.routes.map((route) => route.path));

  expect(app.server).toBeNull();
  for (const path of [
    "/health",
    "/auth/login",
    "/users",
    "/members/me",
    "/coaches",
    "/packages",
    "/schedules",
    "/payments",
    "/subscriptions/me",
    "/bookings",
    "/reschedule-requests",
  ]) {
    expect(paths.has(path)).toBe(true);
  }
});
