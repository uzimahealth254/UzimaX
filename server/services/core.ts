import { and, desc, eq, inArray, like } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema.js';
import { generateIOURegistryId } from '../lib/iouId.js';
import { AppError } from '../lib/errors.js';
import { computeTenorDays, priceReceivable } from '../lib/pricing.js';
import { assertProgrammeAllows } from './programme.js';
import { generatePurchaseNote, generatePaymentReceipt } from './pdf.js';
import { writeAudit } from '../middleware/audit.js';

async function nextIouRegistryId(): Promise<string> {
  const year = new Date().getFullYear();
  const [row] = await db.select({ id: s.invoices.iouRegistryId })
    .from(s.invoices)
    .where(like(s.invoices.iouRegistryId, `IOU-KE-${year}-%`))
    .orderBy(desc(s.invoices.iouRegistryId))
    .limit(1);
  let seq = 1;
  if (row?.id) {
    const m = /^IOU-KE-\d{4}-(\d{5})-\d$/.exec(row.id);
    if (m) seq = Number(m[1]) + 1;
  }
  return generateIOURegistryId({ year, seq });
}

const VALID: Record<string, string[]> = {
  draft: ['awaiting_opt_in', 'awaiting_buyer_verification', 'listed', 'cancelled'],
  awaiting_opt_in: ['listed', 'assigned', 'opt_in_declined', 'cancelled'],
  awaiting_buyer_verification: ['verified', 'assigned', 'buyer_rejected', 'cancelled'],
  listed: ['offer_received', 'assigned', 'cancelled'],
  verified: ['assigned', 'listed', 'cancelled'],
  offer_received: ['offer_accepted', 'listed', 'cancelled'],
  offer_accepted: ['assigned', 'cancelled'],
  assigned: ['packaged', 'disbursed', 'cancelled'],
  packaged: ['disbursed', 'cancelled'],
  disbursed: ['matured', 'settled', 'cancelled'],
  matured: ['settled', 'defaulted', 'cancelled'],
  settled: [],
  opt_in_declined: [],
  buyer_rejected: [],
  defaulted: [],
  cancelled: [],
};

export async function transitionInvoice(
  invoiceId: string,
  toStatus: string,
  actorId?: string | null,
  reason?: string,
) {
  const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, invoiceId)).limit(1);
  if (!inv) throw new AppError(404, 'not_found', 'Invoice not found');
  const allowed = VALID[inv.status] || [];
  if (!allowed.includes(toStatus) && inv.status !== toStatus) {
    throw new AppError(400, 'invalid_transition', `Cannot transition ${inv.status} → ${toStatus}`);
  }
  await db.update(s.invoices).set({ status: toStatus, updatedAt: new Date() }).where(eq(s.invoices.id, invoiceId));
  await db.insert(s.invoiceStatusHistory).values({
    invoiceId,
    fromStatus: inv.status,
    toStatus,
    changedBy: actorId || null,
    reason: reason || null,
  });
  return { ...inv, status: toStatus };
}

async function notifyOrgUsers(orgId: string, n: { type: string; title: string; body?: string; referenceType?: string; referenceId?: string }) {
  const orgUsers = await db.select().from(s.users).where(eq(s.users.orgId, orgId));
  if (!orgUsers.length) return;
  await db.insert(s.notifications).values(
    orgUsers.map((u) => ({
      userId: u.id,
      type: n.type,
      title: n.title,
      body: n.body || null,
      referenceType: n.referenceType || null,
      referenceId: n.referenceId || null,
      channel: 'in_app',
      sentAt: new Date(),
    })),
  );
}

async function getSpvOrg() {
  const [spv] = await db.select().from(s.organisations).where(eq(s.organisations.orgType, 'spv')).limit(1);
  if (!spv) throw new AppError(500, 'config_error', 'SPV organisation not configured');
  return spv;
}

async function getPlatformOrg() {
  const [p] = await db.select().from(s.organisations).where(eq(s.organisations.orgType, 'platform')).limit(1);
  return p;
}

export async function createBuyerOriginatedInvoice(data: {
  buyerOrgId: string;
  supplierOrgId: string;
  invoiceNumber?: string;
  poReference?: string;
  faceValue: number;
  currency?: string;
  issueDate: string;
  dueDate: string;
  description?: string;
  interestRate?: number;
  installmentSchedule?: { installmentNo: number; dueDate: string; amount: number }[];
  origin?: string;
}, actorId?: string) {
  const iou = await nextIouRegistryId();
  const [inv] = await db.insert(s.invoices).values({
    iouRegistryId: iou,
    origin: data.origin || 'buyer_posted',
    originatorId: data.buyerOrgId,
    buyerOrgId: data.buyerOrgId,
    supplierOrgId: data.supplierOrgId,
    invoiceNumber: data.invoiceNumber,
    poReference: data.poReference,
    faceValue: String(data.faceValue),
    currency: data.currency || 'KES',
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    interestRate: data.interestRate != null ? String(data.interestRate) : null,
    status: 'awaiting_opt_in',
    metadata: data.description ? { description: data.description } : {},
  }).returning();

  await db.insert(s.invoiceStatusHistory).values({
    invoiceId: inv.id, fromStatus: null, toStatus: 'awaiting_opt_in', changedBy: actorId || null, reason: 'Buyer posted IOU',
  });

  const [optIn] = await db.insert(s.optIns).values({
    invoiceId: inv.id,
    supplierOrgId: data.supplierOrgId,
    status: 'pending',
  }).returning();

  if (data.installmentSchedule?.length) {
    await db.insert(s.installmentSchedules).values(
      data.installmentSchedule.map((row) => ({
        invoiceId: inv.id,
        installmentNo: row.installmentNo,
        dueDate: row.dueDate,
        amount: String(row.amount),
      })),
    );
  }

  await notifyOrgUsers(data.supplierOrgId, {
    type: 'opt_in_request',
    title: 'Opt-in / sell requested',
    body: `New IOU ${iou} — review and opt in or decline`,
    referenceType: 'invoice',
    referenceId: inv.id,
  });

  await writeAudit({
    actorId, action: 'invoice.created', resourceType: 'invoice', resourceId: inv.id,
    details: { origin: 'buyer_posted', iou },
  });

  return { invoice: inv, optIn };
}

export async function createSupplierOriginatedInvoice(data: {
  buyerOrgId: string;
  supplierOrgId: string;
  invoiceNumber?: string;
  faceValue: number;
  currency?: string;
  issueDate: string;
  dueDate: string;
  description?: string;
}, actorId?: string) {
  const iou = await nextIouRegistryId();
  const [inv] = await db.insert(s.invoices).values({
    iouRegistryId: iou,
    origin: 'supplier_listed',
    originatorId: data.supplierOrgId,
    buyerOrgId: data.buyerOrgId,
    supplierOrgId: data.supplierOrgId,
    invoiceNumber: data.invoiceNumber,
    faceValue: String(data.faceValue),
    currency: data.currency || 'KES',
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    status: 'awaiting_buyer_verification',
    listingStatus: 'listed',
    metadata: data.description ? { description: data.description } : {},
  }).returning();

  await db.insert(s.invoiceStatusHistory).values({
    invoiceId: inv.id, fromStatus: null, toStatus: 'awaiting_buyer_verification', changedBy: actorId || null, reason: 'Supplier listed invoice',
  });

  const [verification] = await db.insert(s.buyerVerifications).values({
    invoiceId: inv.id,
    buyerOrgId: data.buyerOrgId,
    status: 'pending',
  }).returning();

  await notifyOrgUsers(data.buyerOrgId, {
    type: 'buyer_verification_request',
    title: 'Invoice verification required',
    body: `Supplier listed ${iou} against your organisation`,
    referenceType: 'invoice',
    referenceId: inv.id,
  });

  await writeAudit({
    actorId, action: 'invoice.created', resourceType: 'invoice', resourceId: inv.id,
    details: { origin: 'supplier_listed', iou },
  });

  return { invoice: inv, verification };
}

export async function getOrCreateWallet(orgId: string) {
  const [existing] = await db.select().from(s.wallets).where(eq(s.wallets.orgId, orgId)).limit(1);
  if (existing) return existing;
  const [w] = await db.insert(s.wallets).values({ orgId, balance: '0' }).returning();
  return w;
}

export async function walletCredit(orgId: string, amount: number, reference: string, description?: string) {
  const wallet = await getOrCreateWallet(orgId);
  const newBal = Number(wallet.balance) + amount;
  await db.insert(s.walletTransactions).values({
    walletId: wallet.id, type: 'credit', amount: String(amount), reference, description: description || null,
  });
  await db.update(s.wallets).set({ balance: String(newBal), updatedAt: new Date() }).where(eq(s.wallets.id, wallet.id));
  return newBal;
}

export async function walletDebit(orgId: string, amount: number, reference: string, description?: string) {
  const wallet = await getOrCreateWallet(orgId);
  const current = Number(wallet.balance);
  if (current < amount) {
    throw new AppError(400, 'insufficient_funds', 'Insufficient wallet balance');
  }
  const newBal = current - amount;
  await db.insert(s.walletTransactions).values({
    walletId: wallet.id, type: 'debit', amount: String(amount), reference, description: description || null,
  });
  await db.update(s.wallets).set({ balance: String(newBal), updatedAt: new Date() }).where(eq(s.wallets.id, wallet.id));
  return newBal;
}

async function calculateFees(faceValue: number) {
  const configs = await db.select().from(s.feeConfigurations).where(eq(s.feeConfigurations.isActive, true));
  let total = 0;
  const lines: { feeConfigId: string; amount: number; appliesTo: string }[] = [];
  for (const c of configs) {
    let amount = 0;
    if (c.rateBps) amount = Math.round(faceValue * (c.rateBps / 10000));
    if (c.flatAmount) amount += Number(c.flatAmount);
    if (amount > 0) {
      total += amount;
      lines.push({ feeConfigId: c.id, amount, appliesTo: c.appliesTo });
    }
  }
  return { total, lines };
}

export async function createAssignment(opts: {
  invoiceId: string;
  type: 'opt_in_auto' | 'offer_consent' | 'supplier_originated_auto';
  actorId?: string;
  offerId?: string;
  consentId?: string;
  discountBps?: number;
}) {
  const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, opts.invoiceId)).limit(1);
  if (!inv) throw new AppError(404, 'not_found', 'Invoice not found');

  const face = Number(inv.faceValue);
  await assertProgrammeAllows({
    buyerOrgId: inv.buyerOrgId,
    faceValue: face,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    discountRateBps: opts.discountBps,
  });

  const spv = await getSpvOrg();
  const platform = await getPlatformOrg();
  const tenor = computeTenorDays(inv.issueDate, inv.dueDate);
  const priced = priceReceivable({
    faceValue: face,
    tenorDays: tenor,
  });
  const bps = opts.discountBps ?? priced.recommendedBps;
  const purchasePrice = Math.round(face * (1 - bps / 10000));
  const fees = await calculateFees(face);
  const supplierNet = purchasePrice - Math.round(fees.total / 2);

  const [asgn] = await db.insert(s.assignments).values({
    invoiceId: inv.id,
    offerId: opts.offerId || null,
    consentId: opts.consentId || null,
    spvOrgId: spv.id,
    supplierOrgId: inv.supplierOrgId,
    buyerOrgId: inv.buyerOrgId,
    assignmentType: opts.type,
    purchasePrice: String(purchasePrice),
    faceValue: String(face),
    status: 'active',
  }).returning();

  await db.insert(s.escrowLegs).values([
    { assignmentId: asgn.id, legType: 'disbursement_to_supplier', amount: String(supplierNet), status: 'pending' },
    { assignmentId: asgn.id, legType: 'collection_from_buyer', amount: String(face), status: 'pending' },
    { assignmentId: asgn.id, legType: 'fee_to_platform', amount: String(fees.total), status: 'pending' },
    { assignmentId: asgn.id, legType: 'payout_to_spv', amount: String(face - fees.total), status: 'pending' },
  ]);

  for (const line of fees.lines) {
    await db.insert(s.feeLedger).values({
      assignmentId: asgn.id,
      feeConfigId: line.feeConfigId,
      chargedToOrg: spv.id,
      amount: String(line.amount),
      status: 'pending',
    });
  }

  // Simulation wallets
  await walletDebit(spv.id, purchasePrice, `assignment:${asgn.id}`, 'Purchase of receivable');
  await walletCredit(inv.supplierOrgId, supplierNet, `assignment:${asgn.id}`, 'Receivable sale proceeds');
  if (platform && fees.total > 0) {
    await walletCredit(platform.id, fees.total, `fee:${asgn.id}`, 'Platform fees');
  }

  await db.update(s.invoices).set({
    status: 'assigned',
    discountRateBps: bps,
    listingStatus: 'sold',
    updatedAt: new Date(),
  }).where(eq(s.invoices.id, inv.id));

  await db.insert(s.invoiceStatusHistory).values({
    invoiceId: inv.id,
    fromStatus: inv.status,
    toStatus: 'assigned',
    changedBy: opts.actorId || null,
    reason: `Assignment ${opts.type}`,
  });

  await notifyOrgUsers(spv.id, {
    type: 'assignment_created',
    title: 'Receivable assigned',
    body: `${inv.iouRegistryId} assigned to SPV`,
    referenceType: 'assignment',
    referenceId: asgn.id,
  });

  try {
    const [supplier] = await db.select().from(s.organisations).where(eq(s.organisations.id, inv.supplierOrgId)).limit(1);
    const [buyer] = await db.select().from(s.organisations).where(eq(s.organisations.id, inv.buyerOrgId)).limit(1);
    const note = await generatePurchaseNote({
      orgId: inv.supplierOrgId,
      iouRegistryId: inv.iouRegistryId || inv.id,
      supplierName: supplier?.name || 'Supplier',
      buyerName: buyer?.name || 'Buyer',
      faceValue: face,
      purchasePrice,
      assignmentId: asgn.id,
    });
    await db.insert(s.orgDocuments).values({
      orgId: inv.supplierOrgId,
      docType: 'purchase_note',
      fileUrl: note.url,
      uploadedBy: opts.actorId || null,
    });
  } catch (e) {
    console.warn('[pdf] purchase note generation failed', e);
  }

  await writeAudit({
    actorId: opts.actorId,
    action: 'assignment.created',
    resourceType: 'assignment',
    resourceId: asgn.id,
    details: { type: opts.type, invoiceId: inv.id },
  });

  return asgn;
}

export async function respondToOptIn(optInId: string, accept: boolean, userId: string, declineReason?: string) {
  const [opt] = await db.select().from(s.optIns).where(eq(s.optIns.id, optInId)).limit(1);
  if (!opt) throw new AppError(404, 'not_found', 'Opt-in not found');
  if (opt.status !== 'pending') throw new AppError(400, 'invalid_state', 'Opt-in already responded');

  await db.update(s.optIns).set({
    status: accept ? 'accepted' : 'declined',
    declineReason: accept ? null : (declineReason || 'Declined'),
    respondedBy: userId,
    respondedAt: new Date(),
  }).where(eq(s.optIns.id, optInId));

  if (accept) {
    const asgn = await createAssignment({ invoiceId: opt.invoiceId, type: 'opt_in_auto', actorId: userId });
    return { optIn: opt, assignment: asgn };
  }

  await transitionInvoice(opt.invoiceId, 'opt_in_declined', userId, declineReason);
  const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, opt.invoiceId)).limit(1);
  if (inv) {
    await notifyOrgUsers(inv.buyerOrgId, {
      type: 'opt_in_declined',
      title: 'Supplier declined opt-in',
      body: `${inv.iouRegistryId} declined`,
      referenceType: 'invoice',
      referenceId: inv.id,
    });
  }
  return { optIn: opt, assignment: null };
}

export async function respondToBuyerVerification(verificationId: string, accept: boolean, userId: string, rejectReason?: string) {
  const [v] = await db.select().from(s.buyerVerifications).where(eq(s.buyerVerifications.id, verificationId)).limit(1);
  if (!v) throw new AppError(404, 'not_found', 'Verification not found');
  if (v.status !== 'pending') throw new AppError(400, 'invalid_state', 'Already responded');

  await db.update(s.buyerVerifications).set({
    status: accept ? 'verified' : 'rejected',
    rejectReason: accept ? null : (rejectReason || 'Rejected'),
    verifiedBy: userId,
    verifiedAt: new Date(),
  }).where(eq(s.buyerVerifications.id, verificationId));

  if (accept) {
    const asgn = await createAssignment({ invoiceId: v.invoiceId, type: 'supplier_originated_auto', actorId: userId });
    return { verification: v, assignment: asgn };
  }

  await transitionInvoice(v.invoiceId, 'buyer_rejected', userId, rejectReason);
  return { verification: v, assignment: null };
}

export async function releaseEscrowLeg(legId: string, actorId?: string) {
  const [leg] = await db.select().from(s.escrowLegs).where(eq(s.escrowLegs.id, legId)).limit(1);
  if (!leg) throw new AppError(404, 'not_found', 'Escrow leg not found');
  if (leg.status !== 'pending') throw new AppError(400, 'invalid_state', 'Leg not pending');

  const status = leg.legType.includes('collection') ? 'collected' : 'released';
  await db.update(s.escrowLegs).set({ status, executedAt: new Date() }).where(eq(s.escrowLegs.id, legId));

  if (leg.legType === 'disbursement_to_supplier') {
    const [asgn] = await db.select().from(s.assignments).where(eq(s.assignments.id, leg.assignmentId)).limit(1);
    if (asgn) await transitionInvoice(asgn.invoiceId, 'disbursed', actorId, 'Escrow disbursement released');
  }
  return leg;
}

export async function applyPaymentUpdate(data: {
  invoiceId?: string;
  iouRegistryId?: string;
  amountPaid: number;
  outstandingBalance: number;
  nextDueDate?: string;
  paymentMethod?: string;
  afyaxReference?: string;
}) {
  let inv;
  if (data.invoiceId) {
    [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, data.invoiceId)).limit(1);
  } else if (data.iouRegistryId) {
    [inv] = await db.select().from(s.invoices).where(eq(s.invoices.iouRegistryId, data.iouRegistryId)).limit(1);
  }
  if (!inv) throw new AppError(404, 'not_found', 'Invoice not found');

  await db.insert(s.paymentUpdates).values({
    invoiceId: inv.id,
    source: 'afyax',
    amountPaid: String(data.amountPaid),
    outstandingBalance: String(data.outstandingBalance),
    nextDueDate: data.nextDueDate || null,
    paymentMethod: data.paymentMethod || null,
    afyaxReference: data.afyaxReference || null,
  });

  const [asgn] = await db.select().from(s.assignments).where(eq(s.assignments.invoiceId, inv.id)).limit(1);
  if (asgn) {
    await walletCredit(asgn.spvOrgId, data.amountPaid, `payment:${inv.id}`, 'Buyer payment via AfyaX');
    await notifyOrgUsers(asgn.spvOrgId, {
      type: 'payment_received',
      title: `Payment received: KES ${data.amountPaid.toLocaleString()}`,
      body: `On ${inv.iouRegistryId}. Balance: KES ${data.outstandingBalance.toLocaleString()}`,
      referenceType: 'invoice',
      referenceId: inv.id,
    });
    try {
      const receipt = await generatePaymentReceipt({
        orgId: inv.buyerOrgId,
        iouRegistryId: inv.iouRegistryId || inv.id,
        amountPaid: data.amountPaid,
        outstandingBalance: data.outstandingBalance,
        reference: data.afyaxReference,
      });
      await db.insert(s.orgDocuments).values({
        orgId: inv.buyerOrgId,
        docType: 'payment_receipt',
        fileUrl: receipt.url,
      });
    } catch (e) {
      console.warn('[pdf] payment receipt failed', e);
    }
  }

  if (data.outstandingBalance <= 0) {
    await transitionInvoice(inv.id, 'settled', null, 'Fully paid');
    if (asgn) {
      await db.update(s.assignments).set({ status: 'settled' }).where(eq(s.assignments.id, asgn.id));
    }
  }

  return { invoiceId: inv.id, received: true };
}

export async function listInvoicesForOrg(orgId: string, role: string) {
  if (role === 'admin' || role === 'spv') {
    return db.select().from(s.invoices).orderBy(desc(s.invoices.createdAt));
  }
  if (role === 'buyer') {
    return db.select().from(s.invoices).where(eq(s.invoices.buyerOrgId, orgId)).orderBy(desc(s.invoices.createdAt));
  }
  return db.select().from(s.invoices).where(eq(s.invoices.supplierOrgId, orgId)).orderBy(desc(s.invoices.createdAt));
}
