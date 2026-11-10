-- Phase 1/2 completion (response to the Nov 2026 review report).
-- Idempotent. schema.ts remains the source of truth (Render build runs drizzle-kit push);
-- apply manually with: npx tsx scripts/apply-sql-file.ts server/db/migrations/0005_phase_completion.sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_country_code text,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_opt_in boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS permissions text[],
  ADD COLUMN IF NOT EXISTS is_org_admin boolean DEFAULT false;

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS environment text DEFAULT 'production',
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

ALTER TABLE programmes
  ADD COLUMN IF NOT EXISTS buyer_verification_rule text DEFAULT 'required';

CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS standing_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id),
  buyer_org_id uuid NOT NULL REFERENCES organisations(id),
  bank_name text NOT NULL,
  account_masked text,
  reference text,
  amount numeric(15,2) NOT NULL,
  currency text NOT NULL DEFAULT 'KES',
  first_execution_date date NOT NULL,
  frequency text NOT NULL DEFAULT 'once',
  status text NOT NULL DEFAULT 'requested',
  status_reason text,
  history jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_standing_orders_invoice ON standing_orders(invoice_id);

CREATE TABLE IF NOT EXISTS credential_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  project_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  environment text NOT NULL DEFAULT 'production',
  scopes text[] DEFAULT '{}',
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  claimed_at timestamptz,
  claimed_ip text,
  api_key_id uuid REFERENCES api_keys(id),
  revoked_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  requested_by uuid REFERENCES users(id),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  phone_country_code text,
  capacity text,
  permissions text[],
  is_signatory boolean DEFAULT false,
  documents jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  decision_reason text,
  decided_by uuid REFERENCES users(id),
  decided_at timestamptz,
  invite_token_hash text,
  invite_expires_at timestamptz,
  accepted_at timestamptz,
  user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
