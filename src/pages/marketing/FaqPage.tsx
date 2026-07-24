import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import MarketingLayout, { SectionLabel } from '@/components/marketing/MarketingLayout';

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is IOU Exchange?',
    a: 'IOU Exchange is a trade receivables securitisation management service. It connects buyers, suppliers, and an SPV so confirmed invoices can be managed through confirmation, assignment, and settlement records — with a full audit trail.',
  },
  {
    q: 'Who can use it?',
    a: 'Invite-only. Trade organisations (suppliers, buyers) and capital partners onboarded by IOU Exchange admins. There is no public self-signup.',
  },
  {
    q: 'How does a supplier get paid early?',
    a: 'A receivable is listed (by the buyer or the supplier), confirmed by the counterparty, then purchased by the SPV at a tenor-based discount. Settlement partners execute disbursement; IOU Exchange records the workflow and escrow legs.',
  },
  {
    q: 'What is an SPV\'s role?',
    a: 'The SPV purchases confirmed receivables, holds them to maturity, manages offers and assignments, and can package notes toward a capital-markets listing path.',
  },
  {
    q: 'Does IOU Exchange move money / is it a bank?',
    a: 'No. IOU Exchange orchestrates receivables workflows and provides settlement visibility. Money movement is performed by licensed settlement partners — not by IOU Exchange. IOU Exchange is not a bank and does not provide money-transmission services.',
  },
  {
    q: 'How is the discount calculated?',
    a: 'Discounts are tenor-based (days to maturity) and shown up front before a supplier accepts an offer or opts in. Programme bands can constrain min/max rates.',
  },
  {
    q: 'How are receivables confirmed?',
    a: 'Buyer-posted IOUs require supplier opt-in. Supplier-listed invoices require buyer verification. Critical assignments may also require OTP-verified consent from an authorised signatory.',
  },
  {
    q: 'Is my data secure?',
    a: 'Access is role-based. Critical actions are OTP-gated. Every significant action is audit-logged. See the Security page for the current control set — we do not overclaim certifications we have not obtained.',
  },
  {
    q: 'How do I get onboarded?',
    a: 'Contact us with your organisation details and role. An IOU Exchange admin creates your org, collects KYC documents, and invites users with temporary passwords.',
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <MarketingLayout>
      <section className="bg-white border-b border-[#E3E7E0]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <SectionLabel>FAQ</SectionLabel>
          <h1 className="font-display text-4xl font-extrabold text-[#0E1F1A]">Common questions</h1>
        </div>
      </section>
      <section className="bg-[#F7F8F5]">
        <div className="mx-auto max-w-3xl px-6 py-12 md:py-16 space-y-2">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="rounded-xl border border-[#E3E7E0] bg-white overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-bold text-[#0E1F1A]">{f.q}</span>
                  <ChevronDown size={16} className={`shrink-0 text-[#5A6B60] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm leading-relaxed text-[#5A6B60] border-t border-[#E3E7E0] pt-3">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </MarketingLayout>
  );
}
