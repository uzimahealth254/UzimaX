/**
 * Local demo seed — rich, diverse mock data for all portals.
 * Local Docker only. Password: DEMO_PASSWORD || Uzima2026!
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, pgClient } from './client.js';
import * as s from './schema.js';
import { generateIOURegistryId, generateUzimaPartyId } from '../lib/iouId.js';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Uzima2026!';
const YEAR = 2026;

async function clearAll() {
  const tables = [
    s.otpCodes, s.emailSendLog, s.auditLog, s.notifications, s.paymentUpdates, s.packageItems, s.packages,
    s.feeLedger, s.feeConfigurations, s.escrowLegs, s.walletTransactions, s.wallets,
    s.assignments, s.assignmentConsents, s.purchaseOffers, s.buyerVerifications, s.optIns,
    s.invoiceStatusHistory, s.installmentSchedules, s.invoices, s.orgDocuments, s.signatories,
    s.refreshTokens, s.apiKeys, s.programmes, s.users, s.organisations,
  ];
  for (const t of tables) await db.delete(t);
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}
function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length];
}

async function main() {
  const url = process.env.DATABASE_URL || '';
  const isHosted = /supabase\.co|pooler\.supabase|render\.com|neon\.tech/i.test(url);
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== '1') {
    throw new Error('Refusing to seed when NODE_ENV=production.');
  }
  if (isHosted && process.env.ALLOW_PROD_SEED !== '1') {
    throw new Error('Refusing to seed hosted database.');
  }

  console.log('Seeding rich local mock data…');
  await pgClient`SELECT 1`;
  await clearAll();
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const today = new Date();
  let seq = 1;
  const nextIou = () => generateIOURegistryId({ year: YEAR, seq: seq++ });

  // ── Orgs (diverse sectors) ──────────────────────────────────────────
  const [platform] = await db.insert(s.organisations).values({
    name: 'IOU Exchange Platform', orgType: 'platform', uzimaPartyId: generateUzimaPartyId('platform'),
    registrationNo: 'KE-PLT-001', metadata: { kycStatus: 'verified' },
  }).returning();

  const [spv] = await db.insert(s.organisations).values({
    name: 'IOU Exchange Capital SPV', orgType: 'spv', uzimaPartyId: generateUzimaPartyId('spv'),
    registrationNo: 'KE-SPV-001',
    metadata: { kycStatus: 'verified', cmaReference: 'CMA-SPV-2024-014', sector: 'securitisation' },
  }).returning();

  // Anonymised demo parties (no real brand names — client instruction Aug 2026).
  // Pharmacies & hospitals relate to both wholesalers and insurers in invoice graphs.
  const buyerDefs = [
    { name: 'Insurance A', reg: 'KE-INS-A', sector: 'Insurance', tag: 'insurance' },
    { name: 'Insurance B', reg: 'KE-INS-B', sector: 'Insurance', tag: 'insurance' },
    ...[1, 2, 3, 4, 5].map((n) => ({
      name: `Pharmacy ${n}`, reg: `KE-PHARM-${n}`, sector: 'Pharmacy', tag: 'pharmacy',
    })),
    ...[1, 2, 3, 4, 5].map((n) => ({
      name: `Hospital ${n}`, reg: `KE-HOSP-${n}`, sector: 'Hospital', tag: 'hospital',
    })),
    { name: 'Wholesaler 1', reg: 'KE-WHOLE-1', sector: 'Wholesaler', tag: 'wholesaler' },
    { name: 'Wholesaler 2', reg: 'KE-WHOLE-2', sector: 'Wholesaler', tag: 'wholesaler' },
    { name: 'Corporate 1', reg: 'KE-CORP-1', sector: 'Corporate', tag: 'corporate' },
    { name: 'Corporate 2', reg: 'KE-CORP-2', sector: 'Corporate', tag: 'corporate' },
  ];
  const buyers = [];
  for (const b of buyerDefs) {
    const [row] = await db.insert(s.organisations).values({
      name: b.name, orgType: 'buyer', uzimaPartyId: generateUzimaPartyId('buyer'),
      registrationNo: b.reg,
      metadata: {
        kycStatus: 'verified',
        sector: b.sector,
        demoTag: b.tag,
        // Pharmacies/hospitals trade with wholesalers and insurers
        relatedBuyerTypes: (b.tag === 'pharmacy' || b.tag === 'hospital')
          ? ['wholesaler', 'insurance']
          : undefined,
      },
    }).returning();
    buyers.push(row);
  }

  const supplierDefs = [1, 2, 3, 4, 5, 6].map((n) => ({
    name: `Supplier ${n}`,
    reg: `KE-SUP-${n}`,
    sector: 'Trade supplier',
  }));
  const suppliers = [];
  for (const sp of supplierDefs) {
    const [row] = await db.insert(s.organisations).values({
      name: sp.name, orgType: 'supplier', uzimaPartyId: generateUzimaPartyId('supplier'),
      registrationNo: sp.reg, metadata: { kycStatus: 'verified', sector: sp.sector },
    }).returning();
    suppliers.push(row);
  }

  // Suspended org for admin directory variety
  await db.insert(s.organisations).values({
    name: 'Supplier Demo (Suspended)', orgType: 'supplier',
    uzimaPartyId: generateUzimaPartyId('supplier'), registrationNo: 'KE-SUP-X',
    status: 'suspended', metadata: { kycStatus: 'rejected', sector: 'Trade supplier' },
  });

  const insurers = buyers.filter((_, i) => buyerDefs[i].tag === 'insurance');
  const pharmacies = buyers.filter((_, i) => buyerDefs[i].tag === 'pharmacy');
  const hospitals = buyers.filter((_, i) => buyerDefs[i].tag === 'hospital');
  const wholesalers = buyers.filter((_, i) => buyerDefs[i].tag === 'wholesaler');
  const corporates = buyers.filter((_, i) => buyerDefs[i].tag === 'corporate');

  // ── Users ───────────────────────────────────────────────────────────
  const [admin] = await db.insert(s.users).values({
    email: 'admin@ioux.africa', fullName: 'Sarah Kimani', role: 'admin',
    orgId: platform.id, passwordHash: hash, isSignatory: true,
  }).returning();
  const [spvUser] = await db.insert(s.users).values({
    email: 'spv@ioux.africa', fullName: 'David Ochieng', role: 'spv',
    orgId: spv.id, passwordHash: hash, isSignatory: true,
  }).returning();
  // Demo logins: Insurance A/B, Corporate 1, Supplier 1–3
  const [buyerUser] = await db.insert(s.users).values({
    email: 'buyer@ioux.africa', fullName: 'Grace Wanjiku', role: 'buyer',
    orgId: insurers[0].id, passwordHash: hash, isSignatory: true,
  }).returning();
  const [buyer2User] = await db.insert(s.users).values({
    email: 'buyer2@ioux.africa', fullName: 'Amina Hassan', role: 'buyer',
    orgId: insurers[1].id, passwordHash: hash, isSignatory: true,
  }).returning();
  const [supUser] = await db.insert(s.users).values({
    email: 'supplier@ioux.africa', fullName: 'James Mwangi', role: 'supplier',
    orgId: suppliers[0].id, passwordHash: hash, isSignatory: true,
  }).returning();
  const [sup2User] = await db.insert(s.users).values({
    email: 'supplier2@ioux.africa', fullName: 'Peter Njoroge', role: 'supplier',
    orgId: suppliers[1].id, passwordHash: hash, isSignatory: true,
  }).returning();
  await db.insert(s.users).values([
    { email: 'supplier3@ioux.africa', fullName: 'Lucy Achieng', role: 'supplier', orgId: suppliers[2].id, passwordHash: hash },
    { email: 'buyer3@ioux.africa', fullName: 'Brian Otieno', role: 'buyer', orgId: corporates[0].id, passwordHash: hash, isSignatory: true },
  ]);

  await db.insert(s.signatories).values([
    { userId: buyerUser.id, orgId: insurers[0].id, roleTitle: 'CFO', isActive: true, capacity: 'both' },
    { userId: buyer2User.id, orgId: insurers[1].id, roleTitle: 'Treasury Lead', isActive: true, capacity: 'checker' },
    { userId: spvUser.id, orgId: spv.id, roleTitle: 'Managing Director', isActive: true, capacity: 'checker' },
    { userId: supUser.id, orgId: suppliers[0].id, roleTitle: 'Director', isActive: true, capacity: 'both' },
    { userId: sup2User.id, orgId: suppliers[1].id, roleTitle: 'Finance Manager', isActive: true, capacity: 'checker' },
  ]);

  // ── Wallets / fees / programmes ─────────────────────────────────────
  await db.insert(s.wallets).values([
    { orgId: platform.id, balance: '1250000' },
    { orgId: spv.id, balance: '85000000' },
    ...buyers.map((b, i) => ({ orgId: b.id, balance: String(15_000_000 + i * 2_500_000) })),
    ...suppliers.map((sp, i) => ({ orgId: sp.id, balance: String(800_000 + i * 150_000) })),
  ]);

  const [feeSpread] = await db.insert(s.feeConfigurations).values([
    { feeType: 'platform_spread', rateBps: 50, appliesTo: 'all', description: '50bps platform spread' },
    { feeType: 'transaction_pct', rateBps: 25, appliesTo: 'spv', description: '25bps on assignment' },
    { feeType: 'per_payment_pct', rateBps: 10, appliesTo: 'spv', description: '10bps on each buyer repayment' },
    { feeType: 'flat_fee', flatAmount: '500', appliesTo: 'supplier', description: 'KES 500 flat per assignment' },
    { feeType: 'programme_admin', rateBps: 15, appliesTo: 'buyer', description: '15bps programme admin', isActive: false },
  ]).returning();

  await db.insert(s.programmes).values([
    {
      name: 'Insurance A Approved Payables', buyerOrgId: insurers[0].id, maxExposure: '500000000',
      buyerSublimit: '150000000', maxTenorDays: 120, discountBandMinBps: 350, discountBandMaxBps: 650,
      effectiveFrom: iso(addDays(today, -180)), expiresAt: iso(addDays(today, 185)), status: 'active',
    },
    {
      name: 'Insurance B Vendor Finance', buyerOrgId: insurers[1].id, maxExposure: '300000000',
      buyerSublimit: '80000000', maxTenorDays: 90, discountBandMinBps: 400, discountBandMaxBps: 700,
      effectiveFrom: iso(addDays(today, -90)), expiresAt: iso(addDays(today, 275)), status: 'active',
    },
    {
      name: 'Hospital Receivables Window', buyerOrgId: hospitals[0].id, maxExposure: '120000000',
      maxTenorDays: 150, discountBandMinBps: 450, discountBandMaxBps: 750,
      effectiveFrom: iso(addDays(today, -30)), expiresAt: iso(addDays(today, 335)), status: 'active',
    },
    {
      name: 'IOU Exchange Open Market Pool', maxExposure: '1000000000',
      maxTenorDays: 180, discountBandMinBps: 400, discountBandMaxBps: 800, status: 'active',
    },
    {
      name: 'Corporate 1 Pilot (Paused)', buyerOrgId: corporates[0].id, maxExposure: '50000000',
      maxTenorDays: 60, discountBandMinBps: 500, discountBandMaxBps: 900, status: 'paused',
    },
  ]);

  // ── Documents ───────────────────────────────────────────────────────
  await db.insert(s.orgDocuments).values([
    { orgId: insurers[0].id, docType: 'kyc_certificate', fileUrl: '/mock/docs/ins-a-kyc.pdf', uploadedBy: admin.id },
    { orgId: insurers[0].id, docType: 'board_resolution', fileUrl: '/mock/docs/ins-a-board.pdf', uploadedBy: buyerUser.id },
    { orgId: suppliers[0].id, docType: 'tax_clearance', fileUrl: '/mock/docs/supplier-1-kra.pdf', uploadedBy: supUser.id },
    { orgId: spv.id, docType: 'cma_letter', fileUrl: '/mock/docs/spv-cma.pdf', uploadedBy: spvUser.id },
    { orgId: insurers[1].id, docType: 'kyc_certificate', fileUrl: '/mock/docs/ins-b-kyc.pdf', uploadedBy: admin.id },
  ]);

  type InvRow = typeof s.invoices.$inferSelect;
  const assignedPool: { inv: InvRow; asgnId: string; face: number; purchase: number }[] = [];

  async function history(invoiceId: string, to: string, by: string | null, reason: string, from: string | null = null) {
    await db.insert(s.invoiceStatusHistory).values({
      invoiceId, fromStatus: from, toStatus: to, changedBy: by, reason,
    });
  }

  // ── Path A pending opt-ins (supplier inbox) ─────────────────────────
  for (let i = 0; i < 6; i++) {
    const buyer = pick(buyers, i);
    const supplier = pick(suppliers, i);
    const face = 1_200_000 + i * 380_000;
    const [inv] = await db.insert(s.invoices).values({
      iouRegistryId: nextIou(), origin: 'buyer_posted', originatorId: buyer.id,
      buyerOrgId: buyer.id, supplierOrgId: supplier.id,
      invoiceNumber: `INV-OPT-${8800 + i}`, poReference: `PO-${4400 + i}`,
      faceValue: String(face), currency: 'KES',
      issueDate: iso(addDays(today, -2 - i)), dueDate: iso(addDays(today, 45 + i * 7)),
      status: 'awaiting_opt_in', listingStatus: 'unlisted',
      commitmentToPay: true, commitmentAckBy: buyerUser.id, commitmentAckAt: addDays(today, -2 - i),
      bankStandingOrderRef: i % 2 === 0 ? `SO-KCB-${1000 + i}` : null,
      standingOrderBank: i % 2 === 0 ? 'KCB Bank' : null,
      standingOrderSetAt: i % 2 === 0 ? addDays(today, -2 - i) : null,
      metadata: { description: `Approved payable — ${pick(['pharma stock', 'hospital supplies', 'wholesale fill', 'corporate PO', 'medical consumables', 'distributor order'], i)}` },
    }).returning();
    await db.insert(s.optIns).values({ invoiceId: inv.id, supplierOrgId: supplier.id, status: 'pending' });
    await history(inv.id, 'awaiting_opt_in', buyerUser.id, 'Buyer posted IOU');
  }

  // Declined opt-in
  {
    const [inv] = await db.insert(s.invoices).values({
      iouRegistryId: nextIou(), origin: 'buyer_posted', originatorId: buyers[0].id,
      buyerOrgId: buyers[0].id, supplierOrgId: suppliers[0].id,
      invoiceNumber: 'INV-OPT-DECLINED', faceValue: '950000',
      issueDate: iso(addDays(today, -20)), dueDate: iso(addDays(today, 10)),
      status: 'opt_in_declined', commitmentToPay: true, commitmentAckAt: addDays(today, -20),
      commitmentAckBy: buyerUser.id,
    }).returning();
    await db.insert(s.optIns).values({
      invoiceId: inv.id, supplierOrgId: suppliers[0].id, status: 'declined',
      declineReason: 'Invoice amount disputed — awaiting credit note',
      respondedBy: supUser.id, respondedAt: addDays(today, -18),
    });
  }

  // ── Path B pending verifications (buyer inbox) ──────────────────────
  for (let i = 0; i < 5; i++) {
    const buyer = pick(buyers, i);
    const supplier = pick(suppliers, i + 1);
    const [inv] = await db.insert(s.invoices).values({
      iouRegistryId: nextIou(), origin: 'supplier_listed', originatorId: supplier.id,
      buyerOrgId: buyer.id, supplierOrgId: supplier.id,
      invoiceNumber: `INV-VER-${9900 + i}`, faceValue: String(2_100_000 + i * 250_000),
      issueDate: iso(addDays(today, -4 - i)), dueDate: iso(addDays(today, 60 + i * 5)),
      status: 'awaiting_buyer_verification', listingStatus: 'listed',
      supportingDocs: [{ name: 'Delivery note.pdf', url: '/mock/docs/dn.pdf' }, { name: 'Tax invoice.pdf', url: '/mock/docs/tax.pdf' }],
      metadata: { description: `Supplier-listed receivable — ${pick(['goods delivered', 'insurance claim pack', 'pharmacy restock', 'hospital ward stock', 'wholesale delivery'], i)}` },
    }).returning();
    await db.insert(s.buyerVerifications).values({ invoiceId: inv.id, buyerOrgId: buyer.id, status: 'pending' });
    await history(inv.id, 'awaiting_buyer_verification', null, 'Supplier listed invoice');
  }

  // Buyer rejected
  {
    const [inv] = await db.insert(s.invoices).values({
      iouRegistryId: nextIou(), origin: 'supplier_listed', originatorId: suppliers[2].id,
      buyerOrgId: buyers[0].id, supplierOrgId: suppliers[2].id,
      invoiceNumber: 'INV-VER-REJECT', faceValue: '1750000',
      issueDate: iso(addDays(today, -15)), dueDate: iso(addDays(today, 30)),
      status: 'buyer_rejected', listingStatus: 'unlisted',
    }).returning();
    await db.insert(s.buyerVerifications).values({
      invoiceId: inv.id, buyerOrgId: buyers[0].id, status: 'rejected',
      rejectReason: 'PO mismatch — wrong cost centre', verifiedBy: buyerUser.id, verifiedAt: addDays(today, -14),
    });
  }

  // ── Open to offer / listed (SPV registry) ───────────────────────────
  const openOfferInvs: InvRow[] = [];
  for (let i = 0; i < 8; i++) {
    const buyer = pick(buyers, i + 1);
    const supplier = pick(suppliers, i);
    const [inv] = await db.insert(s.invoices).values({
      iouRegistryId: nextIou(), origin: i % 2 === 0 ? 'supplier_listed' : 'buyer_posted',
      originatorId: i % 2 === 0 ? supplier.id : buyer.id,
      buyerOrgId: buyer.id, supplierOrgId: supplier.id,
      invoiceNumber: `INV-OPEN-${1100 + i}`, faceValue: String(1_500_000 + i * 420_000),
      issueDate: iso(addDays(today, -25 + i)), dueDate: iso(addDays(today, 55 + i * 8)),
      status: i < 3 ? 'listed' : i < 5 ? 'verified' : 'offer_received',
      listingStatus: 'listed',
      commitmentToPay: true, commitmentAckAt: addDays(today, -20 + i), commitmentAckBy: buyerUser.id,
      bankStandingOrderRef: `SO-EQ-${2000 + i}`, standingOrderBank: pick(['Equity Bank', 'Absa', 'Stanbic', 'Co-op Bank'], i),
      standingOrderSetAt: addDays(today, -19 + i),
      metadata: { description: pick(['Confirmed trade payable', 'Milestone certificate', 'Goods accepted GRN', 'Service month closed'], i) },
    }).returning();
    openOfferInvs.push(inv);
    if (inv.status === 'offer_received') {
      await db.insert(s.purchaseOffers).values({
        invoiceId: inv.id, spvOrgId: spv.id,
        purchasePrice: String(Math.round(Number(inv.faceValue) * 0.94)),
        faceValue: inv.faceValue,
        discountRateBps: 550 + i * 10, tenorDays: 70 + i * 5,
        status: 'pending', expiresAt: addDays(today, 7),
      });
    }
  }

  // Offer accepted → pending consent (negotiated track)
  for (let i = 0; i < 3; i++) {
    const buyer = buyers[i];
    const supplier = suppliers[i];
    const face = 3_200_000 + i * 500_000;
    const [inv] = await db.insert(s.invoices).values({
      iouRegistryId: nextIou(), origin: 'buyer_posted', originatorId: buyer.id,
      buyerOrgId: buyer.id, supplierOrgId: supplier.id,
      invoiceNumber: `INV-CONSENT-${2200 + i}`, faceValue: String(face),
      issueDate: iso(addDays(today, -18)), dueDate: iso(addDays(today, 72)),
      status: 'offer_accepted', listingStatus: 'listed',
      commitmentToPay: true, commitmentAckAt: addDays(today, -18), commitmentAckBy: buyerUser.id,
      bankStandingOrderRef: `SO-NEG-${3000 + i}`, standingOrderBank: 'NCBA',
    }).returning();
    const [offer] = await db.insert(s.purchaseOffers).values({
      invoiceId: inv.id, spvOrgId: spv.id,
      purchasePrice: String(Math.round(face * 0.925)), faceValue: String(face),
      discountRateBps: 620 + i * 15, tenorDays: 90,
      status: 'accepted', expiresAt: addDays(today, 3), respondedAt: addDays(today, -2),
    }).returning();
    await db.insert(s.assignmentConsents).values({
      invoiceId: inv.id, buyerOrgId: buyer.id, spvOrgId: spv.id, status: 'pending',
    });
    await history(inv.id, 'offer_accepted', spvUser.id, 'Supplier accepted negotiated offer', 'offer_received');
  }

  // Declined offer
  {
    const [inv] = await db.insert(s.invoices).values({
      iouRegistryId: nextIou(), origin: 'supplier_listed', originatorId: suppliers[3].id,
      buyerOrgId: buyers[0].id, supplierOrgId: suppliers[3].id,
      invoiceNumber: 'INV-OFFER-DECL', faceValue: '2800000',
      issueDate: iso(addDays(today, -12)), dueDate: iso(addDays(today, 50)),
      status: 'listed', listingStatus: 'listed', commitmentToPay: true, commitmentAckAt: addDays(today, -10),
    }).returning();
    await db.insert(s.purchaseOffers).values({
      invoiceId: inv.id, spvOrgId: spv.id, purchasePrice: '2500000', faceValue: '2800000',
      discountRateBps: 900, tenorDays: 60,
      status: 'rejected', expiresAt: addDays(today, -1), respondedAt: addDays(today, -3),
    });
  }

  // ── Assigned / disbursed / packaged / settled (standard + negotiated) ─
  const lifecycle: Array<{ status: string; type: string; n: number }> = [
    { status: 'assigned', type: 'standard_confirmation', n: 6 },
    { status: 'disbursed', type: 'standard_confirmation', n: 4 },
    { status: 'packaged', type: 'negotiated_offer', n: 3 },
    { status: 'settled', type: 'standard_confirmation', n: 5 },
    { status: 'matured', type: 'negotiated_offer', n: 2 },
  ];

  for (const bucket of lifecycle) {
    for (let i = 0; i < bucket.n; i++) {
      const buyer = pick(buyers, i + bucket.n);
      const supplier = pick(suppliers, i + 2);
      const face = 2_000_000 + (i + bucket.n) * 350_000;
      const bps = bucket.type === 'negotiated_offer' ? 580 + i * 20 : 480 + i * 15;
      const purchase = Math.round(face * (1 - bps / 10000));
      const [inv] = await db.insert(s.invoices).values({
        iouRegistryId: nextIou(),
        origin: pick(['buyer_posted', 'supplier_listed', 'api_upload'] as const, i),
        originatorId: buyer.id, buyerOrgId: buyer.id, supplierOrgId: supplier.id,
        invoiceNumber: `INV-${bucket.status.slice(0, 4).toUpperCase()}-${4000 + i}`,
        faceValue: String(face), issueDate: iso(addDays(today, -60 - i * 3)),
        dueDate: iso(addDays(today, bucket.status === 'settled' ? -5 - i : 20 + i * 6)),
        status: bucket.status, listingStatus: 'sold', discountRateBps: bps,
        commitmentToPay: true, commitmentAckAt: addDays(today, -55 - i), commitmentAckBy: buyerUser.id,
        bankStandingOrderRef: `SO-LIVE-${5000 + i}`, standingOrderBank: pick(['KCB', 'Equity', 'Absa'], i),
        standingOrderSetAt: addDays(today, -54 - i),
        metadata: { description: `${bucket.status} instrument — ${pick(['pharma', 'hospital', 'wholesale', 'insurance', 'corporate', 'supplier'], i)}` },
      }).returning();

      let offerId: string | null = null;
      let consentId: string | null = null;
      if (bucket.type === 'negotiated_offer') {
        const [offer] = await db.insert(s.purchaseOffers).values({
          invoiceId: inv.id, spvOrgId: spv.id, purchasePrice: String(purchase), faceValue: String(face),
          discountRateBps: bps, tenorDays: 75, status: 'accepted',
          expiresAt: addDays(today, -40), respondedAt: addDays(today, -45),
        }).returning();
        offerId = offer.id;
        const [consent] = await db.insert(s.assignmentConsents).values({
          invoiceId: inv.id, buyerOrgId: buyer.id, spvOrgId: spv.id,
          status: 'signed', otpVerified: true, signatureHash: `mockhash-${inv.id.slice(0, 8)}`,
          signedAt: addDays(today, -44),
        }).returning();
        consentId = consent.id;
      }

      const [asgn] = await db.insert(s.assignments).values({
        invoiceId: inv.id, offerId, consentId, spvOrgId: spv.id,
        supplierOrgId: supplier.id, buyerOrgId: buyer.id,
        assignmentType: bucket.type, purchasePrice: String(purchase), faceValue: String(face),
        status: bucket.status === 'settled' ? 'settled' : 'active',
      }).returning();

      const disbStatus = ['assigned'].includes(bucket.status) ? 'pending' : 'released';
      const colStatus = bucket.status === 'settled' ? 'collected' : 'pending';
      await db.insert(s.escrowLegs).values([
        {
          assignmentId: asgn.id, legType: 'disbursement_to_supplier', amount: String(purchase),
          status: disbStatus, executedAt: disbStatus === 'released' ? addDays(today, -30) : null,
        },
        {
          assignmentId: asgn.id, legType: 'collection_from_buyer', amount: String(face),
          status: colStatus, executedAt: colStatus === 'collected' ? addDays(today, -3) : null,
        },
        {
          assignmentId: asgn.id, legType: 'fee_to_platform', amount: String(Math.round(face * 0.0025)),
          status: bucket.status === 'settled' ? 'released' : 'pending',
        },
        {
          assignmentId: asgn.id, legType: 'payout_to_spv', amount: String(face - Math.round(face * 0.0025)),
          status: bucket.status === 'settled' ? 'released' : 'pending',
        },
      ]);

      if (feeSpread) {
        await db.insert(s.feeLedger).values({
          assignmentId: asgn.id, feeConfigId: feeSpread.id, chargedToOrg: spv.id,
          amount: String(Math.round(face * 0.005)),
          status: bucket.status === 'settled' ? 'collected' : 'pending',
        });
      }

      if (['disbursed', 'packaged', 'settled', 'matured'].includes(bucket.status)) {
        await db.insert(s.paymentUpdates).values({
          invoiceId: inv.id, source: 'afyax',
          amountPaid: String(bucket.status === 'settled' ? face : Math.round(face * 0.35)),
          outstandingBalance: String(bucket.status === 'settled' ? 0 : Math.round(face * 0.65)),
          nextDueDate: bucket.status === 'settled' ? null : iso(addDays(today, 14)),
          paymentMethod: pick(['RTGS', 'EFT', 'Pesalink'], i),
          afyaxReference: `AFX-PAY-${6000 + seq}`,
        });
      }

      await history(inv.id, bucket.status, spvUser.id, `Lifecycle ${bucket.status}`, 'assigned');
      assignedPool.push({ inv, asgnId: asgn.id, face, purchase });
    }
  }

  // Installments on a couple assigned
  for (const row of assignedPool.slice(0, 3)) {
    await db.insert(s.installmentSchedules).values([
      { invoiceId: row.inv.id, installmentNo: 1, dueDate: iso(addDays(today, -10)), amount: String(Math.round(row.face / 2)), status: 'paid', paidAmount: String(Math.round(row.face / 2)), paidAt: addDays(today, -8) },
      { invoiceId: row.inv.id, installmentNo: 2, dueDate: iso(addDays(today, 20)), amount: String(Math.round(row.face / 2)), status: 'pending', paidAmount: '0' },
    ]);
  }

  // ── Packages ────────────────────────────────────────────────────────
  const pkgCandidates = assignedPool.filter((p) => ['assigned', 'disbursed', 'packaged'].includes(p.inv.status));
  if (pkgCandidates.length >= 4) {
    const batch1 = pkgCandidates.slice(0, 3);
    const totalFace = batch1.reduce((s, x) => s + x.face, 0);
    const totalPurchase = batch1.reduce((s, x) => s + x.purchase, 0);
    const [pkg] = await db.insert(s.packages).values({
      packageRef: 'PKG-KE-2026-001', status: 'structured', riskBand: 'B',
      weightedAvgTenor: 78, weightedAvgDiscountBps: 520,
      totalFaceValue: String(totalFace), totalPurchasePrice: String(totalPurchase),
      nseReference: null, createdBy: spvUser.id,
    }).returning();
    await db.insert(s.packageItems).values(batch1.map((x) => ({ packageId: pkg.id, assignmentId: x.asgnId })));

    const batch2 = pkgCandidates.slice(3, 6);
    if (batch2.length) {
      const tf = batch2.reduce((s, x) => s + x.face, 0);
      const tp = batch2.reduce((s, x) => s + x.purchase, 0);
      const [pkg2] = await db.insert(s.packages).values({
        packageRef: 'PKG-KE-2026-002', status: 'ready_for_submission', riskBand: 'A',
        weightedAvgTenor: 65, weightedAvgDiscountBps: 490,
        totalFaceValue: String(tf), totalPurchasePrice: String(tp),
        nseReference: `INT-READY-${Date.now()}`, createdBy: spvUser.id,
      }).returning();
      await db.insert(s.packageItems).values(batch2.map((x) => ({ packageId: pkg2.id, assignmentId: x.asgnId })));
    }
  }

  // ── Wallet txs / notifications / audit / email log ──────────────────
  const wallets = await db.select().from(s.wallets);
  const spvWallet = wallets.find((w) => w.orgId === spv.id)!;
  const supWallet = wallets.find((w) => w.orgId === suppliers[0].id)!;
  await db.insert(s.walletTransactions).values([
    { walletId: spvWallet.id, type: 'debit', amount: '4200000', reference: 'assignment:seed-1', description: 'Purchase of receivable (simulated)' },
    { walletId: supWallet.id, type: 'credit', amount: '3990000', reference: 'assignment:seed-1', description: 'Sale proceeds (simulated)' },
    { walletId: spvWallet.id, type: 'credit', amount: '2100000', reference: 'payment:seed-1', description: 'Buyer repayment recorded (simulated)' },
  ]);

  const notifUsers = [admin.id, spvUser.id, buyerUser.id, buyer2User.id, supUser.id, sup2User.id];
  const notifTypes = [
    ['opt_in_request', 'Opt-in / sell requested', 'New IOU awaiting your response'],
    ['buyer_verification_request', 'Invoice verification required', 'Supplier listed an invoice against you'],
    ['offer_received', 'New SPV purchase offer', 'Review discount and tenor terms'],
    ['consent_required', 'Assignment consent required', 'OTP signature needed for negotiated terms'],
    ['assignment_created', 'Receivable assigned', 'Instrument now with the SPV'],
    ['payment_received', 'Payment update recorded', 'Partner-reported payment applied'],
    ['invoice_settled', 'Settlement recorded', 'Instrument marked settled'],
    ['programme_blocked', 'Programme limit notice', 'Origination exceeded exposure band (historical)'],
  ] as const;
  for (let i = 0; i < 24; i++) {
    const [type, title, body] = notifTypes[i % notifTypes.length];
    await db.insert(s.notifications).values({
      userId: pick(notifUsers, i), type, title, body,
      referenceType: 'invoice', isRead: i % 3 === 0, channel: 'in_app',
      sentAt: addDays(today, -i),
    });
  }

  await db.insert(s.auditLog).values([
    { actorId: admin.id, actorEmail: 'admin@ioux.africa', action: 'user.invite', resourceType: 'user', resourceId: buyerUser.id, details: { email: 'buyer@ioux.africa' } },
    { actorId: buyerUser.id, actorEmail: 'buyer@ioux.africa', action: 'invoice.created', resourceType: 'invoice', details: { origin: 'buyer_posted' } },
    { actorId: supUser.id, actorEmail: 'supplier@ioux.africa', action: 'opt_in.accepted', resourceType: 'opt_in', details: {} },
    { actorId: spvUser.id, actorEmail: 'spv@ioux.africa', action: 'offer.created', resourceType: 'offer', details: { discountBps: 550 } },
    { actorId: buyerUser.id, actorEmail: 'buyer@ioux.africa', action: 'consent.signed', resourceType: 'consent', details: { track: 'negotiated_offer' } },
    { actorId: spvUser.id, actorEmail: 'spv@ioux.africa', action: 'assignment.created', resourceType: 'assignment', details: { type: 'standard_confirmation' } },
    { actorId: admin.id, actorEmail: 'admin@ioux.africa', action: 'settlement.recorded', resourceType: 'invoice', details: { source: 'seed' } },
    { actorId: admin.id, actorEmail: 'admin@ioux.africa', action: 'programme.created', resourceType: 'programme', details: { name: 'Insurance A Approved Payables' } },
  ]);

  await db.insert(s.emailSendLog).values([
    { toEmail: 'buyer@ioux.africa', template: 'invite', subject: 'Welcome to IOU Exchange', status: 'stub', provider: 'stub' },
    { toEmail: 'supplier@ioux.africa', template: 'opt_in_request', subject: 'Opt-in requested', status: 'stub', provider: 'stub' },
    { toEmail: 'buyer@ioux.africa', template: 'consent_required', subject: 'Consent required', status: 'stub', provider: 'stub' },
    { toEmail: 'spv@ioux.africa', template: 'assignment', subject: 'Assigned', status: 'sent', provider: 'resend', providerMessageId: 'mock_re_001' },
    { toEmail: 'fail@example.com', template: 'invite', subject: 'Invite', status: 'failed', provider: 'resend', error: 'Invalid recipient (seed mock)' },
  ]);

  const afyaxKey = 'uzima_afyax_demo_key_9c2e1b7f';
  const buyerKey = 'uzima_buyer_demo_7f3a9c2e';
  await db.insert(s.apiKeys).values([
    {
      orgId: insurers[0].id, keyHash: await bcrypt.hash(buyerKey, 12), keyPrefix: buyerKey.slice(0, 12),
      label: 'Insurance A Demo API Key', scopes: ['invoices:write', 'invoices:read', 'parties:read'],
    },
    {
      orgId: platform.id, keyHash: await bcrypt.hash(afyaxKey, 12), keyPrefix: afyaxKey.slice(0, 12),
      label: 'Platform Integration Key',
      scopes: ['parties:write', 'parties:read', 'invoices:write', 'invoices:read', 'payments:write'],
    },
  ]);

  // Explicit pharmacy/hospital ↔ wholesaler + insurance relationship samples
  for (let i = 0; i < 5; i++) {
    const pharmacy = pharmacies[i];
    const hospital = hospitals[i];
    const wholesaler = pick(wholesalers, i);
    const insurer = pick(insurers, i);
    const supplier = pick(suppliers, i);
    // Supplier → Pharmacy (pharmacy also linked to wholesaler/insurer in metadata)
    {
      const [inv] = await db.insert(s.invoices).values({
        iouRegistryId: nextIou(), origin: 'supplier_listed', originatorId: supplier.id,
        buyerOrgId: pharmacy.id, supplierOrgId: supplier.id,
        invoiceNumber: `INV-PHARM-${7000 + i}`, faceValue: String(450_000 + i * 80_000),
        issueDate: iso(addDays(today, -8 - i)), dueDate: iso(addDays(today, 40 + i * 3)),
        status: 'listed', listingStatus: 'listed',
        metadata: {
          description: `Pharmacy restock — also trades with ${wholesaler.name} and ${insurer.name}`,
          relatedWholesalerOrgId: wholesaler.id,
          relatedInsurerOrgId: insurer.id,
        },
      }).returning();
      await history(inv.id, 'listed', null, 'Pharmacy–wholesaler–insurer demo link');
    }
    // Supplier → Hospital with insurer relationship
    {
      const [inv] = await db.insert(s.invoices).values({
        iouRegistryId: nextIou(), origin: 'buyer_posted', originatorId: hospital.id,
        buyerOrgId: hospital.id, supplierOrgId: supplier.id,
        invoiceNumber: `INV-HOSP-${7100 + i}`, faceValue: String(980_000 + i * 120_000),
        issueDate: iso(addDays(today, -6 - i)), dueDate: iso(addDays(today, 55 + i * 4)),
        status: 'awaiting_opt_in', listingStatus: 'unlisted',
        commitmentToPay: true, commitmentAckBy: buyerUser.id, commitmentAckAt: addDays(today, -6 - i),
        metadata: {
          description: `Hospital payable — claims path via ${insurer.name}; stock via ${wholesaler.name}`,
          relatedWholesalerOrgId: wholesaler.id,
          relatedInsurerOrgId: insurer.id,
        },
      }).returning();
      await db.insert(s.optIns).values({ invoiceId: inv.id, supplierOrgId: supplier.id, status: 'pending' });
      await history(inv.id, 'awaiting_opt_in', buyerUser.id, 'Hospital–wholesaler–insurer demo link');
    }
  }

  const invCount = (await db.select().from(s.invoices)).length;
  const asgnCount = (await db.select().from(s.assignments)).length;

  console.log('\n✅ Rich seed complete\n');
  console.log(`Invoices: ${invCount} · Assignments: ${asgnCount} · Orgs: buyers ${buyers.length} / suppliers ${suppliers.length}`);
  console.log('Demo password:', DEMO_PASSWORD);
  console.log('Logins:');
  console.log('  admin@ioux.africa');
  console.log('  buyer@ioux.africa · buyer2@ioux.africa · buyer3@ioux.africa');
  console.log('  supplier@ioux.africa · supplier2@ioux.africa · supplier3@ioux.africa');
  console.log('  spv@ioux.africa');
  console.log('\nAPI keys (local only):');
  console.log('  Buyer:', buyerKey);
  console.log('  AfyaX:', afyaxKey);

  await pgClient.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error(err);
  try { await pgClient.end({ timeout: 5 }); } catch { /* */ }
  process.exit(1);
});
