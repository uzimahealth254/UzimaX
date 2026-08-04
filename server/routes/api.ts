import {
  authenticate, authorize, apiKeyAuth, requireScope, authenticateAny,
  signAccessToken, signRefreshToken, verifyRefreshToken, loadUser,
} from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../lib/errors.js';
import { generateUzimaPartyId } from '../lib/iouId.js';
import {
  createBuyerOriginatedInvoice,
  createSupplierOriginatedInvoice,
  respondToOptIn,
  respondToBuyerVerification,
  listInvoicesForOrg,
  releaseEscrowLeg,
  collectEscrowLeg,
  applyPaymentUpdate,
  getOrCreateWallet,
  createAssignment,
  recordSettlement,
} from '../services/core.js';
import { computeTenorDays, priceReceivable } from '../lib/pricing.js';
import { packageTotals, weightedAvgDiscountBps, weightedAvgTenorDays } from '../lib/packageMetrics.js';
import { writeAudit } from '../middleware/audit.js';
import { storeFile, readStoredFile, orgIdFromStorageKey } from '../services/storage.js';
import { issueOtp, verifyOtp } from '../services/otp.js';
import { generateAssignmentLetter, generatePackageSummary } from '../services/pdf.js';
import { templates, emailSubjects, sendEmail } from '../services/email.js';
import { notifyOrgUsers, notifyUser } from '../services/notificationService.js';
import { getAdminAnalytics, getProgrammeUtilisation, getBuyerCreditRisk } from '../services/analytics.js';
import {
  assertInvoiceAccess, assertOrgMatch, assertBuyerOrg, assertSupplierOrg,
} from '../middleware/access.js';
import {
  assertStrongPassword, bodyRefreshAllowed, generateTempPassword, generateApiKey,
  REFRESH_COOKIE, refreshCookieOptions, simulatedWalletAllowed,
  verifyWebhookSignature,
} from '../lib/security.js';
import { assertNotLockedOut, recordFailedLogin, clearFailedLogin } from '../middleware/rateLimit.js';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import multer from 'multer';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import * as s from '../db/schema.js';
export const authRouter = Router();
export const apiRouter = Router();

async function persistRefreshToken(userId: string, refreshToken: string) {
  const refreshHash = await bcrypt.hash(refreshToken, 12);
  await db.insert(s.refreshTokens).values({
    userId,
    tokenHash: refreshHash,
    expiresAt: new Date(Date.now() + 7 * 86400000),
  });
}

async function consumeRefreshToken(refreshToken: string): Promise<string> {
  let payload: { userId: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, 'unauthorized', 'Invalid refresh token');
  }
  const tokens = await db.select().from(s.refreshTokens).where(eq(s.refreshTokens.userId, payload.userId));
  let matchedId: string | null = null;
  for (const t of tokens) {
    if (t.expiresAt > new Date() && await bcrypt.compare(refreshToken, t.tokenHash)) {
      matchedId = t.id;
      break;
    }
  }
  if (!matchedId) throw new AppError(401, 'unauthorized', 'Invalid refresh token');
  // Rotation: delete used token
  await db.delete(s.refreshTokens).where(eq(s.refreshTokens.id, matchedId));
  return payload.userId;
}

authRouter.post('/login', validate(z.object({
  email: z.string().email(),
  password: z.string().min(1),
})), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || 'unknown';
    await assertNotLockedOut(email, ip);

    const [user] = await db.select().from(s.users).where(eq(s.users.email, email.toLowerCase())).limit(1);
    if (!user || user.status !== 'active' || !(await bcrypt.compare(password, user.passwordHash))) {
      await recordFailedLogin(email, ip);
      throw new AppError(401, 'invalid_credentials', 'Invalid email or password');
    }
    await clearFailedLogin(email, ip);

    const authUser = {
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      fullName: user.fullName,
    };
    const accessToken = signAccessToken(authUser);
    const refreshToken = signRefreshToken(user.id);
    await persistRefreshToken(user.id, refreshToken);
    await db.update(s.users).set({ lastLoginAt: new Date() }).where(eq(s.users.id, user.id));

    let org = null;
    if (user.orgId) {
      const [o] = await db.select().from(s.organisations).where(eq(s.organisations.id, user.orgId)).limit(1);
      org = o || null;
    }

    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
    const body: Record<string, unknown> = {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        role: user.role,
        organisationId: user.orgId,
        organisationName: org?.name || null,
        uzimaPartyId: org?.uzimaPartyId || null,
        mustChangePassword: !!user.mustChangePassword,
      },
    };
    if (bodyRefreshAllowed()) body.refreshToken = refreshToken;
    res.json(body);
  } catch (e) { next(e); }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const fromCookie = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const fromBody = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined;
    const refreshToken = fromCookie || (bodyRefreshAllowed() ? fromBody : undefined);
    if (!refreshToken) throw new AppError(401, 'unauthorized', 'Missing refresh token');

    const userId = await consumeRefreshToken(refreshToken);
    const user = await loadUser(userId);
    if (!user) throw new AppError(401, 'unauthorized', 'User not found');

    const accessToken = signAccessToken({
      userId: user.id, email: user.email, role: user.role, orgId: user.orgId, fullName: user.fullName,
    });
    const newRefresh = signRefreshToken(user.id);
    await persistRefreshToken(user.id, newRefresh);
    res.cookie(REFRESH_COOKIE, newRefresh, refreshCookieOptions());
    const body: Record<string, unknown> = { accessToken };
    if (bodyRefreshAllowed()) body.refreshToken = newRefresh;
    res.json(body);
  } catch (e) { next(e); }
});

authRouter.post('/logout', authenticate, async (req, res, next) => {
  try {
    await db.delete(s.refreshTokens).where(eq(s.refreshTokens.userId, req.user!.userId));
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await loadUser(req.user!.userId);
    if (!user) throw new AppError(401, 'unauthorized', 'User not found');
    let org = null;
    if (user.orgId) {
      const [o] = await db.select().from(s.organisations).where(eq(s.organisations.id, user.orgId)).limit(1);
      org = o;
    }
    res.json({
      id: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
      organisationId: user.orgId,
      organisationName: org?.name || null,
      uzimaPartyId: org?.uzimaPartyId || null,
      mustChangePassword: !!user.mustChangePassword,
    });
  } catch (e) { next(e); }
});

authRouter.post('/change-password', authenticate, validate(z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
})), async (req, res, next) => {
  try {
    assertStrongPassword(req.body.newPassword);
    const user = await loadUser(req.user!.userId);
    if (!user) throw new AppError(401, 'unauthorized', 'User not found');
    if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) {
      throw new AppError(400, 'invalid_password', 'Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    await db.update(s.users).set({
      passwordHash,
      mustChangePassword: false,
      updatedAt: new Date(),
    }).where(eq(s.users.id, user.id));
    await db.delete(s.refreshTokens).where(eq(s.refreshTokens.userId, user.id));
    await notifyUser(user.id, {
      type: 'password_changed',
      title: 'Password updated',
      body: 'Your IOU Exchange password was changed successfully',
      emailHtml: templates.passwordChanged(user.fullName || undefined),
      emailSubject: emailSubjects.passwordChanged(),
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

authRouter.patch('/me', authenticate, validate(z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
})), async (req, res, next) => {
  try {
    const patch: Record<string, unknown> = {};
    if (req.body.name) patch.fullName = req.body.name;
    if (req.body.email) {
      const email = req.body.email.toLowerCase();
      const [existing] = await db.select().from(s.users).where(eq(s.users.email, email)).limit(1);
      if (existing && existing.id !== req.user!.userId) {
        throw new AppError(409, 'email_taken', 'Email already in use');
      }
      patch.email = email;
    }
    const [user] = await db.update(s.users).set(patch).where(eq(s.users.id, req.user!.userId)).returning();
    let org = null;
    if (user.orgId) {
      const [o] = await db.select().from(s.organisations).where(eq(s.organisations.id, user.orgId)).limit(1);
      org = o;
    }
    res.json({
      id: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
      organisationId: user.orgId,
      organisationName: org?.name || null,
      uzimaPartyId: org?.uzimaPartyId || null,
    });
  } catch (e) { next(e); }
});

authRouter.post('/forgot-password', validate(z.object({ email: z.string().email() })), async (req, res, next) => {
  try {
    const [user] = await db.select().from(s.users).where(eq(s.users.email, req.body.email.toLowerCase())).limit(1);
    // Always return ok to avoid email enumeration
    if (user) {
      const hint = await issueOtp({
        userId: user.id,
        purpose: 'password_reset',
        email: user.email,
      });
      return res.json({ ok: true, message: 'If the account exists, a reset code was sent', ...hint });
    }
    res.json({ ok: true, message: 'If the account exists, a reset code was sent' });
  } catch (e) { next(e); }
});

authRouter.post('/reset-password', validate(z.object({
  email: z.string().email(),
  otp: z.string().min(4),
  newPassword: z.string().min(12),
})), async (req, res, next) => {
  try {
    assertStrongPassword(req.body.newPassword);
    const [user] = await db.select().from(s.users).where(eq(s.users.email, req.body.email.toLowerCase())).limit(1);
    if (!user) throw new AppError(400, 'invalid_reset', 'Invalid reset request');
    await verifyOtp(user.id, 'password_reset', req.body.otp);
    const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    await db.update(s.users).set({ passwordHash, mustChangePassword: false }).where(eq(s.users.id, user.id));
    await db.delete(s.refreshTokens).where(eq(s.refreshTokens.userId, user.id));
    await notifyUser(user.id, {
      type: 'password_changed',
      title: 'Password updated',
      body: 'Your IOU Exchange password was changed successfully',
      emailHtml: templates.passwordChanged(user.fullName || undefined),
      emailSubject: emailSubjects.passwordChanged(),
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ——— Parties (AfyaX) ———
apiRouter.post('/parties', apiKeyAuth, requireScope('parties:write'), validate(z.object({
  name: z.string().min(1),
  registrationNo: z.string().optional(),
  orgType: z.enum(['buyer', 'supplier']),
  afyaxId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})), async (req, res, next) => {
  try {
    const body = req.body;
    if (body.afyaxId) {
      const [existing] = await db.select().from(s.organisations).where(eq(s.organisations.afyaxId, body.afyaxId)).limit(1);
      if (existing) {
        return res.json({ uzimaPartyId: existing.uzimaPartyId, id: existing.id, existing: true });
      }
    }
    const uzimaPartyId = generateUzimaPartyId(body.orgType);
    const [org] = await db.insert(s.organisations).values({
      name: body.name,
      registrationNo: body.registrationNo,
      orgType: body.orgType,
      afyaxId: body.afyaxId,
      uzimaPartyId,
      metadata: body.metadata || {},
    }).returning();
    await getOrCreateWallet(org.id);
    await writeAudit({ action: 'party.created', resourceType: 'organisation', resourceId: org.id, actorEmail: req.apiClient?.label });
    res.status(201).json({ uzimaPartyId: org.uzimaPartyId, id: org.id, existing: false });
  } catch (e) { next(e); }
});

apiRouter.get('/parties/:uzimaPartyId', apiKeyAuth, requireScope('parties:read'), async (req, res, next) => {
  try {
    const [org] = await db.select().from(s.organisations).where(eq(s.organisations.uzimaPartyId, req.params.uzimaPartyId)).limit(1);
    if (!org) throw new AppError(404, 'not_found', 'Party not found');
    res.json(org);
  } catch (e) { next(e); }
});

// ——— Invoices ———
const invoiceCreateSchema = z.object({
  buyerOrgId: z.string().uuid().optional(),
  supplierOrgId: z.string().uuid().optional(),
  buyerPartyId: z.string().optional(),
  supplierPartyId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  poReference: z.string().optional(),
  faceValue: z.number().positive(),
  amount: z.number().positive().optional(), // alias
  currency: z.string().default('KES'),
  issueDate: z.string(),
  dueDate: z.string(),
  description: z.string().optional(),
  origin: z.enum(['buyer_posted', 'supplier_listed', 'api_upload']).optional(),
  interestRate: z.number().optional(),
  installmentSchedule: z.array(z.object({
    installmentNo: z.number(),
    dueDate: z.string(),
    amount: z.number(),
  })).optional(),
  supportingDocs: z.array(z.object({
    id: z.string().uuid().optional(),
    name: z.string(),
    url: z.string().optional(),
    fileUrl: z.string().optional(),
    docType: z.string().optional(),
  }).passthrough()).optional(),
  listedAmount: z.number().positive().optional(),
  commitmentToPay: z.boolean().optional(),
  bankStandingOrderRef: z.string().max(128).optional(),
  standingOrderBank: z.string().max(128).optional(),
  sourcePlatformOrgId: z.string().uuid().optional(),
});

apiRouter.post('/invoices', authenticateAny, validate(invoiceCreateSchema), async (req, res, next) => {
  try {
    if (req.apiClient) {
      if (!(req.apiClient.scopes.includes('invoices:write') || req.apiClient.scopes.includes('*'))) {
        throw new AppError(403, 'forbidden', 'Missing scopes: invoices:write');
      }
      const body = req.body;
      const client = req.apiClient;
      let buyerOrgId = body.buyerOrgId as string | undefined;
      let supplierOrgId = body.supplierOrgId as string | undefined;
      if (body.buyerPartyId) {
        const [b] = await db.select().from(s.organisations).where(eq(s.organisations.uzimaPartyId, body.buyerPartyId)).limit(1);
        if (!b) throw new AppError(400, 'buyer_not_found', 'buyerPartyId not found');
        buyerOrgId = b.id;
      }
      if (body.supplierPartyId) {
        const [sp] = await db.select().from(s.organisations).where(eq(s.organisations.uzimaPartyId, body.supplierPartyId)).limit(1);
        if (!sp) throw new AppError(400, 'supplier_not_found', 'supplierPartyId not found');
        supplierOrgId = sp.id;
      }
      const [keyOrg] = await db.select().from(s.organisations).where(eq(s.organisations.id, client.orgId)).limit(1);
      const isPlatform = keyOrg?.orgType === 'platform' || client.scopes.includes('*');
      if (!isPlatform) buyerOrgId = client.orgId;
      if (!buyerOrgId || !supplierOrgId) throw new AppError(400, 'validation_error', 'buyer and supplier required');
      const result = await createBuyerOriginatedInvoice({
        buyerOrgId, supplierOrgId,
        invoiceNumber: body.invoiceNumber, poReference: body.poReference,
        faceValue: body.faceValue || body.amount,
        currency: body.currency, issueDate: body.issueDate, dueDate: body.dueDate,
        description: body.description, interestRate: body.interestRate,
        installmentSchedule: body.installmentSchedule, origin: 'api_upload',
        supportingDocs: body.supportingDocs,
        commitmentToPay: body.commitmentToPay,
        bankStandingOrderRef: body.bankStandingOrderRef,
        standingOrderBank: body.standingOrderBank,
      });
      return res.status(201).json({
        invoiceId: result.invoice.id,
        id: result.invoice.id,
        iouRegistryId: result.invoice.iouRegistryId,
        status: result.invoice.status,
      });
    }

    const user = req.user!;
    const body = req.body;
    const face = body.faceValue || body.amount;
    let buyerOrgId = body.buyerOrgId;
    let supplierOrgId = body.supplierOrgId;

    if (body.buyerPartyId) {
      const [b] = await db.select().from(s.organisations).where(eq(s.organisations.uzimaPartyId, body.buyerPartyId)).limit(1);
      if (!b) throw new AppError(400, 'buyer_not_found', 'buyerPartyId not found');
      buyerOrgId = b.id;
    }
    if (body.supplierPartyId) {
      const [sp] = await db.select().from(s.organisations).where(eq(s.organisations.uzimaPartyId, body.supplierPartyId)).limit(1);
      if (!sp) throw new AppError(400, 'supplier_not_found', 'supplierPartyId not found');
      supplierOrgId = sp.id;
    }

    if (user.role === 'buyer') {
      buyerOrgId = user.orgId!;
      if (!supplierOrgId) throw new AppError(400, 'validation_error', 'supplierOrgId required');
      const result = await createBuyerOriginatedInvoice({
        buyerOrgId, supplierOrgId, invoiceNumber: body.invoiceNumber, poReference: body.poReference,
        faceValue: face, currency: body.currency, issueDate: body.issueDate, dueDate: body.dueDate,
        description: body.description, interestRate: body.interestRate, installmentSchedule: body.installmentSchedule,
        supportingDocs: body.supportingDocs,
        commitmentToPay: body.commitmentToPay ?? true,
        bankStandingOrderRef: body.bankStandingOrderRef,
        standingOrderBank: body.standingOrderBank,
      }, user.userId);
      return res.status(201).json(result.invoice);
    }

    if (user.role === 'supplier') {
      supplierOrgId = user.orgId!;
      if (!buyerOrgId) throw new AppError(400, 'validation_error', 'buyerOrgId required');
      const docs = body.supportingDocs || [];
      if (!Array.isArray(docs) || docs.length < 1) {
        throw new AppError(400, 'docs_required', 'Attach at least one invoice, proposal, or work-evidence document');
      }
      const listed = body.listedAmount != null ? Number(body.listedAmount) : face;
      if (!(listed > 0) || listed > face) {
        throw new AppError(400, 'invalid_listed_amount', 'listedAmount must be > 0 and ≤ face value');
      }
      const result = await createSupplierOriginatedInvoice({
        buyerOrgId, supplierOrgId, invoiceNumber: body.invoiceNumber,
        faceValue: face, listedAmount: listed, currency: body.currency, issueDate: body.issueDate, dueDate: body.dueDate,
        description: body.description, supportingDocs: docs,
        commitmentToPay: body.commitmentToPay,
        bankStandingOrderRef: body.bankStandingOrderRef,
      }, user.userId);
      return res.status(201).json(result.invoice);
    }

    throw new AppError(403, 'forbidden', 'Only buyer or supplier can create invoices via portal');
  } catch (e) { next(e); }
});

// AfyaX / API key invoice create
apiRouter.post('/external/invoices', apiKeyAuth, requireScope('invoices:write'), validate(invoiceCreateSchema), async (req, res, next) => {
  try {
    const body = req.body;
    const client = req.apiClient!;
    let buyerOrgId = body.buyerOrgId;
    let supplierOrgId = body.supplierOrgId;
    if (body.buyerPartyId) {
      const [b] = await db.select().from(s.organisations).where(eq(s.organisations.uzimaPartyId, body.buyerPartyId)).limit(1);
      if (!b) throw new AppError(400, 'buyer_not_found', 'buyerPartyId not found');
      buyerOrgId = b.id;
    }
    if (body.supplierPartyId) {
      const [sp] = await db.select().from(s.organisations).where(eq(s.organisations.uzimaPartyId, body.supplierPartyId)).limit(1);
      if (!sp) throw new AppError(400, 'supplier_not_found', 'supplierPartyId not found');
      supplierOrgId = sp.id;
    }
    // Bind to API key org unless platform AfyaX key (label afyax / org type platform)
    const [keyOrg] = await db.select().from(s.organisations).where(eq(s.organisations.id, client.orgId)).limit(1);
    const isPlatform = keyOrg?.orgType === 'platform' || client.scopes.includes('*');
    if (!isPlatform) {
      buyerOrgId = client.orgId;
    }
    if (!buyerOrgId || !supplierOrgId) throw new AppError(400, 'validation_error', 'buyer and supplier required');
    if (!isPlatform && buyerOrgId !== client.orgId) {
      throw new AppError(403, 'forbidden', 'API key cannot create invoices for other buyers');
    }
    const sourcePlatformOrgId = isPlatform
      ? (body.sourcePlatformOrgId || client.orgId)
      : (body.sourcePlatformOrgId || null);
    const result = await createBuyerOriginatedInvoice({
      buyerOrgId, supplierOrgId,
      invoiceNumber: body.invoiceNumber, poReference: body.poReference,
      faceValue: body.faceValue || body.amount,
      currency: body.currency, issueDate: body.issueDate, dueDate: body.dueDate,
      description: body.description, interestRate: body.interestRate,
      installmentSchedule: body.installmentSchedule, origin: 'api_upload',
      commitmentToPay: body.commitmentToPay,
      bankStandingOrderRef: body.bankStandingOrderRef,
      sourcePlatformOrgId,
    });
    res.status(201).json({
      invoiceId: result.invoice.id,
      id: result.invoice.id,
      iouRegistryId: result.invoice.iouRegistryId,
      status: result.invoice.status,
      sourcePlatformOrgId: result.invoice.sourcePlatformOrgId,
    });
  } catch (e) { next(e); }
});

apiRouter.get('/invoices', authenticate, async (req, res, next) => {
  try {
    const list = await listInvoicesForOrg(req.user!.orgId || '', req.user!.role);
    res.json({ data: list, count: list.length });
  } catch (e) { next(e); }
});

apiRouter.get('/invoices/:id', authenticate, async (req, res, next) => {
  try {
    const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, req.params.id)).limit(1);
    assertInvoiceAccess(req.user!, inv);
    const history = await db.select().from(s.invoiceStatusHistory).where(eq(s.invoiceStatusHistory.invoiceId, inv.id));
    res.json({ ...inv, statusHistory: history });
  } catch (e) { next(e); }
});

apiRouter.get('/invoices/:id/status', authenticateAny, async (req, res, next) => {
  try {
    if (req.apiClient) {
      if (!(req.apiClient.scopes.includes('invoices:read') || req.apiClient.scopes.includes('*') || req.apiClient.scopes.includes('invoices:write'))) {
        throw new AppError(403, 'forbidden', 'Missing scopes: invoices:read');
      }
    }
    const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, req.params.id)).limit(1);
    if (!inv) throw new AppError(404, 'not_found', 'Invoice not found');
    if (req.user) assertInvoiceAccess(req.user, inv);
    res.json({ id: inv.id, iouRegistryId: inv.iouRegistryId, status: inv.status, listingStatus: inv.listingStatus });
  } catch (e) { next(e); }
});

apiRouter.get('/ious/:iouRegistryId', authenticate, async (req, res, next) => {
  try {
    const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.iouRegistryId, req.params.iouRegistryId)).limit(1);
    assertInvoiceAccess(req.user!, inv);
    res.json(inv);
  } catch (e) { next(e); }
});

// Opt-ins
apiRouter.get('/opt-ins', authenticate, authorize('supplier', 'admin', 'spv'), async (req, res, next) => {
  try {
    const orgId = req.user!.orgId!;
    const rows = req.user!.role === 'admin' || req.user!.role === 'spv'
      ? await db.select().from(s.optIns)
      : await db.select().from(s.optIns).where(eq(s.optIns.supplierOrgId, orgId));
    res.json({ data: rows });
  } catch (e) { next(e); }
});

apiRouter.post('/opt-ins/:id/respond', authenticate, authorize('supplier', 'admin'), validate(z.object({
  accept: z.boolean(),
  declineReason: z.string().optional(),
  listedAmount: z.number().positive().optional(),
  otp: z.string().optional(),
})), async (req, res, next) => {
  try {
    const [opt] = await db.select().from(s.optIns).where(eq(s.optIns.id, req.params.id)).limit(1);
    if (!opt) throw new AppError(404, 'not_found', 'Opt-in not found');
    assertSupplierOrg(req.user!, opt.supplierOrgId);
    if (req.body.accept) {
      const { assertCheckerOtp } = await import('../lib/makerChecker.js');
      await assertCheckerOtp(req.user!, `opt_in:${req.params.id}`, req.body.otp);
    }
    const result = await respondToOptIn(
      req.params.id,
      req.body.accept,
      req.user!.userId,
      req.body.declineReason,
      req.body.listedAmount,
    );
    res.json(result);
  } catch (e) { next(e); }
});

apiRouter.post('/opt-ins/:id/request-otp', authenticate, authorize('supplier', 'admin'), async (req, res, next) => {
  try {
    const [opt] = await db.select().from(s.optIns).where(eq(s.optIns.id, req.params.id)).limit(1);
    if (!opt) throw new AppError(404, 'not_found', 'Opt-in not found');
    assertSupplierOrg(req.user!, opt.supplierOrgId);
    if (opt.status !== 'pending') throw new AppError(400, 'invalid_state', 'Already responded');
    const hint = await issueOtp({
      userId: req.user!.userId,
      purpose: `opt_in:${opt.id}`,
      email: req.user!.email,
    });
    res.json({ otpSent: true, ...hint });
  } catch (e) { next(e); }
});

// Buyer verifications
apiRouter.get('/buyer-verifications', authenticate, authorize('buyer', 'admin', 'spv'), async (req, res, next) => {
  try {
    const orgId = req.user!.orgId!;
    const rows = req.user!.role === 'admin' || req.user!.role === 'spv'
      ? await db.select().from(s.buyerVerifications)
      : await db.select().from(s.buyerVerifications).where(eq(s.buyerVerifications.buyerOrgId, orgId));
    res.json({ data: rows });
  } catch (e) { next(e); }
});

apiRouter.post('/buyer-verifications/:id/respond', authenticate, authorize('buyer', 'admin'), validate(z.object({
  accept: z.boolean(),
  rejectPreset: z.enum(['invalid_invoice', 'not_authentic', 'amount_mismatch', 'suspected_fraud', 'other']).optional(),
  rejectDetail: z.string().max(500).optional(),
  rejectReason: z.string().max(600).optional(),
  bankStandingOrderRef: z.string().max(128).optional(),
  standingOrderBank: z.string().max(128).optional(),
  otp: z.string().optional(),
}).superRefine((body, ctx) => {
  if (body.accept) return;
  if (body.rejectReason?.trim()) return;
  if (!body.rejectPreset) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'rejectPreset or rejectReason is required when declining', path: ['rejectPreset'] });
    return;
  }
  if (body.rejectPreset === 'other' && !(body.rejectDetail || '').trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Detail required when preset is other', path: ['rejectDetail'] });
  }
})), async (req, res, next) => {
  try {
    const [v] = await db.select().from(s.buyerVerifications).where(eq(s.buyerVerifications.id, req.params.id)).limit(1);
    if (!v) throw new AppError(404, 'not_found', 'Verification not found');
    assertBuyerOrg(req.user!, v.buyerOrgId);
    const { formatBuyerRejectReason } = await import('../lib/declineReasons.js');
    const reason = req.body.accept
      ? undefined
      : (req.body.rejectReason?.trim()
        || formatBuyerRejectReason(req.body.rejectPreset || 'other', req.body.rejectDetail));
    if (req.body.accept) {
      const { assertCheckerOtp } = await import('../lib/makerChecker.js');
      await assertCheckerOtp(req.user!, `buyer_verify:${req.params.id}`, req.body.otp);
    }
    const result = await respondToBuyerVerification(
      req.params.id,
      req.body.accept,
      req.user!.userId,
      reason,
      {
        bankStandingOrderRef: req.body.bankStandingOrderRef,
        standingOrderBank: req.body.standingOrderBank,
      },
    );
    res.json(result);
  } catch (e) { next(e); }
});

apiRouter.post('/buyer-verifications/:id/request-otp', authenticate, authorize('buyer', 'admin'), async (req, res, next) => {
  try {
    const [v] = await db.select().from(s.buyerVerifications).where(eq(s.buyerVerifications.id, req.params.id)).limit(1);
    if (!v) throw new AppError(404, 'not_found', 'Verification not found');
    assertBuyerOrg(req.user!, v.buyerOrgId);
    if (v.status !== 'pending') throw new AppError(400, 'invalid_state', 'Already responded');
    const hint = await issueOtp({
      userId: req.user!.userId,
      purpose: `buyer_verify:${v.id}`,
      email: req.user!.email,
    });
    res.json({ otpSent: true, ...hint });
  } catch (e) { next(e); }
});

// Assignments
apiRouter.get('/assignments', authenticate, authorize('buyer', 'supplier', 'spv', 'admin'), async (req, res, next) => {
  try {
    const role = req.user!.role;
    if (role === 'admin' || role === 'spv') {
      return res.json({ data: await db.select().from(s.assignments) });
    }
    const orgId = req.user!.orgId!;
    const invs = await db.select().from(s.invoices).where(
      role === 'buyer' ? eq(s.invoices.buyerOrgId, orgId) : eq(s.invoices.supplierOrgId, orgId),
    );
    const ids = new Set(invs.map((i) => i.id));
    const rows = (await db.select().from(s.assignments)).filter((a) => ids.has(a.invoiceId));
    res.json({ data: rows });
  } catch (e) { next(e); }
});

// Offers
apiRouter.get('/offers', authenticate, authorize('buyer', 'supplier', 'spv', 'admin'), async (req, res, next) => {
  try {
    const role = req.user!.role;
    if (role === 'admin' || role === 'spv') {
      return res.json({ data: await db.select().from(s.purchaseOffers) });
    }
    const orgId = req.user!.orgId!;
    const invs = await db.select().from(s.invoices).where(
      role === 'buyer' ? eq(s.invoices.buyerOrgId, orgId) : eq(s.invoices.supplierOrgId, orgId),
    );
    const ids = new Set(invs.map((i) => i.id));
    const rows = (await db.select().from(s.purchaseOffers)).filter((o) => ids.has(o.invoiceId));
    res.json({ data: rows });
  } catch (e) { next(e); }
});

apiRouter.post('/offers', authenticate, authorize('spv', 'admin'), validate(z.object({
  invoiceId: z.string().uuid(),
  discountRateBps: z.number().int().positive().optional(),
  discountRate: z.number().positive().optional(),
})), async (req, res, next) => {
  try {
    const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, req.body.invoiceId)).limit(1);
    if (!inv) throw new AppError(404, 'not_found', 'Invoice not found');
    const [spv] = await db.select().from(s.organisations).where(eq(s.organisations.orgType, 'spv')).limit(1);
    const face = Number(inv.listedAmount ?? inv.faceValue);
    const tenor = computeTenorDays(inv.issueDate, inv.dueDate);
    const bps = req.body.discountRateBps ?? Math.round((req.body.discountRate || priceReceivable({ faceValue: face, tenorDays: tenor }).recommendedDiscount) * 100);
    const { assertProgrammeAllows } = await import('../services/programme.js');
    await assertProgrammeAllows({
      buyerOrgId: inv.buyerOrgId,
      faceValue: face,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      discountRateBps: bps,
    });
    const purchasePrice = Math.round(face * (1 - bps / 10000));
    const [offer] = await db.insert(s.purchaseOffers).values({
      invoiceId: inv.id,
      spvOrgId: spv!.id,
      discountRateBps: bps,
      tenorDays: tenor,
      purchasePrice: String(purchasePrice),
      faceValue: String(face),
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 86400000),
    }).returning();
    await db.update(s.invoices).set({ status: 'offer_received', updatedAt: new Date() }).where(eq(s.invoices.id, inv.id));
    const iou = inv.iouRegistryId || inv.id;
    const discountPct = `${(bps / 100).toFixed(2)}%`;
    await notifyOrgUsers(inv.supplierOrgId, {
      type: 'offer_received',
      title: `Purchase offer on ${iou}`,
      body: `Discount ${discountPct} · purchase price KES ${purchasePrice.toLocaleString()}`,
      referenceType: 'offer',
      referenceId: offer.id,
      emailHtml: templates.offerReceived(iou, discountPct, `KES ${purchasePrice.toLocaleString()}`),
      emailSubject: emailSubjects.offerReceived(iou),
    });
    res.status(201).json(offer);
  } catch (e) { next(e); }
});

apiRouter.post('/offers/:id/respond', authenticate, authorize('supplier', 'admin'), validate(z.object({
  accept: z.boolean(),
  otp: z.string().optional(),
})), async (req, res, next) => {
  try {
    const [offer] = await db.select().from(s.purchaseOffers).where(eq(s.purchaseOffers.id, req.params.id)).limit(1);
    if (!offer) throw new AppError(404, 'not_found', 'Offer not found');
    const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, offer.invoiceId)).limit(1);
    assertInvoiceAccess(req.user!, inv);
    assertSupplierOrg(req.user!, inv.supplierOrgId);
    if (req.body.accept) {
      const { assertCheckerOtp } = await import('../lib/makerChecker.js');
      await assertCheckerOtp(req.user!, `offer:${req.params.id}`, req.body.otp);
    }
    await db.update(s.purchaseOffers).set({
      status: req.body.accept ? 'accepted' : 'declined',
      respondedAt: new Date(),
    }).where(eq(s.purchaseOffers.id, offer.id));
    if (req.body.accept) {
      await db.update(s.invoices).set({ status: 'offer_accepted', updatedAt: new Date() }).where(eq(s.invoices.id, offer.invoiceId));
      const [consent] = await db.insert(s.assignmentConsents).values({
        invoiceId: offer.invoiceId,
        buyerOrgId: inv.buyerOrgId,
        spvOrgId: offer.spvOrgId,
        status: 'pending',
      }).returning();
      const iou = inv.iouRegistryId || inv.id;
      await notifyOrgUsers(offer.spvOrgId, {
        type: 'offer_accepted',
        title: `Offer accepted: ${iou}`,
        body: 'Supplier accepted your purchase offer — request buyer consent if needed',
        referenceType: 'offer',
        referenceId: offer.id,
        emailHtml: templates.offerAccepted(iou),
        emailSubject: emailSubjects.offerAccepted(iou),
      });
      await notifyOrgUsers(inv.buyerOrgId, {
        type: 'consent_required',
        title: `Consent required: ${iou}`,
        body: 'An authorised signatory must complete OTP-verified assignment consent',
        referenceType: 'consent',
        referenceId: consent.id,
        emailHtml: templates.consentRequired(iou, `KES ${Number(inv.faceValue).toLocaleString()}`),
        emailSubject: emailSubjects.consentRequired(iou),
      });
      return res.json({ offer, consent });
    }
    const iou = inv.iouRegistryId || inv.id;
    await notifyOrgUsers(offer.spvOrgId, {
      type: 'offer_declined',
      title: `Offer declined: ${iou}`,
      body: 'Supplier declined the purchase offer',
      referenceType: 'offer',
      referenceId: offer.id,
      emailHtml: templates.offerDeclined(iou),
      emailSubject: emailSubjects.offerDeclined(iou),
    });
    res.json({ offer });
  } catch (e) { next(e); }
});

apiRouter.post('/offers/:id/request-otp', authenticate, authorize('supplier', 'admin'), async (req, res, next) => {
  try {
    const [offer] = await db.select().from(s.purchaseOffers).where(eq(s.purchaseOffers.id, req.params.id)).limit(1);
    if (!offer) throw new AppError(404, 'not_found', 'Offer not found');
    const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, offer.invoiceId)).limit(1);
    assertSupplierOrg(req.user!, inv.supplierOrgId);
    if (offer.status !== 'pending') throw new AppError(400, 'invalid_state', 'Offer is not pending');
    const hint = await issueOtp({
      userId: req.user!.userId,
      purpose: `offer:${offer.id}`,
      email: req.user!.email,
    });
    res.json({ otpSent: true, ...hint });
  } catch (e) { next(e); }
});

// Consents
apiRouter.get('/consents', authenticate, authorize('buyer', 'spv', 'admin'), async (req, res, next) => {
  try {
    const role = req.user!.role;
    if (role === 'buyer') {
      return res.json({
        data: await db.select().from(s.assignmentConsents).where(eq(s.assignmentConsents.buyerOrgId, req.user!.orgId!)),
      });
    }
    // SPV / admin — full consent registry
    res.json({ data: await db.select().from(s.assignmentConsents) });
  } catch (e) { next(e); }
});

apiRouter.post('/consents', authenticate, authorize('spv', 'admin'), validate(z.object({
  invoiceId: z.string().uuid(),
})), async (req, res, next) => {
  try {
    const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, req.body.invoiceId)).limit(1);
    if (!inv) throw new AppError(404, 'not_found', 'Invoice not found');
    if (!['offer_accepted', 'listed', 'verified'].includes(inv.status)) {
      throw new AppError(400, 'invalid_state', `Cannot request consent from status ${inv.status}`);
    }
    const [spv] = await db.select().from(s.organisations).where(eq(s.organisations.orgType, 'spv')).limit(1);
    if (!spv) throw new AppError(500, 'config_error', 'SPV not configured');
    const [consent] = await db.insert(s.assignmentConsents).values({
      invoiceId: inv.id,
      buyerOrgId: inv.buyerOrgId,
      spvOrgId: spv.id,
      status: 'pending',
    }).returning();
    await writeAudit({
      actorId: req.user!.userId,
      action: 'consent.requested',
      resourceType: 'assignment_consent',
      resourceId: consent.id,
    });
    const iou = inv.iouRegistryId || inv.id;
    await notifyOrgUsers(inv.buyerOrgId, {
      type: 'consent_required',
      title: `Consent required: ${iou}`,
      body: 'An authorised signatory must complete OTP-verified assignment consent',
      referenceType: 'consent',
      referenceId: consent.id,
      emailHtml: templates.consentRequired(iou, `KES ${Number(inv.faceValue).toLocaleString()}`),
      emailSubject: emailSubjects.consentRequired(iou),
    });
    res.status(201).json(consent);
  } catch (e) { next(e); }
});

apiRouter.post('/consents/:id/request-otp', authenticate, authorize('buyer', 'admin'), async (req, res, next) => {
  try {
    const [consent] = await db.select().from(s.assignmentConsents).where(eq(s.assignmentConsents.id, req.params.id)).limit(1);
    if (!consent) throw new AppError(404, 'not_found', 'Consent not found');
    assertBuyerOrg(req.user!, consent.buyerOrgId);
    if (consent.status !== 'pending') throw new AppError(400, 'invalid_state', 'Consent already signed');

    if (req.user!.role !== 'admin') {
      const [sig] = await db.select().from(s.signatories).where(and(
        eq(s.signatories.userId, req.user!.userId),
        eq(s.signatories.orgId, consent.buyerOrgId),
        eq(s.signatories.isActive, true),
      )).limit(1);
      if (!sig) throw new AppError(403, 'forbidden', 'Active signatory required to sign consent');
    }

    const hint = await issueOtp({
      userId: req.user!.userId,
      purpose: `consent:${consent.id}`,
      email: req.user!.email,
    });
    res.json({ otpSent: true, consentId: consent.id, ...hint });
  } catch (e) { next(e); }
});

apiRouter.post('/consents/:id/decline', authenticate, authorize('buyer', 'admin'), validate(z.object({
  reason: z.string().max(500).optional(),
})), async (req, res, next) => {
  try {
    const [consent] = await db.select().from(s.assignmentConsents).where(eq(s.assignmentConsents.id, req.params.id)).limit(1);
    if (!consent) throw new AppError(404, 'not_found', 'Consent not found');
    assertBuyerOrg(req.user!, consent.buyerOrgId);
    if (consent.status !== 'pending') throw new AppError(400, 'invalid_state', 'Consent is not pending');
    await db.update(s.assignmentConsents).set({
      status: 'declined',
      signedAt: new Date(),
    }).where(eq(s.assignmentConsents.id, consent.id));
    await writeAudit({
      actorId: req.user!.userId,
      action: 'consent.declined',
      resourceType: 'assignment_consent',
      resourceId: consent.id,
      details: { reason: req.body.reason || null },
    });
    const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, consent.invoiceId)).limit(1);
    const iou = inv?.iouRegistryId || consent.invoiceId;
    await notifyOrgUsers(consent.spvOrgId, {
      type: 'consent_declined',
      title: `Consent declined: ${iou}`,
      body: req.body.reason || 'Buyer declined assignment consent',
      referenceType: 'consent',
      referenceId: consent.id,
      emailHtml: templates.consentDeclined(iou, req.body.reason),
      emailSubject: emailSubjects.consentDeclined(iou),
    });
    res.json({ id: consent.id, status: 'declined' });
  } catch (e) { next(e); }
});

apiRouter.post('/consents/:id/confirm-sign', authenticate, authorize('buyer', 'admin'), validate(z.object({
  otp: z.string().min(4),
})), async (req, res, next) => {
  try {
    const [consent] = await db.select().from(s.assignmentConsents).where(eq(s.assignmentConsents.id, req.params.id)).limit(1);
    if (!consent) throw new AppError(404, 'not_found', 'Consent not found');
    assertBuyerOrg(req.user!, consent.buyerOrgId);
    if (consent.status !== 'pending') throw new AppError(400, 'invalid_state', 'Consent already signed');

    let signatoryId: string | null = null;
    if (req.user!.role !== 'admin') {
      const [sig] = await db.select().from(s.signatories).where(and(
        eq(s.signatories.userId, req.user!.userId),
        eq(s.signatories.orgId, consent.buyerOrgId),
        eq(s.signatories.isActive, true),
      )).limit(1);
      if (!sig) throw new AppError(403, 'forbidden', 'Active signatory required to sign consent');
      signatoryId = sig.id;
    }

    await verifyOtp(req.user!.userId, `consent:${consent.id}`, req.body.otp);

    const hash = crypto.createHash('sha256').update(`${consent.id}:${req.user!.userId}:${Date.now()}`).digest('hex');
    await db.update(s.assignmentConsents).set({
      status: 'signed',
      otpVerified: true,
      signatureHash: hash,
      signatoryId,
      signedAt: new Date(),
    }).where(eq(s.assignmentConsents.id, consent.id));

    // Negotiated track: OTP consent is the obligor acknowledgement for changed economics
    const now = new Date();
    await db.update(s.invoices).set({
      commitmentToPay: true,
      commitmentAckBy: req.user!.userId,
      commitmentAckAt: now,
      updatedAt: now,
    }).where(eq(s.invoices.id, consent.invoiceId));

    const [offer] = await db.select().from(s.purchaseOffers).where(eq(s.purchaseOffers.invoiceId, consent.invoiceId)).limit(1);
    const asgn = await createAssignment({
      invoiceId: consent.invoiceId,
      type: 'negotiated_offer',
      actorId: req.user!.userId,
      offerId: offer?.id,
      consentId: consent.id,
      discountBps: offer?.discountRateBps,
    });

    try {
      const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, consent.invoiceId)).limit(1);
      if (inv) {
        const letter = await generateAssignmentLetter({
          orgId: consent.buyerOrgId,
          iouRegistryId: inv.iouRegistryId || inv.id,
          parties: `Buyer ${consent.buyerOrgId} / SPV ${consent.spvOrgId}`,
          assignmentId: asgn.id,
          signatureHash: hash,
          standingOrderRef: inv.bankStandingOrderRef,
          standingOrderBank: inv.standingOrderBank,
          commitmentAckAt: inv.commitmentAckAt || now,
        });
        await db.insert(s.orgDocuments).values({
          orgId: consent.buyerOrgId,
          docType: 'assignment_letter',
          fileUrl: letter.url,
          uploadedBy: req.user!.userId,
        });
      }
    } catch (e) {
      console.warn('[pdf] assignment letter failed', e);
    }

    {
      const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, consent.invoiceId)).limit(1);
      const iou = inv?.iouRegistryId || consent.invoiceId;
      await notifyOrgUsers(consent.spvOrgId, {
        type: 'consent_signed',
        title: `Consent signed: ${iou}`,
        body: 'OTP-verified assignment consent is on file',
        referenceType: 'consent',
        referenceId: consent.id,
        emailHtml: templates.consentSigned(iou),
        emailSubject: emailSubjects.consentSigned(iou),
      });
      if (inv) {
        await notifyOrgUsers(inv.supplierOrgId, {
          type: 'consent_signed',
          title: `Consent signed: ${iou}`,
          body: 'Buyer consent recorded — assignment can proceed',
          referenceType: 'consent',
          referenceId: consent.id,
          emailHtml: templates.consentSigned(iou),
          emailSubject: emailSubjects.consentSigned(iou),
        });
      }
    }

    res.json({ consent: { ...consent, status: 'signed', signatureHash: hash }, assignment: asgn });
  } catch (e) { next(e); }
});

/** Alias requiring OTP — no default bypass */
apiRouter.post('/consents/:id/sign', authenticate, authorize('buyer', 'admin'), validate(z.object({
  otp: z.string().min(4),
})), async (req, res, next) => {
  try {
    const [consent] = await db.select().from(s.assignmentConsents).where(eq(s.assignmentConsents.id, req.params.id)).limit(1);
    if (!consent) throw new AppError(404, 'not_found', 'Consent not found');
    assertBuyerOrg(req.user!, consent.buyerOrgId);
    if (consent.status !== 'pending') throw new AppError(400, 'invalid_state', 'Consent already signed');
    let signatoryId: string | null = null;
    if (req.user!.role !== 'admin') {
      const [sig] = await db.select().from(s.signatories).where(and(
        eq(s.signatories.userId, req.user!.userId),
        eq(s.signatories.orgId, consent.buyerOrgId),
        eq(s.signatories.isActive, true),
      )).limit(1);
      if (!sig) throw new AppError(403, 'forbidden', 'Active signatory required to sign consent');
      signatoryId = sig.id;
    }
    await verifyOtp(req.user!.userId, `consent:${consent.id}`, req.body.otp);
    const hash = crypto.createHash('sha256').update(`${consent.id}:${req.user!.userId}:${Date.now()}`).digest('hex');
    await db.update(s.assignmentConsents).set({
      status: 'signed', otpVerified: true, signatureHash: hash, signatoryId, signedAt: new Date(),
    }).where(eq(s.assignmentConsents.id, consent.id));
    const now = new Date();
    await db.update(s.invoices).set({
      commitmentToPay: true,
      commitmentAckBy: req.user!.userId,
      commitmentAckAt: now,
      updatedAt: now,
    }).where(eq(s.invoices.id, consent.invoiceId));
    const [offer] = await db.select().from(s.purchaseOffers).where(eq(s.purchaseOffers.invoiceId, consent.invoiceId)).limit(1);
    const asgn = await createAssignment({
      invoiceId: consent.invoiceId, type: 'negotiated_offer', actorId: req.user!.userId,
      offerId: offer?.id, consentId: consent.id, discountBps: offer?.discountRateBps,
    });
    const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, consent.invoiceId)).limit(1);
    if (inv) {
      const iou = inv.iouRegistryId || inv.id;
      await notifyOrgUsers(consent.spvOrgId, {
        type: 'consent_signed',
        title: `Consent signed: ${iou}`,
        body: 'OTP-verified assignment consent is on file',
        referenceType: 'consent',
        referenceId: consent.id,
        emailHtml: templates.consentSigned(iou),
        emailSubject: emailSubjects.consentSigned(iou),
      });
    }
    res.json({ consent: { ...consent, status: 'signed', signatureHash: hash }, assignment: asgn });
  } catch (e) { next(e); }
});

// Escrow
apiRouter.get('/escrow', authenticate, authorize('spv', 'admin'), async (_req, res, next) => {
  try {
    res.json({ data: await db.select().from(s.escrowLegs) });
  } catch (e) { next(e); }
});

apiRouter.post('/escrow/:id/release', authenticate, authorize('spv', 'admin'), async (req, res, next) => {
  try {
    const leg = await releaseEscrowLeg(req.params.id, req.user!.userId);
    res.json(leg);
  } catch (e) { next(e); }
});

apiRouter.post('/escrow/:id/collect', authenticate, authorize('spv', 'admin'), async (req, res, next) => {
  try {
    const leg = await collectEscrowLeg(req.params.id, req.user!.userId);
    res.json(leg);
  } catch (e) { next(e); }
});

// Wallets (simulated ledger — gated by ENABLE_SIMULATED_WALLET)
apiRouter.get('/wallets/me', authenticate, authorize('buyer', 'supplier', 'spv', 'admin'), async (req, res, next) => {
  try {
    if (!simulatedWalletAllowed()) {
      throw new AppError(403, 'forbidden', 'Simulated wallet is disabled in this environment');
    }
    if (!req.user!.orgId) throw new AppError(400, 'no_org', 'User has no organisation');
    const wallet = await getOrCreateWallet(req.user!.orgId);
    const txs = await db.select().from(s.walletTransactions).where(eq(s.walletTransactions.walletId, wallet.id));
    res.json({ wallet, transactions: txs, simulated: true });
  } catch (e) { next(e); }
});

apiRouter.post('/wallets/me/deposit', authenticate, authorize('buyer', 'supplier', 'spv', 'admin'), validate(z.object({
  amount: z.number().positive().max(50_000_000),
  description: z.string().max(200).optional(),
})), async (req, res, next) => {
  try {
    if (!simulatedWalletAllowed()) {
      throw new AppError(403, 'forbidden', 'Simulated wallet deposits are disabled in this environment');
    }
    if (!req.user!.orgId) throw new AppError(400, 'no_org', 'User has no organisation');
    const { walletCredit, getOrCreateWallet: gow } = await import('../services/core.js');
    await walletCredit(
      req.user!.orgId,
      req.body.amount,
      `deposit:${Date.now()}`,
      req.body.description || 'Simulated deposit',
    );
    const wallet = await gow(req.user!.orgId);
    await writeAudit({
      actorId: req.user!.userId,
      action: 'wallet.deposit',
      resourceType: 'wallet',
      resourceId: wallet.id,
      details: { amount: req.body.amount },
    });
    res.json({ wallet });
  } catch (e) { next(e); }
});

apiRouter.post('/wallets/me/withdraw', authenticate, authorize('buyer', 'supplier', 'spv', 'admin'), validate(z.object({
  amount: z.number().positive().max(50_000_000),
  description: z.string().max(200).optional(),
})), async (req, res, next) => {
  try {
    if (!simulatedWalletAllowed()) {
      throw new AppError(403, 'forbidden', 'Simulated wallet withdrawals are disabled in this environment');
    }
    if (!req.user!.orgId) throw new AppError(400, 'no_org', 'User has no organisation');
    const { walletDebit, getOrCreateWallet: gow } = await import('../services/core.js');
    await walletDebit(
      req.user!.orgId,
      req.body.amount,
      `withdraw:${Date.now()}`,
      req.body.description || 'Simulated withdrawal',
    );
    const wallet = await gow(req.user!.orgId);
    await writeAudit({
      actorId: req.user!.userId,
      action: 'wallet.withdraw',
      resourceType: 'wallet',
      resourceId: wallet.id,
      details: { amount: req.body.amount },
    });
    res.json({ wallet });
  } catch (e) { next(e); }
});

// Packages
apiRouter.get('/packages', authenticate, authorize('spv', 'admin'), async (_req, res, next) => {
  try {
    const pkgs = await db.select().from(s.packages);
    const items = await db.select().from(s.packageItems);
    const asgns = await db.select().from(s.assignments);
    const asgnById = Object.fromEntries(asgns.map((a) => [a.id, a]));
    const data = pkgs.map((p) => {
      const pItems = items.filter((i) => i.packageId === p.id);
      const invoiceIds = pItems.map((i) => asgnById[i.assignmentId]?.invoiceId).filter(Boolean);
      return { ...p, invoiceIds };
    });
    res.json({ data });
  } catch (e) { next(e); }
});

apiRouter.post('/packages', authenticate, authorize('spv', 'admin'), validate(z.object({
  packageRef: z.string().min(1),
  assignmentIds: z.array(z.string().uuid()).min(1),
})), async (req, res, next) => {
  try {
    const asgns = await db.select().from(s.assignments);
    const selected = asgns.filter((a) => req.body.assignmentIds.includes(a.id));
    if (!selected.length) throw new AppError(400, 'validation_error', 'No valid assignments');
    const invIds = selected.map((a) => a.invoiceId);
    const invs = await db.select().from(s.invoices);
    const invById = Object.fromEntries(invs.map((i) => [i.id, i]));
    const offers = await db.select().from(s.purchaseOffers);
    const tenorItems: { faceValue: number; tenorDays: number }[] = [];
    const discItems: { faceValue: number; discountBps: number }[] = [];
    const priceItems: { faceValue: number; purchasePrice: number }[] = [];
    for (const a of selected) {
      const face = Number(a.faceValue);
      const purchase = Number(a.purchasePrice || 0);
      priceItems.push({ faceValue: face, purchasePrice: purchase });
      const inv = invById[a.invoiceId];
      if (inv?.issueDate && inv?.dueDate) {
        tenorItems.push({ faceValue: face, tenorDays: computeTenorDays(inv.issueDate, inv.dueDate) });
      }
      const offer = offers.find((o) => o.invoiceId === a.invoiceId && o.status === 'accepted')
        || offers.find((o) => o.id === a.offerId);
      let disc = offer?.discountRateBps != null ? Number(offer.discountRateBps) : null;
      if (disc == null && face > 0 && purchase > 0) {
        disc = Math.round((1 - purchase / face) * 10000);
      }
      if (disc != null) discItems.push({ faceValue: face, discountBps: disc });
    }
    const totals = packageTotals(priceItems);
    const [pkg] = await db.insert(s.packages).values({
      packageRef: req.body.packageRef,
      status: 'draft',
      totalFaceValue: String(totals.totalFaceValue),
      totalPurchasePrice: String(totals.totalPurchasePrice),
      weightedAvgTenor: tenorItems.length ? weightedAvgTenorDays(tenorItems) : null,
      weightedAvgDiscountBps: discItems.length ? weightedAvgDiscountBps(discItems) : null,
      createdBy: req.user!.userId,
    }).returning();
    await db.insert(s.packageItems).values(selected.map((a) => ({ packageId: pkg.id, assignmentId: a.id })));
    for (const a of selected) {
      await db.update(s.invoices).set({ status: 'packaged', updatedAt: new Date() }).where(eq(s.invoices.id, a.invoiceId));
    }
    // Attach invoiceIds for client mapping (not persisted on packages row)
    const response = { ...pkg, invoiceIds: invIds };
    try {
      const spvOrgId = selected[0]?.spvOrgId || req.user!.orgId!;
      const summary = await generatePackageSummary({
        orgId: spvOrgId,
        packageRef: pkg.packageRef,
        packageId: pkg.id,
        status: pkg.status,
        totalFaceValue: totals.totalFaceValue,
        totalPurchasePrice: totals.totalPurchasePrice,
        itemCount: selected.length,
      });
      await db.insert(s.orgDocuments).values({
        orgId: spvOrgId,
        docType: 'package_summary',
        fileUrl: summary.url,
        uploadedBy: req.user!.userId,
      });
      await notifyOrgUsers(spvOrgId, {
        type: 'document_ready',
        title: 'Package summary ready',
        body: `Package ${pkg.packageRef} summary PDF is available`,
        referenceType: 'package',
        referenceId: pkg.id,
        emailHtml: templates.documentReady('package summary'),
        emailSubject: emailSubjects.document(`package summary (${pkg.packageRef})`),
      });
    } catch (e) {
      console.warn('[pdf] package summary failed', e);
    }
    res.status(201).json(response);
  } catch (e) { next(e); }
});

apiRouter.patch('/packages/:id/status', authenticate, authorize('spv', 'admin'), validate(z.object({
  // "listed" kept as alias for readiness; never means exchange-listed
  status: z.enum(['draft', 'structured', 'ready_for_submission', 'listed', 'placed', 'settled']),
})), async (req, res, next) => {
  try {
    const status = req.body.status === 'listed' ? 'ready_for_submission' : req.body.status;
    // Internal workflow reference only — not an NSE listing confirmation
    const nseReference = status === 'ready_for_submission' ? `INT-READY-${Date.now()}` : undefined;
    const [pkg] = await db.update(s.packages).set({
      status,
      nseReference: nseReference || undefined,
      updatedAt: new Date(),
    }).where(eq(s.packages.id, req.params.id)).returning();
    if (pkg && status === 'ready_for_submission') {
      const spvOrgId = req.user!.orgId;
      if (spvOrgId) {
        await notifyOrgUsers(spvOrgId, {
          type: 'package_ready',
          title: `Package ready: ${pkg.packageRef}`,
          body: 'Internal readiness only — not an NSE listing confirmation',
          referenceType: 'package',
          referenceId: pkg.id,
          emailHtml: templates.packageReady(pkg.packageRef),
          emailSubject: emailSubjects.packageReady(pkg.packageRef),
        });
      }
    }
    res.json(pkg);
  } catch (e) { next(e); }
});

// Programmes
apiRouter.get('/programmes', authenticate, async (_req, res, next) => {
  try {
    res.json({ data: await getProgrammeUtilisation() });
  } catch (e) { next(e); }
});

// Fees
apiRouter.get('/fees', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    res.json({
      configurations: await db.select().from(s.feeConfigurations),
      ledger: await db.select().from(s.feeLedger),
    });
  } catch (e) { next(e); }
});

apiRouter.post('/fees', authenticate, authorize('admin'), validate(z.object({
  feeType: z.string().min(1),
  rateBps: z.number().int().optional(),
  flatAmount: z.number().optional(),
  appliesTo: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})), async (req, res, next) => {
  try {
    const [row] = await db.insert(s.feeConfigurations).values({
      feeType: req.body.feeType,
      rateBps: req.body.rateBps ?? null,
      flatAmount: req.body.flatAmount != null ? String(req.body.flatAmount) : null,
      appliesTo: req.body.appliesTo,
      description: req.body.description || null,
      isActive: req.body.isActive ?? true,
    }).returning();
    await writeAudit({ actorId: req.user!.userId, action: 'fee.create', resourceType: 'fee_configuration', resourceId: row.id });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

apiRouter.patch('/fees/:id', authenticate, authorize('admin'), validate(z.object({
  rateBps: z.number().int().optional(),
  flatAmount: z.number().optional(),
  appliesTo: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})), async (req, res, next) => {
  try {
    const patch: Record<string, unknown> = {};
    if (req.body.rateBps !== undefined) patch.rateBps = req.body.rateBps;
    if (req.body.flatAmount !== undefined) patch.flatAmount = String(req.body.flatAmount);
    if (req.body.appliesTo !== undefined) patch.appliesTo = req.body.appliesTo;
    if (req.body.description !== undefined) patch.description = req.body.description;
    if (req.body.isActive !== undefined) patch.isActive = req.body.isActive;
    const [row] = await db.update(s.feeConfigurations).set(patch).where(eq(s.feeConfigurations.id, req.params.id)).returning();
    if (!row) throw new AppError(404, 'not_found', 'Fee config not found');
    res.json(row);
  } catch (e) { next(e); }
});

apiRouter.delete('/fees/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [row] = await db.update(s.feeConfigurations).set({ isActive: false }).where(eq(s.feeConfigurations.id, req.params.id)).returning();
    if (!row) throw new AppError(404, 'not_found', 'Fee config not found');
    await writeAudit({
      actorId: req.user!.userId,
      action: 'fee.deactivate',
      resourceType: 'fee_configuration',
      resourceId: row.id,
    });
    res.json(row);
  } catch (e) { next(e); }
});

// Documents
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

apiRouter.get('/documents', authenticate, async (req, res, next) => {
  try {
    const orgId = req.user!.role === 'admin' && req.query.orgId
      ? String(req.query.orgId)
      : req.user!.orgId;
    if (!orgId) throw new AppError(400, 'no_org', 'No organisation');
    const rows = await db.select().from(s.orgDocuments).where(eq(s.orgDocuments.orgId, orgId));
    res.json({ data: rows });
  } catch (e) { next(e); }
});

apiRouter.post('/documents/upload', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, 'no_file', 'file is required');
    const orgId = req.user!.orgId;
    if (!orgId) throw new AppError(400, 'no_org', 'No organisation');
    const docType = String(req.body.docType || 'supporting');
    const stored = await storeFile({
      orgId,
      originalName: req.file.originalname,
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
    });
    const [doc] = await db.insert(s.orgDocuments).values({
      orgId,
      docType,
      fileUrl: stored.url,
      uploadedBy: req.user!.userId,
    }).returning();
    await writeAudit({
      actorId: req.user!.userId,
      action: 'document.upload',
      resourceType: 'org_document',
      resourceId: doc.id,
      details: { docType, key: stored.key },
    });
    res.status(201).json(doc);
  } catch (e) { next(e); }
});

apiRouter.get('/documents/download', authenticate, async (req, res, next) => {
  try {
    const key = String(req.query.key || '');
    if (!key) throw new AppError(400, 'missing_key', 'key query required');
    const keyOrg = orgIdFromStorageKey(key);
    if (!keyOrg) throw new AppError(400, 'invalid_path', 'Invalid file key');
    if (req.user!.role !== 'admin' && req.user!.role !== 'spv') {
      assertOrgMatch(req.user!, keyOrg, 'File not found');
    }
    const { buffer, fullPath } = await readStoredFile(key);
    const ext = path.extname(fullPath).toLowerCase();
    const ctype = ext === '.pdf' ? 'application/pdf'
      : ext === '.png' ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
          : 'application/octet-stream';
    res.setHeader('Content-Type', ctype);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(fullPath)}"`);
    res.send(buffer);
  } catch (e) { next(e); }
});

// Signatories
apiRouter.get('/signatories', authenticate, async (req, res, next) => {
  try {
    const orgId = req.user!.role === 'admin' && req.query.orgId
      ? String(req.query.orgId)
      : req.user!.orgId!;
    const rows = await db.select().from(s.signatories).where(eq(s.signatories.orgId, orgId));
    res.json({ data: rows });
  } catch (e) { next(e); }
});

apiRouter.post('/signatories', authenticate, validate(z.object({
  userId: z.string().uuid(),
  orgId: z.string().uuid().optional(),
  roleTitle: z.string().optional(),
  capacity: z.enum(['maker', 'checker', 'both']).optional(),
})), async (req, res, next) => {
  try {
    const orgId = req.body.orgId || req.user!.orgId;
    if (!orgId) throw new AppError(400, 'no_org', 'No organisation');
    if (req.user!.role !== 'admin' && orgId !== req.user!.orgId) {
      throw new AppError(403, 'forbidden', 'Cannot manage other orgs');
    }
    const [row] = await db.insert(s.signatories).values({
      userId: req.body.userId,
      orgId,
      roleTitle: req.body.roleTitle || null,
      capacity: req.body.capacity || 'checker',
      isActive: true,
    }).returning();
    res.status(201).json(row);
  } catch (e) { next(e); }
});

apiRouter.patch('/signatories/:id', authenticate, validate(z.object({
  roleTitle: z.string().optional(),
  capacity: z.enum(['maker', 'checker', 'both']).optional(),
  isActive: z.boolean().optional(),
  approvalCertUrl: z.string().optional(),
  specimenSigUrl: z.string().optional(),
})), async (req, res, next) => {
  try {
    const [existing] = await db.select().from(s.signatories).where(eq(s.signatories.id, req.params.id)).limit(1);
    if (!existing) throw new AppError(404, 'not_found', 'Signatory not found');
    assertOrgMatch(req.user!, existing.orgId);
    const [row] = await db.update(s.signatories).set(req.body).where(eq(s.signatories.id, req.params.id)).returning();
    res.json(row);
  } catch (e) { next(e); }
});

// Programmes (admin CRUD + utilisation)
apiRouter.post('/programmes', authenticate, authorize('admin'), validate(z.object({
  name: z.string().min(1),
  buyerOrgId: z.string().uuid().optional().nullable(),
  maxExposure: z.number().positive(),
  buyerSublimit: z.number().positive().optional().nullable(),
  maxTenorDays: z.number().int().positive().optional(),
  discountBandMinBps: z.number().int().optional(),
  discountBandMaxBps: z.number().int().optional(),
  effectiveFrom: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
})), async (req, res, next) => {
  try {
    const [row] = await db.insert(s.programmes).values({
      name: req.body.name,
      buyerOrgId: req.body.buyerOrgId || null,
      maxExposure: String(req.body.maxExposure),
      buyerSublimit: req.body.buyerSublimit != null ? String(req.body.buyerSublimit) : null,
      maxTenorDays: req.body.maxTenorDays ?? 180,
      discountBandMinBps: req.body.discountBandMinBps ?? 300,
      discountBandMaxBps: req.body.discountBandMaxBps ?? 900,
      effectiveFrom: req.body.effectiveFrom || null,
      expiresAt: req.body.expiresAt || null,
      status: 'active',
    }).returning();
    res.status(201).json(row);
  } catch (e) { next(e); }
});

apiRouter.patch('/programmes/:id', authenticate, authorize('admin'), validate(z.object({
  name: z.string().optional(),
  maxExposure: z.number().optional(),
  buyerSublimit: z.number().optional().nullable(),
  maxTenorDays: z.number().int().optional(),
  discountBandMinBps: z.number().int().optional(),
  discountBandMaxBps: z.number().int().optional(),
  effectiveFrom: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  status: z.enum(['active', 'paused', 'closed']).optional(),
})), async (req, res, next) => {
  try {
    const patch: Record<string, unknown> = { ...req.body };
    if (req.body.maxExposure != null) patch.maxExposure = String(req.body.maxExposure);
    if (req.body.buyerSublimit !== undefined) {
      patch.buyerSublimit = req.body.buyerSublimit != null ? String(req.body.buyerSublimit) : null;
    }
    const [row] = await db.update(s.programmes).set(patch).where(eq(s.programmes.id, req.params.id)).returning();
    if (!row) throw new AppError(404, 'not_found', 'Programme not found');
    res.json(row);
  } catch (e) { next(e); }
});

// Notifications
apiRouter.get('/notifications', authenticate, async (req, res, next) => {
  try {
    const rows = await db.select().from(s.notifications).where(eq(s.notifications.userId, req.user!.userId));
    res.json({ data: rows });
  } catch (e) { next(e); }
});

apiRouter.post('/notifications/:id/read', authenticate, async (req, res, next) => {
  try {
    const [n] = await db.select().from(s.notifications).where(and(
      eq(s.notifications.id, req.params.id),
      eq(s.notifications.userId, req.user!.userId),
    )).limit(1);
    if (!n) throw new AppError(404, 'not_found', 'Notification not found');
    await db.update(s.notifications).set({ isRead: true }).where(eq(s.notifications.id, n.id));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Organisations (for forms) — non-admin get limited fields; own org includes KYC metadata
apiRouter.get('/organisations', authenticate, async (req, res, next) => {
  try {
    const rows = await db.select().from(s.organisations);
    if (req.user!.role === 'admin') {
      return res.json({ data: rows });
    }
    const ownId = req.user!.orgId;
    res.json({
      data: rows.map((o) => {
        const base = {
          id: o.id,
          name: o.name,
          orgType: o.orgType,
          uzimaPartyId: o.uzimaPartyId,
          status: o.status,
          registrationNo: o.registrationNo,
        };
        if (o.id === ownId) {
          return {
            ...base,
            metadata: o.metadata || {},
            contactEmail: (o.metadata as any)?.contactEmail || null,
          };
        }
        return base;
      }),
    });
  } catch (e) { next(e); }
});

// Admin audit
apiRouter.get('/admin/audit', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    res.json({ data: await db.select().from(s.auditLog) });
  } catch (e) { next(e); }
});

apiRouter.get('/admin/users', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    const rows = await db.select({
      id: s.users.id,
      email: s.users.email,
      fullName: s.users.fullName,
      role: s.users.role,
      orgId: s.users.orgId,
      status: s.users.status,
    }).from(s.users);
    res.json({ data: rows });
  } catch (e) { next(e); }
});

apiRouter.post('/admin/users/invite', authenticate, authorize('admin'), validate(z.object({
  email: z.string().email(),
  fullName: z.string().min(1).optional(),
  role: z.enum(['supplier', 'buyer', 'spv', 'platform', 'admin']),
  orgId: z.string().uuid().optional(),
  temporaryPassword: z.string().min(12).optional(),
})), async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase();
    const [existing] = await db.select().from(s.users).where(eq(s.users.email, email)).limit(1);
    if (existing) throw new AppError(409, 'exists', 'User already exists');
    const tempPass = req.body.temporaryPassword || generateTempPassword();
    assertStrongPassword(tempPass);
    const passwordHash = await bcrypt.hash(tempPass, 12);
    const [user] = await db.insert(s.users).values({
      email,
      fullName: req.body.fullName || email.split('@')[0],
      role: req.body.role,
      orgId: req.body.orgId || null,
      passwordHash,
      mustChangePassword: true,
      status: 'active',
    }).returning();
    const { sendEmail: sendInviteEmail, templates: emailTemplates, emailSubjects: subjects } = await import('../services/email.js');
    const [org] = req.body.orgId
      ? await db.select().from(s.organisations).where(eq(s.organisations.id, req.body.orgId)).limit(1)
      : [null];
    let emailResult: { ok: boolean; mode: string } = { ok: false, mode: 'unknown' };
    let emailError: string | undefined;
    try {
      emailResult = await sendInviteEmail({
        to: email,
        subject: subjects.invite(),
        html: emailTemplates.invite({
          name: req.body.fullName,
          role: req.body.role,
          orgName: org?.name,
          tempPassword: tempPass,
          email,
        }),
        text: `Welcome to IOU Exchange. Temporary password: ${tempPass}. Sign in at ${process.env.PORTAL_URL || 'https://app.ioux.africa'}/login and change it immediately.`,
        template: 'invite',
        relatedType: 'user',
        relatedId: user.id,
      });
      if (!emailResult.ok) {
        emailError = `Invite email not delivered (mode=${emailResult.mode})`;
        console.warn('[invite]', emailError, { email });
      }
    } catch (err) {
      emailError = err instanceof Error ? err.message : 'Invite email failed';
      console.error('[invite] email send failed', err);
    }
    await writeAudit({
      actorId: req.user!.userId,
      action: 'user.invite',
      resourceType: 'user',
      resourceId: user.id,
      details: { email, role: req.body.role, emailOk: emailResult.ok, emailMode: emailResult.mode },
    });
    // Never echo temporary password in API response
    res.status(201).json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      invited: true,
      emailSent: emailResult.ok,
      emailMode: emailResult.mode,
      ...(emailError ? { emailWarning: emailError } : {}),
    });
  } catch (e) { next(e); }
});

/** WS-07 — resend invite with a new temporary password */
apiRouter.post('/admin/users/:id/resend-invite', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [user] = await db.select().from(s.users).where(eq(s.users.id, req.params.id)).limit(1);
    if (!user) throw new AppError(404, 'not_found', 'User not found');
    const tempPass = generateTempPassword();
    assertStrongPassword(tempPass);
    const passwordHash = await bcrypt.hash(tempPass, 12);
    await db.update(s.users).set({
      passwordHash,
      mustChangePassword: true,
      updatedAt: new Date(),
    }).where(eq(s.users.id, user.id));

    const { sendEmail: sendInviteEmail, templates: emailTemplates, emailSubjects: subjects } = await import('../services/email.js');
    const [org] = user.orgId
      ? await db.select().from(s.organisations).where(eq(s.organisations.id, user.orgId)).limit(1)
      : [null];
    const emailResult = await sendInviteEmail({
      to: user.email,
      subject: subjects.invite(),
      html: emailTemplates.invite({
        name: user.fullName,
        role: user.role,
        orgName: org?.name,
        tempPassword: tempPass,
        email: user.email,
      }),
      text: `IOU Exchange invite (resent). Temporary password: ${tempPass}. Sign in at ${process.env.PORTAL_URL || 'https://app.ioux.africa'}/login and change it immediately.`,
      template: 'invite_resend',
      relatedType: 'user',
      relatedId: user.id,
    });
    await writeAudit({
      actorId: req.user!.userId,
      action: 'user.resend_invite',
      resourceType: 'user',
      resourceId: user.id,
      details: { email: user.email, emailOk: emailResult.ok, emailMode: emailResult.mode },
    });
    res.json({
      id: user.id,
      email: user.email,
      emailSent: emailResult.ok,
      emailMode: emailResult.mode,
      ...(emailResult.ok ? {} : { emailWarning: emailResult.error || `Email not delivered (mode=${emailResult.mode})` }),
    });
  } catch (e) { next(e); }
});

apiRouter.get('/admin/email-log', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const rows = await db.select().from(s.emailSendLog).orderBy(desc(s.emailSendLog.createdAt)).limit(limit);
    res.json({ data: rows });
  } catch (e) { next(e); }
});

apiRouter.get('/payment-schedule', authenticate, async (req, res, next) => {
  try {
    const orgId = req.user!.orgId;
    const role = req.user!.role;
    let invoices = await db.select().from(s.invoices);
    if (role === 'buyer' && orgId) {
      invoices = invoices.filter((i) => i.buyerOrgId === orgId);
    } else if (role === 'supplier' && orgId) {
      invoices = invoices.filter((i) => i.supplierOrgId === orgId);
    }
    const payableStatuses = ['assigned', 'disbursed', 'packaged', 'matured', 'settled'];
    const rows = invoices
      .filter((i) => payableStatuses.includes(i.status))
      .map((i) => {
        const due = new Date(i.dueDate);
        const now = new Date();
        let status = 'upcoming';
        if (i.status === 'settled') status = 'paid';
        else if (due < now) status = 'overdue';
        else if ((due.getTime() - now.getTime()) / 86400000 <= 14) status = 'due';
        return {
          id: `sched-${i.id}`,
          invoiceId: i.id,
          iouRegistryId: i.iouRegistryId,
          buyerId: i.buyerOrgId,
          supplierId: i.supplierOrgId,
          amount: Number(i.faceValue),
          dueDate: i.dueDate,
          status,
          paidAt: i.status === 'settled' ? i.updatedAt : null,
          payee: 'IOU Exchange Capital SPV',
        };
      });
    res.json({ data: rows });
  } catch (e) { next(e); }
});

apiRouter.get('/admin/analytics', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    res.json(await getAdminAnalytics());
  } catch (e) { next(e); }
});

apiRouter.get('/admin/reconciliation', authenticate, authorize('admin'), validate(z.object({
  from: z.string().optional(),
  to: z.string().optional(),
}), 'query'), async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 86400000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const toEnd = new Date(to.getTime() + 86400000);
    const escrow = await db.select().from(s.escrowLegs);
    const payments = await db.select().from(s.paymentUpdates);
    const invoices = await db.select().from(s.invoices);

    const inRange = (d: Date | string | null | undefined) => {
      if (!d) return false;
      const t = new Date(d).getTime();
      return t >= from.getTime() && t <= toEnd.getTime();
    };

    const disbursed = escrow.filter((l) => l.legType?.includes('disbursement') && l.status === 'released' && inRange(l.executedAt));
    const collected = escrow.filter((l) => l.legType?.includes('collection') && l.status === 'collected' && inRange(l.executedAt));
    const sumD = disbursed.reduce((s, l) => s + Number(l.amount), 0);
    const sumC = collected.reduce((s, l) => s + Number(l.amount), 0);

    res.json({
      period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
      disbursed: { count: disbursed.length, total: sumD },
      collected: { count: collected.length, total: sumC },
      variance: sumC - sumD,
      pendingEscrow: escrow.filter((l) => l.status === 'pending').length,
      settledInvoices: invoices.filter((i) => i.status === 'settled').length,
      paymentUpdates: payments.length,
    });
  } catch (e) { next(e); }
});

apiRouter.get('/buyers/:orgId/credit-risk', authenticate, authorize('buyer', 'spv', 'admin'), async (req, res, next) => {
  try {
    if (req.user!.role === 'buyer' && req.user!.orgId !== req.params.orgId) {
      throw new AppError(403, 'forbidden', 'Cannot view other buyer risk');
    }
    res.json(await getBuyerCreditRisk(req.params.orgId));
  } catch (e) { next(e); }
});

// AfyaX payment webhook
apiRouter.post('/webhooks/payment-update', apiKeyAuth, requireScope('payments:write'), validate(z.object({
  invoiceId: z.string().uuid().optional(),
  iouRegistryId: z.string().optional(),
  amountPaid: z.number(),
  outstandingBalance: z.number(),
  nextDueDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  afyaxReference: z.string().optional(),
  idempotencyKey: z.string().min(8).optional(),
})), async (req, res, next) => {
  try {
    const raw = (req as typeof req & { rawBody?: string }).rawBody || JSON.stringify(req.body);
    try {
      verifyWebhookSignature(
        raw,
        req.headers['x-afyax-signature'] as string | undefined,
        req.headers['x-afyax-timestamp'] as string | undefined,
      );
    } catch (sigErr) {
      console.warn('[webhook] payment-update signature rejected', {
        ip: req.ip,
        hasSignature: Boolean(req.headers['x-afyax-signature']),
        hasTimestamp: Boolean(req.headers['x-afyax-timestamp']),
        message: sigErr instanceof Error ? sigErr.message : String(sigErr),
      });
      throw sigErr;
    }
    if (req.body.idempotencyKey) {
      const [dup] = await db.select().from(s.paymentUpdates).where(
        eq(s.paymentUpdates.afyaxReference, req.body.idempotencyKey),
      ).limit(1);
      if (dup) return res.json({ ok: true, duplicate: true, update: dup });
    }
    const payload = {
      ...req.body,
      afyaxReference: req.body.idempotencyKey || req.body.afyaxReference,
    };
    const result = await applyPaymentUpdate(payload);
    res.json(result);
  } catch (e) { next(e); }
});

/** Explicit settlement recording (partner / admin) — IOUX does not move cash */
apiRouter.post('/settlements/notify', authenticateAny, validate(z.object({
  invoiceId: z.string().uuid().optional(),
  iouRegistryId: z.string().optional(),
  note: z.string().max(500).optional(),
  amountPaid: z.number().optional(),
  source: z.string().max(64).optional(),
})), async (req, res, next) => {
  try {
    if (!req.body.invoiceId && !req.body.iouRegistryId) {
      throw new AppError(400, 'validation_error', 'invoiceId or iouRegistryId required');
    }
    if (req.apiClient) {
      if (!(req.apiClient.scopes.includes('payments:write') || req.apiClient.scopes.includes('*'))) {
        throw new AppError(403, 'forbidden', 'Missing scopes: payments:write');
      }
    } else if (!req.user || !['admin', 'spv'].includes(req.user.role)) {
      throw new AppError(403, 'forbidden', 'Admin or SPV required');
    }
    const result = await recordSettlement({
      invoiceId: req.body.invoiceId,
      iouRegistryId: req.body.iouRegistryId,
      actorId: req.user?.userId,
      source: req.body.source || (req.apiClient ? 'api_key' : 'portal'),
      note: req.body.note,
      amountPaid: req.body.amountPaid,
    });
    res.json(result);
  } catch (e) { next(e); }
});

/**
 * Horizon C lite (WS-22 precursor) — evidence manifest for an instrument.
 * Returns metadata + document URLs; counsel-approved wording is a change-order item.
 */
apiRouter.get('/invoices/:id/evidence-bundle', authenticate, authorize('buyer', 'supplier', 'spv', 'admin'), async (req, res, next) => {
  try {
    const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, req.params.id)).limit(1);
    if (!inv) throw new AppError(404, 'not_found', 'Invoice not found');
    await assertInvoiceAccess(req.user!, inv);
    const [asgn] = await db.select().from(s.assignments).where(eq(s.assignments.invoiceId, inv.id)).limit(1);
    const consents = await db.select().from(s.assignmentConsents).where(eq(s.assignmentConsents.invoiceId, inv.id));
    const docs = await db.select().from(s.orgDocuments).where(
      and(
        eq(s.orgDocuments.orgId, inv.buyerOrgId),
      ),
    );
    const relatedDocs = docs.filter((d) => {
      const url = d.fileUrl || '';
      return url.includes(inv.iouRegistryId || '') || url.includes(inv.id)
        || ['purchase_note', 'assignment_letter', 'payment_receipt'].includes(d.docType || '');
    });
    const history = await db.select().from(s.invoiceStatusHistory).where(eq(s.invoiceStatusHistory.invoiceId, inv.id));
    res.json({
      invoiceId: inv.id,
      iouRegistryId: inv.iouRegistryId,
      status: inv.status,
      commitment: {
        commitmentToPay: inv.commitmentToPay,
        commitmentAckAt: inv.commitmentAckAt,
        commitmentAckBy: inv.commitmentAckBy,
        bankStandingOrderRef: inv.bankStandingOrderRef,
        standingOrderBank: inv.standingOrderBank,
        standingOrderSetAt: inv.standingOrderSetAt,
      },
      assignment: asgn ? {
        id: asgn.id,
        assignmentType: asgn.assignmentType,
        purchasePrice: asgn.purchasePrice,
        status: asgn.status,
        createdAt: asgn.createdAt,
      } : null,
      consents: consents.map((c) => ({
        id: c.id,
        status: c.status,
        signedAt: c.signedAt,
        otpVerified: c.otpVerified,
        signatureHash: c.signatureHash,
      })),
      documents: relatedDocs.map((d) => ({
        id: d.id,
        docType: d.docType,
        fileUrl: d.fileUrl,
        uploadedAt: d.uploadedAt,
      })),
      statusHistory: history,
      disclaimer: 'Evidence manifest for operational review. Not a counsel-certified true-sale opinion. IOU Exchange records references; it does not move cash or list notes on an exchange.',
    });
  } catch (e) { next(e); }
});

// Pricing helper
apiRouter.post('/pricing/quote', authenticate, validate(z.object({
  faceValue: z.number().positive(),
  issueDate: z.string(),
  dueDate: z.string(),
})), async (req, res, next) => {
  try {
    const tenor = computeTenorDays(req.body.issueDate, req.body.dueDate);
    res.json(priceReceivable({ faceValue: req.body.faceValue, tenorDays: tenor }));
  } catch (e) { next(e); }
});

// Payment updates list
apiRouter.get('/payment-updates', authenticate, authorize('buyer', 'supplier', 'spv', 'admin'), async (req, res, next) => {
  try {
    const role = req.user!.role;
    if (role === 'admin' || role === 'spv') {
      return res.json({ data: await db.select().from(s.paymentUpdates) });
    }
    const orgId = req.user!.orgId!;
    let invs = await db.select().from(s.invoices).where(
      role === 'buyer' ? eq(s.invoices.buyerOrgId, orgId) : eq(s.invoices.supplierOrgId, orgId),
    );
    // Suppliers only see repayment activity on sold / assigned receivables
    if (role === 'supplier') {
      const sold = new Set(['assigned', 'packaged', 'disbursed', 'matured', 'settled', 'sold']);
      invs = invs.filter((i) => sold.has(i.status) || i.listingStatus === 'sold');
    }
    const ids = new Set(invs.map((i) => i.id));
    const rows = (await db.select().from(s.paymentUpdates)).filter((p) => ids.has(p.invoiceId));
    res.json({ data: rows });
  } catch (e) { next(e); }
});

// API keys (buyer / admin) — raw key shown once
apiRouter.get('/api-keys', authenticate, authorize('buyer', 'admin'), async (req, res, next) => {
  try {
    const orgId = req.user!.role === 'admin' && req.query.orgId
      ? String(req.query.orgId)
      : req.user!.orgId;
    if (!orgId) throw new AppError(400, 'no_org', 'Organisation required');
    const rows = await db.select({
      id: s.apiKeys.id,
      label: s.apiKeys.label,
      keyPrefix: s.apiKeys.keyPrefix,
      scopes: s.apiKeys.scopes,
      isActive: s.apiKeys.isActive,
      lastUsed: s.apiKeys.lastUsed,
      createdAt: s.apiKeys.createdAt,
    }).from(s.apiKeys).where(eq(s.apiKeys.orgId, orgId));
    res.json({ data: rows });
  } catch (e) { next(e); }
});

apiRouter.post('/api-keys', authenticate, authorize('buyer', 'admin'), validate(z.object({
  label: z.string().min(1).max(80).optional(),
  scopes: z.array(z.string()).optional(),
})), async (req, res, next) => {
  try {
    const orgId = req.user!.orgId;
    if (!orgId) throw new AppError(400, 'no_org', 'Organisation required');
    const { raw, prefix } = generateApiKey();
    const keyHash = await bcrypt.hash(raw, 12);
    const [row] = await db.insert(s.apiKeys).values({
      orgId,
      keyHash,
      keyPrefix: prefix,
      label: req.body.label || 'AfyaX / ERP key',
      scopes: req.body.scopes || ['invoices:write', 'parties:write', 'payments:write'],
      isActive: true,
    }).returning();
    await writeAudit({
      actorId: req.user!.userId,
      action: 'api_key.created',
      resourceType: 'api_key',
      resourceId: row.id,
      details: { label: row.label, prefix },
    });
    const [org] = await db.select().from(s.organisations).where(eq(s.organisations.id, orgId)).limit(1);
    await notifyOrgUsers(orgId, {
      type: 'api_key_created',
      title: 'API key provisioned',
      body: `Key prefix ${prefix} — full key shown once in the portal`,
      referenceType: 'api_key',
      referenceId: row.id,
      emailHtml: templates.apiKeyCreated(prefix, org?.name),
      emailSubject: emailSubjects.apiKey(),
    });
    res.status(201).json({
      id: row.id,
      label: row.label,
      keyPrefix: row.keyPrefix,
      scopes: row.scopes,
      apiKey: raw,
      message: 'Copy this key now — it will not be shown again',
    });
  } catch (e) { next(e); }
});

apiRouter.post('/api-keys/:id/revoke', authenticate, authorize('buyer', 'admin'), async (req, res, next) => {
  try {
    const [row] = await db.select().from(s.apiKeys).where(eq(s.apiKeys.id, req.params.id)).limit(1);
    if (!row) throw new AppError(404, 'not_found', 'API key not found');
    if (req.user!.role !== 'admin' && row.orgId !== req.user!.orgId) {
      throw new AppError(403, 'forbidden', 'Cannot revoke another organisation key');
    }
    await db.update(s.apiKeys).set({ isActive: false }).where(eq(s.apiKeys.id, row.id));
    await writeAudit({
      actorId: req.user!.userId,
      action: 'api_key.revoked',
      resourceType: 'api_key',
      resourceId: row.id,
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Admin create organisation (KYC fields)
apiRouter.post('/organisations', authenticate, authorize('admin'), validate(z.object({
  name: z.string().min(1),
  orgType: z.enum(['buyer', 'supplier', 'spv', 'platform']),
  registrationNo: z.string().optional(),
  kraPin: z.string().optional(),
  address: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  ppbRegistration: z.string().optional(),
  ppbLicence: z.string().optional(),
  cmaReference: z.string().optional(),
  apiNote: z.string().max(2000).optional(),
  kycStatus: z.enum(['pending', 'verified', 'rejected']).optional(),
})), async (req, res, next) => {
  try {
    const body = req.body;
    const uzimaPartyId = generateUzimaPartyId(body.orgType);
    const [row] = await db.insert(s.organisations).values({
      name: body.name,
      orgType: body.orgType,
      registrationNo: body.registrationNo || null,
      uzimaPartyId,
      status: 'active',
      metadata: {
        kraPin: body.kraPin || null,
        address: body.address || null,
        contactEmail: body.contactEmail || null,
        contactPhone: body.contactPhone || null,
        ppbRegistration: body.ppbRegistration || null,
        ppbLicence: body.ppbLicence || null,
        cmaReference: body.cmaReference || null,
        apiNote: body.apiNote || null,
        kycStatus: body.kycStatus || 'pending',
      },
    }).returning();
    await writeAudit({
      actorId: req.user!.userId,
      action: 'organisation.created',
      resourceType: 'organisation',
      resourceId: row.id,
      details: { orgType: body.orgType, uzimaPartyId },
    });
    const html = templates.orgCreated(body.name, body.orgType, uzimaPartyId);
    const subject = emailSubjects.orgCreated(body.name);
    // Notify creating admin + optional contact email
    await notifyUser(req.user!.userId, {
      type: 'org_created',
      title: `Organisation created: ${body.name}`,
      body: `${body.orgType} · ${uzimaPartyId}`,
      referenceType: 'organisation',
      referenceId: row.id,
      emailHtml: html,
      emailSubject: subject,
    });
    if (body.contactEmail) {
      await sendEmail({
        to: body.contactEmail,
        subject,
        html,
        text: `Organisation ${body.name} (${body.orgType}) was registered on IOU Exchange. Party ID: ${uzimaPartyId}.`,
      });
    }
    res.status(201).json(row);
  } catch (e) { next(e); }
});

apiRouter.patch('/organisations/:id', authenticate, authorize('admin'), validate(z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['active', 'suspended', 'inactive']).optional(),
  kycStatus: z.enum(['pending', 'verified', 'rejected']).optional(),
  kraPin: z.string().optional(),
  address: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  ppbRegistration: z.string().optional(),
  ppbLicence: z.string().optional(),
  cmaReference: z.string().optional(),
})), async (req, res, next) => {
  try {
    const [existing] = await db.select().from(s.organisations).where(eq(s.organisations.id, req.params.id)).limit(1);
    if (!existing) throw new AppError(404, 'not_found', 'Organisation not found');
    const meta = { ...(existing.metadata as Record<string, unknown> || {}) };
    const body = req.body;
    if (body.kycStatus != null) meta.kycStatus = body.kycStatus;
    if (body.kraPin != null) meta.kraPin = body.kraPin;
    if (body.address != null) meta.address = body.address;
    if (body.contactEmail != null) meta.contactEmail = body.contactEmail;
    if (body.contactPhone != null) meta.contactPhone = body.contactPhone;
    if (body.ppbRegistration != null) meta.ppbRegistration = body.ppbRegistration;
    if (body.ppbLicence != null) meta.ppbLicence = body.ppbLicence;
    if (body.cmaReference != null) meta.cmaReference = body.cmaReference;
    const patch: Record<string, unknown> = { metadata: meta, updatedAt: new Date() };
    if (body.name) patch.name = body.name;
    if (body.status) patch.status = body.status;
    const [row] = await db.update(s.organisations).set(patch).where(eq(s.organisations.id, existing.id)).returning();
    if (body.kycStatus && body.kycStatus !== (existing.metadata as any)?.kycStatus) {
      await notifyOrgUsers(row.id, {
        type: 'kyc_updated',
        title: `KYC ${body.kycStatus}`,
        body: `Organisation KYC status is now ${body.kycStatus}`,
        referenceType: 'organisation',
        referenceId: row.id,
        emailHtml: templates.kycStatusUpdated(row.name, body.kycStatus),
        emailSubject: emailSubjects.kyc(row.name),
      });
    }
    await writeAudit({
      actorId: req.user!.userId,
      action: 'organisation.updated',
      resourceType: 'organisation',
      resourceId: row.id,
      details: { kycStatus: body.kycStatus || null },
    });
    res.json(row);
  } catch (e) { next(e); }
});

apiRouter.get('/system/health', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    let dbStatus: 'up' | 'down' = 'up';
    try {
      await db.select({ id: s.organisations.id }).from(s.organisations).limit(1);
    } catch {
      dbStatus = 'down';
    }
    let lastWebhook: string | null = null;
    try {
      const [latest] = await db.select().from(s.paymentUpdates).orderBy(desc(s.paymentUpdates.receivedAt)).limit(1);
      lastWebhook = latest?.receivedAt ? new Date(latest.receivedAt).toISOString() : null;
    } catch { /* */ }
    let unread = 0;
    try {
      unread = (await db.select().from(s.notifications).where(eq(s.notifications.isRead, false))).length;
    } catch { /* */ }
    res.json({
      status: dbStatus === 'up' ? 'ok' : 'degraded',
      service: 'uzima-api',
      version: '2.0.0',
      db: dbStatus,
      lastAfyaXWebhookAt: lastWebhook,
      unreadNotifications: unread,
      time: new Date().toISOString(),
    });
  } catch (e) { next(e); }
});
