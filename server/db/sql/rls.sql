-- UZIMA-ARCH-001 §3 — Row-Level Security on multi-tenant tables
-- Apply: npm run db:rls
-- Session vars set per request when using withTenantContext (optional):
--   SELECT set_config('app.current_org_id', '<uuid>', true);
--   SELECT set_config('app.role', 'buyer|supplier|spv|admin|api', true);
--   SELECT set_config('app.bypass_rls', 'on', true); -- admin/migrations only

DO $$ BEGIN
  PERFORM 1;
END $$;

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE opt_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_updates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-applied
DROP POLICY IF EXISTS org_select ON organisations;
DROP POLICY IF EXISTS invoices_tenant ON invoices;
DROP POLICY IF EXISTS wallets_tenant ON wallets;
DROP POLICY IF EXISTS notifications_tenant ON notifications;
DROP POLICY IF EXISTS org_documents_tenant ON org_documents;
DROP POLICY IF EXISTS opt_ins_tenant ON opt_ins;
DROP POLICY IF EXISTS buyer_verifications_tenant ON buyer_verifications;
DROP POLICY IF EXISTS consents_tenant ON assignment_consents;
DROP POLICY IF EXISTS assignments_tenant ON assignments;
DROP POLICY IF EXISTS payment_updates_tenant ON payment_updates;
DROP POLICY IF EXISTS users_tenant ON users;
DROP POLICY IF EXISTS wallet_tx_tenant ON wallet_transactions;

-- Bypass when app.bypass_rls=on OR role is admin/spv/api platform; else org-scoped
CREATE POLICY org_select ON organisations FOR ALL USING (
  current_setting('app.bypass_rls', true) = 'on'
  OR current_setting('app.role', true) IN ('admin', 'spv', 'api')
  OR id::text = nullif(current_setting('app.current_org_id', true), '')
);

CREATE POLICY users_tenant ON users FOR ALL USING (
  current_setting('app.bypass_rls', true) = 'on'
  OR current_setting('app.role', true) IN ('admin', 'spv', 'api')
  OR org_id::text = nullif(current_setting('app.current_org_id', true), '')
  OR id::text = nullif(current_setting('app.current_user_id', true), '')
);

CREATE POLICY invoices_tenant ON invoices FOR ALL USING (
  current_setting('app.bypass_rls', true) = 'on'
  OR current_setting('app.role', true) IN ('admin', 'spv', 'api')
  OR buyer_org_id::text = nullif(current_setting('app.current_org_id', true), '')
  OR supplier_org_id::text = nullif(current_setting('app.current_org_id', true), '')
);

CREATE POLICY wallets_tenant ON wallets FOR ALL USING (
  current_setting('app.bypass_rls', true) = 'on'
  OR current_setting('app.role', true) IN ('admin', 'spv', 'api')
  OR org_id::text = nullif(current_setting('app.current_org_id', true), '')
);

CREATE POLICY wallet_tx_tenant ON wallet_transactions FOR ALL USING (
  current_setting('app.bypass_rls', true) = 'on'
  OR current_setting('app.role', true) IN ('admin', 'spv', 'api')
  OR wallet_id IN (
    SELECT id FROM wallets
    WHERE org_id::text = nullif(current_setting('app.current_org_id', true), '')
  )
);

CREATE POLICY notifications_tenant ON notifications FOR ALL USING (
  current_setting('app.bypass_rls', true) = 'on'
  OR current_setting('app.role', true) IN ('admin', 'api')
  OR user_id::text = nullif(current_setting('app.current_user_id', true), '')
);

CREATE POLICY org_documents_tenant ON org_documents FOR ALL USING (
  current_setting('app.bypass_rls', true) = 'on'
  OR current_setting('app.role', true) IN ('admin', 'spv', 'api')
  OR org_id::text = nullif(current_setting('app.current_org_id', true), '')
);

CREATE POLICY opt_ins_tenant ON opt_ins FOR ALL USING (
  current_setting('app.bypass_rls', true) = 'on'
  OR current_setting('app.role', true) IN ('admin', 'spv', 'api')
  OR supplier_org_id::text = nullif(current_setting('app.current_org_id', true), '')
);

CREATE POLICY buyer_verifications_tenant ON buyer_verifications FOR ALL USING (
  current_setting('app.bypass_rls', true) = 'on'
  OR current_setting('app.role', true) IN ('admin', 'spv', 'api')
  OR buyer_org_id::text = nullif(current_setting('app.current_org_id', true), '')
);

CREATE POLICY consents_tenant ON assignment_consents FOR ALL USING (
  current_setting('app.bypass_rls', true) = 'on'
  OR current_setting('app.role', true) IN ('admin', 'spv', 'api')
  OR buyer_org_id::text = nullif(current_setting('app.current_org_id', true), '')
);

CREATE POLICY assignments_tenant ON assignments FOR ALL USING (
  current_setting('app.bypass_rls', true) = 'on'
  OR current_setting('app.role', true) IN ('admin', 'spv', 'api')
  OR buyer_org_id::text = nullif(current_setting('app.current_org_id', true), '')
  OR supplier_org_id::text = nullif(current_setting('app.current_org_id', true), '')
  OR spv_org_id::text = nullif(current_setting('app.current_org_id', true), '')
);

CREATE POLICY payment_updates_tenant ON payment_updates FOR ALL USING (
  current_setting('app.bypass_rls', true) = 'on'
  OR current_setting('app.role', true) IN ('admin', 'spv', 'api')
  OR invoice_id IN (
    SELECT id FROM invoices
    WHERE buyer_org_id::text = nullif(current_setting('app.current_org_id', true), '')
       OR supplier_org_id::text = nullif(current_setting('app.current_org_id', true), '')
  )
);

-- Default: table owner bypasses RLS (no FORCE). For production, connect as
-- non-owner `uzima_app` and set session vars via tenantContext middleware.
