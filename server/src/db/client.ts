import postgres, { type Sql } from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;
export type DatabaseConnection = { client: Sql; db: Database };

function databaseUrlFromEnv(): string | undefined {
  return Bun.env.DATABASE_URL ?? process.env.DATABASE_URL;
}

export function createDb(databaseUrl = databaseUrlFromEnv()): DatabaseConnection {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to create a database connection");
  }

  const client = postgres(databaseUrl);
  return { client, db: drizzle(client, { schema }) };
}

// Constructing postgres-js does not open a socket; the connection is acquired on first query.
// Keeping this nullable makes importing application modules safe in tests without a database.
const defaultConnection = databaseUrlFromEnv() ? createDb() : null;
export const client = defaultConnection?.client ?? null;
export const db = defaultConnection?.db ?? null;

export async function closeDb(connection: Sql | null = client): Promise<void> {
  if (connection) await connection.end({ timeout: 5 });
}
