/**
 * Critical-path smoke checks against a running API (npm run dev:api).
 * Usage: npx tsx scripts/smoke-IOU Exchange.ts
 */
const BASE = process.env.API_URL || 'http://localhost:8787/api/v1';
const PASS = process.env.DEMO_PASSWORD || 'Uzima2026!';

async function json(method: string, path: string, body?: unknown, token?: string, apiKey?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (apiKey) headers['X-API-Key'] = apiKey;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  console.log('Health…');
  await json('GET', '/health');

  console.log('Buyer login…');
  const buyer = await json('POST', '/auth/login', { email: 'buyer@ioux.africa', password: PASS });
  console.log('Supplier login…');
  const supplier = await json('POST', '/auth/login', { email: 'supplier@ioux.africa', password: PASS });

  const orgs = await json('GET', '/organisations', undefined, buyer.accessToken);
  const supplierOrg = orgs.data.find((o: { orgType: string; name: string }) => o.orgType === 'supplier' && o.name.includes('Savannah'));

  console.log('Buyer posts invoice…');
  const inv = await json('POST', '/invoices', {
    origin: 'buyer_posted',
    supplierOrgId: supplierOrg.id,
    invoiceNumber: `SMOKE-${Date.now()}`,
    faceValue: 500000,
    currency: 'KES',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
  }, buyer.accessToken);

  console.log('Supplier lists opt-ins…');
  const opts = await json('GET', '/opt-ins', undefined, supplier.accessToken);
  const pending = opts.data.find((o: { invoiceId: string; status: string }) => o.invoiceId === inv.id && o.status === 'pending');
  if (!pending) throw new Error('Expected pending opt-in');

  console.log('Supplier accepts opt-in…');
  const asgn = await json('POST', `/opt-ins/${pending.id}/respond`, { accept: true }, supplier.accessToken);
  if (!asgn.assignment && !asgn.invoice) console.log('Opt-in response', asgn);

  console.log('AfyaX party lookup…');
  await json('GET', `/parties/${buyer.user.uzimaPartyId}`, undefined, undefined, 'uzima_afyax_demo_key_9c2e1b7f');

  if (process.env.ENABLE_SIMULATED_WALLET === 'true' || process.env.VITE_ENABLE_WALLET === 'true') {
    console.log('Wallet…');
    await json('GET', '/wallets/me', undefined, supplier.accessToken);
  } else {
    console.log('Wallet skipped (simulated wallet disabled)');
  }

  console.log('OK — smoke passed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
