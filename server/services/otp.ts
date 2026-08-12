import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { sendEmail, templates, emailSubjects } from './email.js';
import { demoOtpAllowed } from '../lib/security.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const failCounts = new Map<string, { count: number; resetAt: number }>();

function failKey(userId: string, purpose: string) {
  return `${userId}:${purpose}`;
}

export async function issueOtp(opts: {
  userId: string;
  purpose: string;
  email?: string | null;
}): Promise<{ demoHint?: string }> {
  await db.update(s.otpCodes).set({ consumedAt: new Date() }).where(and(
    eq(s.otpCodes.userId, opts.userId),
    eq(s.otpCodes.purpose, opts.purpose),
    isNull(s.otpCodes.consumedAt),
  ));
  failCounts.delete(failKey(opts.userId, opts.purpose));

  const useDemo = demoOtpAllowed();
  const code = useDemo
    ? (process.env.DEMO_OTP || '123456')
    : String(crypto.randomInt(100000, 1000000));

  const codeHash = await bcrypt.hash(code, 12);
  await db.insert(s.otpCodes).values({
    userId: opts.userId,
    purpose: opts.purpose,
    codeHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  let emailDelivered = false;
  if (opts.email) {
    const isReset = opts.purpose === 'password_reset';
    const purposeLabel = opts.purpose.replace(/[:_]/g, ' ').trim();
    const sent = await sendEmail({
      to: opts.email,
      subject: isReset ? emailSubjects.passwordReset() : emailSubjects.otp(purposeLabel),
      html: isReset ? templates.passwordReset(code) : templates.otp(code, purposeLabel),
      text: `Your IOU Exchange code is ${code}. It expires in 10 minutes.`,
      template: isReset ? 'password_reset' : 'otp',
    });
    emailDelivered = Boolean(sent?.ok && sent.mode !== 'stub');
  }

  // Show code in API/UI when demo OTP is allowed, or when email cannot be delivered (stub),
  // so portal demos still complete maker-checker confirms.
  if (useDemo || !emailDelivered) {
    return { demoHint: code };
  }
  return {};
}

export async function verifyOtp(userId: string, purpose: string, code: string): Promise<void> {
  const fk = failKey(userId, purpose);
  const now = Date.now();
  const bucket = failCounts.get(fk);
  if (bucket && bucket.resetAt > now && bucket.count >= MAX_ATTEMPTS) {
    throw new AppError(429, 'otp_locked', 'Too many invalid OTP attempts — request a new code');
  }

  const rows = await db.select().from(s.otpCodes).where(and(
    eq(s.otpCodes.userId, userId),
    eq(s.otpCodes.purpose, purpose),
    isNull(s.otpCodes.consumedAt),
    gt(s.otpCodes.expiresAt, new Date()),
  ));

  if (rows.length === 0) {
    throw new AppError(400, 'invalid_otp', 'Invalid or expired OTP');
  }

  for (const row of rows.reverse()) {
    if (await bcrypt.compare(code, row.codeHash)) {
      await db.update(s.otpCodes).set({ consumedAt: new Date() }).where(eq(s.otpCodes.id, row.id));
      failCounts.delete(fk);
      return;
    }
  }

  const next = (!bucket || bucket.resetAt <= now)
    ? { count: 1, resetAt: now + OTP_TTL_MS }
    : { count: bucket.count + 1, resetAt: bucket.resetAt };
  failCounts.set(fk, next);
  if (next.count >= MAX_ATTEMPTS) {
    await db.update(s.otpCodes).set({ consumedAt: new Date() }).where(and(
      eq(s.otpCodes.userId, userId),
      eq(s.otpCodes.purpose, purpose),
      isNull(s.otpCodes.consumedAt),
    ));
    throw new AppError(429, 'otp_locked', 'Too many invalid OTP attempts — request a new code');
  }
  throw new AppError(400, 'invalid_otp', 'Invalid or expired OTP');
}
