-- AfyaX webhook adapter columns (purchase + lifecycle URLs)
ALTER TABLE platform_integrations ADD COLUMN IF NOT EXISTS webhook_format text NOT NULL DEFAULT 'afyax_purchase';
ALTER TABLE platform_integrations ADD COLUMN IF NOT EXISTS sandbox_base_url text;
ALTER TABLE platform_integrations ADD COLUMN IF NOT EXISTS production_base_url text;
ALTER TABLE platform_integrations ADD COLUMN IF NOT EXISTS sandbox_lifecycle_webhook_url text;
ALTER TABLE platform_integrations ADD COLUMN IF NOT EXISTS production_lifecycle_webhook_url text;
