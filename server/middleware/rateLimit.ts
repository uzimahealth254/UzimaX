import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';

type Bucket = { count: number; resetAt: number };

const memory = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX = () => Number(process.env.RATE_LIMIT_MAX || 120);
const AUTH_MAX = () => Number(process.env.AUTH_RATE_LIMIT_MAX || 10);
const LOCKOUT_THRESHOLD = () => Number(process.env.LOGIN_LOCKOUT_THRESHOLD || 5);
const LOCKOUT_MS = () => Number(process.env.LOGIN_LOCKOUT_MS || 15 * 60_000);

let redis: import('ioredis').default | null = null;

export async function initRateLimitStore() {
  const url = process.env.REDIS_URL;
  const isProd = process.env.NODE_ENV === 'production';
  if (!url) {
    if (isProd) {
      throw new Error('FATAL: REDIS_URL is required in production for rate limiting (UZIMA-ARCH-001 §3.7)');
    }
    console.info('[rate-limit] in-memory (set REDIS_URL for Redis)');
    return;
  }
  try {
    const Redis = (await import('ioredis')).default;
    redis = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    await redis.connect();
    console.info('[rate-limit] Redis connected');
  } catch (e) {
    if (isProd) {
      throw new Error(`FATAL: Redis required in production but connection failed: ${e}`);
    }
    console.warn('[rate-limit] Redis unavailable, using memory', e);
    redis = null;
  }
}

async function hit(key: string, max: number, windowMs = WINDOW_MS): Promise<{ count: number; remaining: number; resetAt: number }> {
  if (redis) {
    const k = `uzima:rl:${key}`;
    const count = await redis.incr(k);
    if (count === 1) await redis.pexpire(k, windowMs);
    const ttl = await redis.pttl(k);
    return { count, remaining: Math.max(0, max - count), resetAt: Date.now() + Math.max(ttl, 0) };
  }
  const now = Date.now();
  let b = memory.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    memory.set(key, b);
  }
  b.count += 1;
  return { count: b.count, remaining: Math.max(0, max - b.count), resetAt: b.resetAt };
}

function clientKey(req: Request): string {
  return req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || 'unknown';
}

export async function apiRateLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const key = clientKey(req);
    const result = await hit(key, MAX());
    res.setHeader('X-RateLimit-Limit', String(MAX()));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
    if (result.count > MAX()) {
      return res.status(429).json({ error: 'rate_limited', message: 'Too many requests' });
    }
    next();
  } catch (e) {
    // Fail open for general API (availability), but log
    console.warn('[rate-limit] store error', e);
    next();
  }
}

/** Stricter limiter for /auth/* — fails closed on store errors */
export async function authRateLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const key = `auth:${clientKey(req)}`;
    const result = await hit(key, AUTH_MAX());
    res.setHeader('X-RateLimit-Limit', String(AUTH_MAX()));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    if (result.count > AUTH_MAX()) {
      return res.status(429).json({ error: 'rate_limited', message: 'Too many auth attempts' });
    }
    next();
  } catch {
    return res.status(503).json({ error: 'unavailable', message: 'Auth temporarily unavailable' });
  }
}

export async function assertNotLockedOut(email: string, ip: string): Promise<void> {
  const key = `lock:${email.toLowerCase()}:${ip}`;
  if (redis) {
    const n = Number(await redis.get(`uzima:rl:${key}`) || 0);
    if (n >= LOCKOUT_THRESHOLD()) {
      throw new AppError(429, 'account_locked', 'Too many failed login attempts. Try again later.');
    }
    return;
  }
  const b = memory.get(key);
  if (b && b.resetAt > Date.now() && b.count >= LOCKOUT_THRESHOLD()) {
    throw new AppError(429, 'account_locked', 'Too many failed login attempts. Try again later.');
  }
}

export async function recordFailedLogin(email: string, ip: string): Promise<void> {
  const key = `lock:${email.toLowerCase()}:${ip}`;
  await hit(key, LOCKOUT_THRESHOLD(), LOCKOUT_MS());
}

export async function clearFailedLogin(email: string, ip: string): Promise<void> {
  const key = `lock:${email.toLowerCase()}:${ip}`;
  if (redis) {
    await redis.del(`uzima:rl:${key}`);
    return;
  }
  memory.delete(key);
}
