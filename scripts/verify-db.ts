import postgres from 'postgres';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');
  const needsSsl = /supabase\.co|pooler\.supabase/i.test(url);
  const sql = postgres(url, { max: 1, ssl: needsSsl ? 'require' : undefined });
  try {
    const triggers = await sql`
      select tgname from pg_trigger
      where not tgisinternal and tgrelid = 'invoices'::regclass
    `;
    const orgs = await sql`select count(*)::int as n from organisations`;
    const users = await sql`select count(*)::int as n from users`;
    console.log('invoice triggers:', triggers.map((t) => t.tgname).join(', ') || '(none)');
    console.log(`rows: organisations=${orgs[0].n} users=${users[0].n}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
