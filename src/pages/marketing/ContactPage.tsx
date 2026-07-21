import { useState } from 'react';
import { toast } from 'sonner';
import MarketingLayout, { SectionLabel } from '@/components/marketing/MarketingLayout';
import { BRAND } from '@/lib/brand';

const SUPPORT = BRAND.supportEmail;

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    organisation: '',
    role: 'Supplier',
    email: '',
    message: '',
  });
  const [sending, setSending] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const subject = encodeURIComponent(`${BRAND.name} onboarding — ${form.organisation || form.name}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nOrganisation: ${form.organisation}\nRole: ${form.role}\nEmail: ${form.email}\n\n${form.message}`,
    );
    window.location.href = `mailto:${SUPPORT}?subject=${subject}&body=${body}`;
    toast.success('Opening your email client…');
    setSending(false);
  };

  const field =
    'mt-1 w-full rounded-lg border border-[#E3E7E0] bg-white px-3 py-2.5 text-sm text-[#0E1F1A] focus:outline-none focus:ring-2 focus:ring-[#D3F36B]';

  return (
    <MarketingLayout>
      <section className="bg-white border-b border-[#E3E7E0]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <SectionLabel>Contact</SectionLabel>
          <h1 className="font-display text-4xl font-extrabold text-[#0E1F1A]">Get in touch</h1>
          <p className="mt-3 max-w-xl text-[#5A6B60]">
            {BRAND.name} is invite-only. Tell us about your organisation and we&apos;ll reach out.
          </p>
        </div>
      </section>

      <section className="bg-[#F7F8F5]">
        <div className="mx-auto max-w-6xl px-6 py-14 md:py-16 grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-lg font-bold text-[#0E1F1A]">Talk to {BRAND.name}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#5A6B60]">
              Whether you are a supplier, buyer, or capital partner — we onboard organisations deliberately.
            </p>
            <p className="mt-6 text-sm">
              <span className="font-semibold text-[#0E1F1A]">Email</span>
              <br />
              <a href={`mailto:${SUPPORT}`} className="font-bold text-[#0E1F1A] underline underline-offset-2">
                {SUPPORT}
              </a>
            </p>
          </div>

          <form onSubmit={submit} className="rounded-2xl border border-[#E3E7E0] bg-white p-6 space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#5A6B60]">Name</label>
              <input required className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#5A6B60]">Organisation</label>
              <input required className={field} value={form.organisation} onChange={(e) => setForm({ ...form, organisation: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#5A6B60]">Role</label>
              <select className={field} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option>Supplier</option>
                <option>Buyer</option>
                <option>SPV / Financier</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#5A6B60]">Email</label>
              <input required type="email" className={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#5A6B60]">Message</label>
              <textarea required rows={4} className={field} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-full bg-[#0E1F1A] py-3 text-sm font-bold text-white hover:bg-[#1A3A2E] disabled:opacity-50"
            >
              {sending ? 'Opening…' : 'Send message'}
            </button>
          </form>
        </div>
      </section>
    </MarketingLayout>
  );
}
