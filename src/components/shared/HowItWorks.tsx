import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

type Role = 'buyer' | 'supplier' | 'spv' | 'admin';

const COPY: Record<Role, { title: string; steps: string[] }> = {
  buyer: {
    title: 'How IOU Exchange works for buyers',
    steps: [
      'Path A — You post an approved IOU naming a supplier. They opt in / sell, and the receivable assigns to the SPV.',
      'Path B — A supplier posts an invoice against you. You verify / accept it here before assignment.',
      'Path C — Your ERP or AfyaX can push invoices via API. Same lifecycle after intake.',
      'Both paths end the same way: assigned receivable, consent where required, then settlement outside IOU Exchange.',
    ],
  },
  supplier: {
    title: 'How IOU Exchange works for suppliers',
    steps: [
      'Path A — When a buyer posts an invoice naming you, it appears in Opt-in Inbox for you to sell.',
      'Path B — You post an invoice against a buyer. They verify it before the SPV can take assignment.',
      'On sell / accept, the receivable assigns to the SPV. Escrow and repayments are tracked for workflow — funds move with the settlement partner.',
    ],
  },
  spv: {
    title: 'How IOU Exchange works for the SPV',
    steps: [
      'IOUs arrive via buyer post, supplier list, or API. Review them in the Registry.',
      'Make offers, collect consent where needed, then manage owned receivables in Assignments.',
      'Escrow legs and packaging prepare settlement and capital-market readiness — they do not move bank funds or list on NSE by themselves.',
    ],
  },
  admin: {
    title: 'How IOU Exchange works (platform)',
    steps: [
      'Invite-only onboarding: create orgs, upload KYC docs, invite users with temporary passwords.',
      'Programmes, fees, reconciliation, and workflow are the control plane over buyer / supplier / SPV activity.',
      'Simulated wallet and escrow actions are labelled — they never imply live bank rails.',
    ],
  },
};

export default function HowItWorks({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const copy = COPY[role];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 rounded-lg border border-[#0E1F1A]/15 text-xs font-bold text-[#0E1F1A] hover:bg-[#f7faf6]"
        aria-label="How IOU Exchange works"
      >
        <HelpCircle size={13} />
        How it works
      </button>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white border border-[#0E1F1A]/10 rounded-t-xl sm:rounded-xl p-5 w-full max-w-lg space-y-3 safe-pad-bottom">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-bold text-[#0E1F1A]">{copy.title}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X size={16} className="text-[#5A6B7D]" />
              </button>
            </div>
            <ol className="space-y-2 list-decimal list-inside">
              {copy.steps.map((s) => (
                <li key={s} className="text-xs text-[#3D4F5C] leading-relaxed">{s}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
