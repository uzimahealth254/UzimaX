-- Platform integration tables for AfyaX outbound webhooks
-- Apply: npm run db:migrate  OR  npm run db:apply:sql with this file

ALTER TABLE users ADD COLUMN IF NOT EXISTS afyax_user_id text UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;

CREATE TABLE IF NOT EXISTS platform_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_org_id uuid NOT NULL UNIQUE REFERENCES organisations(id),
  sandbox_webhook_url text,
  production_webhook_url text,
  webhook_secret text,
  active_environment text NOT NULL DEFAULT 'sandbox',
  enabled_events text[] DEFAULT ARRAY[
    'iou.created', 'iou.status_changed', 'iou.assigned',
    'iou.acquired', 'iou.payment_updated', 'iou.settled'
  ],
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_org_id uuid NOT NULL REFERENCES organisations(id),
  event_id text NOT NULL,
  event_type text NOT NULL,
  target_url text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  http_status integer,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS webhook_deliveries_event_id_idx ON webhook_deliveries (event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_platform ON webhook_deliveries (platform_org_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON webhook_deliveries (created_at);
