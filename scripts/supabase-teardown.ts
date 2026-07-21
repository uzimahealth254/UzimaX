/**
 * Tear down IOU Exchange schema on a hosted Supabase project.
 * Usage (hosted gqb project): USE_SUPABASE=1 npm run db:teardown:supabase
 */
import fs from 'fs';
import dotenv from 'dotenv';
import postgres from 'postgres';

if (process.env.USE_SUPABASE === '1' && fs.existsSync('.env.supabase')) {
  dotenv.config({ path: '.env.supabase', override: true });
} else {
  dotenv.config();
}

const ref = process.env.SUPABASE_PROJECT_REF?.trim() || 'gqbwmshxiblmaicxgwko';
const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error('DATABASE_URL required in .env.supabase');
  process.exit(1);
}

if (!/gqbwmshxiblmaicxgwko/.test(url) && ref !== 'gqbwmshxiblmaicxgwko') {
  console.error('Refusing teardown: target is not gqbwmshxiblmaicxgwko');
  process.exit(1);
}

const sql = postgres(url, { max: 1, ssl: 'require', connect_timeout: 20 });

try {
  console.log('Unscheduling cron job…');
  await sql.unsafe(`
    do $$
    begin
      if exists (select 1 from cron.job where jobname = 'ioux_nightly_maintenance') then
        perform cron.unschedule(jobid) from cron.job where jobname = 'ioux_nightly_maintenance';
      end if;
    exception when undefined_table then null;
    end $$;
  `);

  console.log('Dropping public tables…');
  const tables = await sql<{ tablename: string }[]>`
    select tablename from pg_tables where schemaname = 'public' order by tablename
  `;
  if (tables.length === 0) {
    console.log('No public tables — already empty.');
  } else {
    const names = tables.map((t) => `"${t.tablename}"`).join(', ');
    await sql.unsafe(`drop table if exists ${names} cascade`);
    console.log(`Dropped ${tables.length} tables.`);
  }

  await sql.unsafe('drop function if exists public.ioux_nightly_maintenance() cascade');

  const remaining = await sql<{ n: number }[]>`
    select count(*)::int as n from pg_tables where schemaname = 'public'
  `;
  console.log(`Remaining public tables: ${remaining[0].n}`);
  console.log('Teardown complete on gqbwmshxiblmaicxgwko.');
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
