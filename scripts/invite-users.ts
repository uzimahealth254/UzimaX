/**
 * Invite real users via the live/local API (admin session).
 *
 * Usage:
 *   API_URL=https://api.ioux.africa \
 *   ADMIN_EMAIL=ops@ioux.africa \
 *   ADMIN_PASSWORD='…' \
 *   INVITES='buyer@acme.co.ke:buyer:Buyer Name,supplier@acme.co.ke:supplier' \
 *   npm run invite:users
 *
 * Format per invite: email:role[:fullName][:orgId]
 * Roles: buyer | supplier | spv | admin
 */
import 'dotenv/config';

const API = (process.env.API_URL || process.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
const adminEmail = (process.env.ADMIN_EMAIL || 'ops@ioux.africa').toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || '';
const raw = process.env.INVITES || '';

if (!adminPassword) {
  console.error('ADMIN_PASSWORD required');
  process.exit(1);
}
if (!raw.trim()) {
  console.error('INVITES required — example: INVITES="jane@buyer.co.ke:buyer:Jane Wanjiku"');
  process.exit(1);
}

type Invite = { email: string; role: string; fullName?: string; orgId?: string };

function parseInvites(s: string): Invite[] {
  return s.split(',').map((part) => {
    const [email, role, fullName, orgId] = part.trim().split(':').map((x) => x.trim());
    if (!email || !role) throw new Error(`Bad invite segment: ${part}`);
    return { email: email.toLowerCase(), role, fullName, orgId };
  });
}

async function main() {
  const loginRes = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  }
  const login = await loginRes.json() as { accessToken?: string; token?: string };
  const token = login.accessToken || login.token;
  if (!token) throw new Error('No access token in login response');

  const invites = parseInvites(raw);
  for (const inv of invites) {
    const body: Record<string, string> = {
      email: inv.email,
      role: inv.role,
    };
    if (inv.fullName) body.fullName = inv.fullName;
    if (inv.orgId) body.orgId = inv.orgId;

    const res = await fetch(`${API}/api/v1/admin/users/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`FAIL ${inv.email}: ${res.status} ${text}`);
      continue;
    }
    console.log(`OK invited ${inv.email} (${inv.role})`, text);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
