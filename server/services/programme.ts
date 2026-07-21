import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { checkProgramCapacity, computeTenorDays } from '../lib/pricing.js';
import { notifyOrgUsers } from './notificationService.js';
import { templates, emailSubjects } from './email.js';

async function notifyProgrammeBlock(programmeName: string, reason: string, buyerOrgId: string) {
  const payload = {
    type: 'programme_blocked',
    title: 'Programme limit blocked a transaction',
    body: `${programmeName}: ${reason}`,
    emailHtml: templates.programmeLimitBlocked(programmeName, reason),
    emailSubject: emailSubjects.programmeBlock(),
  };
  await notifyOrgUsers(buyerOrgId, payload).catch(() => undefined);
  const platforms = await db.select().from(s.organisations).where(eq(s.organisations.orgType, 'platform'));
  for (const p of platforms) {
    await notifyOrgUsers(p.id, payload).catch(() => undefined);
  }
}

async function blockAndNotify(
  programme: { id: string; name: string },
  buyerOrgId: string,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): Promise<never> {
  await notifyProgrammeBlock(programme.name, message, buyerOrgId);
  throw new AppError(400, code, message, details);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Resolve the active programme that should govern this buyer (buyer-specific, else open-market). */
export async function resolveActiveProgramme(buyerOrgId: string) {
  const today = todayIso();
  const programmes = await db.select().from(s.programmes).where(eq(s.programmes.status, 'active'));

  const inWindow = (p: typeof programmes[0]) => {
    if (p.effectiveFrom && p.effectiveFrom > today) return false;
    if (p.expiresAt && p.expiresAt < today) return false;
    return true;
  };

  const active = programmes.filter(inWindow);
  return active.find((p) => p.buyerOrgId === buyerOrgId)
    || active.find((p) => !p.buyerOrgId)
    || null;
}

/**
 * Hard-enforce active programme exposure + tenor + discount band (+ dates/sublimit).
 * Throws AppError when a governing programme exists and the request violates it.
 */
export async function assertProgrammeAllows(opts: {
  buyerOrgId: string;
  faceValue: number;
  issueDate: string;
  dueDate: string;
  discountRateBps?: number;
  /** When true, require a governing programme (used for assignment/offer). Default soft-allow if none. */
  requireProgramme?: boolean;
}) {
  const programme = await resolveActiveProgramme(opts.buyerOrgId);

  if (!programme) {
    if (opts.requireProgramme) {
      throw new AppError(400, 'programme_required', 'No active financing programme covers this buyer');
    }
    return;
  }

  const today = todayIso();
  if (programme.effectiveFrom && programme.effectiveFrom > today) {
    throw new AppError(400, 'programme_not_effective', `Programme effective from ${programme.effectiveFrom}`);
  }
  if (programme.expiresAt && programme.expiresAt < today) {
    throw new AppError(400, 'programme_expired', `Programme expired on ${programme.expiresAt}`);
  }

  const tenor = computeTenorDays(opts.issueDate, opts.dueDate);
  if (programme.maxTenorDays && tenor > programme.maxTenorDays) {
    await blockAndNotify(
      programme,
      opts.buyerOrgId,
      'programme_tenor',
      `Tenor ${tenor}d exceeds programme max ${programme.maxTenorDays}d`,
      { programmeId: programme.id, tenor, maxTenorDays: programme.maxTenorDays },
    );
  }

  if (opts.discountRateBps != null) {
    const min = programme.discountBandMinBps ?? 0;
    const max = programme.discountBandMaxBps ?? 10000;
    if (opts.discountRateBps < min || opts.discountRateBps > max) {
      await blockAndNotify(
        programme,
        opts.buyerOrgId,
        'programme_discount',
        `Discount ${opts.discountRateBps}bps outside programme band ${min}–${max}bps`,
        { programmeId: programme.id, min, max },
      );
    }
  }

  const activeStatuses = ['active', 'disbursed', 'packaged'];
  const asgns = await db.select().from(s.assignments).where(and(
    eq(s.assignments.buyerOrgId, opts.buyerOrgId),
    inArray(s.assignments.status, activeStatuses),
  ));
  const utilised = asgns.reduce((sum, a) => sum + Number(a.faceValue), 0);

  const maxExposure = Number(programme.maxExposure || 0);
  if (maxExposure > 0) {
    const check = checkProgramCapacity(utilised, maxExposure, opts.faceValue);
    if (!check.ok) {
      await blockAndNotify(
        programme,
        opts.buyerOrgId,
        'programme_capacity',
        check.message || 'Programme capacity exceeded',
        { remaining: check.remaining, programmeId: programme.id },
      );
    }
  }

  const sublimit = Number(programme.buyerSublimit || 0);
  if (sublimit > 0) {
    const check = checkProgramCapacity(utilised, sublimit, opts.faceValue);
    if (!check.ok) {
      await blockAndNotify(
        programme,
        opts.buyerOrgId,
        'programme_sublimit',
        `Buyer sublimit exceeded (remaining ${check.remaining.toLocaleString()} KES)`,
        { remaining: check.remaining, programmeId: programme.id, buyerSublimit: sublimit },
      );
    }
  }
}
