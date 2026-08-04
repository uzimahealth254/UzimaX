/**
 * Upsert local-demo login accounts onto a target database (local or hosted).
 * Does NOT wipe tables — only creates/updates orgs + users for the known demo emails.
 *
 * Hosted usage (requires explicit intent):
 *   ALLOW_PROD_DEMO_ACCOUNTS=1 DATABASE_URL='postgresql://…' npm run db:ensure-demo
 *
 * Password: DEMO_PASSWORD || Uzima2026!
 */
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as s from '../server/db/schema.js';
import { generateUzimaPartyId } from '../server/lib/iouId.js';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Uzima2026!';

type DemoUser = {
  email: string;
  fullName: string;
  role: 'admin' | 'buyer' | 'supplier' | 'spv';
  orgKey: string;
};

const ORGS: Record<string, { name: string; orgType: string; reg: string; sector?: string }> = {
  platform: { name: 'IOU Exchange Platform', orgType: 'platform', reg: 'KE-PLT-001' },
  spv: { name: 'IOU Exchange Capital SPV', orgType: 'spv', reg: 'KE-SPV-001', sector: 'securitisation' },
  buyer1: { name: 'Kenya Breweries Corp', orgType: 'buyer', reg: 'KE-2010-10001', sector: 'FMCG / beverages' },
  buyer2: { name: 'Safaricom PLC', orgType: 'buyer', reg: 'KE-2000-70010', sector: 'Telecom' },
  buyer3: { name: 'Twiga Foods Ltd', orgType: 'buyer', reg: 'KE-2014-88221', sector: 'Agri distribution' },
  supplier1: { name: 'Savannah Steel Ltd', orgType: 'supplier', reg: 'KE-2019-44521', sector: 'Industrial metals' },
  supplier2: { name: 'Highland Logistics', orgType: 'supplier', reg: 'KE-2020-11234', sector: 'Transport & logistics' },
  supplier3: { name: 'Nairobi Tech Solutions', orgType: 'supplier', reg: 'KE-2021-55789', sector: 'IT services' },
};

const USERS: DemoUser[] = [
  { email: 'admin@ioux.africa', fullName: 'Sarah Kimani', role: 'admin', orgKey: 'platform' },
  { email: 'spv@ioux.africa', fullName: 'David Ochieng', role: 'spv', orgKey: 'spv' },
  { email: 'buyer@ioux.africa', fullName: 'Grace Wanjiku', role: 'buyer', orgKey: 'buyer1' },
  { email: 'buyer2@ioux.africa', fullName: 'Amina Hassan', role: 'buyer', orgKey: 'buyer2' },
  { email: 'buyer3@ioux.africa', fullName: 'Brian Otieno', role: 'buyer', orgKey: 'buyer3' },
  { email: 'supplier@ioux.africa', fullName: 'James Mwangi', role: 'supplier', orgKey: 'supplier1' },
  { email: 'supplier2@ioux.africa', fullName: 'Peter Njoroge', role: 'supplier', orgKey: 'supplier2' },
  { email: 'supplier3@ioux.africa', fullName: 'Lucy Achieng', role: 'supplier', orgKey: 'supplier3' },
];

function resolveDatabaseUrl(): string {
  // Prefer hosted URL from .env.render when explicitly allowing prod demo writes
  if (process.env.ALLOW_PROD_DEMO_ACCOUNTS === '1') {
    const renderEnv = path.resolve(process.cwd(), '.env.render');
    if (fs.existsSync(renderEnv)) {
      const parsed = dotenvParse(fs.readFileSync(renderEnv, 'utf8'));
      if (parsed.DATABASE_URL?.trim()) return parsed.DATABASE_URL.trim();
    }
    const ref = process.env.SUPABASE_PROJECT_REF?.trim();
    const pwFile = path.resolve(process.cwd(), '.supabase-db-password.tmp');
    if (ref && fs.existsSync(pwFile)) {
      const pw = fs.readFileSync(pwFile, 'utf8').trim();
      if (pw) {
        return `postgresql://postgres.${ref}:${encodeURIComponent(pw)}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`;
      }
    }
  }
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  throw new Error('DATABASE_URL required (or ALLOW_PROD_DEMO_ACCOUNTS=1 with .env.render)');
}

function dotenvParse(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of src.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

async function ensureOrg(
  db: ReturnType<typeof drizzle>,
  key: string,
): Promise<string> {
  const def = ORGS[key];
  const byReg = await db.select().from(s.organisations).where(eq(s.organisations.registrationNo, def.reg)).limit(1);
  if (byReg[0]) return byReg[0].id;

  const byName = await db.select().from(s.organisations).where(eq(s.organisations.name, def.name)).limit(1);
  if (byName[0]) return byName[0].id;

  const [row] = await db.insert(s.organisations).values({
    name: def.name,
    orgType: def.orgType,
    uzimaPartyId: generateUzimaPartyId(def.orgType),
    registrationNo: def.reg,
    status: 'active',
    metadata: def.sector ? { kycStatus: 'verified', sector: def.sector } : { kycStatus: 'verified' },
  }).returning();
  console.log(`  org created: ${def.name}`);
  return row.id;
}

async function main() {
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.supabase' });
  if (process.env.ALLOW_PROD_DEMO_ACCOUNTS !== '1') {
    dotenv.config(); // local .env DATABASE_URL for Docker
  }

  const url = resolveDatabaseUrl();
  const isHosted = /supabase\.co|pooler\.supabase|render\.com|neon\.tech/i.test(url);
  if (isHosted && process.env.ALLOW_PROD_DEMO_ACCOUNTS !== '1') {
    throw new Error(
      'Refusing to write demo accounts on hosted DB. Set ALLOW_PROD_DEMO_ACCOUNTS=1 to confirm.',
    );
  }

  const sql = postgres(url, {
    max: 1,
    ssl: isHosted ? 'require' : undefined,
    connect_timeout: 20,
  });
  const db = drizzle(sql);

  try {
    await sql`select 1`;
    console.log(`Connected (${isHosted ? 'hosted' : 'local'}). Upserting demo accounts…`);
    const hash = await bcrypt.hash(DEMO_PASSWORD, 12);

    const orgIds: Record<string, string> = {};
    for (const key of Object.keys(ORGS)) {
      orgIds[key] = await ensureOrg(db, key);
    }

    for (const u of USERS) {
      const orgId = orgIds[u.orgKey];
      const [existing] = await db.select().from(s.users).where(eq(s.users.email, u.email)).limit(1);
      if (existing) {
        await db.update(s.users).set({
          passwordHash: hash,
          fullName: u.fullName,
          role: u.role,
          orgId,
          status: 'active',
          mustChangePassword: false,
          isSignatory: u.role !== 'admin',
        }).where(eq(s.users.id, existing.id));
        console.log(`  user updated: ${u.email}`);
      } else {
        await db.insert(s.users).values({
          email: u.email,
          fullName: u.fullName,
          role: u.role,
          orgId,
          passwordHash: hash,
          status: 'active',
          mustChangePassword: false,
          isSignatory: u.role !== 'admin',
        });
        console.log(`  user created: ${u.email}`);
      }
    }

    console.log('\nDemo accounts ready. Password:', DEMO_PASSWORD);
    console.log(USERS.map((u) => `  ${u.role.padEnd(9)} ${u.email}`).join('\n'));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
