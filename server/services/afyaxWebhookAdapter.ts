/**
 * Maps IOUX lifecycle events to AfyaX webhook payloads (Sule spec v1).
 * Purchase: POST {base}/api/v1/iou/purchase
 *
 * DvS alignment (Githuku): purchase webhook fires on iou.disbursed only —
 * payment and assignment complete together at escrow settlement.
 */

export const AFYAX_PURCHASE_EVENTS = ['iou.disbursed'] as const;
export const AFYAX_LIFECYCLE_EVENTS = [
  'iou.created',
  'iou.status_changed',
  'iou.payment_updated',
  'iou.settled',
] as const;

export type AfyaxPaymentMethod = 'mpesa' | 'bank' | 'wallet';

export interface AfyaxPurchasePayload {
  buyer_name: string;
  ioux_id: string;
  payment_method: AfyaxPaymentMethod;
  amount: number;
  phone_number?: string;
  transaction_id?: string;
  bank_reference?: string;
  bank_name?: string;
}

export interface AfyaxIntegrationUrls {
  sandboxBaseUrl?: string | null;
  productionBaseUrl?: string | null;
  sandboxWebhookUrl?: string | null;
  productionWebhookUrl?: string | null;
  sandboxLifecycleWebhookUrl?: string | null;
  productionLifecycleWebhookUrl?: string | null;
  activeEnvironment: 'sandbox' | 'production';
}

const PURCHASE_PATH = '/api/v1/iou/purchase';

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export function resolveAfyaxPurchaseUrl(cfg: AfyaxIntegrationUrls): string | null {
  const env = cfg.activeEnvironment;
  const explicit = env === 'production' ? cfg.productionWebhookUrl : cfg.sandboxWebhookUrl;
  if (explicit) {
    const u = explicit.trim();
    if (u.includes('/iou/purchase')) return u;
    return `${trimSlash(u)}${PURCHASE_PATH}`;
  }
  const base = env === 'production' ? cfg.productionBaseUrl : cfg.sandboxBaseUrl;
  if (!base) return null;
  return `${trimSlash(base)}${PURCHASE_PATH}`;
}

export function resolveAfyaxLifecycleUrl(cfg: AfyaxIntegrationUrls): string | null {
  const env = cfg.activeEnvironment;
  return env === 'production'
    ? cfg.productionLifecycleWebhookUrl || null
    : cfg.sandboxLifecycleWebhookUrl || null;
}

/** AfyaX purchase webhook fires once at DvS settlement (disbursement). */
export function shouldSendAfyaxPurchase(eventType: string): boolean {
  return eventType === 'iou.disbursed';
}

export function skipAfyaxPurchaseForAssignedWhenAcquired(
  _eventType: string,
  _extra?: Record<string, unknown>,
): boolean {
  return false;
}

export function buildAfyaxPurchasePayload(
  invoicePayload: Record<string, unknown>,
  extra?: Record<string, unknown>,
  opts?: { defaultPaymentMethod?: AfyaxPaymentMethod; bankName?: string },
): AfyaxPurchasePayload | null {
  const iouxId = String(invoicePayload.iouRegistryId || '');
  if (!iouxId) return null;

  const buyer = invoicePayload.buyer as { name?: string } | null;
  const buyerName = buyer?.name || 'Unknown Buyer';

  const assignment = invoicePayload.assignment as {
    id?: string;
    purchasePrice?: number | null;
  } | null;

  const amount = Number(
    extra?.purchasePrice
    ?? extra?.settlementAmount
    ?? assignment?.purchasePrice
    ?? invoicePayload.listedAmount
    ?? invoicePayload.faceValue,
  );
  if (!(amount > 0)) return null;

  const paymentMethod = (opts?.defaultPaymentMethod || 'bank') as AfyaxPaymentMethod;
  const paymentRef = String(
    extra?.paymentReference
    ?? extra?.iouxTransactionId
    ?? extra?.escrowLegId
    ?? assignment?.id
    ?? iouxId,
  );
  const reference = paymentRef.startsWith('IOUX-') ? paymentRef : `IOUX-TXN-${paymentRef.replace(/-/g, '').slice(0, 12)}`;

  const payload: AfyaxPurchasePayload = {
    buyer_name: buyerName,
    ioux_id: iouxId,
    payment_method: paymentMethod,
    amount: Math.round(amount * 100) / 100,
  };

  // IOUX settlement transaction id — AfyaX stores for reconciliation (Sule spec).
  payload.transaction_id = reference;

  if (paymentMethod === 'mpesa') {
    payload.phone_number = process.env.AFYAX_DEFAULT_MPESA_PHONE || undefined;
  } else if (paymentMethod === 'bank') {
    payload.bank_reference = reference;
    if (opts?.bankName) payload.bank_name = opts.bankName;
  }

  return payload;
}
