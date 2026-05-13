import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const g = globalThis as unknown as {
  _pgPool?: Pool;
  _drizzle?: NodePgDatabase<typeof schema>;
};

function buildPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set at runtime");
  return new Pool({
    connectionString: url,
    max: 5,
    ssl:
      url.includes("railway.app") || url.includes("rlwy.net") || url.includes("railway.internal")
        ? { rejectUnauthorized: false }
        : undefined,
  });
}

function getPool(): Pool {
  if (!g._pgPool) g._pgPool = buildPool();
  return g._pgPool;
}

function getDb(): NodePgDatabase<typeof schema> {
  if (!g._drizzle) g._drizzle = drizzle(getPool(), { schema });
  return g._drizzle;
}

export const db: NodePgDatabase<typeof schema> = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_t, prop) {
    const real = getDb();
    const v = (real as unknown as Record<string | symbol, unknown>)[prop as string | symbol];
    return typeof v === "function" ? (v as Function).bind(real) : v;
  },
}) as NodePgDatabase<typeof schema>;

export const pool = new Proxy({} as Pool, {
  get(_t, prop) {
    const real = getPool();
    const v = (real as unknown as Record<string | symbol, unknown>)[prop as string | symbol];
    return typeof v === "function" ? (v as Function).bind(real) : v;
  },
}) as Pool;

export * from "./schema";
