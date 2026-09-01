import { InvoiceStatus } from '@/types';

const STEPS: { key: InvoiceStatus; short: string }[] = [
  { key: 'listed', short: 'List' },
  { key: 'offer_received', short: 'Offer' },
  { key: 'assigned', short: 'Assign' },
  { key: 'disbursed', short: 'Disburse' },
  { key: 'settled', short: 'Settle' },
];

const ORDER: string[] = [
  'draft', 'awaiting_opt_in', 'listed', 'awaiting_buyer_verification', 'verified',
  'offer_received', 'offer_accepted', 'pending_settlement', 'assigned', 'packaged', 'disbursed', 'matured', 'settled',
];

/** Compact financing progress for invoice list rows */
export default function FinancingProgress({ status }: { status: InvoiceStatus | string }) {
  const idx = ORDER.indexOf(status);
  const mapped =
    status === 'awaiting_opt_in' || status === 'awaiting_buyer_verification'
      ? 'listed'
      : status === 'verified' || status === 'offer_accepted'
        ? 'offer_received'
        : status === 'packaged' || status === 'matured'
          ? 'disbursed'
          : status;

  return (
    <div className="flex items-center gap-0.5 min-w-[120px]" title={status}>
      {STEPS.map((s) => {
        const stepIdx = ORDER.indexOf(s.key);
        const done = idx >= 0 && idx >= stepIdx;
        const current = mapped === s.key || status === s.key;
        return (
          <div key={s.key} className="flex items-center gap-0.5 flex-1">
            <div
              className={`h-1.5 flex-1 rounded-full ${
                done || current ? 'bg-[#0E1F1A]' : 'bg-[#0E1F1A]/12'
              } ${current ? 'ring-1 ring-[#D3F36B]' : ''}`}
            />
          </div>
        );
      })}
    </div>
  );
}
