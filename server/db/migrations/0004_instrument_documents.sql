ALTER TABLE installment_schedules
  ADD COLUMN IF NOT EXISTS interest_amount numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charges numeric(15,2) DEFAULT 0;

ALTER TABLE org_documents
  ADD COLUMN IF NOT EXISTS invoice_id uuid;
