/**
 * List all public tables + RLS status for Uzima DB
 */
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL || 'postgresql://uzima:uzima@localhost:5432/uzima', { max: 1 });
  const tables = await sql`
    select c.relname as table, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname
  `;
  console.log('Tables in public schema:', tables.length);
  for (const t of tables) {
    console.log(`  ${t.table.padEnd(28)} rls=${t.rls_enabled ? 'on' : 'off'} force=${t.rls_forced ? 'on' : 'off'}`);
  }
  const indexes = await sql`select count(*)::int as n from pg_indexes where schemaname = 'public'`;
  const fks = await sql`
    select count(*)::int as n from information_schema.table_constraints
    where constraint_type = 'FOREIGN KEY' and table_schema = 'public'
  `;
  console.log(`Indexes: ${indexes[0].n} · Foreign keys: ${fks[0].n}`);
  await sql.end({ timeout: 2 });
}
main().catch((e) => { console.error(e); process.exit(1); });
