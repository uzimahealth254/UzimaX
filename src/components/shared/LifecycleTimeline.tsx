import { InvoiceStatus } from '@/types';

const pipeline: { key: InvoiceStatus; label: string; owner: string }[] = [
  { key: 'awaiting_opt_in', label: 'Opt-in', owner: 'Supplier' },
  { key: 'listed', label: 'Listed', owner: 'Supplier' },
  { key: 'verified', label: 'Verified', owner: 'Buyer' },
  { key: 'offer_received', label: 'Offer', owner: 'SPV' },
  { key: 'offer_accepted', label: 'Accepted', owner: 'Supplier' },
  { key: 'assigned', label: 'Assigned', owner: 'SPV' },
  { key: 'packaged', label: 'Packaged', owner: 'SPV' },
  { key: 'disbursed', label: 'Disbursed', owner: 'Escrow' },
  { key: 'settled', label: 'Settled', owner: 'Buyer' },
];

const order: InvoiceStatus[] = [
  'draft', 'awaiting_opt_in', 'listed', 'verified', 'offer_received', 'offer_accepted',
  'assigned', 'packaged', 'disbursed', 'matured', 'settled', 'opt_in_declined',
];

function stepState(currentStatus: InvoiceStatus, stepKey: InvoiceStatus) {
  const currentIdx = order.indexOf(currentStatus);
  const stepIdx = order.indexOf(stepKey);
  const isComplete = currentIdx > stepIdx || (currentStatus === 'settled' && stepKey === 'settled');
  const isCurrent = currentStatus === stepKey
    || (currentStatus === 'matured' && stepKey === 'disbursed')
    || (currentStatus === 'opt_in_declined' && stepKey === 'awaiting_opt_in');
  return { isComplete, isCurrent };
}

/** Richer lifecycle stepper with party ownership */
export default function LifecycleTimeline({ currentStatus }: { currentStatus: InvoiceStatus }) {
  const visible = currentStatus === 'awaiting_opt_in' || currentStatus === 'opt_in_declined'
    ? pipeline
    : pipeline.filter(s => s.key !== 'awaiting_opt_in');

  return (
    <>
      {/* Mobile: vertical compact list */}
      <ol className="md:hidden space-y-0 border rounded-xl overflow-hidden divide-y">
        {visible.map((step, idx) => {
          const { isComplete, isCurrent } = stepState(currentStatus, step.key);
          return (
            <li
              key={step.key}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm ${isCurrent ? 'bg-primary/5' : ''}`}
            >
              <span
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                  isComplete
                    ? 'bg-accent border-accent text-accent-foreground'
                    : isCurrent
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'bg-card border-border text-muted-foreground'
                }`}
              >
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${isCurrent ? 'text-foreground' : 'text-foreground'}`}>{step.label}</p>
                <p className="text-[10px] text-muted-foreground">{step.owner}</p>
              </div>
              {isCurrent && <span className="text-[10px] font-semibold text-foreground shrink-0">Current</span>}
              {isComplete && !isCurrent && <span className="text-[10px] text-accent-foreground shrink-0 font-semibold">Done</span>}
            </li>
          );
        })}
      </ol>

      {/* Desktop: horizontal stepper */}
      <div className="hidden md:block overflow-x-auto py-2 scroll-touch">
        <div className="flex items-stretch gap-0 min-w-[640px]">
          {visible.map((step, idx) => {
            const { isComplete, isCurrent } = stepState(currentStatus, step.key);
            return (
              <div key={step.key} className="flex-1 flex flex-col items-center relative">
                {idx < visible.length - 1 && (
                  <div
                    className={`absolute top-3.5 left-1/2 w-full h-0.5 ${isComplete ? 'bg-accent' : 'bg-border'}`}
                    aria-hidden
                  />
                )}
                <div
                  className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                    isComplete
                      ? 'bg-accent border-accent text-accent-foreground'
                      : isCurrent
                        ? 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/15'
                        : 'bg-card border-border text-muted-foreground'
                  }`}
                >
                  {idx + 1}
                </div>
                <p className={`text-[11px] mt-2 font-medium text-center ${isCurrent ? 'text-foreground' : 'text-foreground'}`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground">{step.owner}</p>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
