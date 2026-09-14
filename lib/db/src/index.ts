import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { env } from "./env";

const { Pool } = pg;

export const pool = new Pool({ connectionString: env.databaseUrl });
export const db = drizzle(pool, { schema });

export * from "./schema";
export * from "./upsert-business";
