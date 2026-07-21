/**
 * Set Render env vars for uzima-api from scripts/.tmp-ops-secrets.json + DATABASE_URL.
 *
 * Requires: RENDER_API_KEY (Dashboard → Account Settings → API Keys)
 * Optional: RENDER_SERVICE_ID (or looks up service named uzima-api)
 *
 *   RENDER_API_KEY=rnd_... DATABASE_URL='postgresql://...' npx tsx scripts/set-render-env.ts
 */
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.supabase' });
dotenv.config();

const apiKey = process.env.RENDER_API_KEY;
if (!apiKey) {
  console.error('Set RENDER_API_KEY from https://dashboard.render.com/u/settings#api-keys');
  process.exit(1);
}

const secrets = JSON.parse(fs.readFileSync('scripts/.tmp-ops-secrets.json', 'utf8')) as {
  AFYAX_WEBHOOK_SECRET: string;
  AFYAX_API_KEY: string;
  IOUX_API_URL: string;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.includes('YOUR_DB_PASSWORD')) {
  console.error('Set DATABASE_URL to the Session pooler URI (with real password).');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${apiKey}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

async function main() {
  let serviceId = process.env.RENDER_SERVICE_ID;
  if (!serviceId) {
    const res = await fetch('https://api.render.com/v1/services?limit=50', { headers });
    if (!res.ok) throw new Error(`List services failed: ${res.status} ${await res.text()}`);
    const list = (await res.json()) as Array<{ service: { id: string; name: string } }>;
    const hit = list.find((x) => x.service?.name === 'uzima-api' || x.service?.name === 'iou-api');
    if (!hit) {
      console.error('No uzima-api service found. Set RENDER_SERVICE_ID explicitly.');
      console.error('Services:', list.map((x) => x.service?.name).join(', '));
      process.exit(1);
    }
    serviceId = hit.service.id;
  }

  const envVars = [
    { key: 'DATABASE_URL', value: databaseUrl },
    { key: 'AFYAX_WEBHOOK_SECRET', value: secrets.AFYAX_WEBHOOK_SECRET },
    { key: 'AFYAX_API_KEY', value: secrets.AFYAX_API_KEY },
    { key: 'NODE_ENV', value: 'production' },
    { key: 'ALLOW_DEMO_OTP', value: 'false' },
    { key: 'ALLOW_BODY_REFRESH', value: 'false' },
    { key: 'ENABLE_SIMULATED_WALLET', value: 'false' },
    { key: 'COOKIE_SECURE', value: 'true' },
    {
      key: 'CORS_ORIGINS',
      value: process.env.CORS_ORIGINS
        || 'https://www.ioux.africa,https://ioux.africa,https://app.ioux.africa',
    },
    { key: 'PORTAL_URL', value: process.env.PORTAL_URL || 'https://app.ioux.africa' },
    { key: 'EMAIL_PROVIDER', value: process.env.EMAIL_PROVIDER || 'resend' },
    { key: 'EMAIL_FROM', value: process.env.EMAIL_FROM || 'IOU Exchange <no-reply@ioux.africa>' },
    { key: 'SUPPORT_EMAIL', value: process.env.SUPPORT_EMAIL || 'hello@ioux.africa' },
    { key: 'VITE_API_URL', value: process.env.VITE_API_URL || 'https://api.ioux.africa' },
    ...(process.env.RESEND_API_KEY
      ? [{ key: 'RESEND_API_KEY', value: process.env.RESEND_API_KEY }]
      : []),
  ];

  const res = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(envVars),
  });
  if (!res.ok) throw new Error(`Set env failed: ${res.status} ${await res.text()}`);
  console.log('Updated env vars on Render service', serviceId);
  console.log('Keys:', envVars.map((e) => e.key).join(', '));
  console.log('Trigger a deploy from the Render dashboard if it did not auto-redeploy.');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
