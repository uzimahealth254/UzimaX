import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Apply SQL migrations from server/db/migrations (drizzle-kit generate).
 * Dev shortcut: `npm run db:migrate` uses drizzle-kit push.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');
  const needsSsl = /supabase\.co|pooler\.supabase/i.test(url);
  const client = postgres(url, { max: 1, ssl: needsSsl ? 'require' : undefined });
  const db = drizzle(client);
  const folder = path.join(__dirname, 'migrations');
  try {
    await migrate(db, { migrationsFolder: folder });
    console.log('Migrations applied from', folder);
  } catch (e) {
    console.warn('Migrate failed — try npm run db:migrate (drizzle-kit push)', e);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
