import { createApp } from "./app";
import { loadConfig } from "./config/env";
import { closeDb, createDb, type DatabaseConnection } from "./db/client";

export function createShutdown(
  app: ReturnType<typeof createApp>,
  connection: DatabaseConnection | null,
): () => Promise<void> {
  let shutdownPromise: Promise<void> | undefined;

  return () => {
    shutdownPromise ??= (async () => {
      try {
        await app.stop();
      } finally {
        await closeDb(connection?.client ?? null);
      }
    })();
    return shutdownPromise;
  };
}

export function createServer(config = loadConfig()) {
  const connection = config.databaseUrl ? createDb(config.databaseUrl) : null;
  const app = createApp(config, { database: connection });
  const shutdown = createShutdown(app, connection);

  return { app, connection, shutdown };
}

export function startServer(config = loadConfig()) {
  const runtime = createServer(config);
  runtime.app.listen(config.port);

  const onSignal = () => {
    void runtime.shutdown().then(
      () => process.exit(0),
      (error) => {
        console.error("Failed to shut down cleanly", error);
        process.exit(1);
      },
    );
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  return runtime;
}

if (import.meta.main) {
  const { app } = startServer();
  console.log(`API listening on http://localhost:${app.server?.hostname ?? "localhost"}:${app.server?.port}`);
}
