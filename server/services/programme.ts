import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { checkProgramCapacity, computeTenorDays } from '../lib/pricing.js';

/** Hard-enforce active programme exposure + tenor + discount band before assignment/offer */
export async function assertProgrammeAllows(opts: {
  buyerOrgId: string;
  faceValue: number;
  issueDate: string;
  dueDate: string;
  discountRateBps?: number;
}) {
  const programmes = await db.select().from(s.programmes).where(and(
    eq(s.programmes.status, 'active'),
    eq(s.programmes.buyerOrgId, opts.buyerOrgId),
  ));

  const open = programmes.length
    ? programmes
    : await db.select().from(s.programmes).where(and(
      eq(s.programmes.status, 'active'),
    ));

  const programme = open.find((p) => p.buyerOrgId === opts.buyerOrgId)
    || open.find((p) => !p.buyerOrgId)
    || open[0];

  if (!programme) return;

  const tenor = computeTenorDays(opts.issueDate, opts.dueDate);
  if (programme.maxTenorDays && tenor > programme.maxTenorDays) {
    throw new AppError(400, 'programme_tenor', `Tenor ${tenor}d exceeds programme max ${programme.maxTenorDays}d`);
  }

  if (opts.discountRateBps != null) {
    const min = programme.discountBandMinBps ?? 0;
    const max = programme.discountBandMaxBps ?? 10000;
    if (opts.discountRateBps < min || opts.discountRateBps > max) {
      throw new AppError(400, 'programme_discount', `Discount ${opts.discountRateBps}bps outside programme band ${min}–${max}bps`, {
        programmeId: programme.id,
        min,
        max,
      });
    }
  }

  const maxExposure = Number(programme.maxExposure || 0);
  if (!maxExposure) return;

  const activeStatuses = ['active', 'disbursed', 'packaged'];
  const asgns = await db.select().from(s.assignments).where(and(
    eq(s.assignments.buyerOrgId, opts.buyerOrgId),
    inArray(s.assignments.status, activeStatuses),
  ));
  const utilised = asgns.reduce((sum, a) => sum + Number(a.faceValue), 0);
  const check = checkProgramCapacity(utilised, maxExposure, opts.faceValue);
  if (!check.ok) {
    throw new AppError(400, 'programme_capacity', check.message || 'Programme capacity exceeded', {
      remaining: check.remaining,
      programmeId: programme.id,
    });
  }
}
