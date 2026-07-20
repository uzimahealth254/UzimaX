/**
 * Integration smoke — requires running API + seeded DB.
 * Run: npm run smoke
 * Vitest wrapper: npm run test:integration (skips if API down)
 */
import { describe, it, expect, beforeAll } from 'vitest';

const BASE = process.env.API_URL || 'http://localhost:8787/api/v1';
const PASS = process.env.DEMO_PASSWORD || 'Uzima2026!';

async function json(method: string, path: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

describe('Uzima API critical path', () => {
  let available = false;
  let buyerToken = '';
  let supplierToken = '';

  beforeAll(async () => {
    try {
      const h = await json('GET', '/health');
      available = h.status === 200;
    } catch {
      available = false;
    }
  });

  it('health endpoint', async () => {
    if (!available) return;
    const h = await json('GET', '/health');
    expect(h.data.status).toBe('ok');
  });

  it('login buyer and supplier', async () => {
    if (!available) return;
    const buyer = await json('POST', '/auth/login', { email: 'buyer@uzima.co.ke', password: PASS });
    expect(buyer.status).toBe(200);
    expect(buyer.data.accessToken).toBeTruthy();
    buyerToken = buyer.data.accessToken;

    const supplier = await json('POST', '/auth/login', { email: 'supplier@uzima.co.ke', password: PASS });
    expect(supplier.status).toBe(200);
    supplierToken = supplier.data.accessToken;
  });

  it('dual origination buyer → opt-in', async () => {
    if (!available || !buyerToken || !supplierToken) return;
    const orgs = await json('GET', '/organisations', undefined, buyerToken);
    const supplierOrg = orgs.data.data.find((o: { orgType: string; name: string }) =>
      o.orgType === 'supplier' && o.name.includes('Savannah'));
    expect(supplierOrg).toBeTruthy();

    const inv = await json('POST', '/invoices', {
      supplierOrgId: supplierOrg.id,
      invoiceNumber: `TEST-${Date.now()}`,
      faceValue: 250000,
      currency: 'KES',
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
    }, buyerToken);
    expect(inv.status).toBe(201);
    expect(inv.data.status).toBe('awaiting_opt_in');

    const opts = await json('GET', '/opt-ins', undefined, supplierToken);
    const pending = opts.data.data.find((o: { invoiceId: string; status: string }) =>
      o.invoiceId === inv.data.id && o.status === 'pending');
    expect(pending).toBeTruthy();

    const respond = await json('POST', `/opt-ins/${pending.id}/respond`, { accept: true }, supplierToken);
    expect(respond.status).toBe(200);
  });

  it('rejects unauthenticated invoice list', async () => {
    if (!available) return;
    const res = await json('GET', '/invoices');
    expect(res.status).toBe(401);
  });
});
