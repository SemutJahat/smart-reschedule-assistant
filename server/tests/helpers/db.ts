import type { DatabaseConnection } from "../../src/db/client";
import { closeDb, createDb } from "../../src/db/client";

/**
 * Returns a connection only when a test database URL is configured. Importing this
 * helper never opens a database connection, so unit tests remain self-contained.
 */
export function createTestDb(): DatabaseConnection {
  const url = Bun.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is required for database tests");
  return createDb(url);
}

export async function closeTestDb(connection: DatabaseConnection): Promise<void> {
  await closeDb(connection.client);
}
