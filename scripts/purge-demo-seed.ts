/**
 * Remove known local-seed demo users/orgs/invoices from a database.
 * NEVER runs without ALLOW_PURGE_DEMO=1.
 *
 * Usage:
 *   ALLOW_PURGE_DEMO=1 DRY_RUN=1 npm run db:purge-demo
 *   ALLOW_PURGE_DEMO=1 npm run db:purge-demo
 */
import 'dotenv/config';
import { eq, inArray, or, like } from 'drizzle-orm';
import { db, pgClient } from '../server/db/client.js';
import * as s from '../server/db/schema.js';

const SEED_EMAILS = [
  'admin@ioux.africa',
  'buyer@ioux.africa',
  'supplier@ioux.africa',
  'supplier2@ioux.africa',
  'spv@ioux.africa',
];

const SEED_ORG_NAMES = [
  'Kenya Breweries Corp',
  'Safaricom PLC',
  'Savannah Steel Ltd',
  'Highland Logistics',
  'Nairobi Tech Solutions',
];

/** Demo API key raw prefixes / labels from seed.ts */
const DEMO_KEY_PREFIX = 'uzima_';

async function main() {
  if (process.env.ALLOW_PURGE_DEMO !== '1') {
    throw new Error('Refusing purge. Set ALLOW_PURGE_DEMO=1 to delete known seed demo data.');
  }
  const dry = process.env.DRY_RUN === '1';
  console.log(dry ? 'DRY RUN — no deletes' : 'Purging known demo seed data…');

  const seedUsers = await db.select().from(s.users).where(inArray(s.users.email, SEED_EMAILS));
  const seedOrgsByName = await db.select().from(s.organisations).where(inArray(s.organisations.name, SEED_ORG_NAMES));
  const demoKeys = await db.select().from(s.apiKeys).where(
    or(like(s.apiKeys.keyPrefix, `${DEMO_KEY_PREFIX}%`), like(s.apiKeys.label, '%demo%'), like(s.apiKeys.label, '%Demo%'))!,
  );

  console.log(`Seed users: ${seedUsers.length}`);
  console.log(`Seed orgs (by name): ${seedOrgsByName.length}`);
  console.log(`Demo-ish API keys: ${demoKeys.length}`);

  if (dry) {
    for (const u of seedUsers) console.log('  user', u.email);
    for (const o of seedOrgsByName) console.log('  org', o.name, o.uzimaPartyId);
    for (const k of demoKeys) console.log('  key', k.keyPrefix, k.label);
    await pgClient.end();
    return;
  }

  const userIds = seedUsers.map((u) => u.id);
  const orgIds = seedOrgsByName.map((o) => o.id);

  if (orgIds.length) {
    const invs = await db.select({ id: s.invoices.id }).from(s.invoices).where(
      or(inArray(s.invoices.buyerOrgId, orgIds), inArray(s.invoices.supplierOrgId, orgIds))!,
    );
    const invIds = invs.map((i) => i.id);

    if (invIds.length) {
      const asgns = await db.select({ id: s.assignments.id }).from(s.assignments).where(inArray(s.assignments.invoiceId, invIds));
      const asgnIds = asgns.map((a) => a.id);
      if (asgnIds.length) {
        await db.delete(s.feeLedger).where(inArray(s.feeLedger.assignmentId, asgnIds));
        await db.delete(s.escrowLegs).where(inArray(s.escrowLegs.assignmentId, asgnIds));
        await db.delete(s.packageItems).where(inArray(s.packageItems.assignmentId, asgnIds));
        await db.delete(s.assignments).where(inArray(s.assignments.id, asgnIds));
      }
      await db.delete(s.paymentUpdates).where(inArray(s.paymentUpdates.invoiceId, invIds));
      await db.delete(s.installmentSchedules).where(inArray(s.installmentSchedules.invoiceId, invIds));
      await db.delete(s.invoiceStatusHistory).where(inArray(s.invoiceStatusHistory.invoiceId, invIds));
      await db.delete(s.optIns).where(inArray(s.optIns.invoiceId, invIds));
      await db.delete(s.buyerVerifications).where(inArray(s.buyerVerifications.invoiceId, invIds));
      await db.delete(s.purchaseOffers).where(inArray(s.purchaseOffers.invoiceId, invIds));
      await db.delete(s.assignmentConsents).where(inArray(s.assignmentConsents.invoiceId, invIds));
      await db.delete(s.invoices).where(inArray(s.invoices.id, invIds));
    }

    const wallets = await db.select({ id: s.wallets.id }).from(s.wallets).where(inArray(s.wallets.orgId, orgIds));
    const walletIds = wallets.map((w) => w.id);
    if (walletIds.length) {
      await db.delete(s.walletTransactions).where(inArray(s.walletTransactions.walletId, walletIds));
      await db.delete(s.wallets).where(inArray(s.wallets.id, walletIds));
    }

    await db.delete(s.apiKeys).where(inArray(s.apiKeys.orgId, orgIds));
    await db.delete(s.orgDocuments).where(inArray(s.orgDocuments.orgId, orgIds));
    await db.delete(s.signatories).where(inArray(s.signatories.orgId, orgIds));
    await db.delete(s.programmes).where(inArray(s.programmes.buyerOrgId, orgIds));
  }

  if (userIds.length) {
    await db.delete(s.otpCodes).where(inArray(s.otpCodes.userId, userIds));
    await db.delete(s.refreshTokens).where(inArray(s.refreshTokens.userId, userIds));
    await db.delete(s.notifications).where(inArray(s.notifications.userId, userIds));
    await db.delete(s.signatories).where(inArray(s.signatories.userId, userIds));
    await db.delete(s.users).where(inArray(s.users.id, userIds));
  }

  if (orgIds.length) {
    await db.delete(s.organisations).where(inArray(s.organisations.id, orgIds));
  }

  for (const k of demoKeys) {
    await db.delete(s.apiKeys).where(eq(s.apiKeys.id, k.id));
  }

  console.log('Done. Real admins (e.g. ops@) and non-seed orgs were left alone.');
  await pgClient.end();
}

main().catch(async (e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(msg);
  if (/Failed query|ECONNREFUSED|connect/i.test(msg)) {
    console.error('Tip: ensure DATABASE_URL points at a running Postgres (local Docker or Supabase pooler).');
  }
  try { await pgClient.end(); } catch { /* */ }
  process.exit(1);
});
