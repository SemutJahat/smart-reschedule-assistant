import { expect, test } from "bun:test";
import { createTestApp } from "./helpers/app";

test("GET /health returns a healthy response without listening on a port", async () => {
  const response = await createTestApp().handle(new Request("http://localhost/health"));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});

test("unknown routes return the consistent error envelope", async () => {
  const response = await createTestApp().handle(new Request("http://localhost/missing"));

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({
    error: {
      code: "NOT_FOUND",
      message: "The requested resource was not found",
    },
  });
});
