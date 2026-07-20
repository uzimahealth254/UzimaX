import {
  authenticate, authorize, apiKeyAuth, requireScope,
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
  applyPaymentUpdate,
  getOrCreateWallet,
  createAssignment,
} from '../services/core.js';
import { computeTenorDays, priceReceivable } from '../lib/pricing.js';
import { writeAudit } from '../middleware/audit.js';
import { storeFile, readStoredFile, orgIdFromStorageKey } from '../services/storage.js';
import { issueOtp, verifyOtp } from '../services/otp.js';
import { generateAssignmentLetter } from '../services/pdf.js';
import { getAdminAnalytics, getProgrammeUtilisation, getBuyerCreditRisk } from '../services/analytics.js';
import {
  assertInvoiceAccess, assertOrgMatch, assertBuyerOrg, assertSupplierOrg,
} from '../middleware/access.js';
import {
  assertStrongPassword, bodyRefreshAllowed, generateTempPassword,
  REFRESH_COOKIE, refreshCookieOptions, simulatedWalletAllowed,
  verifyWebhookSignature,
} from '../lib/security.js';
import { assertNotLockedOut, recordFailedLogin, clearFailedLogin } from '../middleware/rateLimit.js';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import multer from 'multer';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import * as s from '../db/schema.js';
export const authRouter = Router();
export const apiRouter = Router();

async function persistRefreshToken(userId: string, refreshToken: string) {
  const refreshHash = await bcrypt.hash(refreshToken, 10);
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
    });
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
    await db.update(s.users).set({ passwordHash }).where(eq(s.users.id, user.id));
    await db.delete(s.refreshTokens).where(eq(s.refreshTokens.userId, user.id));
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
});

apiRouter.post('/invoices', authenticate, validate(invoiceCreateSchema), async (req, res, next) => {
  try {
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
      }, user.userId);
      return res.status(201).json(result.invoice);
    }

    if (user.role === 'supplier') {
      supplierOrgId = user.orgId!;
      if (!buyerOrgId) throw new AppError(400, 'validation_error', 'buyerOrgId required');
      const result = await createSupplierOriginatedInvoice({
        buyerOrgId, supplierOrgId, invoiceNumber: body.invoiceNumber,
        faceValue: face, currency: body.currency, issueDate: body.issueDate, dueDate: body.dueDate,
        description: body.description,
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
    const result = await createBuyerOriginatedInvoice({
      buyerOrgId, supplierOrgId,
      invoiceNumber: body.invoiceNumber, poReference: body.poReference,
      faceValue: body.faceValue || body.amount,
      currency: body.currency, issueDate: body.issueDate, dueDate: body.dueDate,
      description: body.description, interestRate: body.interestRate,
      installmentSchedule: body.installmentSchedule, origin: 'api_upload',
    });
    res.status(201).json({
      id: result.invoice.id,
      iouRegistryId: result.invoice.iouRegistryId,
      status: result.invoice.status,
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

apiRouter.get('/invoices/:id/status', authenticate, async (req, res, next) => {
  try {
    const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, req.params.id)).limit(1);
    assertInvoiceAccess(req.user!, inv);
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
apiRouter.get('/opt-ins', authenticate, async (req, res, next) => {
  try {
    const orgId = req.user!.orgId!;
    const rows = req.user!.role === 'admin'
      ? await db.select().from(s.optIns)
      : await db.select().from(s.optIns).where(eq(s.optIns.supplierOrgId, orgId));
    res.json({ data: rows });
  } catch (e) { next(e); }
});

apiRouter.post('/opt-ins/:id/respond', authenticate, authorize('supplier', 'admin'), validate(z.object({
  accept: z.boolean(),
  declineReason: z.string().optional(),
})), async (req, res, next) => {
  try {
    const [opt] = await db.select().from(s.optIns).where(eq(s.optIns.id, req.params.id)).limit(1);
    if (!opt) throw new AppError(404, 'not_found', 'Opt-in not found');
    assertSupplierOrg(req.user!, opt.supplierOrgId);
    const result = await respondToOptIn(req.params.id, req.body.accept, req.user!.userId, req.body.declineReason);
    res.json(result);
  } catch (e) { next(e); }
});

// Buyer verifications
apiRouter.get('/buyer-verifications', authenticate, async (req, res, next) => {
  try {
    const orgId = req.user!.orgId!;
    const rows = req.user!.role === 'admin'
      ? await db.select().from(s.buyerVerifications)
      : await db.select().from(s.buyerVerifications).where(eq(s.buyerVerifications.buyerOrgId, orgId));
    res.json({ data: rows });
  } catch (e) { next(e); }
});

apiRouter.post('/buyer-verifications/:id/respond', authenticate, authorize('buyer', 'admin'), validate(z.object({
  accept: z.boolean(),
  rejectReason: z.string().optional(),
})), async (req, res, next) => {
  try {
    const [v] = await db.select().from(s.buyerVerifications).where(eq(s.buyerVerifications.id, req.params.id)).limit(1);
    if (!v) throw new AppError(404, 'not_found', 'Verification not found');
    assertBuyerOrg(req.user!, v.buyerOrgId);
    const result = await respondToBuyerVerification(req.params.id, req.body.accept, req.user!.userId, req.body.rejectReason);
    res.json(result);
  } catch (e) { next(e); }
});

// Assignments
apiRouter.get('/assignments', authenticate, async (req, res, next) => {
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
apiRouter.get('/offers', authenticate, async (req, res, next) => {
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
    const face = Number(inv.faceValue);
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
    res.status(201).json(offer);
  } catch (e) { next(e); }
});

apiRouter.post('/offers/:id/respond', authenticate, authorize('supplier', 'admin'), validate(z.object({
  accept: z.boolean(),
})), async (req, res, next) => {
  try {
    const [offer] = await db.select().from(s.purchaseOffers).where(eq(s.purchaseOffers.id, req.params.id)).limit(1);
    if (!offer) throw new AppError(404, 'not_found', 'Offer not found');
    const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, offer.invoiceId)).limit(1);
    assertInvoiceAccess(req.user!, inv);
    assertSupplierOrg(req.user!, inv.supplierOrgId);
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
      return res.json({ offer, consent });
    }
    res.json({ offer });
  } catch (e) { next(e); }
});

// Consents
apiRouter.get('/consents', authenticate, async (req, res, next) => {
  try {
    const rows = req.user!.role === 'buyer'
      ? await db.select().from(s.assignmentConsents).where(eq(s.assignmentConsents.buyerOrgId, req.user!.orgId!))
      : await db.select().from(s.assignmentConsents);
    res.json({ data: rows });
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
    res.status(201).json(consent);
  } catch (e) { next(e); }
});

apiRouter.post('/consents/:id/request-otp', authenticate, authorize('buyer', 'admin'), async (req, res, next) => {
  try {
    const [consent] = await db.select().from(s.assignmentConsents).where(eq(s.assignmentConsents.id, req.params.id)).limit(1);
    if (!consent) throw new AppError(404, 'not_found', 'Consent not found');
    assertBuyerOrg(req.user!, consent.buyerOrgId);
    if (consent.status !== 'pending') throw new AppError(400, 'invalid_state', 'Consent already signed');
    const hint = await issueOtp({
      userId: req.user!.userId,
      purpose: `consent:${consent.id}`,
      email: req.user!.email,
    });
    res.json({ otpSent: true, consentId: consent.id, ...hint });
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

    await verifyOtp(req.user!.userId, `consent:${consent.id}`, req.body.otp);

    const hash = crypto.createHash('sha256').update(`${consent.id}:${req.user!.userId}:${Date.now()}`).digest('hex');
    await db.update(s.assignmentConsents).set({
      status: 'signed',
      otpVerified: true,
      signatureHash: hash,
      signedAt: new Date(),
    }).where(eq(s.assignmentConsents.id, consent.id));

    const [offer] = await db.select().from(s.purchaseOffers).where(eq(s.purchaseOffers.invoiceId, consent.invoiceId)).limit(1);
    const asgn = await createAssignment({
      invoiceId: consent.invoiceId,
      type: 'offer_consent',
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

    res.json({ consent: { ...consent, status: 'signed', signatureHash: hash }, assignment: asgn });
  } catch (e) { next(e); }
});

/** Alias requiring OTP — no default bypass */
apiRouter.post('/consents/:id/sign', authenticate, authorize('buyer', 'admin'), validate(z.object({
  otp: z.string().min(4),
})), async (req, res, next) => {
  try {
    // Delegate to confirm-sign logic via internal re-dispatch pattern
    const [consent] = await db.select().from(s.assignmentConsents).where(eq(s.assignmentConsents.id, req.params.id)).limit(1);
    if (!consent) throw new AppError(404, 'not_found', 'Consent not found');
    assertBuyerOrg(req.user!, consent.buyerOrgId);
    if (consent.status !== 'pending') throw new AppError(400, 'invalid_state', 'Consent already signed');
    await verifyOtp(req.user!.userId, `consent:${consent.id}`, req.body.otp);
    const hash = crypto.createHash('sha256').update(`${consent.id}:${req.user!.userId}:${Date.now()}`).digest('hex');
    await db.update(s.assignmentConsents).set({
      status: 'signed', otpVerified: true, signatureHash: hash, signedAt: new Date(),
    }).where(eq(s.assignmentConsents.id, consent.id));
    const [offer] = await db.select().from(s.purchaseOffers).where(eq(s.purchaseOffers.invoiceId, consent.invoiceId)).limit(1);
    const asgn = await createAssignment({
      invoiceId: consent.invoiceId, type: 'offer_consent', actorId: req.user!.userId,
      offerId: offer?.id, consentId: consent.id, discountBps: offer?.discountRateBps,
    });
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

// Wallets
apiRouter.get('/wallets/me', authenticate, async (req, res, next) => {
  try {
    if (!req.user!.orgId) throw new AppError(400, 'no_org', 'User has no organisation');
    const wallet = await getOrCreateWallet(req.user!.orgId);
    const txs = await db.select().from(s.walletTransactions).where(eq(s.walletTransactions.walletId, wallet.id));
    res.json({ wallet, transactions: txs });
  } catch (e) { next(e); }
});

apiRouter.post('/wallets/me/deposit', authenticate, validate(z.object({
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

apiRouter.post('/wallets/me/withdraw', authenticate, validate(z.object({
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
    res.json({ data: await db.select().from(s.packages) });
  } catch (e) { next(e); }
});

apiRouter.post('/packages', authenticate, authorize('spv', 'admin'), validate(z.object({
  packageRef: z.string().min(1),
  assignmentIds: z.array(z.string().uuid()).min(1),
})), async (req, res, next) => {
  try {
    const asgns = await db.select().from(s.assignments);
    const selected = asgns.filter((a) => req.body.assignmentIds.includes(a.id));
    const totalFace = selected.reduce((sum, a) => sum + Number(a.faceValue), 0);
    const totalPurchase = selected.reduce((sum, a) => sum + Number(a.purchasePrice || 0), 0);
    const [pkg] = await db.insert(s.packages).values({
      packageRef: req.body.packageRef,
      status: 'draft',
      totalFaceValue: String(totalFace),
      totalPurchasePrice: String(totalPurchase),
      createdBy: req.user!.userId,
    }).returning();
    await db.insert(s.packageItems).values(selected.map((a) => ({ packageId: pkg.id, assignmentId: a.id })));
    for (const a of selected) {
      await db.update(s.invoices).set({ status: 'packaged', updatedAt: new Date() }).where(eq(s.invoices.id, a.invoiceId));
    }
    res.status(201).json(pkg);
  } catch (e) { next(e); }
});

apiRouter.patch('/packages/:id/status', authenticate, authorize('spv', 'admin'), validate(z.object({
  status: z.enum(['draft', 'structured', 'listed', 'placed', 'settled']),
})), async (req, res, next) => {
  try {
    const nseReference = req.body.status === 'listed' ? `NSE-USP-${Date.now()}` : undefined;
    const [pkg] = await db.update(s.packages).set({
      status: req.body.status,
      nseReference: nseReference || undefined,
      updatedAt: new Date(),
    }).where(eq(s.packages.id, req.params.id)).returning();
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
      isActive: true,
    }).returning();
    res.status(201).json(row);
  } catch (e) { next(e); }
});

apiRouter.patch('/signatories/:id', authenticate, validate(z.object({
  roleTitle: z.string().optional(),
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
  maxTenorDays: z.number().int().positive().optional(),
  discountBandMinBps: z.number().int().optional(),
  discountBandMaxBps: z.number().int().optional(),
})), async (req, res, next) => {
  try {
    const [row] = await db.insert(s.programmes).values({
      name: req.body.name,
      buyerOrgId: req.body.buyerOrgId || null,
      maxExposure: String(req.body.maxExposure),
      maxTenorDays: req.body.maxTenorDays ?? 180,
      discountBandMinBps: req.body.discountBandMinBps ?? 300,
      discountBandMaxBps: req.body.discountBandMaxBps ?? 900,
      status: 'active',
    }).returning();
    res.status(201).json(row);
  } catch (e) { next(e); }
});

apiRouter.patch('/programmes/:id', authenticate, authorize('admin'), validate(z.object({
  name: z.string().optional(),
  maxExposure: z.number().optional(),
  maxTenorDays: z.number().int().optional(),
  discountBandMinBps: z.number().int().optional(),
  discountBandMaxBps: z.number().int().optional(),
  status: z.enum(['active', 'paused', 'closed']).optional(),
})), async (req, res, next) => {
  try {
    const patch: Record<string, unknown> = { ...req.body };
    if (req.body.maxExposure != null) patch.maxExposure = String(req.body.maxExposure);
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

// Organisations (for forms) — non-admin get limited public fields only
apiRouter.get('/organisations', authenticate, async (req, res, next) => {
  try {
    const rows = await db.select().from(s.organisations);
    if (req.user!.role === 'admin') {
      return res.json({ data: rows });
    }
    res.json({
      data: rows.map((o) => ({
        id: o.id,
        name: o.name,
        orgType: o.orgType,
        uzimaPartyId: o.uzimaPartyId,
        status: o.status,
      })),
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
  role: z.enum(['supplier', 'buyer', 'spv', 'admin']),
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
      status: 'active',
    }).returning();
    const { sendEmail } = await import('../services/email.js');
    await sendEmail({
      to: email,
      subject: 'You are invited to Uzima',
      html: `<p>Welcome to Uzima. Your temporary password is <strong>${tempPass}</strong>. Sign in and change it after login.</p>`,
      text: `Welcome to Uzima. Temporary password: ${tempPass}`,
    });
    await writeAudit({
      actorId: req.user!.userId,
      action: 'user.invite',
      resourceType: 'user',
      resourceId: user.id,
      details: { email, role: req.body.role },
    });
    // Never echo temporary password in API response
    res.status(201).json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      invited: true,
    });
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
          payee: 'Uzima Capital SPV',
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

apiRouter.get('/buyers/:orgId/credit-risk', authenticate, async (req, res, next) => {
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
    verifyWebhookSignature(
      raw,
      req.headers['x-afyax-signature'] as string | undefined,
      req.headers['x-afyax-timestamp'] as string | undefined,
    );
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
apiRouter.get('/payment-updates', authenticate, async (req, res, next) => {
  try {
    const role = req.user!.role;
    if (role === 'admin' || role === 'spv') {
      return res.json({ data: await db.select().from(s.paymentUpdates) });
    }
    const orgId = req.user!.orgId!;
    const invs = await db.select().from(s.invoices).where(
      role === 'buyer' ? eq(s.invoices.buyerOrgId, orgId) : eq(s.invoices.supplierOrgId, orgId),
    );
    const ids = new Set(invs.map((i) => i.id));
    const rows = (await db.select().from(s.paymentUpdates)).filter((p) => ids.has(p.invoiceId));
    res.json({ data: rows });
  } catch (e) { next(e); }
});
