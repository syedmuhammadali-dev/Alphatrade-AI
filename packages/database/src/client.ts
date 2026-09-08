import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadEnv } from "@alphatrade/shared-config";
import * as schema from "./schema";

let sql: postgres.Sql | undefined;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;

/** Lazily creates a single shared Postgres connection + Drizzle client per process. */
export function getDb() {
  if (dbInstance) return dbInstance;

  const env = loadEnv();
  sql = postgres(env.DATABASE_URL, { max: 10 });
  dbInstance = drizzle(sql, { schema });
  return dbInstance;
}

export async function closeDb(): Promise<void> {
  await sql?.end();
  sql = undefined;
  dbInstance = undefined;
}

export type Database = ReturnType<typeof getDb>;
