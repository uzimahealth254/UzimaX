/**
 * Push Drizzle schema + RLS + audit triggers + Supabase SQL migrations to hosted Supabase.
 *
 * Configure via `.env.supabase` OR env vars:
 *   SUPABASE_PROJECT_REF=mllsgipchoezhaehbvew
 *   SUPABASE_DB_PASSWORD=<from dashboard → Project Settings → Database>
 *   SUPABASE_REGION=eu-west-1   (optional, default eu-west-1)
 *
 *   npm run db:setup:supabase
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import postgres from 'postgres';

const envPath = path.resolve('.env.supabase');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
} else {
  dotenv.config();
}

function buildPoolerUrl(ref: string, password: string, region = 'eu-west-1') {
  const host = region.startsWith('aws-') ? region : `aws-0-${region}`;
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${host}.pooler.supabase.com:5432/postgres`;
}

const ref = process.env.SUPABASE_PROJECT_REF?.trim();
const password = process.env.SUPABASE_DB_PASSWORD?.trim();
const region = process.env.SUPABASE_REGION?.trim() || 'eu-west-1';

let url = process.env.DATABASE_URL?.trim();
if (!url && ref && password) {
  url = buildPoolerUrl(ref, password, region);
  console.log(`Built pooler URL for project ${ref}`);
}
if (!url) {
  console.error(
    'Missing DATABASE_URL. Set it in .env.supabase, or set SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD.',
  );
  console.error('Dashboard: Project Settings → Database → Connection string (Session pooler, URI).');
  process.exit(1);
}

function run(cmd: string, args: string[]) {
  console.log('>', cmd, args.join(' '));
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, DATABASE_URL: url },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

async function applySql(rel: string) {
  const abs = path.resolve(rel);
  const body = fs.readFileSync(abs, 'utf8');
  const sql = postgres(url!, { max: 1, ssl: 'require' });
  try {
    await sql.unsafe(body);
    console.log('Applied', abs);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function verify() {
  const sql = postgres(url!, { max: 1, ssl: 'require' });
  try {
    const tables = await sql`
      select count(*)::int as n from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    `;
    const rls = await sql`
      select count(*)::int as n from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
    `;
    console.log(`Supabase public tables: ${tables[0].n} · RLS-enabled: ${rls[0].n}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

// Drizzle schema (26 tables + latest columns)
run('npx', ['drizzle-kit', 'push', '--force']);
// RLS policies (tenant isolation)
run('npx', ['tsx', 'server/db/apply-rls.ts']);
// Supabase-native ops migration (cron + commitment columns if missing)
await applySql('supabase/migrations/20260721121000_ioux_ops_cron_and_webhook_columns.sql');
// Optional DB audit triggers
await applySql('server/db/sql/audit_triggers.sql');

await verify();
console.log('Supabase DB setup complete. Do NOT run db:seed against production unless intentional.');
console.log('Next: ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run create-admin');
console.log('Next: npm run supabase:function:deploy:webhook (set edge secrets in dashboard)');
