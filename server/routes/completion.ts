import multer from 'multer';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import * as s from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize, apiKeyAuth, requireScope } from '../middleware/auth.js';
import { assertStrongPassword, generateApiKey } from '../lib/security.js';
import { sendEmail } from '../services/email.js';
import { storeFile } from '../services/storage.js';
import { writeAudit } from '../middleware/audit.js';
import { respondToOptIn } from '../services/core.js';

export const completionRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const STATUSES = ['requested', 'confirmed', 'executed', 'failed', 'cancelled', 'amended'] as const;

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function portalBase() {
  return (process.env.PORTAL_URL || 'https://uzimax.onrender.com').replace(/\/$/, '');
}

completionRouter.get('/standing-orders', authenticate, authorize('buyer', 'admin', 'spv'), async (req, res, next) => {
  try {
    const invoiceId = typeof req.query.invoiceId === 'string' ? req.query.invoiceId : '';
    const rows = await db.select().from(s.standingOrders).orderBy(desc(s.standingOrders.createdAt));
    const scoped = req.user!.role === 'buyer'
      ? rows.filter((row) => row.buyerOrgId === req.user!.orgId)
      : rows;
    res.json({ data: invoiceId ? scoped.filter((row) => row.invoiceId === invoiceId) : scoped });
  } catch (e) { next(e); }
});

completionRouter.post('/standing-orders', authenticate, authorize('buyer', 'admin'), validate(z.object({
  invoiceId: z.string().uuid(),
  bankName: z.string().min(2),
  accountMasked: z.string().max(32).optional(),
  reference: z.string().max(128).optional(),
  amount: z.number().positive(),
  currency: z.string().default('KES'),
  firstExecutionDate: z.string(),
  frequency: z.enum(['once', 'monthly', 'per_installment']).default('once'),
})), async (req, res, next) => {
  try {
    const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, req.body.invoiceId)).limit(1);
    if (!inv) throw new AppError(404, 'not_found', 'Invoice not found');
    if (req.user!.role === 'buyer' && inv.buyerOrgId !== req.user!.orgId) {
      throw new AppError(403, 'forbidden', 'This invoice is not yours');
    }
    const masked = req.body.accountMasked ? String(req.body.accountMasked).replace(/\d(?=\d{4})/g, '*') : null;
    const [row] = await db.insert(s.standingOrders).values({
      invoiceId: inv.id,
      buyerOrgId: inv.buyerOrgId,
      bankName: req.body.bankName,
      accountMasked: masked,
      reference: req.body.reference || null,
      amount: String(req.body.amount),
      currency: req.body.currency,
      firstExecutionDate: req.body.firstExecutionDate,
      frequency: req.body.frequency,
      status: 'requested',
      history: [{ at: new Date().toISOString(), status: 'requested', by: req.user!.email }],
      createdBy: req.user!.userId,
    }).returning();
    await db.update(s.invoices).set({
      bankStandingOrderRef: req.body.reference || inv.bankStandingOrderRef,
      standingOrderBank: req.body.bankName,
      standingOrderSetAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(s.invoices.id, inv.id));
    await writeAudit({
      actorId: req.user!.userId, action: 'standing_order.requested', resourceType: 'standing_order', resourceId: row.id,
      details: { invoiceId: inv.id, bankName: req.body.bankName },
    });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

completionRouter.patch('/standing-orders/:id', authenticate, authorize('buyer', 'admin'), validate(z.object({
  status: z.enum(STATUSES),
  statusReason: z.string().max(500).optional(),
})), async (req, res, next) => {
  try {
    const [existing] = await db.select().from(s.standingOrders).where(eq(s.standingOrders.id, req.params.id)).limit(1);
    if (!existing) throw new AppError(404, 'not_found', 'Standing order not found');
    if (req.user!.role === 'buyer' && existing.buyerOrgId !== req.user!.orgId) {
      throw new AppError(403, 'forbidden', 'This standing order is not yours');
    }
    const history = Array.isArray(existing.history) ? existing.history : [];
    const [row] = await db.update(s.standingOrders).set({
      status: req.body.status,
      statusReason: req.body.statusReason || null,
      history: [...history, { at: new Date().toISOString(), status: req.body.status, reason: req.body.statusReason || null, by: req.user!.email }],
      updatedAt: new Date(),
    }).where(eq(s.standingOrders.id, existing.id)).returning();
    res.json(row);
  } catch (e) { next(e); }
});

completionRouter.get('/access-requests', authenticate, async (req, res, next) => {
  try {
    const rows = await db.select().from(s.userAccessRequests).orderBy(desc(s.userAccessRequests.createdAt));
    const data = req.user!.role === 'admin' ? rows : rows.filter((row) => row.orgId === req.user!.orgId);
    res.json({ data });
  } catch (e) { next(e); }
});

completionRouter.post('/access-requests', authenticate, authorize('spv', 'buyer', 'supplier', 'admin'), validate(z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  phoneCountryCode: z.string().optional(),
  capacity: z.string().optional(),
  isSignatory: z.boolean().optional(),
})), async (req, res, next) => {
  try {
    if (!req.user!.orgId) throw new AppError(400, 'no_org', 'Organisation required');
    const [row] = await db.insert(s.userAccessRequests).values({
      orgId: req.user!.orgId,
      requestedBy: req.user!.userId,
      fullName: req.body.fullName,
      email: req.body.email.toLowerCase(),
      phone: req.body.phone || null,
      phoneCountryCode: req.body.phoneCountryCode || null,
      capacity: req.body.capacity || null,
      isSignatory: !!req.body.isSignatory,
      status: 'pending',
    }).returning();
    res.status(201).json(row);
  } catch (e) { next(e); }
});

completionRouter.post('/access-requests/:id/documents', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    const [existing] = await db.select().from(s.userAccessRequests).where(eq(s.userAccessRequests.id, req.params.id)).limit(1);
    if (!existing) throw new AppError(404, 'not_found', 'Request not found');
    if (req.user!.role !== 'admin' && existing.orgId !== req.user!.orgId) {
      throw new AppError(403, 'forbidden', 'This request is not yours');
    }
    if (!req.file) throw new AppError(400, 'no_file', 'Choose a file');
    const stored = await storeFile({
      orgId: existing.orgId,
      originalName: req.file.originalname,
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
    });
    const documents = [...(existing.documents || []), { name: req.file.originalname, fileUrl: stored.url }];
    const [row] = await db.update(s.userAccessRequests).set({ documents }).where(eq(s.userAccessRequests.id, existing.id)).returning();
    res.json({ id: row.id, documents: row.documents });
  } catch (e) { next(e); }
});

completionRouter.post('/access-requests/:id/decide', authenticate, authorize('admin'), validate(z.object({
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().max(500).optional(),
})), async (req, res, next) => {
  try {
    const [existing] = await db.select().from(s.userAccessRequests).where(eq(s.userAccessRequests.id, req.params.id)).limit(1);
    if (!existing || existing.status !== 'pending') throw new AppError(400, 'invalid_state', 'Request is not pending');
    if (req.body.decision === 'rejected') {
      const [row] = await db.update(s.userAccessRequests).set({
        status: 'rejected',
        decisionReason: req.body.reason || null,
        decidedBy: req.user!.userId,
        decidedAt: new Date(),
      }).where(eq(s.userAccessRequests.id, existing.id)).returning();
      return res.json(row);
    }
    const token = crypto.randomBytes(24).toString('hex');
    const [row] = await db.update(s.userAccessRequests).set({
      status: 'approved',
      decisionReason: req.body.reason || null,
      decidedBy: req.user!.userId,
      decidedAt: new Date(),
      inviteTokenHash: sha256(token),
      inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }).where(eq(s.userAccessRequests.id, existing.id)).returning();
    const link = `${portalBase()}/accept-invite?token=${token}`;
    await sendEmail({
      to: existing.email,
      subject: 'Your IOU Exchange invitation',
      template: 'access_invite',
      html: `<p>Hello ${existing.fullName},</p><p>Your access was approved. This link expires in 7 days and does not contain a password.</p><p><a href="${link}">${link}</a></p>`,
      text: `Set your password: ${link}`,
    });
    res.json({ id: row.id, status: row.status, inviteSentTo: existing.email });
  } catch (e) { next(e); }
});

completionRouter.post('/access-requests/accept', validate(z.object({
  token: z.string().min(20),
  password: z.string().min(12),
})), async (req, res, next) => {
  try {
    assertStrongPassword(req.body.password);
    const hash = sha256(req.body.token);
    const [invite] = await db.select().from(s.userAccessRequests).where(eq(s.userAccessRequests.inviteTokenHash, hash)).limit(1);
    if (!invite || invite.status !== 'approved' || !invite.inviteExpiresAt || invite.inviteExpiresAt < new Date()) {
      throw new AppError(400, 'invalid_invite', 'This invitation is invalid or expired');
    }
    const [org] = await db.select().from(s.organisations).where(eq(s.organisations.id, invite.orgId)).limit(1);
    const role = org?.orgType === 'platform' ? 'admin' : (org?.orgType || 'supplier');
    const [user] = await db.insert(s.users).values({
      email: invite.email,
      fullName: invite.fullName,
      passwordHash: await bcrypt.hash(req.body.password, 12),
      role: role === 'buyer' || role === 'supplier' || role === 'spv' || role === 'admin' ? role : 'supplier',
      orgId: invite.orgId,
      phone: invite.phone,
      phoneCountryCode: invite.phoneCountryCode,
      isSignatory: !!invite.isSignatory,
      status: 'active',
    }).returning();
    await db.update(s.userAccessRequests).set({
      status: 'accepted',
      acceptedAt: new Date(),
      userId: user.id,
      inviteTokenHash: null,
    }).where(eq(s.userAccessRequests.id, invite.id));
    res.json({ ok: true, email: user.email });
  } catch (e) { next(e); }
});

completionRouter.get('/credential-invites', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    const rows = await db.select({
      id: s.credentialInvites.id,
      projectName: s.credentialInvites.projectName,
      contactName: s.credentialInvites.contactName,
      contactEmail: s.credentialInvites.contactEmail,
      environment: s.credentialInvites.environment,
      scopes: s.credentialInvites.scopes,
      expiresAt: s.credentialInvites.expiresAt,
      claimedAt: s.credentialInvites.claimedAt,
      revokedAt: s.credentialInvites.revokedAt,
      createdAt: s.credentialInvites.createdAt,
    }).from(s.credentialInvites).orderBy(desc(s.credentialInvites.createdAt));
    res.json({ data: rows });
  } catch (e) { next(e); }
});

completionRouter.post('/credential-invites', authenticate, authorize('admin'), validate(z.object({
  orgId: z.string().uuid(),
  projectName: z.string().min(2),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  environment: z.enum(['sandbox', 'production']).default('production'),
  scopes: z.array(z.string()).optional(),
})), async (req, res, next) => {
  try {
    const token = crypto.randomBytes(24).toString('hex');
    const [row] = await db.insert(s.credentialInvites).values({
      orgId: req.body.orgId,
      projectName: req.body.projectName,
      contactName: req.body.contactName,
      contactEmail: req.body.contactEmail.toLowerCase(),
      environment: req.body.environment,
      scopes: req.body.scopes || ['invoices:write', 'parties:write', 'payments:write', 'invoices:read', 'parties:read'],
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      createdBy: req.user!.userId,
    }).returning();
    const link = `${portalBase()}/claim-key?token=${token}`;
    await sendEmail({
      to: req.body.contactEmail,
      subject: `IOU Exchange API access for ${req.body.projectName}`,
      template: 'credential_invite',
      html: `<p>Hello ${req.body.contactName},</p><p>Open this single-use link within 48 hours. The API key is shown once on that page and is not included in this email.</p><p><a href="${link}">${link}</a></p>`,
      text: `Claim the API key (shown once, not in this email): ${link}`,
    });
    res.status(201).json({ id: row.id, expiresAt: row.expiresAt, sentTo: row.contactEmail });
  } catch (e) { next(e); }
});

completionRouter.post('/credential-invites/:id/revoke', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [row] = await db.update(s.credentialInvites).set({ revokedAt: new Date() }).where(eq(s.credentialInvites.id, req.params.id)).returning();
    if (!row) throw new AppError(404, 'not_found', 'Invite not found');
    if (row.apiKeyId) {
      await db.update(s.apiKeys).set({ isActive: false, revokedAt: new Date() }).where(eq(s.apiKeys.id, row.apiKeyId));
    }
    res.json({ id: row.id, revokedAt: row.revokedAt });
  } catch (e) { next(e); }
});

completionRouter.post('/credential-invites/claim', validate(z.object({
  token: z.string().min(20),
})), async (req, res, next) => {
  try {
    const [invite] = await db.select().from(s.credentialInvites).where(eq(s.credentialInvites.tokenHash, sha256(req.body.token))).limit(1);
    if (!invite || invite.revokedAt || invite.expiresAt < new Date()) {
      throw new AppError(400, 'invalid_invite', 'This link is invalid or expired');
    }
    if (invite.claimedAt) throw new AppError(410, 'already_claimed', 'This key was already shown');
    const { raw, prefix } = generateApiKey();
    const [key] = await db.insert(s.apiKeys).values({
      orgId: invite.orgId,
      keyHash: await bcrypt.hash(raw, 12),
      keyPrefix: prefix,
      label: invite.projectName,
      scopes: invite.scopes || [],
      environment: invite.environment,
      isActive: true,
    }).returning();
    await db.update(s.credentialInvites).set({
      claimedAt: new Date(),
      claimedIp: req.ip || null,
      apiKeyId: key.id,
    }).where(eq(s.credentialInvites.id, invite.id));
    res.json({
      apiKey: raw,
      prefix,
      environment: invite.environment,
      scopes: invite.scopes,
      projectName: invite.projectName,
    });
  } catch (e) { next(e); }
});

completionRouter.get('/settings/security', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    const [row] = await db.select().from(s.platformSettings).where(eq(s.platformSettings.key, 'login_otp')).limit(1);
    res.json({ loginOtp: Boolean((row?.value as { enabled?: boolean } | undefined)?.enabled) });
  } catch (e) { next(e); }
});

completionRouter.put('/settings/security', authenticate, authorize('admin'), validate(z.object({
  loginOtp: z.boolean(),
})), async (req, res, next) => {
  try {
    await db.insert(s.platformSettings).values({
      key: 'login_otp',
      value: { enabled: req.body.loginOtp },
      updatedBy: req.user!.userId,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: s.platformSettings.key,
      set: { value: { enabled: req.body.loginOtp }, updatedBy: req.user!.userId, updatedAt: new Date() },
    });
    await writeAudit({
      actorId: req.user!.userId, action: 'settings.login_otp', resourceType: 'platform_settings', resourceId: 'login_otp',
      details: { enabled: req.body.loginOtp },
    });
    res.json({ loginOtp: req.body.loginOtp });
  } catch (e) { next(e); }
});

completionRouter.patch('/me/contact', authenticate, validate(z.object({
  phone: z.string().min(6).max(20),
  phoneCountryCode: z.string().min(2).max(6),
  smsOptIn: z.boolean(),
})), async (req, res, next) => {
  try {
    const [row] = await db.update(s.users).set({
      phone: req.body.phone,
      phoneCountryCode: req.body.phoneCountryCode,
      smsOptIn: req.body.smsOptIn,
      updatedAt: new Date(),
    }).where(eq(s.users.id, req.user!.userId)).returning({
      phone: s.users.phone,
      phoneCountryCode: s.users.phoneCountryCode,
      smsOptIn: s.users.smsOptIn,
    });
    res.json(row);
  } catch (e) { next(e); }
});

completionRouter.post('/external/opt-ins', apiKeyAuth, requireScope('invoices:write'), validate(z.object({
  iouRegistryId: z.string().min(4),
  decision: z.enum(['accept', 'decline']),
  actorEmail: z.string().email(),
  listedAmount: z.number().positive().optional(),
  declineReason: z.string().optional(),
  evidence: z.string().max(2000).optional(),
})), async (req, res, next) => {
  try {
    const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.iouRegistryId, req.body.iouRegistryId)).limit(1);
    if (!inv) throw new AppError(404, 'not_found', 'IOU not found');
    const [actor] = await db.select().from(s.users).where(and(
      eq(s.users.email, req.body.actorEmail.toLowerCase()),
      eq(s.users.orgId, inv.supplierOrgId),
      eq(s.users.status, 'active'),
    )).limit(1);
    if (!actor) throw new AppError(403, 'actor_not_authorised', 'actorEmail must be an active user of the supplier organisation');
    const [opt] = await db.select().from(s.optIns).where(and(
      eq(s.optIns.invoiceId, inv.id),
      eq(s.optIns.status, 'pending'),
    )).limit(1);
    if (!opt) throw new AppError(400, 'invalid_state', 'No pending supplier opt-in for this IOU');
    const result = await respondToOptIn(
      opt.id,
      req.body.decision === 'accept',
      actor.id,
      req.body.declineReason,
      req.body.listedAmount,
    );
    await writeAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'opt_in.api',
      resourceType: 'invoice',
      resourceId: inv.id,
      details: { decision: req.body.decision, evidence: req.body.evidence || null, via: 'partner_api' },
    });
    const [updated] = await db.select().from(s.invoices).where(eq(s.invoices.id, inv.id)).limit(1);
    res.json({
      iouRegistryId: inv.iouRegistryId,
      status: updated?.status,
      decision: req.body.decision,
      assignmentId: result.assignment && typeof result.assignment === 'object' && 'id' in result.assignment
        ? result.assignment.id
        : null,
    });
  } catch (e) { next(e); }
});

export async function loginOtpEnabled(): Promise<boolean> {
  try {
    const [row] = await db.select().from(s.platformSettings).where(eq(s.platformSettings.key, 'login_otp')).limit(1);
    return Boolean((row?.value as { enabled?: boolean } | undefined)?.enabled);
  } catch {
    return false;
  }
}

