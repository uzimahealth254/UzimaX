/**
 * Apply a SQL file against DATABASE_URL (loads .env.supabase if present and USE_SUPABASE=1).
 * Usage: npx tsx scripts/apply-sql-file.ts server/db/sql/audit_triggers.sql
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import postgres from 'postgres';

if (process.env.USE_SUPABASE === '1' && fs.existsSync('.env.supabase')) {
  dotenv.config({ path: '.env.supabase', override: true });
} else {
  dotenv.config();
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: tsx scripts/apply-sql-file.ts <sql-file>');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');
  const abs = path.resolve(file);
  const body = fs.readFileSync(abs, 'utf8');
  const needsSsl = /supabase\.co|pooler\.supabase/i.test(url);
  const sql = postgres(url, { max: 1, ssl: needsSsl ? 'require' : undefined });
  try {
    await sql.unsafe(body);
    console.log('Applied', abs);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
