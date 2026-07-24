-- IOUX-COMPLETE-001 P0.5 — commitment ack + standing-order metadata
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS commitment_ack_by uuid REFERENCES users(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS commitment_ack_at timestamptz;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS standing_order_bank text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS standing_order_set_at timestamptz;

-- Backfill acknowledgement timestamp for instruments already marked committed
UPDATE invoices
SET commitment_ack_at = COALESCE(commitment_ack_at, created_at)
WHERE commitment_to_pay = true AND commitment_ack_at IS NULL;
