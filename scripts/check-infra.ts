/**
 * Quick infra truth check — DB / Redis / seed presence.
 * Usage: npx tsx scripts/check-infra.ts
 */
import postgres from 'postgres';

async function main() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://uzima:uzima@localhost:5432/uzima';
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  console.log('--- Uzima infra check ---');
  console.log('DATABASE_URL host:', dbUrl.replace(/:[^:@/]+@/, ':***@'));

  try {
    const sql = postgres(dbUrl, { max: 1 });
    const [orgs] = await sql`select count(*)::int as n from organisations`;
    const [users] = await sql`select count(*)::int as n from users`;
    const [invs] = await sql`select count(*)::int as n from invoices`;
    const nonSeed = await sql`
      select id, name, org_type, uzima_party_id
      from organisations
      where name not ilike '%demo%'
        and name not ilike '%seed%'
        and name not ilike '%savannah%'
        and name not ilike '%afya%'
      order by created_at desc
      limit 10
    `;
    console.log('Postgres: OK');
    console.log(`  organisations: ${orgs.n}`);
    console.log(`  users: ${users.n}`);
    console.log(`  invoices: ${invs.n}`);
    console.log(`  non-demo-ish orgs (sample): ${nonSeed.length}`);
    for (const o of nonSeed) {
      console.log(`    - ${o.name} (${o.org_type}) ${o.uzima_party_id}`);
    }
    await sql.end({ timeout: 2 });
  } catch (e: any) {
    console.error('Postgres: DOWN / not migrated');
    console.error(' ', e.message || e);
    process.exitCode = 1;
  }

  try {
    const { default: Redis } = await import('ioredis');
    const client = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
    await client.connect();
    const pong = await client.ping();
    console.log(`Redis: ${pong === 'PONG' ? 'OK' : pong}`);
    await client.quit();
  } catch (e: any) {
    console.warn('Redis: not reachable (rate-limit may fall back to memory)');
    console.warn(' ', e.message || e);
  }

  console.log('--- done ---');
}

main();
