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

/** Explicit connections are preferred; this optional convenience connection is created only on access. */
let lazyDefaultConnection: DatabaseConnection | null | undefined;
export function getDefaultDb(): DatabaseConnection | null {
  if (lazyDefaultConnection === undefined) {
    lazyDefaultConnection = databaseUrlFromEnv() ? createDb() : null;
  }
  return lazyDefaultConnection;
}

export async function closeDb(connection: Sql | null): Promise<void> {
  if (connection) await connection.end({ timeout: 5 });
}
