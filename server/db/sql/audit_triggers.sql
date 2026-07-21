-- Optional audit triggers: mirror mutations into audit_log (defense in depth alongside app writeAudit)
-- Apply with: psql $DATABASE_URL -f server/db/sql/audit_triggers.sql

CREATE OR REPLACE FUNCTION uzima_audit_invoice() RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_log (action, resource_type, resource_id, details)
  VALUES (
    TG_OP || '.invoice',
    'invoice',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('status', COALESCE(NEW.status, OLD.status), 'op', TG_OP)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_invoices ON invoices;
CREATE TRIGGER trg_audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION uzima_audit_invoice();
