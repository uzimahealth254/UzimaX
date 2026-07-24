import postgres from 'postgres';
import dotenv from 'dotenv';
import fs from 'fs';

if (process.env.USE_SUPABASE === '1' && fs.existsSync('.env.supabase')) {
  dotenv.config({ path: '.env.supabase', override: true });
} else {
  dotenv.config();
}

/** Columns that must exist after IOUX-COMPLETE / FULL-FINISH migrations (WS-10). */
const REQUIRED: { table: string; column: string }[] = [
  { table: 'invoices', column: 'commitment_to_pay' },
  { table: 'invoices', column: 'commitment_ack_by' },
  { table: 'invoices', column: 'commitment_ack_at' },
  { table: 'invoices', column: 'bank_standing_order_ref' },
  { table: 'invoices', column: 'standing_order_bank' },
  { table: 'invoices', column: 'standing_order_set_at' },
  { table: 'programmes', column: 'buyer_sublimit' },
  { table: 'programmes', column: 'effective_from' },
  { table: 'programmes', column: 'expires_at' },
  { table: 'packages', column: 'weighted_avg_discount_bps' },
  { table: 'email_send_log', column: 'to_email' },
  { table: 'email_send_log', column: 'status' },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');
  const needsSsl = /supabase\.co|pooler\.supabase/i.test(url);
  const sql = postgres(url, { max: 1, ssl: needsSsl ? 'require' : undefined });
  const missing: string[] = [];
  try {
    for (const req of REQUIRED) {
      const rows = await sql`
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = ${req.table}
          and column_name = ${req.column}
        limit 1
      `;
      if (!rows.length) missing.push(`${req.table}.${req.column}`);
    }

    const triggers = await sql`
      select tgname from pg_trigger
      where not tgisinternal and tgrelid = 'invoices'::regclass
    `;
    const orgs = await sql`select count(*)::int as n from organisations`;
    const users = await sql`select count(*)::int as n from users`;
    console.log('invoice triggers:', triggers.map((t) => t.tgname).join(', ') || '(none)');
    console.log(`rows: organisations=${orgs[0].n} users=${users[0].n}`);

    if (missing.length) {
      console.error('MISSING COLUMNS:', missing.join(', '));
      process.exit(1);
    }
    console.log(`verify:db OK — ${REQUIRED.length} required columns present`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
