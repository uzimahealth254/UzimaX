import { SectionLabel } from './MarketingLayout';

type Step = {
  n: string;
  title: string;
  body: string;
  detail?: string;
};

const STEPS: Step[] = [
  {
    n: '01',
    title: 'List the receivable',
    body: 'A buyer posts a confirmed invoice, or a supplier lists one for the buyer to verify.',
  },
  {
    n: '02',
    title: 'Confirm & assign',
    body: 'The counterparty confirms. The receivable is assigned to the SPV.',
  },
  {
    n: '03',
    title: 'Get paid early',
    body: 'The supplier receives funds now, at an agreed discount — no waiting for maturity.',
  },
  {
    n: '04',
    title: 'Settle at maturity',
    body: 'The buyer pays the full amount at the due date. The cycle closes.',
  },
];

const STEPS_EXPANDED: Step[] = [
  {
    ...STEPS[0],
    detail: 'Dual origination: buyer-posted IOUs land in the supplier opt-in inbox; supplier-listed invoices await buyer verification. Both converge on the same registry.',
  },
  {
    ...STEPS[1],
    detail: 'Where required, assignment consent is OTP-verified by an authorised signatory before the SPV takes ownership in the workflow.',
  },
  {
    ...STEPS[2],
    detail: 'Discount is tenor-based and shown up front. Disbursement is executed by the settlement partner — IOU Exchange records the escrow leg for reconciliation.',
  },
  {
    ...STEPS[3],
    detail: 'Payment updates from partners (e.g. AfyaX) update outstanding balances. IOU Exchange tracks schedule and history; it does not move the money itself.',
  },
];

export default function HowItWorksSteps({ expanded = false, onDark = true }: { expanded?: boolean; onDark?: boolean }) {
  const steps = expanded ? STEPS_EXPANDED : STEPS;
  return (
    <div>
      <SectionLabel onDark={onDark}>How it works</SectionLabel>
      <h2 className={`font-display text-3xl md:text-[2.5rem] font-extrabold tracking-tight leading-tight max-w-2xl ${onDark ? 'text-white' : 'text-[#0E1F1A]'}`}>
        From invoice to working capital, in a few steps.
      </h2>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative">
        {steps.map((s) => (
          <div key={s.n} className="relative">
            <div className={`text-3xl font-extrabold font-display tracking-tight ${onDark ? 'text-[#D3F36B]' : 'text-[#0E1F1A]'}`}>
              {s.n}
            </div>
            <h3 className={`mt-3 text-lg font-bold ${onDark ? 'text-white' : 'text-[#0E1F1A]'}`}>{s.title}</h3>
            <p className={`mt-2 text-sm leading-relaxed ${onDark ? 'text-[#A8C4B4]' : 'text-[#5A6B60]'}`}>{s.body}</p>
            {s.detail && (
              <p className={`mt-3 text-xs leading-relaxed ${onDark ? 'text-[#7A9488]' : 'text-[#5A6B60]/80'}`}>{s.detail}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
