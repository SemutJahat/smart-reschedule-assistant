import type { DatabaseConnection } from "../../src/db/client";
import { closeDb, createDb } from "../../src/db/client";

/**
 * Returns a connection only when a test database URL is configured. Importing this
 * helper never opens a database connection, so unit tests remain self-contained.
 */
export function createTestDb(): DatabaseConnection | null {
  const url = Bun.env.TEST_DATABASE_URL ?? Bun.env.DATABASE_URL;
  return url ? createDb(url) : null;
}

export async function closeTestDb(connection: DatabaseConnection | null): Promise<void> {
  await closeDb(connection?.client ?? null);
}
