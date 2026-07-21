/**
 * Dual-origination smoke with freshly created (non-seed) organisations.
 * Requires API running: npm run dev:api
 * Usage: npx tsx scripts/smoke-dual-origination.ts
 */
const BASE = process.env.API_URL || 'http://localhost:8787/api/v1';
const PASS = process.env.DEMO_PASSWORD || 'Uzima2026!';
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || 'admin@ioux.africa';

async function json(method: string, path: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
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
  console.log('=== Dual-origination smoke (non-seed orgs) ===');
  console.log('Health…');
  await json('GET', '/health');

  console.log('Admin login…');
  const admin = await json('POST', '/auth/login', { email: ADMIN_EMAIL, password: PASS });
  const adminTok = admin.accessToken as string;

  const stamp = Date.now();
  console.log('Create buyer org…');
  const buyerOrg = await json('POST', '/organisations', {
    name: `Smoke Buyer ${stamp}`,
    orgType: 'buyer',
    registrationNo: `BR-${stamp}`,
    kraPin: `P${stamp}X`,
    address: 'Nairobi',
    contactEmail: `buyer.smoke.${stamp}@example.com`,
    kycStatus: 'pending',
  }, adminTok);

  console.log('Create supplier org…');
  const supplierOrg = await json('POST', '/organisations', {
    name: `Smoke Supplier ${stamp}`,
    orgType: 'supplier',
    registrationNo: `SR-${stamp}`,
    kraPin: `S${stamp}X`,
    address: 'Mombasa',
    contactEmail: `supplier.smoke.${stamp}@example.com`,
    ppbRegistration: `PPB-${stamp}`,
    kycStatus: 'pending',
  }, adminTok);

  const buyerEmail = `buyer.smoke.${stamp}@example.com`;
  const supplierEmail = `supplier.smoke.${stamp}@example.com`;
  const tempPass = `Smoke!${stamp}Aa`;

  console.log('Invite buyer + supplier users…');
  await json('POST', '/admin/users/invite', {
    email: buyerEmail,
    fullName: 'Smoke Buyer User',
    role: 'buyer',
    orgId: buyerOrg.id,
    temporaryPassword: tempPass,
  }, adminTok);
  await json('POST', '/admin/users/invite', {
    email: supplierEmail,
    fullName: 'Smoke Supplier User',
    role: 'supplier',
    orgId: supplierOrg.id,
    temporaryPassword: tempPass,
  }, adminTok);

  console.log('Login as new buyer / supplier…');
  const buyer = await json('POST', '/auth/login', { email: buyerEmail, password: tempPass });
  const supplier = await json('POST', '/auth/login', { email: supplierEmail, password: tempPass });
  const buyerTok = buyer.accessToken as string;
  const supplierTok = supplier.accessToken as string;

  // —— Path A: buyer posted → supplier opt-in ——
  console.log('Path A: buyer posts IOU…');
  const pathA = await json('POST', '/invoices', {
    origin: 'buyer_posted',
    supplierOrgId: supplierOrg.id,
    invoiceNumber: `SMOKE-A-${stamp}`,
    faceValue: 750000,
    currency: 'KES',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
    description: 'Smoke Path A — buyer posted',
  }, buyerTok);

  const opts = await json('GET', '/opt-ins', undefined, supplierTok);
  const pendingOpt = (opts.data as any[]).find((o) => o.invoiceId === pathA.id && o.status === 'pending');
  if (!pendingOpt) throw new Error('Path A: expected pending opt-in');
  console.log('Path A: supplier opts in…');
  await json('POST', `/opt-ins/${pendingOpt.id}/respond`, { accept: true }, supplierTok);

  // —— Path B: supplier listed → buyer verify ——
  console.log('Path B: supplier posts invoice…');
  const pathB = await json('POST', '/invoices', {
    origin: 'supplier_listed',
    buyerOrgId: buyerOrg.id,
    invoiceNumber: `SMOKE-B-${stamp}`,
    faceValue: 420000,
    currency: 'KES',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    description: 'Smoke Path B — supplier listed',
  }, supplierTok);

  const vers = await json('GET', '/buyer-verifications', undefined, buyerTok);
  const pendingVer = (vers.data as any[]).find((v) => v.invoiceId === pathB.id && v.status === 'pending');
  if (!pendingVer) throw new Error('Path B: expected pending buyer verification');
  console.log('Path B: buyer verifies…');
  await json('POST', `/buyer-verifications/${pendingVer.id}/respond`, { accept: true }, buyerTok);

  console.log('OK — dual origination smoke passed');
  console.log({
    buyerOrg: buyerOrg.uzimaPartyId,
    supplierOrg: supplierOrg.uzimaPartyId,
    pathA: pathA.iouRegistryId || pathA.id,
    pathB: pathB.iouRegistryId || pathB.id,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
