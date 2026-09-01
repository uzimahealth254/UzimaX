import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema.js';
import {
  buildAfyaxPurchasePayload,
  resolveAfyaxLifecycleUrl,
  resolveAfyaxPurchaseUrl,
  shouldSendAfyaxPurchase,
  skipAfyaxPurchaseForAssignedWhenAcquired,
  type AfyaxIntegrationUrls,
} from './afyaxWebhookAdapter.js';

export const IOUX_WEBHOOK_EVENTS = [
  'iou.created',
  'iou.status_changed',
  'iou.assigned',
  'iou.acquired',
  'iou.disbursed',
  'iou.payment_updated',
  'iou.settled',
] as const;

export type IouxWebhookEvent = (typeof IOUX_WEBHOOK_EVENTS)[number];

export function signOutboundWebhook(rawBody: string, secret: string, timestamp: string): string {
  const payload = `${timestamp}.${rawBody}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function resolvePlatformOrgId(invoice: typeof s.invoices.$inferSelect): Promise<string | null> {
  if (invoice.sourcePlatformOrgId) return invoice.sourcePlatformOrgId;
  const [platform] = await db.select().from(s.organisations)
    .where(eq(s.organisations.orgType, 'platform'))
    .limit(1);
  return platform?.id || null;
}

export async function buildInvoiceWebhookPayload(
  invoiceId: string,
  extra?: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, invoiceId)).limit(1);
  if (!inv) return null;

  const [buyer] = await db.select().from(s.organisations).where(eq(s.organisations.id, inv.buyerOrgId)).limit(1);
  const [supplier] = await db.select().from(s.organisations).where(eq(s.organisations.id, inv.supplierOrgId)).limit(1);
  let platformName: string | null = null;
  if (inv.sourcePlatformOrgId) {
    const [p] = await db.select().from(s.organisations).where(eq(s.organisations.id, inv.sourcePlatformOrgId)).limit(1);
    platformName = p?.name || null;
  }

  const [asgn] = await db.select().from(s.assignments).where(eq(s.assignments.invoiceId, inv.id)).limit(1);

  return {
    invoiceId: inv.id,
    iouRegistryId: inv.iouRegistryId,
    status: inv.status,
    listingStatus: inv.listingStatus,
    origin: inv.origin,
    faceValue: Number(inv.faceValue),
    listedAmount: inv.listedAmount != null ? Number(inv.listedAmount) : Number(inv.faceValue),
    currency: inv.currency,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    invoiceNumber: inv.invoiceNumber,
    poReference: inv.poReference,
    sourcePlatformOrgId: inv.sourcePlatformOrgId,
    sourcePlatformName: platformName,
    buyer: buyer ? { id: buyer.id, uzimaPartyId: buyer.uzimaPartyId, afyaxId: buyer.afyaxId, name: buyer.name } : null,
    supplier: supplier ? { id: supplier.id, uzimaPartyId: supplier.uzimaPartyId, afyaxId: supplier.afyaxId, name: supplier.name } : null,
    assignment: asgn ? {
      id: asgn.id,
      assignmentType: asgn.assignmentType,
      purchasePrice: asgn.purchasePrice != null ? Number(asgn.purchasePrice) : null,
      assignedAt: asgn.assignedAt,
      status: asgn.status,
    } : null,
    updatedAt: inv.updatedAt,
    ...extra,
  };
}

type DeliveryPlan = {
  targetUrl: string;
  rawBody: string;
  headers: Record<string, string>;
  storedPayload: Record<string, unknown>;
};

function cfgToUrls(cfg: typeof s.platformIntegrations.$inferSelect): AfyaxIntegrationUrls {
  return {
    sandboxBaseUrl: cfg.sandboxBaseUrl,
    productionBaseUrl: cfg.productionBaseUrl,
    sandboxWebhookUrl: cfg.sandboxWebhookUrl,
    productionWebhookUrl: cfg.productionWebhookUrl,
    sandboxLifecycleWebhookUrl: cfg.sandboxLifecycleWebhookUrl,
    productionLifecycleWebhookUrl: cfg.productionLifecycleWebhookUrl,
    activeEnvironment: (cfg.activeEnvironment as 'sandbox' | 'production') || 'sandbox',
  };
}

function buildAfyaxDeliveryPlan(
  cfg: typeof s.platformIntegrations.$inferSelect,
  eventType: IouxWebhookEvent,
  invoicePayload: Record<string, unknown>,
  extra?: Record<string, unknown>,
): DeliveryPlan | null {
  const urls = cfgToUrls(cfg);

  if (shouldSendAfyaxPurchase(eventType)) {
    if (skipAfyaxPurchaseForAssignedWhenAcquired(eventType, extra)) {
      console.info('[webhook] skip AfyaX purchase for iou.assigned — iou.acquired will follow');
      return null;
    }
    const targetUrl = resolveAfyaxPurchaseUrl(urls);
    if (!targetUrl) {
      console.warn('[webhook] no AfyaX purchase URL configured', cfg.activeEnvironment);
      return null;
    }
    const purchaseBody = buildAfyaxPurchasePayload(invoicePayload, extra, {
      defaultPaymentMethod: (process.env.AFYAX_DEFAULT_PAYMENT_METHOD as 'bank' | 'mpesa' | 'wallet') || 'bank',
      bankName: process.env.AFYAX_DEFAULT_BANK_NAME,
    });
    if (!purchaseBody) return null;
    const rawBody = JSON.stringify(purchaseBody);
    return {
      targetUrl,
      rawBody,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-IOUX-Event': eventType,
      },
      storedPayload: { format: 'afyax_purchase', request: purchaseBody, iouRegistryId: invoicePayload.iouRegistryId },
    };
  }

  const lifecycleUrl = resolveAfyaxLifecycleUrl(urls);
  if (!lifecycleUrl) {
    console.info('[webhook] AfyaX lifecycle URL not set — skipping', eventType);
    return null;
  }

  const eventId = `evt_${crypto.randomBytes(12).toString('hex')}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const secret = cfg.webhookSecret || process.env.IOUX_WEBHOOK_SECRET || '';
  const envelope = {
    event_id: eventId,
    event_type: eventType,
    timestamp: new Date().toISOString(),
    data: invoicePayload,
  };
  const rawBody = JSON.stringify(envelope);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-IOUX-Event': eventType,
    'X-IOUX-Event-Id': eventId,
    'X-IOUX-Timestamp': timestamp,
  };
  if (secret) headers['X-IOUX-Signature'] = signOutboundWebhook(rawBody, secret, timestamp);
  return {
    targetUrl: lifecycleUrl,
    rawBody,
    headers,
    storedPayload: envelope,
  };
}

function buildEnvelopeDeliveryPlan(
  cfg: typeof s.platformIntegrations.$inferSelect,
  eventType: IouxWebhookEvent,
  invoicePayload: Record<string, unknown>,
  eventId: string,
): DeliveryPlan | null {
  const targetUrl = cfg.activeEnvironment === 'production'
    ? cfg.productionWebhookUrl
    : cfg.sandboxWebhookUrl;
  if (!targetUrl) return null;

  const secret = cfg.webhookSecret || process.env.IOUX_WEBHOOK_SECRET || process.env.AFYAX_WEBHOOK_SECRET || '';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const envelope = {
    event_id: eventId,
    event_type: eventType,
    timestamp: new Date().toISOString(),
    data: invoicePayload,
  };
  const rawBody = JSON.stringify(envelope);
  const signature = secret ? signOutboundWebhook(rawBody, secret, timestamp) : '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-IOUX-Event': eventType,
    'X-IOUX-Event-Id': eventId,
    'X-IOUX-Timestamp': timestamp,
  };
  if (signature) headers['X-IOUX-Signature'] = signature;
  return { targetUrl, rawBody, headers, storedPayload: envelope };
}

async function deliverWebhook(opts: {
  platformOrgId: string;
  eventType: IouxWebhookEvent;
  payload: Record<string, unknown>;
  extra?: Record<string, unknown>;
}): Promise<void> {
  const [cfg] = await db.select().from(s.platformIntegrations)
    .where(eq(s.platformIntegrations.platformOrgId, opts.platformOrgId))
    .limit(1);
  if (!cfg || !cfg.isActive) return;

  const enabled = cfg.enabledEvents || IOUX_WEBHOOK_EVENTS as unknown as string[];
  if (!enabled.includes(opts.eventType)) return;

  const eventId = `evt_${crypto.randomBytes(12).toString('hex')}`;
  const format = cfg.webhookFormat || 'afyax_purchase';

  const plan = format === 'afyax_purchase'
    ? buildAfyaxDeliveryPlan(cfg, opts.eventType, opts.payload, opts.extra)
    : buildEnvelopeDeliveryPlan(cfg, opts.eventType, opts.payload, eventId);

  if (!plan) return;

  const [delivery] = await db.insert(s.webhookDeliveries).values({
    platformOrgId: opts.platformOrgId,
    eventId,
    eventType: opts.eventType,
    targetUrl: plan.targetUrl,
    payload: plan.storedPayload,
    status: 'pending',
    attempts: 0,
  }).returning();

  const maxAttempts = 3;
  let lastError: string | undefined;
  let httpStatus: number | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(plan.targetUrl, {
        method: 'POST',
        headers: plan.headers,
        body: plan.rawBody,
        signal: AbortSignal.timeout(15000),
      });
      httpStatus = res.status;
      if (res.ok) {
        await db.update(s.webhookDeliveries).set({
          status: 'delivered',
          httpStatus,
          attempts: attempt,
          deliveredAt: new Date(),
          lastError: null,
        }).where(eq(s.webhookDeliveries.id, delivery.id));
        return;
      }
      lastError = `HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await db.update(s.webhookDeliveries).set({
      attempts: attempt,
      httpStatus: httpStatus || null,
      lastError: lastError || null,
    }).where(eq(s.webhookDeliveries.id, delivery.id));
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, attempt * 500));
    }
  }

  await db.update(s.webhookDeliveries).set({
    status: 'failed',
    lastError: lastError || 'delivery failed',
  }).where(eq(s.webhookDeliveries.id, delivery.id));
}

/** Fire-and-forget — never blocks the main request path */
export function emitPlatformWebhook(
  invoiceId: string,
  eventType: IouxWebhookEvent,
  extra?: Record<string, unknown>,
): void {
  void (async () => {
    try {
      const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, invoiceId)).limit(1);
      if (!inv) return;
      const platformOrgId = await resolvePlatformOrgId(inv);
      if (!platformOrgId) return;
      const payload = await buildInvoiceWebhookPayload(invoiceId, extra);
      if (!payload) return;
      await deliverWebhook({ platformOrgId, eventType, payload, extra });
    } catch (err) {
      console.error('[webhook] emit failed', eventType, invoiceId, err);
    }
  })();
}

export async function retryWebhookDelivery(deliveryId: string): Promise<typeof s.webhookDeliveries.$inferSelect> {
  const [row] = await db.select().from(s.webhookDeliveries).where(eq(s.webhookDeliveries.id, deliveryId)).limit(1);
  if (!row) throw new Error('Delivery not found');

  const stored = row.payload as Record<string, unknown>;
  const isAfyaxPurchase = stored.format === 'afyax_purchase' && stored.request;
  const rawBody = isAfyaxPurchase
    ? JSON.stringify(stored.request)
    : JSON.stringify(stored);

  const [cfg] = await db.select().from(s.platformIntegrations)
    .where(eq(s.platformIntegrations.platformOrgId, row.platformOrgId))
    .limit(1);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-IOUX-Event': row.eventType,
  };

  if (!isAfyaxPurchase) {
    const secret = cfg?.webhookSecret || process.env.IOUX_WEBHOOK_SECRET || process.env.AFYAX_WEBHOOK_SECRET || '';
    const timestamp = String(Math.floor(Date.now() / 1000));
    headers['X-IOUX-Event-Id'] = row.eventId;
    headers['X-IOUX-Timestamp'] = timestamp;
    if (secret) headers['X-IOUX-Signature'] = signOutboundWebhook(rawBody, secret, timestamp);
  }

  try {
    const res = await fetch(row.targetUrl, { method: 'POST', headers, body: rawBody, signal: AbortSignal.timeout(15000) });
    if (res.ok) {
      const [updated] = await db.update(s.webhookDeliveries).set({
        status: 'delivered',
        httpStatus: res.status,
        attempts: row.attempts + 1,
        deliveredAt: new Date(),
        lastError: null,
      }).where(eq(s.webhookDeliveries.id, row.id)).returning();
      return updated;
    }
    const errText = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
    const [updated] = await db.update(s.webhookDeliveries).set({
      status: 'failed',
      httpStatus: res.status,
      attempts: row.attempts + 1,
      lastError: errText,
    }).where(eq(s.webhookDeliveries.id, row.id)).returning();
    return updated;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const [updated] = await db.update(s.webhookDeliveries).set({
      status: 'failed',
      attempts: row.attempts + 1,
      lastError: msg,
    }).where(eq(s.webhookDeliveries.id, row.id)).returning();
    return updated;
  }
}
