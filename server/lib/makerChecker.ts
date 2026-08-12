/**
 * Maker-checker helpers. Until capacity column is migrated, any active signatory
 * counts as checker; admin role bypasses OTP for ops.
 */
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema.js';
import { AppError } from './errors.js';
import { verifyOtp } from '../services/otp.js';

type AuthUser = { userId: string; role: string; orgId?: string | null };

export async function assertCheckerOtp(user: AuthUser, purpose: string, otp?: string) {
  if (user.role === 'admin') return;

  const orgId = user.orgId;
  if (!orgId) throw new AppError(403, 'forbidden', 'Organisation required');

  const [sig] = await db.select().from(s.signatories).where(and(
    eq(s.signatories.userId, user.userId),
    eq(s.signatories.orgId, orgId),
    eq(s.signatories.isActive, true),
  )).limit(1);

  // If org has no signatories yet, allow (bootstrap). Once any exist, actor must be checker + OTP.
  const orgSigs = await db.select().from(s.signatories).where(and(
    eq(s.signatories.orgId, orgId),
    eq(s.signatories.isActive, true),
  ));

  if (orgSigs.length === 0) {
    return;
  }

  if (!sig) {
    throw new AppError(403, 'checker_required', 'Only an active checker signatory can confirm this action');
  }
  const capacity = (sig as { capacity?: string | null }).capacity;
  if (capacity && capacity !== 'checker' && capacity !== 'both') {
    throw new AppError(403, 'checker_required', 'Maker accounts cannot confirm — a checker must approve with OTP');
  }

  if (!otp?.trim()) {
    throw new AppError(400, 'otp_required', 'OTP is required to confirm this action');
  }
  await verifyOtp(user.userId, purpose, otp.trim());
}

export async function requireActiveSignatory(user: AuthUser) {
  if (user.role === 'admin') return;
  const orgId = user.orgId;
  if (!orgId) return;
  const orgSigs = await db.select().from(s.signatories).where(and(
    eq(s.signatories.orgId, orgId),
    eq(s.signatories.isActive, true),
  ));
  if (orgSigs.length === 0) return;
  const [sig] = await db.select().from(s.signatories).where(and(
    eq(s.signatories.userId, user.userId),
    eq(s.signatories.orgId, orgId),
    eq(s.signatories.isActive, true),
  )).limit(1);
  if (!sig) {
    throw new AppError(403, 'signatory_required', 'An active signatory must perform this action');
  }
}
