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
  'buyer2@ioux.africa',
  'buyer3@ioux.africa',
  'supplier@ioux.africa',
  'supplier2@ioux.africa',
  'supplier3@ioux.africa',
  'spv@ioux.africa',
];

const SEED_ORG_NAMES = [
  'Insurance A',
  'Insurance B',
  'Corporate 1',
  'Corporate 2',
  'Supplier 1',
  'Supplier 2',
  'Supplier 3',
  'Supplier 4',
  'Supplier 5',
  'Supplier 6',
  'Pharmacy 1',
  'Pharmacy 2',
  'Pharmacy 3',
  'Pharmacy 4',
  'Pharmacy 5',
  'Hospital 1',
  'Hospital 2',
  'Hospital 3',
  'Hospital 4',
  'Hospital 5',
  'Wholesaler 1',
  'Wholesaler 2',
  'Supplier Demo (Suspended)',
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

  const seedUsersByEmail = await db.select().from(s.users).where(inArray(s.users.email, SEED_EMAILS));
  const smokeUsers = await db.select().from(s.users).where(
    or(like(s.users.email, 'demo.buyer.%'), like(s.users.email, 'demo.supplier.%'))!,
  );
  const seedUsers = [...new Map([...seedUsersByEmail, ...smokeUsers].map((u) => [u.id, u])).values()];

  const seedOrgsByName = await db.select().from(s.organisations).where(inArray(s.organisations.name, SEED_ORG_NAMES));
  const smokeOrgs = await db.select().from(s.organisations).where(
    or(like(s.organisations.name, 'Demo Buyer%'), like(s.organisations.name, 'Demo Supplier%'))!,
  );
  const seedOrgs = [...new Map([...seedOrgsByName, ...smokeOrgs].map((o) => [o.id, o])).values()];
  const demoKeys = await db.select().from(s.apiKeys).where(
    or(like(s.apiKeys.keyPrefix, `${DEMO_KEY_PREFIX}%`), like(s.apiKeys.label, '%demo%'), like(s.apiKeys.label, '%Demo%'))!,
  );

  console.log(`Seed users: ${seedUsers.length}`);
  console.log(`Seed orgs: ${seedOrgs.length}`);
  console.log(`Demo-ish API keys: ${demoKeys.length}`);

  if (dry) {
    for (const u of seedUsers) console.log('  user', u.email);
    for (const o of seedOrgs) console.log('  org', o.name, o.uzimaPartyId);
    for (const k of demoKeys) console.log('  key', k.keyPrefix, k.label);
    await pgClient.end();
    return;
  }

  const userIds = seedUsers.map((u) => u.id);
  const platformSpv = await db.select({ id: s.organisations.id }).from(s.organisations).where(
    inArray(s.organisations.orgType, ['platform', 'spv']),
  );
  const keepOrgIds = new Set(platformSpv.map((o) => o.id));
  const orgIds = [...new Set([
    ...seedOrgs.map((o) => o.id),
    ...seedUsers.map((u) => u.orgId).filter((id): id is string => Boolean(id)),
  ])].filter((id) => !keepOrgIds.has(id));

  async function purgeInvoices(invIds: string[]) {
    if (!invIds.length) return;
    const asgns = await db.select({ id: s.assignments.id }).from(s.assignments).where(inArray(s.assignments.invoiceId, invIds));
    const asgnIds = asgns.map((a) => a.id);
    if (asgnIds.length) {
      const pkgRows = await db.select({ packageId: s.packageItems.packageId }).from(s.packageItems).where(inArray(s.packageItems.assignmentId, asgnIds));
      const pkgIds = [...new Set(pkgRows.map((p) => p.packageId))];
      await db.delete(s.packageItems).where(inArray(s.packageItems.assignmentId, asgnIds));
      for (const pkgId of pkgIds) {
        const remaining = await db.select({ id: s.packageItems.id }).from(s.packageItems).where(eq(s.packageItems.packageId, pkgId));
        if (!remaining.length) await db.delete(s.packages).where(eq(s.packages.id, pkgId));
      }
      await db.delete(s.feeLedger).where(inArray(s.feeLedger.assignmentId, asgnIds));
      await db.delete(s.escrowLegs).where(inArray(s.escrowLegs.assignmentId, asgnIds));
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

  if (orgIds.length) {
    const invs = await db.select({ id: s.invoices.id }).from(s.invoices).where(
      or(
        inArray(s.invoices.buyerOrgId, orgIds),
        inArray(s.invoices.supplierOrgId, orgIds),
        inArray(s.invoices.originatorId, orgIds),
        inArray(s.invoices.sourcePlatformOrgId, orgIds),
      )!,
    );
    await purgeInvoices(invs.map((i) => i.id));

    const orphanAsgns = await db.select({ id: s.assignments.id }).from(s.assignments).where(
      or(
        inArray(s.assignments.buyerOrgId, orgIds),
        inArray(s.assignments.supplierOrgId, orgIds),
        inArray(s.assignments.spvOrgId, orgIds),
      )!,
    );
    if (orphanAsgns.length) {
      const asgnIds = orphanAsgns.map((a) => a.id);
      await db.delete(s.feeLedger).where(inArray(s.feeLedger.assignmentId, asgnIds));
      await db.delete(s.escrowLegs).where(inArray(s.escrowLegs.assignmentId, asgnIds));
      await db.delete(s.packageItems).where(inArray(s.packageItems.assignmentId, asgnIds));
      await db.delete(s.assignments).where(inArray(s.assignments.id, asgnIds));
    }

    await db.delete(s.optIns).where(inArray(s.optIns.supplierOrgId, orgIds));
    await db.delete(s.buyerVerifications).where(inArray(s.buyerVerifications.buyerOrgId, orgIds));
    await db.delete(s.assignmentConsents).where(inArray(s.assignmentConsents.buyerOrgId, orgIds));
    await db.delete(s.feeLedger).where(inArray(s.feeLedger.chargedToOrg, orgIds));

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
    // Real users (e.g. ops@) may still point at a demo org from UAT
    await db.update(s.users).set({ orgId: null }).where(inArray(s.users.orgId, orgIds));
  }

  if (userIds.length) {
    // Invoices acknowledged by demo users (may involve SPV / platform orgs)
    const ackInvs = await db.select({ id: s.invoices.id }).from(s.invoices).where(inArray(s.invoices.commitmentAckBy, userIds));
    await purgeInvoices(ackInvs.map((i) => i.id));

    await db.delete(s.auditLog).where(inArray(s.auditLog.actorId, userIds));
    await db.delete(s.invoiceStatusHistory).where(inArray(s.invoiceStatusHistory.changedBy, userIds));
    await db.delete(s.optIns).where(inArray(s.optIns.respondedBy, userIds));
    await db.delete(s.buyerVerifications).where(inArray(s.buyerVerifications.verifiedBy, userIds));
    await db.delete(s.orgDocuments).where(inArray(s.orgDocuments.uploadedBy, userIds));
    const demoPkgs = await db.select({ id: s.packages.id }).from(s.packages).where(inArray(s.packages.createdBy, userIds));
    const demoPkgIds = demoPkgs.map((p) => p.id);
    if (demoPkgIds.length) {
      await db.delete(s.packageItems).where(inArray(s.packageItems.packageId, demoPkgIds));
      await db.delete(s.packages).where(inArray(s.packages.id, demoPkgIds));
    }
    await db.delete(s.otpCodes).where(inArray(s.otpCodes.userId, userIds));
    await db.delete(s.refreshTokens).where(inArray(s.refreshTokens.userId, userIds));
    await db.delete(s.notifications).where(inArray(s.notifications.userId, userIds));
    await db.delete(s.signatories).where(inArray(s.signatories.userId, userIds));
    await db.delete(s.users).where(inArray(s.users.id, userIds));
  }

  if (orgIds.length) {
    await db.delete(s.organisations).where(inArray(s.organisations.id, orgIds));
  }

  const demoKeyIds = demoKeys.filter((k) => orgIds.includes(k.orgId) || /demo/i.test(k.label ?? '')).map((k) => k.id);
  for (const id of demoKeyIds) {
    await db.delete(s.apiKeys).where(eq(s.apiKeys.id, id));
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
