/**
 * Create the first real platform admin (IOUX-GOLIVE-001 P0.3).
 * Never uses DEMO_PASSWORD. Reads credentials from env.
 *
 * Required:
 *   ADMIN_EMAIL
 *   ADMIN_PASSWORD  (≥12 chars, upper/lower/digit/special)
 * Optional:
 *   ADMIN_NAME (default "Platform Admin")
 *   PLATFORM_ORG_NAME (default "IOU Exchange Platform")
 *
 * Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run create-admin
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, pgClient } from '../server/db/client.js';
import * as s from '../server/db/schema.js';
import { generateUzimaPartyId } from '../server/lib/iouId.js';
import { assertStrongPassword } from '../server/lib/security.js';

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = (process.env.ADMIN_NAME || 'Platform Admin').trim();
  const orgName = (process.env.PLATFORM_ORG_NAME || 'IOU Exchange Platform').trim();

  if (!email || !email.includes('@')) {
    throw new Error('ADMIN_EMAIL is required');
  }
  if (!password) {
    throw new Error('ADMIN_PASSWORD is required');
  }
  assertStrongPassword(password);

  if (password === 'Uzima2026!' || password === process.env.DEMO_PASSWORD) {
    throw new Error('Refuse to create admin with DEMO_PASSWORD — choose a unique strong password');
  }

  const [existing] = await db.select().from(s.users).where(eq(s.users.email, email)).limit(1);
  if (existing) {
    throw new Error(`User already exists: ${email}`);
  }

  let [platform] = await db.select().from(s.organisations).where(eq(s.organisations.orgType, 'platform')).limit(1);
  if (!platform) {
    [platform] = await db.insert(s.organisations).values({
      name: orgName,
      orgType: 'platform',
      uzimaPartyId: generateUzimaPartyId('platform'),
      registrationNo: 'KE-PLT-ADMIN',
    }).returning();
    console.log('Created platform organisation:', platform.id);
  }

  const hash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(s.users).values({
    orgId: platform.id,
    email,
    fullName: name,
    role: 'admin',
    passwordHash: hash,
    mustChangePassword: false,
    status: 'active',
  }).returning();

  console.log('Admin created:', { id: user.id, email: user.email, orgId: platform.id });
  console.log('Store the password in your password manager — it is not written to logs.');
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pgClient.end({ timeout: 5 });
  });
