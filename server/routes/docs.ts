import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import * as s from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { assertStrongPassword, getJwtSecret, demoOtpAllowed, generateTempPassword } from '../lib/security.js';
import { sendEmail, templates, emailSubjects } from '../services/email.js';
import { docsChapter, docsIndex } from '../content/docsCatalog.js';
import type { Request, Response, NextFunction } from 'express';

export const docsRouter = Router();

interface DocsAuth {
  userId: string;
  email: string;
  role: 'docs_admin' | 'docs_reader';
  fullName: string;
  aud: 'docs';
}

function signDocsToken(user: { id: string; email: string; role: string; fullName: string }) {
  const payload: DocsAuth = {
    userId: user.id,
    email: user.email,
    role: user.role === 'docs_admin' ? 'docs_admin' : 'docs_reader',
    fullName: user.fullName,
    aud: 'docs',
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '12h', algorithm: 'HS256' });
}

async function authenticateDocs(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'unauthorized', 'Sign in to read the docs'));
  }
  try {
    const payload = jwt.verify(header.slice(7), getJwtSecret(), { algorithms: ['HS256'] }) as DocsAuth;
    if (payload.aud !== 'docs') throw new Error('wrong audience');
    const [user] = await db.select().from(s.docsUsers).where(eq(s.docsUsers.id, payload.userId)).limit(1);
    if (!user || user.status !== 'active') {
      return next(new AppError(401, 'revoked', 'This docs account is not active'));
    }
    (req as Request & { docsUser?: typeof user }).docsUser = user;
    next();
  } catch {
    next(new AppError(401, 'unauthorized', 'Invalid or expired docs session'));
  }
}

function requireDocsAdmin(req: Request, _res: Response, next: NextFunction) {
  const user = (req as Request & { docsUser?: { role: string } }).docsUser;
  if (!user) return next(new AppError(401, 'unauthorized', 'Sign in required'));
  if (user.role !== 'docs_admin') return next(new AppError(403, 'forbidden', 'Docs admin only'));
  next();
}

async function issueDocsOtp(userId: string, email: string) {
  await db.update(s.docsOtpCodes).set({ consumedAt: new Date() }).where(and(
    eq(s.docsOtpCodes.userId, userId),
    eq(s.docsOtpCodes.purpose, 'password_reset'),
    isNull(s.docsOtpCodes.consumedAt),
  ));
  const code = demoOtpAllowed()
    ? (process.env.DEMO_OTP || '123456')
    : String(crypto.randomInt(100000, 1000000));
  await db.insert(s.docsOtpCodes).values({
    userId,
    purpose: 'password_reset',
    codeHash: await bcrypt.hash(code, 12),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  const sent = await sendEmail({
    to: email,
    subject: emailSubjects.passwordReset(),
    html: templates.passwordReset(code),
    text: `Your IOU Exchange docs reset code is ${code}. It expires in 10 minutes.`,
    template: 'docs_password_reset',
  });
  if (demoOtpAllowed() || !sent?.ok || sent.mode === 'stub') return { demoHint: code };
  return {};
}

docsRouter.post('/login', validate(z.object({
  email: z.string().email(),
  password: z.string().min(1),
})), async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase();
    const [user] = await db.select().from(s.docsUsers).where(eq(s.docsUsers.email, email)).limit(1);
    if (!user || user.status !== 'active' || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      throw new AppError(401, 'invalid_credentials', 'Invalid email or password');
    }
    await db.update(s.docsUsers).set({ lastLoginAt: new Date() }).where(eq(s.docsUsers.id, user.id));
    res.json({
      accessToken: signDocsToken(user),
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        role: user.role,
        mustChangePassword: !!user.mustChangePassword,
      },
    });
  } catch (e) { next(e); }
});

docsRouter.post('/forgot-password', validate(z.object({
  email: z.string().email(),
})), async (req, res, next) => {
  try {
    const [user] = await db.select().from(s.docsUsers).where(eq(s.docsUsers.email, req.body.email.toLowerCase())).limit(1);
    if (user && user.status === 'active') {
      const hint = await issueDocsOtp(user.id, user.email);
      return res.json({ ok: true, message: 'If the account exists, a reset code was sent', ...hint });
    }
    res.json({ ok: true, message: 'If the account exists, a reset code was sent' });
  } catch (e) { next(e); }
});

docsRouter.post('/reset-password', validate(z.object({
  email: z.string().email(),
  otp: z.string().min(4),
  newPassword: z.string().min(12),
})), async (req, res, next) => {
  try {
    assertStrongPassword(req.body.newPassword);
    const [user] = await db.select().from(s.docsUsers).where(eq(s.docsUsers.email, req.body.email.toLowerCase())).limit(1);
    if (!user || user.status !== 'active') throw new AppError(400, 'invalid_reset', 'Invalid reset request');
    const rows = await db.select().from(s.docsOtpCodes).where(and(
      eq(s.docsOtpCodes.userId, user.id),
      eq(s.docsOtpCodes.purpose, 'password_reset'),
      isNull(s.docsOtpCodes.consumedAt),
      gt(s.docsOtpCodes.expiresAt, new Date()),
    )).orderBy(desc(s.docsOtpCodes.createdAt)).limit(1);
    const row = rows[0];
    if (!row || !(await bcrypt.compare(req.body.otp, row.codeHash))) {
      throw new AppError(400, 'invalid_otp', 'Invalid or expired code');
    }
    await db.update(s.docsOtpCodes).set({ consumedAt: new Date() }).where(eq(s.docsOtpCodes.id, row.id));
    await db.update(s.docsUsers).set({
      passwordHash: await bcrypt.hash(req.body.newPassword, 12),
      mustChangePassword: false,
      updatedAt: new Date(),
    }).where(eq(s.docsUsers.id, user.id));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

docsRouter.post('/change-password', authenticateDocs, validate(z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
})), async (req, res, next) => {
  try {
    assertStrongPassword(req.body.newPassword);
    const user = (req as Request & { docsUser: typeof s.docsUsers.$inferSelect }).docsUser;
    if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) {
      throw new AppError(401, 'invalid_credentials', 'Current password is wrong');
    }
    await db.update(s.docsUsers).set({
      passwordHash: await bcrypt.hash(req.body.newPassword, 12),
      mustChangePassword: false,
      updatedAt: new Date(),
    }).where(eq(s.docsUsers.id, user.id));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

docsRouter.get('/me', authenticateDocs, async (req, res) => {
  const user = (req as Request & { docsUser: typeof s.docsUsers.$inferSelect }).docsUser;
  res.json({
    id: user.id,
    email: user.email,
    name: user.fullName,
    role: user.role,
    mustChangePassword: !!user.mustChangePassword,
  });
});

docsRouter.get('/chapters', authenticateDocs, (_req, res) => {
  res.json({ data: docsIndex() });
});

docsRouter.get('/chapters/:id', authenticateDocs, (req, res, next) => {
  const chapter = docsChapter(req.params.id);
  if (!chapter) return next(new AppError(404, 'not_found', 'Chapter not found'));
  res.json(chapter);
});

docsRouter.get('/users', authenticateDocs, requireDocsAdmin, async (_req, res, next) => {
  try {
    const rows = await db.select({
      id: s.docsUsers.id,
      email: s.docsUsers.email,
      name: s.docsUsers.fullName,
      role: s.docsUsers.role,
      status: s.docsUsers.status,
      lastLoginAt: s.docsUsers.lastLoginAt,
      createdAt: s.docsUsers.createdAt,
    }).from(s.docsUsers).orderBy(desc(s.docsUsers.createdAt));
    res.json({ data: rows });
  } catch (e) { next(e); }
});

docsRouter.post('/users', authenticateDocs, requireDocsAdmin, validate(z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['docs_admin', 'docs_reader']).default('docs_reader'),
  password: z.string().min(12).optional(),
})), async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase();
    const [existing] = await db.select().from(s.docsUsers).where(eq(s.docsUsers.email, email)).limit(1);
    if (existing) throw new AppError(409, 'email_taken', 'That email already has docs access');
    const password = req.body.password || generateTempPassword();
    assertStrongPassword(password);
    const [row] = await db.insert(s.docsUsers).values({
      email,
      fullName: req.body.name,
      role: req.body.role,
      passwordHash: await bcrypt.hash(password, 12),
      status: 'active',
      mustChangePassword: !req.body.password,
    }).returning();
    await sendEmail({
      to: email,
      subject: 'Your IOU Exchange documentation access',
      template: 'docs_invite',
      html: `<p>Hello ${req.body.name},</p><p>You can sign in at <a href="https://docs.ioux.africa">docs.ioux.africa</a>.</p><p>Email: ${email}<br/>Temporary password: ${password}</p><p>Use Forgot password after you sign in if you want to choose your own.</p>`,
      text: `Sign in at https://docs.ioux.africa\nEmail: ${email}\nTemporary password: ${password}`,
    });
    res.status(201).json({
      id: row.id,
      email: row.email,
      name: row.fullName,
      role: row.role,
      status: row.status,
      temporaryPassword: req.body.password ? undefined : password,
    });
  } catch (e) { next(e); }
});

docsRouter.patch('/users/:id', authenticateDocs, requireDocsAdmin, validate(z.object({
  status: z.enum(['active', 'revoked']).optional(),
  role: z.enum(['docs_admin', 'docs_reader']).optional(),
})), async (req, res, next) => {
  try {
    const actor = (req as Request & { docsUser: { id: string } }).docsUser;
    if (req.params.id === actor.id && req.body.status === 'revoked') {
      throw new AppError(400, 'invalid_state', 'You cannot revoke your own docs access');
    }
    const patch: Partial<typeof s.docsUsers.$inferInsert> = { updatedAt: new Date() };
    if (req.body.status) patch.status = req.body.status;
    if (req.body.role) patch.role = req.body.role;
    const [row] = await db.update(s.docsUsers).set(patch).where(eq(s.docsUsers.id, req.params.id)).returning();
    if (!row) throw new AppError(404, 'not_found', 'Docs user not found');
    res.json({ id: row.id, email: row.email, status: row.status, role: row.role });
  } catch (e) { next(e); }
});
