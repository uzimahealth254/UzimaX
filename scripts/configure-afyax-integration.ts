import 'dotenv/config';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../server/db/client.js';
import * as s from '../server/db/schema.js';

const platformOrgId = process.env.AFYAX_PLATFORM_ORG_ID;
if (!platformOrgId) {
  console.error('Set AFYAX_PLATFORM_ORG_ID in .env');
  process.exit(1);
}

const patch = {
  webhookFormat: 'afyax_purchase' as const,
  sandboxBaseUrl: process.env.AFYAX_SANDBOX_BASE_URL || 'https://manager.smplystore.com',
  productionBaseUrl: process.env.AFYAX_PRODUCTION_BASE_URL || 'https://vendor.afyax.health',
  sandboxWebhookUrl: process.env.AFYAX_SANDBOX_PURCHASE_URL
    || `${process.env.AFYAX_SANDBOX_BASE_URL || 'https://manager.smplystore.com'}/api/v1/iou/purchase`,
  productionWebhookUrl: process.env.AFYAX_PRODUCTION_PURCHASE_URL
    || `${process.env.AFYAX_PRODUCTION_BASE_URL || 'https://vendor.afyax.health'}/api/v1/iou/purchase`,
  sandboxLifecycleWebhookUrl: process.env.AFYAX_SANDBOX_LIFECYCLE_URL || null,
  productionLifecycleWebhookUrl: process.env.AFYAX_PRODUCTION_LIFECYCLE_URL || null,
  webhookSecret: process.env.IOUX_WEBHOOK_SECRET || undefined,
  activeEnvironment: (process.env.AFYAX_ACTIVE_ENV || 'sandbox') as 'sandbox' | 'production',
  isActive: true,
  enabledEvents: [
    'iou.created', 'iou.status_changed', 'iou.assigned',
    'iou.acquired', 'iou.payment_updated', 'iou.settled',
  ],
  updatedAt: new Date(),
};

async function main() {
  const [existing] = await db.select().from(s.platformIntegrations)
    .where(eq(s.platformIntegrations.platformOrgId, platformOrgId!))
    .limit(1);

  if (existing) {
    const [row] = await db.update(s.platformIntegrations).set({
      ...patch,
      webhookSecret: patch.webhookSecret ?? existing.webhookSecret,
    }).where(eq(s.platformIntegrations.id, existing.id)).returning();
    console.log('Updated AfyaX integration:', {
      id: row.id,
      sandboxWebhookUrl: row.sandboxWebhookUrl,
      productionWebhookUrl: row.productionWebhookUrl,
      webhookFormat: row.webhookFormat,
      activeEnvironment: row.activeEnvironment,
    });
  } else {
    const [row] = await db.insert(s.platformIntegrations).values({
      platformOrgId: platformOrgId!,
      webhookSecret: patch.webhookSecret || crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().slice(0, 8),
      ...patch,
    }).returning();
    console.log('Created AfyaX integration:', row.sandboxWebhookUrl);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
