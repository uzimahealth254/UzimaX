-- Audit correlation and organisation scope. drizzle-kit push applies the same columns from schema.ts.
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS correlation_id text;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS org_id uuid;
CREATE INDEX IF NOT EXISTS idx_audit_correlation ON audit_log (correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_log (org_id);
