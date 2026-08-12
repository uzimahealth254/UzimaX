/**
 * Demo-readiness smoke: dual origination + admin create buyer + cross-role visibility.
 * Handles checker OTP (uses request-otp demoHint when ALLOW_DEMO_OTP).
 *
 * Usage:
 *   npx tsx scripts/smoke-demo-ready.ts
 *   API_URL=https://uzimax.onrender.com/api/v1 npx tsx scripts/smoke-demo-ready.ts
 */
const BASE = (process.env.API_URL || 'http://localhost:8787/api/v1').replace(/\/$/, '');
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
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function otpFor(path: string, token: string, userId?: string, purpose?: string): Promise<string | undefined> {
  try {
    const data = await json('POST', path, {}, token);
    if (data.demoHint) return String(data.demoHint);
  } catch {
    /* continue */
  }
  // Hosted production often has no demoHint; plant a known code when DATABASE_URL is available.
  if (userId && purpose && process.env.SMOKE_PLANT_OTP === '1') {
    const { plantOtp } = await import('./smoke-plant-otp.js');
    await plantOtp(userId, purpose, '123456');
    return '123456';
  }
  return undefined;
}

async function main() {
  console.log(`\n=== Demo smoke @ ${BASE} ===\n`);

  console.log('1. Health');
  const health = await json('GET', '/health');
  if (health.db && health.db !== 'up') throw new Error(`DB not up: ${health.db}`);

  console.log('2. Demo logins');
  const admin = await json('POST', '/auth/login', { email: 'admin@ioux.africa', password: PASS });
  const buyer = await json('POST', '/auth/login', { email: 'buyer@ioux.africa', password: PASS });
  const supplier = await json('POST', '/auth/login', { email: 'supplier@ioux.africa', password: PASS });
  const spv = await json('POST', '/auth/login', { email: 'spv@ioux.africa', password: PASS });
  const adminTok = admin.accessToken as string;
  const buyerTok = buyer.accessToken as string;
  const supplierTok = supplier.accessToken as string;
  const spvTok = spv.accessToken as string;

  const stamp = Date.now();
  console.log('3. Admin creates buyer + supplier orgs');
  const buyerOrg = await json('POST', '/organisations', {
    name: `Demo Buyer ${stamp}`,
    orgType: 'buyer',
    registrationNo: `DB-${stamp}`,
    contactEmail: `demo.buyer.${stamp}@example.com`,
    kycStatus: 'verified',
  }, adminTok);
  const supplierOrg = await json('POST', '/organisations', {
    name: `Demo Supplier ${stamp}`,
    orgType: 'supplier',
    registrationNo: `DS-${stamp}`,
    contactEmail: `demo.supplier.${stamp}@example.com`,
    kycStatus: 'verified',
  }, adminTok);

  const buyerEmail = `demo.buyer.${stamp}@example.com`;
  const supplierEmail = `demo.supplier.${stamp}@example.com`;
  const tempPass = `Demo!${stamp}Aa1`;

  console.log('4. Invite users for new orgs');
  await json('POST', '/admin/users/invite', {
    email: buyerEmail,
    fullName: 'Demo Buyer User',
    role: 'buyer',
    orgId: buyerOrg.id,
    temporaryPassword: tempPass,
  }, adminTok);
  await json('POST', '/admin/users/invite', {
    email: supplierEmail,
    fullName: 'Demo Supplier User',
    role: 'supplier',
    orgId: supplierOrg.id,
    temporaryPassword: tempPass,
  }, adminTok);

  const newBuyer = await json('POST', '/auth/login', { email: buyerEmail, password: tempPass });
  const newSupplier = await json('POST', '/auth/login', { email: supplierEmail, password: tempPass });
  const newBuyerTok = newBuyer.accessToken as string;
  const newSupplierTok = newSupplier.accessToken as string;

  // Path A — buyer posts → supplier opt-in (OTP)
  console.log('5. Path A: buyer posts IOU → supplier opt-in');
  const pathA = await json('POST', '/invoices', {
    origin: 'buyer_posted',
    supplierOrgId: supplierOrg.id,
    invoiceNumber: `DEMO-A-${stamp}`,
    faceValue: 850000,
    currency: 'KES',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
    description: 'Demo Path A — buyer posted',
    commitmentToPay: true,
  }, newBuyerTok);

  const opts = await json('GET', '/opt-ins', undefined, newSupplierTok);
  const pendingOpt = (opts.data as any[]).find((o) => o.invoiceId === pathA.id && o.status === 'pending');
  if (!pendingOpt) throw new Error('Path A: pending opt-in missing on supplier side');

  // Seed supplier (Insurance-linked) may also need OTP; new org has no signatories but still needs OTP on older deploys
  const optOtp = await otpFor(
    `/opt-ins/${pendingOpt.id}/request-otp`,
    newSupplierTok,
    newSupplier.user?.id || newSupplier.user?.userId,
    `opt_in:${pendingOpt.id}`,
  );
  await json('POST', `/opt-ins/${pendingOpt.id}/respond`, {
    accept: true,
    ...(optOtp ? { otp: optOtp } : {}),
  }, newSupplierTok);

  // Path B — supplier lists → buyer verify (OTP + docs)
  console.log('6. Path B: supplier posts invoice → buyer verifies');
  const pathB = await json('POST', '/invoices', {
    origin: 'supplier_listed',
    buyerOrgId: buyerOrg.id,
    invoiceNumber: `DEMO-B-${stamp}`,
    faceValue: 620000,
    currency: 'KES',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    description: 'Demo Path B — supplier listed',
    supportingDocs: [{ name: 'invoice.pdf', url: '/mock/docs/invoice.pdf', docType: 'invoice' }],
  }, newSupplierTok);

  const vers = await json('GET', '/buyer-verifications', undefined, newBuyerTok);
  const pendingVer = (vers.data as any[]).find((v) => v.invoiceId === pathB.id && v.status === 'pending');
  if (!pendingVer) throw new Error('Path B: pending verification missing on buyer side');

  const verOtp = await otpFor(
    `/buyer-verifications/${pendingVer.id}/request-otp`,
    newBuyerTok,
    newBuyer.user?.id || newBuyer.user?.userId,
    `buyer_verify:${pendingVer.id}`,
  );
  await json('POST', `/buyer-verifications/${pendingVer.id}/respond`, {
    accept: true,
    commitmentToPay: true,
    ...(verOtp ? { otp: verOtp } : {}),
  }, newBuyerTok);

  console.log('7. Cross-role visibility (seed portals)');
  const buyerInvs = await json('GET', '/invoices', undefined, buyerTok);
  const supplierInvs = await json('GET', '/invoices', undefined, supplierTok);
  const spvInvs = await json('GET', '/invoices', undefined, spvTok);
  const adminInvs = await json('GET', '/invoices', undefined, adminTok);
  if (!Array.isArray(buyerInvs.data) || buyerInvs.data.length < 1) throw new Error('Buyer invoice list empty');
  if (!Array.isArray(supplierInvs.data) || supplierInvs.data.length < 1) throw new Error('Supplier invoice list empty');
  if (!Array.isArray(spvInvs.data) || spvInvs.data.length < 1) throw new Error('SPV invoice list empty');
  if (!Array.isArray(adminInvs.data) || adminInvs.data.length < 1) throw new Error('Admin invoice list empty');

  const spvSeesA = (spvInvs.data as any[]).some((i) => i.id === pathA.id || i.iouRegistryId === pathA.iouRegistryId);
  const spvSeesB = (spvInvs.data as any[]).some((i) => i.id === pathB.id || i.iouRegistryId === pathB.iouRegistryId);
  if (!spvSeesA || !spvSeesB) {
    throw new Error(`SPV missing new IOUs (A=${spvSeesA} B=${spvSeesB})`);
  }

  const asgns = await json('GET', '/assignments', undefined, spvTok);
  const asgnForA = (asgns.data as any[]).find((a) => a.invoiceId === pathA.id);
  const asgnForB = (asgns.data as any[]).find((a) => a.invoiceId === pathB.id);
  if (!asgnForA) throw new Error('Path A: assignment not created after opt-in');
  if (!asgnForB) throw new Error('Path B: assignment not created after buyer verify');

  console.log('\nOK — demo flows passed');
  console.log({
    buyerOrg: buyerOrg.name,
    supplierOrg: supplierOrg.name,
    pathA: pathA.iouRegistryId || pathA.id,
    pathB: pathB.iouRegistryId || pathB.id,
    assignments: { a: asgnForA.id, b: asgnForB.id },
    seedCounts: {
      buyer: buyerInvs.data.length,
      supplier: supplierInvs.data.length,
      spv: spvInvs.data.length,
      admin: adminInvs.data.length,
    },
  });
}

main().catch((e) => {
  console.error('\nFAIL:', e instanceof Error ? e.message : e);
  process.exit(1);
});
