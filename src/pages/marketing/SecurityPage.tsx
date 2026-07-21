import MarketingLayout, { SectionLabel } from '@/components/marketing/MarketingLayout';

const SECTIONS = [
  {
    title: 'Role-based access control',
    body: 'Every session is scoped to a role — buyer, supplier, SPV, or admin. Routes and APIs enforce that role server-side. Users only see their organisation\'s data.',
  },
  {
    title: 'Audit logging',
    body: 'Significant actions (invites, offers, consents, escrow legs, package status) are written to an immutable audit trail with actor, resource, and timestamp.',
  },
  {
    title: 'OTP-verified signatures',
    body: 'Assignment consent and other high-risk actions require a one-time code delivered to the signatory. Codes expire quickly and lock out after repeated failures.',
  },
  {
    title: 'API keys',
    body: 'Integration keys are hashed at rest, shown once at creation, and can be revoked. Scopes limit what each key can do (invoices, parties, payments).',
  },
  {
    title: 'Data handling',
    body: 'Application data is stored in your configured PostgreSQL database. Document files use local or S3-compatible storage. We do not claim SOC2 or ISO certification on this page unless separately attested.',
  },
];

export default function SecurityPage() {
  return (
    <MarketingLayout>
      <section className="bg-white border-b border-[#E3E7E0]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <SectionLabel>Security</SectionLabel>
          <h1 className="font-display text-4xl font-extrabold text-[#0E1F1A]">Security & trust</h1>
          <p className="mt-3 max-w-2xl text-[#5A6B60]">
            Controls we actually ship — stated plainly, without overclaim.
          </p>
        </div>
      </section>

      <section className="bg-[#F7F8F5]">
        <div className="mx-auto max-w-6xl px-6 py-14 md:py-16 space-y-6">
          {SECTIONS.map((s) => (
            <div key={s.title} className="rounded-2xl border border-[#E3E7E0] bg-white p-6">
              <h2 className="text-lg font-bold text-[#0E1F1A]">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5A6B60]">{s.body}</p>
            </div>
          ))}

          <div className="rounded-2xl border border-[#D3F36B]/60 bg-[#F4FBE3] p-6">
            <h2 className="text-lg font-bold text-[#0E1F1A]">Honesty on money movement</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#0E1F1A]/80">
              IOU Exchange orchestrates receivables workflows and provides settlement visibility. Money movement is performed by
              licensed settlement partners, not by IOU Exchange. We are not a bank and do not provide money-transmission services.
            </p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
