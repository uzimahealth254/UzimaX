/** Quick live readiness: logins + org/invoice counts */
const BASE = (process.env.API_URL || 'https://uzimax.onrender.com/api/v1').replace(/\/$/, '');
const PASS = process.env.DEMO_PASSWORD || 'Uzima2026!';

async function j(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  console.log('Live check', BASE);
  await j('GET', '/health');
  const admin = await j('POST', '/auth/login', { email: 'admin@ioux.africa', password: PASS });
  const buyer = await j('POST', '/auth/login', { email: 'buyer@ioux.africa', password: PASS });
  const supplier = await j('POST', '/auth/login', { email: 'supplier@ioux.africa', password: PASS });
  const spv = await j('POST', '/auth/login', { email: 'spv@ioux.africa', password: PASS });
  console.log('logins ok');
  const orgs = await j('GET', '/organisations', undefined, admin.accessToken);
  const invs = await j('GET', '/invoices', undefined, spv.accessToken);
  console.log('orgs', orgs.data?.length, 'spv invoices', invs.data?.length || invs.count);
  const names = (orgs.data || []).map((o: any) => o.name);
  const bad = names.filter((n: string) => /twiga|safaricom|savannah|highland|breweries/i.test(n));
  console.log(bad.length ? `BAD brands: ${bad.join(', ')}` : 'org names anonymized');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
