/** Shared buyer reject presets (API + server validation) */
export const BUYER_REJECT_PRESETS = [
  'invalid_invoice',
  'not_authentic',
  'amount_mismatch',
  'suspected_fraud',
  'other',
] as const;

export type BuyerRejectPreset = (typeof BUYER_REJECT_PRESETS)[number];

export function formatBuyerRejectReason(preset: string, detail?: string): string {
  const labels: Record<string, string> = {
    invalid_invoice: 'Invalid invoice / not authentic',
    not_authentic: 'Documents or claim not authentic',
    amount_mismatch: 'Amount or terms do not match',
    suspected_fraud: 'Suspected fraud',
    other: 'Other',
  };
  const label = labels[preset] || preset;
  const d = (detail || '').trim();
  if (preset === 'other' || d) return d ? `${label}: ${d}` : label;
  return label;
}
