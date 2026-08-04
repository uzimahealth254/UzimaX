/** Buyer verification reject presets (client meeting 3 Aug 2026) */
export const BUYER_REJECT_PRESETS = [
  { value: 'invalid_invoice', label: 'Invalid invoice / not authentic' },
  { value: 'not_authentic', label: 'Documents or claim not authentic' },
  { value: 'amount_mismatch', label: 'Amount or terms do not match' },
  { value: 'suspected_fraud', label: 'Suspected fraud' },
  { value: 'other', label: 'Other' },
] as const;

export type BuyerRejectPreset = (typeof BUYER_REJECT_PRESETS)[number]['value'];

export function formatBuyerRejectReason(preset: string, detail?: string): string {
  const hit = BUYER_REJECT_PRESETS.find((p) => p.value === preset);
  const label = hit?.label || preset;
  if (preset === 'other' || detail) {
    const d = (detail || '').trim();
    return d ? `${label}: ${d}` : label;
  }
  return label;
}

/** Org / KYC document types (Kenya-oriented checklist) */
export const ORG_DOC_TYPES = [
  { value: 'incorporation_cert', label: 'Certificate of incorporation' },
  { value: 'cr12', label: 'CR12 / company search' },
  { value: 'kra_pin_cert', label: 'KRA PIN certificate' },
  { value: 'tax_clearance', label: 'Tax clearance' },
  { value: 'board_resolution', label: 'Board resolution' },
  { value: 'specimen_signature', label: 'Specimen signature' },
  { value: 'approval_certificate', label: 'Approval / originator certificate' },
  { value: 'licence_cert', label: 'Business licence' },
  { value: 'invoice_proposal', label: 'Invoice / proposal / work evidence' },
  { value: 'purchase_note', label: 'Purchase note' },
  { value: 'assignment_letter', label: 'Assignment letter' },
  { value: 'supporting', label: 'Other supporting document' },
] as const;
