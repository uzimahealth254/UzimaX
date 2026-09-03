import crypto from 'crypto';
import { AppError } from './errors.js';

const isProd = () => process.env.NODE_ENV === 'production';

/** Fail closed if secrets are missing or weak in production; generate ephemeral secrets in development. */
export function assertSecurityConfig(): void {
  const minLen = 32;
  const jwt = process.env.JWT_SECRET;
  const refresh = process.env.JWT_REFRESH_SECRET;

  if (isProd()) {
    if (!jwt || jwt.length < minLen || jwt === 'dev-secret') {
      throw new Error('FATAL: JWT_SECRET must be set to a strong value (≥32 chars) in production');
    }
    if (!refresh || refresh.length < minLen || refresh === 'dev-refresh') {
      throw new Error('FATAL: JWT_REFRESH_SECRET must be set to a strong value (≥32 chars) in production');
    }
    const cors = (process.env.CORS_ORIGINS || '').trim();
    if (!cors) {
      throw new Error('FATAL: CORS_ORIGINS must be set to an exact allow-list in production');
    }
    if (!process.env.AFYAX_WEBHOOK_SECRET || process.env.AFYAX_WEBHOOK_SECRET.length < 16) {
      throw new Error('FATAL: AFYAX_WEBHOOK_SECRET must be set in production (payment webhooks)');
    }
    if (process.env.ALLOW_DEMO_OTP === 'true') {
      throw new Error('FATAL: ALLOW_DEMO_OTP must be false in production');
    }
    if (process.env.ALLOW_BODY_REFRESH === 'true') {
      throw new Error('FATAL: ALLOW_BODY_REFRESH must be false in production (cookie refresh only)');
    }
    if (process.env.ENABLE_SIMULATED_WALLET === 'true') {
      throw new Error('FATAL: ENABLE_SIMULATED_WALLET must be false in production');
    }
    if (process.env.ALLOW_PROD_SEED === '1') {
      throw new Error('FATAL: ALLOW_PROD_SEED must not be set on a running production API');
    }
    if (process.env.EMAIL_PROVIDER === 'stub') {
      console.warn('[security] EMAIL_PROVIDER=stub — invites/OTP/reset cannot be delivered; configure Resend/SMTP');
    }
  } else {
    if (!jwt) {
      process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
      console.warn('[security] JWT_SECRET missing — generated ephemeral secret for this process');
    }
    if (!refresh) {
      process.env.JWT_REFRESH_SECRET = crypto.randomBytes(48).toString('hex');
      console.warn('[security] JWT_REFRESH_SECRET missing — generated ephemeral secret for this process');
    }
  }
}

export function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET not configured');
  return s;
}

export function getJwtRefreshSecret(): string {
  const s = process.env.JWT_REFRESH_SECRET;
  if (!s) throw new Error('JWT_REFRESH_SECRET not configured');
  return s;
}

export function demoOtpAllowed(): boolean {
  return process.env.ALLOW_DEMO_OTP === 'true'
    || (!isProd() && process.env.ALLOW_DEMO_OTP !== 'false');
}

export function simulatedWalletAllowed(): boolean {
  if (process.env.ENABLE_SIMULATED_WALLET === 'true') return true;
  if (process.env.ENABLE_SIMULATED_WALLET === 'false') return false;
  return !isProd();
}

export function bodyRefreshAllowed(): boolean {
  return process.env.ALLOW_BODY_REFRESH === 'true' || !isProd();
}

/** Password policy: ≥12 chars, upper, lower, digit, special */
export const passwordSchemaMessage =
  'Password must be at least 12 characters and include upper, lower, number, and special character';

export function isStrongPassword(pw: string): boolean {
  if (pw.length < 12) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  if (!/[^A-Za-z0-9]/.test(pw)) return false;
  return true;
}

export function assertStrongPassword(pw: string): void {
  if (!isStrongPassword(pw)) {
    throw new AppError(400, 'weak_password', passwordSchemaMessage);
  }
}

export function generateApiKey(): { raw: string; prefix: string } {
  const raw = `uzima_${crypto.randomBytes(24).toString('hex')}`;
  return { raw, prefix: raw.slice(0, 12) };
}

export function generateTempPassword(): string {
  // Meets policy; used for invites when no password supplied
  const base = crypto.randomBytes(9).toString('base64url');
  return `Uz${base}!9a`;
}

export const REFRESH_COOKIE = 'uzima_rt';

export function refreshCookieOptions() {
  const secure = isProd() || process.env.COOKIE_SECURE === 'true';
  return {
    httpOnly: true as const,
    secure,
    sameSite: (secure ? 'none' : 'lax') as 'none' | 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

const WEBHOOK_SKEW_MS = 5 * 60 * 1000;

/** Accept unix seconds (~1e9) or unix milliseconds (~1e12). HMAC still uses the header string as sent. */
export function webhookTimestampToMs(timestampHeader: string): number | null {
  const ts = Number(timestampHeader);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  return ts < 1e12 ? ts * 1000 : ts;
}

/** HMAC verify for AfyaX webhooks when AFYAX_WEBHOOK_SECRET is set */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  timestampHeader: string | undefined,
): void {
  const secret = process.env.AFYAX_WEBHOOK_SECRET;
  if (!secret) {
    if (isProd()) {
      throw new AppError(503, 'misconfigured', 'Webhook signature secret not configured');
    }
    return; // allow unsigned in non-prod when secret unset
  }
  if (!signatureHeader || !timestampHeader) {
    throw new AppError(401, 'invalid_signature', 'Missing webhook signature');
  }
  const tsMs = webhookTimestampToMs(timestampHeader);
  if (tsMs == null || Math.abs(Date.now() - tsMs) > WEBHOOK_SKEW_MS) {
    throw new AppError(401, 'invalid_signature', 'Webhook timestamp skew too large');
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestampHeader}.${rawBody}`)
    .digest('hex');
  const provided = signatureHeader.replace(/^sha256=/, '').trim().toLowerCase();
  let a: Buffer;
  let b: Buffer;
  try {
    a = Buffer.from(expected, 'hex');
    b = Buffer.from(provided, 'hex');
  } catch {
    throw new AppError(401, 'invalid_signature', 'Invalid webhook signature');
  }
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new AppError(401, 'invalid_signature', 'Invalid webhook signature');
  }
}

export const ALLOWED_UPLOAD_MIMES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

export const ALLOWED_UPLOAD_EXTS = new Set(['.pdf', '.png', '.jpg', '.jpeg']);
