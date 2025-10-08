import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

export const db = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  statement_timeout: 30000,
  query_timeout: 30000,
});

db.on('error', (err) => console.error('PG pool error:', err));

export async function query(text, params) {
  const res = await db.query(text, params);
  return res;
}
