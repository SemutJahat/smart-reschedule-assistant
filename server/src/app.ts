import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";
import { loadConfig, type AppConfig } from "./config/env";
import { errors } from "./plugins/errors";

const healthResponse = t.Object({
  status: t.Literal("ok"),
});

export function createApp(config: AppConfig = loadConfig()) {
  return new Elysia({ name: "smart-reschedule-assistant-api" })
    .use(
      cors({
        origin: config.corsOrigin,
      }),
    )
    .use(errors)
    .get(
      "/health",
      () => ({ status: "ok" as const }),
      {
        response: healthResponse,
      },
    );
}
