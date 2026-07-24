-- IOUX-FULL-FINISH-001 WS-07 — email send log
CREATE TABLE IF NOT EXISTS email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  template text NOT NULL DEFAULT 'generic',
  subject text,
  status text NOT NULL,
  provider text,
  provider_message_id text,
  error text,
  related_type text,
  related_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON email_send_log (created_at);
CREATE INDEX IF NOT EXISTS idx_email_send_log_to ON email_send_log (to_email);
