/**
 * Create docs.ioux.africa accounts. Does not touch portal users.
 *
 *   DOCS_SEED_USERS="email|Full Name|docs_admin|TemporaryPassword12!" npm run docs:seed
 *
 * Several people: separate entries with a semicolon.
 * Roles: docs_admin | docs_reader
 * Re-running updates the password and sets status back to active.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as s from '../server/db/schema.js';
import { isStrongPassword, passwordSchemaMessage } from '../server/lib/security.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseEntries(raw: string) {
  return raw.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const [email, fullName, role, password] = part.split('|').map((x) => x?.trim() || '');
    if (!email || !fullName || !password) {
      throw new Error(`Bad DOCS_SEED_USERS entry "${part}". Use email|Full Name|docs_admin|Password`);
    }
    if (role !== 'docs_admin' && role !== 'docs_reader') {
      throw new Error(`Role must be docs_admin or docs_reader (got "${role}")`);
    }
    if (!isStrongPassword(password)) throw new Error(`${email}: ${passwordSchemaMessage}`);
    return { email: email.toLowerCase(), fullName, role, password };
  });
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');
  const raw = process.env.DOCS_SEED_USERS?.trim();
  const entries = raw ? parseEntries(raw) : [];
  const needsSsl = /supabase\.co|pooler\.supabase/i.test(url);
  const client = postgres(url, { max: 1, ssl: needsSsl ? 'require' : undefined });
  const sqlPath = path.join(__dirname, '../server/db/migrations/0003_docs_users.sql');
  for (const stmt of fs.readFileSync(sqlPath, 'utf8').split(';').map((s) => s.trim()).filter(Boolean)) {
    await client.unsafe(stmt);
  }
  const db = drizzle(client);
  try {
    if (!entries.length) {
      console.log('docs tables are ready. Set DOCS_SEED_USERS="email|Full Name|docs_admin|TemporaryPassword12!" to create accounts.');
      return;
    }
    for (const entry of entries) {
      const passwordHash = await bcrypt.hash(entry.password, 12);
      const [existing] = await db.select().from(s.docsUsers).where(eq(s.docsUsers.email, entry.email)).limit(1);
      if (existing) {
        await db.update(s.docsUsers).set({
          fullName: entry.fullName,
          role: entry.role,
          passwordHash,
          status: 'active',
          mustChangePassword: true,
          updatedAt: new Date(),
        }).where(eq(s.docsUsers.id, existing.id));
        console.log(`updated ${entry.email} (${entry.role})`);
      } else {
        await db.insert(s.docsUsers).values({
          email: entry.email,
          fullName: entry.fullName,
          role: entry.role,
          passwordHash,
          status: 'active',
          mustChangePassword: true,
        });
        console.log(`created ${entry.email} (${entry.role})`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
