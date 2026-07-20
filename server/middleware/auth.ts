import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { apiKeys, users } from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { getJwtRefreshSecret, getJwtSecret } from '../lib/security.js';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  orgId: string | null;
  fullName: string;
}

export interface ApiClient {
  orgId: string;
  orgType?: string;
  scopes: string[];
  keyId: string;
  label?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      apiClient?: ApiClient;
    }
  }
}

const JWT_OPTS = { algorithms: ['HS256'] as jwt.Algorithm[] };

export function signAccessToken(payload: AuthUser): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '15m', algorithm: 'HS256' });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId, jti: crypto.randomBytes(16).toString('hex') }, getJwtRefreshSecret(), {
    expiresIn: '7d',
    algorithm: 'HS256',
  });
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, getJwtRefreshSecret(), JWT_OPTS) as { userId: string };
}

function toAuthUser(u: typeof users.$inferSelect): AuthUser {
  return {
    userId: u.id,
    email: u.email,
    role: u.role,
    orgId: u.orgId,
    fullName: u.fullName,
  };
}

/** Verify JWT then reload active user from DB (fresh role/org/status). */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'unauthorized', 'Missing Bearer token'));
  }
  try {
    const payload = jwt.verify(header.slice(7), getJwtSecret(), JWT_OPTS) as AuthUser;
    const user = await loadUser(payload.userId);
    if (!user) {
      return next(new AppError(401, 'unauthorized', 'Invalid or inactive session'));
    }
    req.user = toAuthUser(user);
    next();
  } catch {
    next(new AppError(401, 'unauthorized', 'Invalid or expired token'));
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'unauthorized', 'Not authenticated'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'forbidden', 'Insufficient role'));
    }
    next();
  };
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), getJwtSecret(), JWT_OPTS) as AuthUser;
      const user = await loadUser(payload.userId);
      if (user) req.user = toAuthUser(user);
    } catch { /* ignore */ }
  }
  next();
}

export async function apiKeyAuth(req: Request, _res: Response, next: NextFunction) {
  const key = (req.headers['x-api-key'] as string) || null;

  if (!key) {
    return next(new AppError(401, 'unauthorized', 'Missing API key'));
  }

  const prefix = key.slice(0, 12);
  let candidates = await db.select().from(apiKeys).where(and(
    eq(apiKeys.isActive, true),
    eq(apiKeys.keyPrefix, prefix),
  ));

  if (candidates.length === 0) {
    candidates = await db.select().from(apiKeys).where(eq(apiKeys.isActive, true));
  }

  let matched: typeof candidates[0] | undefined;
  for (const row of candidates) {
    if (await bcrypt.compare(key, row.keyHash)) {
      matched = row;
      break;
    }
  }
  if (!matched) {
    return next(new AppError(401, 'unauthorized', 'Invalid API key'));
  }

  await db.update(apiKeys).set({ lastUsed: new Date() }).where(eq(apiKeys.id, matched.id));

  req.apiClient = {
    orgId: matched.orgId,
    scopes: matched.scopes || [],
    keyId: matched.id,
    label: matched.label,
  };
  next();
}

export function requireScope(...scopes: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.apiClient) return next(new AppError(401, 'unauthorized', 'API key required'));
    const ok = scopes.every((sc) => req.apiClient!.scopes.includes(sc) || req.apiClient!.scopes.includes('*'));
    if (!ok) return next(new AppError(403, 'forbidden', `Missing scopes: ${scopes.join(', ')}`));
    next();
  };
}

/** Prefer X-API-Key for machine auth; Bearer JWT for users. */
export async function authenticateAny(req: Request, res: Response, next: NextFunction) {
  if (req.headers['x-api-key']) {
    return apiKeyAuth(req, res, next);
  }
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }
  next(new AppError(401, 'unauthorized', 'Authentication required'));
}

export async function loadUser(userId: string) {
  const [u] = await db.select().from(users).where(and(eq(users.id, userId), eq(users.status, 'active'))).limit(1);
  return u;
}
