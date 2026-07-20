import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, pgClient } from './client.js';
import * as s from './schema.js';
import { generateIOURegistryId, generateUzimaPartyId } from '../lib/iouId.js';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Uzima2026!';

async function clearAll() {
  const tables = [
    s.otpCodes, s.auditLog, s.notifications, s.paymentUpdates, s.packageItems, s.packages,
    s.feeLedger, s.feeConfigurations, s.escrowLegs, s.walletTransactions, s.wallets,
    s.assignments, s.assignmentConsents, s.purchaseOffers, s.buyerVerifications, s.optIns,
    s.invoiceStatusHistory, s.installmentSchedules, s.invoices, s.orgDocuments, s.signatories,
    s.refreshTokens, s.apiKeys, s.programmes, s.users, s.organisations,
  ];
  for (const t of tables) {
    await db.delete(t);
  }
}

async function main() {
  console.log('Seeding Uzima database...');
  await clearAll();
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const [platform] = await db.insert(s.organisations).values({
    name: 'Uzima Platform',
    orgType: 'platform',
    uzimaPartyId: generateUzimaPartyId('platform'),
    registrationNo: 'KE-PLT-001',
  }).returning();

  const [spv] = await db.insert(s.organisations).values({
    name: 'Uzima Capital SPV',
    orgType: 'spv',
    uzimaPartyId: generateUzimaPartyId('spv'),
    registrationNo: 'KE-SPV-001',
  }).returning();

  const [buyer1] = await db.insert(s.organisations).values({
    name: 'Kenya Breweries Corp',
    orgType: 'buyer',
    uzimaPartyId: generateUzimaPartyId('buyer'),
    registrationNo: 'KE-2010-10001',
  }).returning();

  const [buyer2] = await db.insert(s.organisations).values({
    name: 'Safaricom PLC',
    orgType: 'buyer',
    uzimaPartyId: generateUzimaPartyId('buyer'),
    registrationNo: 'KE-2000-70010',
  }).returning();

  const [sup1] = await db.insert(s.organisations).values({
    name: 'Savannah Steel Ltd',
    orgType: 'supplier',
    uzimaPartyId: generateUzimaPartyId('supplier'),
    registrationNo: 'KE-2019-44521',
  }).returning();

  const [sup2] = await db.insert(s.organisations).values({
    name: 'Highland Logistics',
    orgType: 'supplier',
    uzimaPartyId: generateUzimaPartyId('supplier'),
    registrationNo: 'KE-2020-11234',
  }).returning();

  const [sup3] = await db.insert(s.organisations).values({
    name: 'Nairobi Tech Solutions',
    orgType: 'supplier',
    uzimaPartyId: generateUzimaPartyId('supplier'),
    registrationNo: 'KE-2021-55789',
  }).returning();

  const [admin] = await db.insert(s.users).values({
    email: 'admin@uzima.co.ke', fullName: 'Sarah Kimani', role: 'admin', orgId: platform.id, passwordHash: hash, isSignatory: true,
  }).returning();

  const [spvUser] = await db.insert(s.users).values({
    email: 'spv@uzima.co.ke', fullName: 'David Ochieng', role: 'spv', orgId: spv.id, passwordHash: hash, isSignatory: true,
  }).returning();

  const [buyerUser] = await db.insert(s.users).values({
    email: 'buyer@uzima.co.ke', fullName: 'Grace Wanjiku', role: 'buyer', orgId: buyer1.id, passwordHash: hash, isSignatory: true,
  }).returning();

  const [supUser] = await db.insert(s.users).values({
    email: 'supplier@uzima.co.ke', fullName: 'James Mwangi', role: 'supplier', orgId: sup1.id, passwordHash: hash, isSignatory: true,
  }).returning();

  await db.insert(s.users).values({
    email: 'supplier2@uzima.co.ke', fullName: 'Peter Njoroge', role: 'supplier', orgId: sup2.id, passwordHash: hash,
  });

  await db.insert(s.signatories).values([
    { userId: buyerUser.id, orgId: buyer1.id, roleTitle: 'CFO', isActive: true },
    { userId: spvUser.id, orgId: spv.id, roleTitle: 'Managing Director', isActive: true },
    { userId: supUser.id, orgId: sup1.id, roleTitle: 'Director', isActive: true },
  ]);

  const walletSeeds = [
    { orgId: platform.id, balance: '0' },
    { orgId: spv.id, balance: '50000000' },
    { orgId: buyer1.id, balance: '20000000' },
    { orgId: buyer2.id, balance: '20000000' },
    { orgId: sup1.id, balance: '1000000' },
    { orgId: sup2.id, balance: '1000000' },
    { orgId: sup3.id, balance: '1000000' },
  ];
  await db.insert(s.wallets).values(walletSeeds);

  await db.insert(s.feeConfigurations).values([
    { feeType: 'platform_spread', rateBps: 50, appliesTo: 'all', description: '50bps platform spread' },
    { feeType: 'transaction_pct', rateBps: 25, appliesTo: 'spv', description: '25bps on assignment' },
  ]);

  await db.insert(s.programmes).values([
    {
      name: 'KBC Approved Payables',
      buyerOrgId: buyer1.id,
      maxExposure: '500000000',
      maxTenorDays: 120,
      discountBandMinBps: 350,
      discountBandMaxBps: 650,
    },
    {
      name: 'Uzima Open Market Pool',
      maxExposure: '1000000000',
      maxTenorDays: 180,
      discountBandMinBps: 400,
      discountBandMaxBps: 800,
    },
  ]);

  // Invoices
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };

  let seq = 1;
  const nextIou = () => generateIOURegistryId({ year: 2026, seq: seq++ });

  const [invOptIn] = await db.insert(s.invoices).values({
    iouRegistryId: nextIou(),
    origin: 'buyer_posted',
    originatorId: buyer1.id,
    buyerOrgId: buyer1.id,
    supplierOrgId: sup1.id,
    invoiceNumber: 'INV-KBC-8801',
    faceValue: '4200000',
    issueDate: iso(addDays(-5)),
    dueDate: iso(addDays(55)),
    status: 'awaiting_opt_in',
    listingStatus: 'unlisted',
  }).returning();

  await db.insert(s.optIns).values({
    invoiceId: invOptIn.id,
    supplierOrgId: sup1.id,
    status: 'pending',
  });

  await db.insert(s.invoiceStatusHistory).values({
    invoiceId: invOptIn.id,
    fromStatus: null,
    toStatus: 'awaiting_opt_in',
    changedBy: buyerUser.id,
    reason: 'Buyer posted IOU',
  });

  const [invVerify] = await db.insert(s.invoices).values({
    iouRegistryId: nextIou(),
    origin: 'supplier_listed',
    originatorId: sup1.id,
    buyerOrgId: buyer1.id,
    supplierOrgId: sup1.id,
    invoiceNumber: 'INV-SAV-9901',
    faceValue: '3100000',
    issueDate: iso(addDays(-3)),
    dueDate: iso(addDays(70)),
    status: 'awaiting_buyer_verification',
  }).returning();

  await db.insert(s.buyerVerifications).values({
    invoiceId: invVerify.id,
    buyerOrgId: buyer1.id,
    status: 'pending',
  });

  const listedInvoices = [];
  for (let i = 0; i < 4; i++) {
    const [inv] = await db.insert(s.invoices).values({
      iouRegistryId: nextIou(),
      origin: 'supplier_listed',
      originatorId: [sup1, sup2, sup3][i % 3].id,
      buyerOrgId: i % 2 === 0 ? buyer1.id : buyer2.id,
      supplierOrgId: [sup1, sup2, sup3][i % 3].id,
      invoiceNumber: `INV-LIST-${1000 + i}`,
      faceValue: String(1500000 + i * 500000),
      issueDate: iso(addDays(-30 + i)),
      dueDate: iso(addDays(60 + i * 10)),
      status: 'listed',
      listingStatus: 'listed',
    }).returning();
    listedInvoices.push(inv);
  }

  // Assigned + escrow
  for (let i = 0; i < 5; i++) {
    const face = 2000000 + i * 400000;
    const purchase = Math.round(face * 0.95);
    const [inv] = await db.insert(s.invoices).values({
      iouRegistryId: nextIou(),
      origin: 'buyer_posted',
      originatorId: buyer1.id,
      buyerOrgId: buyer1.id,
      supplierOrgId: sup1.id,
      invoiceNumber: `INV-ASGN-${2000 + i}`,
      faceValue: String(face),
      issueDate: iso(addDays(-40)),
      dueDate: iso(addDays(40)),
      status: i < 2 ? 'disbursed' : i < 4 ? 'assigned' : 'settled',
      listingStatus: 'sold',
      discountRateBps: 500,
    }).returning();

    const [asgn] = await db.insert(s.assignments).values({
      invoiceId: inv.id,
      spvOrgId: spv.id,
      supplierOrgId: sup1.id,
      buyerOrgId: buyer1.id,
      assignmentType: 'opt_in_auto',
      purchasePrice: String(purchase),
      faceValue: String(face),
      status: inv.status === 'settled' ? 'settled' : 'active',
    }).returning();

    await db.insert(s.escrowLegs).values([
      {
        assignmentId: asgn.id,
        legType: 'disbursement_to_supplier',
        amount: String(purchase),
        status: inv.status === 'assigned' ? 'pending' : 'released',
        executedAt: inv.status === 'assigned' ? null : new Date(),
      },
      {
        assignmentId: asgn.id,
        legType: 'collection_from_buyer',
        amount: String(face),
        status: inv.status === 'settled' ? 'collected' : 'pending',
        executedAt: inv.status === 'settled' ? new Date() : null,
      },
      {
        assignmentId: asgn.id,
        legType: 'fee_to_platform',
        amount: String(Math.round(face * 0.0025)),
        status: 'pending',
      },
    ]);
  }

  // Settled extras
  for (let i = 0; i < 3; i++) {
    await db.insert(s.invoices).values({
      iouRegistryId: nextIou(),
      origin: 'api_upload',
      originatorId: buyer1.id,
      buyerOrgId: buyer1.id,
      supplierOrgId: sup2.id,
      invoiceNumber: `INV-SET-${3000 + i}`,
      faceValue: String(800000 + i * 100000),
      issueDate: iso(addDays(-120)),
      dueDate: iso(addDays(-30)),
      status: 'settled',
      listingStatus: 'sold',
    });
  }

  const afyaxKey = 'uzima_afyax_demo_key_9c2e1b7f';
  const buyerKey = 'uzima_buyer_kbc_demo_7f3a9c2e';
  await db.insert(s.apiKeys).values([
    {
      orgId: buyer1.id,
      keyHash: await bcrypt.hash(buyerKey, 12),
      keyPrefix: buyerKey.slice(0, 12),
      label: 'KBC Demo API Key',
      scopes: ['invoices:write', 'invoices:read', 'parties:read'],
    },
    {
      orgId: platform.id,
      keyHash: await bcrypt.hash(afyaxKey, 12),
      keyPrefix: afyaxKey.slice(0, 12),
      label: 'AfyaX Integration Key',
      scopes: ['parties:write', 'parties:read', 'invoices:write', 'invoices:read', 'payments:write'],
    },
  ]);

  console.log('\n✅ Seed complete\n');
  console.log('Demo password:', DEMO_PASSWORD);
  console.log('Users:');
  console.log('  admin@uzima.co.ke (admin)');
  console.log('  buyer@uzima.co.ke (buyer)');
  console.log('  supplier@uzima.co.ke (supplier)');
  console.log('  spv@uzima.co.ke (spv)');
  console.log('\nAPI keys (shown once — store securely, never commit to frontend):');
  console.log('  Buyer (KBC):', buyerKey);
  console.log('  AfyaX:', afyaxKey);
  console.log('\nParty IDs:');
  console.log('  Platform:', platform.uzimaPartyId);
  console.log('  SPV:', spv.uzimaPartyId);
  console.log('  Buyer KBC:', buyer1.uzimaPartyId);
  console.log('  Supplier Savannah:', sup1.uzimaPartyId);

  await pgClient.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error(err);
  try { await pgClient.end({ timeout: 5 }); } catch { /* */ }
  process.exit(1);
});
