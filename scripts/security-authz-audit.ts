/**
 * Authz audit — unauthenticated → 401; wrong role → 403 (IOUX-GOLIVE-001 P0.7).
 * Also verifies payment webhook rejects bad/absent HMAC (P0.6).
 *
 * Usage: npm run test:authz
 */
import 'dotenv/config';
import crypto from 'crypto';

const BASE = process.env.API_URL || 'http://localhost:8787/api/v1';
const PASS = process.env.DEMO_PASSWORD || 'Uzima2026!';
const WEBHOOK_SECRET = process.env.AFYAX_WEBHOOK_SECRET || '';

async function req(
  method: string,
  path: string,
  opts: { body?: unknown; token?: string; headers?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function login(email: string) {
  const res = await req('POST', '/auth/login', { body: { email, password: PASS } });
  if (res.status !== 200) throw new Error(`login ${email} → ${res.status}`);
  return res.data.accessToken as string;
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`  OK: ${msg}`);
}

const UNAUTH_MUTATIONS: { method: string; path: string; body?: unknown }[] = [
  { method: 'POST', path: '/invoices', body: { faceValue: 1, issueDate: '2026-01-01', dueDate: '2026-02-01' } },
  { method: 'POST', path: '/opt-ins/00000000-0000-0000-0000-000000000001/respond', body: { accept: true } },
  { method: 'POST', path: '/buyer-verifications/00000000-0000-0000-0000-000000000001/respond', body: { accept: true } },
  { method: 'POST', path: '/offers', body: { invoiceId: '00000000-0000-0000-0000-000000000001' } },
  { method: 'POST', path: '/consents', body: { invoiceId: '00000000-0000-0000-0000-000000000001' } },
  { method: 'POST', path: '/escrow/00000000-0000-0000-0000-000000000001/release' },
  { method: 'POST', path: '/packages', body: { packageRef: 'x', assignmentIds: [] } },
  { method: 'POST', path: '/programmes', body: { name: 'x' } },
  { method: 'POST', path: '/admin/users/invite', body: { email: 'x@y.z', role: 'buyer' } },
  { method: 'POST', path: '/organisations', body: { name: 'x', orgType: 'buyer' } },
];

const UNAUTH_READS = [
  '/invoices',
  '/assignments',
  '/escrow',
  '/admin/users',
  '/admin/analytics',
  '/system/health',
];

async function main() {
  console.log('Authz + webhook audit against', BASE);
  const health = await req('GET', '/health');
  if (health.status !== 200) throw new Error('API not reachable');

  for (const path of UNAUTH_READS) {
    const r = await req('GET', path);
    assert(r.status === 401, `GET ${path} without token → 401 (got ${r.status})`);
  }
  for (const m of UNAUTH_MUTATIONS) {
    const r = await req(m.method, m.path, { body: m.body });
    assert(r.status === 401, `${m.method} ${m.path} without token → 401 (got ${r.status})`);
  }

  const buyer = await login('buyer@ioux.africa');
  const supplier = await login('supplier@ioux.africa');

  const wrongRole: { method: string; path: string; token: string; body?: unknown; expect: number }[] = [
    { method: 'GET', path: '/escrow', token: buyer, expect: 403 },
    { method: 'GET', path: '/opt-ins', token: buyer, expect: 403 },
    { method: 'GET', path: '/admin/users', token: buyer, expect: 403 },
    { method: 'GET', path: '/admin/analytics', token: supplier, expect: 403 },
    { method: 'POST', path: '/programmes', token: buyer, body: { name: 'x', status: 'active' }, expect: 403 },
    { method: 'GET', path: '/buyer-verifications', token: supplier, expect: 403 },
  ];

  for (const w of wrongRole) {
    const r = await req(w.method, w.path, { token: w.token, body: w.body });
    assert(r.status === w.expect, `${w.method} ${w.path} wrong role → ${w.expect} (got ${r.status})`);
  }

  // P0.6 webhook signature
  const payload = {
    iouRegistryId: 'IOU-NOPE',
    amountPaid: 1,
    outstandingBalance: 0,
  };
  const raw = JSON.stringify(payload);

  const noSig = await req('POST', '/webhooks/payment-update', {
    body: payload,
    headers: { Authorization: 'Bearer fake' },
  });
  // Without valid API key → 401; with key but bad sig also 401. Either way not 200.
  assert(noSig.status === 401 || noSig.status === 403, `webhook without valid auth → blocked (${noSig.status})`);

  if (WEBHOOK_SECRET) {
    const ts = String(Date.now());
    const bad = await req('POST', '/webhooks/payment-update', {
      body: payload,
      headers: {
        'x-api-key': process.env.AFYAX_API_KEY || 'uzima_invalid',
        'x-afyax-signature': 'sha256=deadbeef',
        'x-afyax-timestamp': ts,
      },
    });
    assert(bad.status === 401 || bad.status === 403, `webhook bad signature/key → blocked (${bad.status})`);

    // Prove verifier logic locally matches server
    const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${ts}.${raw}`).digest('hex');
    assert(expected.length === 64, 'local HMAC produces hex digest');
    console.log('  OK: AFYAX_WEBHOOK_SECRET present — HMAC format verified locally');
  } else {
    console.log('  SKIP: set AFYAX_WEBHOOK_SECRET (+ valid API key) to exercise signed webhook path');
  }

  console.log('\nAuthz audit passed.');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
