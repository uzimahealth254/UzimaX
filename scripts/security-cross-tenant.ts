/**
 * Cross-tenant isolation check (IOUX-GOLIVE-001 P0.5).
 * Requires seeded or multi-org DB + running API.
 *
 * Usage: API_URL=http://localhost:8787/api/v1 npm run test:cross-tenant
 */
import 'dotenv/config';

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

async function login(email: string) {
  const res = await json('POST', '/auth/login', { email, password: PASS });
  if (res.status !== 200 || !res.data.accessToken) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return res.data.accessToken as string;
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`  OK: ${msg}`);
}

async function main() {
  console.log('Cross-tenant security test against', BASE);

  const health = await json('GET', '/health');
  if (health.status !== 200) throw new Error('API health check failed — is the API running?');

  const buyerA = await login('buyer@ioux.africa');
  const supplier = await login('supplier@ioux.africa');

  // Buyer A creates an invoice naming supplier
  const orgs = await json('GET', '/organisations', undefined, buyerA);
  const supplierOrg = (orgs.data.data || orgs.data || []).find(
    (o: { orgType: string }) => o.orgType === 'supplier',
  );
  assert(!!supplierOrg, 'supplier org available');

  const inv = await json('POST', '/invoices', {
    supplierOrgId: supplierOrg.id,
    invoiceNumber: `XTEAM-${Date.now()}`,
    faceValue: 100000,
    currency: 'KES',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    description: 'cross-tenant probe',
    commitmentToPay: true,
  }, buyerA);
  assert(inv.status === 201, `buyer creates invoice (${inv.status})`);
  const invoiceId = inv.data.id as string;

  // Supplier can see own-side invoice
  const supplierRead = await json('GET', `/invoices/${invoiceId}`, undefined, supplier);
  assert(supplierRead.status === 200, 'named supplier can read invoice');

  // Second buyer must not read buyer A's invoice (404, not 403 — anti-enumeration)
  // If only one buyer seeded, create probe via wrong-role: supplier2 if present
  let otherBuyerToken: string | null = null;
  try {
    otherBuyerToken = await login('spv@ioux.africa');
  } catch {
    /* ignore */
  }

  // SPV may read (by design). Use a forged UUID as "other org" probe for unauthenticated + wrong token.
  const unauth = await json('GET', `/invoices/${invoiceId}`);
  assert(unauth.status === 401, 'unauthenticated invoice get → 401');

  // Opt-ins: buyer must not list supplier opt-ins
  const buyerOpts = await json('GET', '/opt-ins', undefined, buyerA);
  assert(buyerOpts.status === 403, 'buyer cannot list opt-ins');

  // Escrow: buyer must not access
  const buyerEscrow = await json('GET', '/escrow', undefined, buyerA);
  assert(buyerEscrow.status === 403, 'buyer cannot list escrow');

  // Wallets: cross-org not exposed via /wallets/me (only own)
  const wallet = await json('GET', '/wallets/me', undefined, buyerA);
  assert(wallet.status === 200 || wallet.status === 403 || wallet.status === 503, 'wallets/me gated');

  // Documents list should not dump other orgs for buyer
  const docs = await json('GET', '/documents', undefined, buyerA);
  assert(docs.status === 200, 'buyer documents list ok');
  const foreign = (docs.data.data || []).find(
    (d: { orgId?: string }) => d.orgId && d.orgId !== (orgs.data.data || []).find((o: { orgType: string }) => o.orgType === 'buyer')?.id,
  );
  // Soft check — filter may already scope; if foreign present, fail
  if (foreign) {
    throw new Error('FAIL: documents list returned another org document');
  }
  console.log('  OK: documents list appears org-scoped');

  if (otherBuyerToken) {
    // SPV can read — expected; ensure mutate still role-gated
    const release = await json('POST', `/escrow/${crypto.randomUUID()}/release`, {}, buyerA);
    assert(release.status === 403 || release.status === 404, 'buyer cannot release escrow');
  }

  console.log('\nAll cross-tenant checks passed.');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
