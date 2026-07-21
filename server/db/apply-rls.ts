import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');
  const needsSsl = /supabase\.co|pooler\.supabase/i.test(url);
  const sql = postgres(url, { max: 1, ssl: needsSsl ? 'require' : undefined });
  const file = path.join(__dirname, 'sql', 'rls.sql');
  const body = fs.readFileSync(file, 'utf8');
  try {
    await sql.unsafe(body);
    console.log('RLS policies applied from', file);
  } catch (e) {
    console.error('RLS apply failed', e);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
