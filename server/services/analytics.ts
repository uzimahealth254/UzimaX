import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema.js';

export async function getAdminAnalytics() {
  const invoices = await db.select().from(s.invoices);
  const offers = await db.select().from(s.purchaseOffers);
  const orgs = await db.select().from(s.organisations);
  const payments = await db.select().from(s.paymentUpdates);
  const assignments = await db.select().from(s.assignments);
  const packages = await db.select().from(s.packages);

  const byStatus: Record<string, number> = {};
  for (const inv of invoices) {
    byStatus[inv.status] = (byStatus[inv.status] || 0) + 1;
  }

  const totalFace = invoices.reduce((sum, i) => sum + Number(i.faceValue), 0);
  const assignedFace = assignments
    .filter((a) => a.status === 'active')
    .reduce((sum, a) => sum + Number(a.faceValue), 0);

  const monthly: { month: string; count: number; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const y = d.getFullYear();
    const m = d.getMonth();
    const monthInvs = invoices.filter((inv) => {
      const created = new Date(inv.createdAt);
      return created.getFullYear() === y && created.getMonth() === m;
    });
    monthly.push({
      month: d.toLocaleDateString('en', { month: 'short' }),
      count: monthInvs.length,
      value: monthInvs.reduce((sum, inv) => sum + Number(inv.faceValue), 0),
    });
  }

  const avgDiscountBps = offers.length
    ? Math.round(offers.reduce((sum, o) => sum + (o.discountRateBps || 0), 0) / offers.length)
    : 0;

  return {
    totals: {
      invoices: invoices.length,
      totalFaceValue: totalFace,
      assignedFaceValue: assignedFace,
      organisations: orgs.length,
      packages: packages.length,
      paymentUpdates: payments.length,
    },
    pipeline: byStatus,
    monthlyVolume: monthly,
    participants: {
      suppliers: orgs.filter((o) => o.orgType === 'supplier').length,
      buyers: orgs.filter((o) => o.orgType === 'buyer').length,
      spv: orgs.filter((o) => o.orgType === 'spv').length,
    },
    performance: {
      avgDiscountPct: avgDiscountBps / 100,
      settlementEvents: payments.filter((p) => Number(p.outstandingBalance) <= 0).length,
      paymentEvents: payments.length,
    },
  };
}

export async function getProgrammeUtilisation() {
  const programmes = await db.select().from(s.programmes);
  const active = await db.select().from(s.assignments).where(
    inArray(s.assignments.status, ['active', 'disbursed', 'packaged']),
  );

  return programmes.map((p) => {
    const utilised = active
      .filter((a) => !p.buyerOrgId || a.buyerOrgId === p.buyerOrgId)
      .reduce((sum, a) => sum + Number(a.faceValue), 0);
    return {
      ...p,
      utilised,
      maxFacility: Number(p.maxExposure || 0),
      remaining: Math.max(0, Number(p.maxExposure || 0) - utilised),
    };
  });
}

/** Simple credit risk from payment history + exposure */
export async function getBuyerCreditRisk(buyerOrgId: string) {
  const invoices = await db.select().from(s.invoices).where(eq(s.invoices.buyerOrgId, buyerOrgId));
  const invoiceIds = invoices.map((i) => i.id);
  const payments = invoiceIds.length
    ? await db.select().from(s.paymentUpdates).where(inArray(s.paymentUpdates.invoiceId, invoiceIds))
    : [];

  const settled = invoices.filter((i) => i.status === 'settled').length;
  const defaulted = invoices.filter((i) => i.status === 'defaulted').length;
  const activeExposure = invoices
    .filter((i) => ['assigned', 'disbursed', 'packaged', 'matured'].includes(i.status))
    .reduce((sum, i) => sum + Number(i.faceValue), 0);

  const lateHints = payments.filter((p) => Number(p.outstandingBalance) > 0).length;
  let score = 80;
  score -= defaulted * 25;
  score -= Math.min(20, lateHints * 2);
  score += Math.min(10, settled);
  score = Math.max(0, Math.min(100, score));

  const band = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : 'D';

  return {
    buyerOrgId,
    score,
    band,
    metrics: {
      invoiceCount: invoices.length,
      settled,
      defaulted,
      activeExposure,
      paymentUpdates: payments.length,
    },
  };
}
