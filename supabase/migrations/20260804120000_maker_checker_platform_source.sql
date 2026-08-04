-- Client meeting 3 Aug 2026: maker-checker capacity + platform source on IOUs
ALTER TABLE signatories
  ADD COLUMN IF NOT EXISTS capacity text NOT NULL DEFAULT 'checker';

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS source_platform_org_id uuid REFERENCES organisations(id);

CREATE INDEX IF NOT EXISTS idx_invoices_source_platform
  ON invoices (source_platform_org_id)
  WHERE source_platform_org_id IS NOT NULL;
