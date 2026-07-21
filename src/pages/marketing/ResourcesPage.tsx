import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, HelpCircle, Shield, Mail, ArrowRight, Lock, KeyRound, FileCheck, Users } from 'lucide-react';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import Reveal from '@/components/marketing/Reveal';
import { useHashScroll } from '@/components/marketing/useHashScroll';
import { BRAND } from '@/lib/brand';

const JUMP = [
  {
    to: '#docs',
    title: 'Documentation',
    body: 'API and integration guides for buyers and partners.',
    icon: BookOpen,
  },
  {
    to: '#faq',
    title: 'FAQ',
    body: `Common questions about how ${BRAND.name} works.`,
    icon: HelpCircle,
  },
  {
    to: '#security',
    title: 'Security',
    body: 'How we protect data and control access.',
    icon: Shield,
  },
  {
    to: '#contact',
    title: 'Contact',
    body: 'Get in touch or request onboarding.',
    icon: Mail,
  },
];

const FAQS = [
  {
    q: 'What is IOU Exchange?',
    a: 'IOU Exchange is a platform that turns confirmed pharmacy and health-trade receivables into early working capital. Suppliers get paid now; buyers settle at maturity; an SPV bridges the two.',
  },
  {
    q: 'Who can use it?',
    a: 'IOU Exchange is invite-only, built for health-trade organisations — suppliers, buyers, and capital partners. Contact us to be onboarded.',
  },
  {
    q: 'How does a supplier get paid early?',
    a: "A supplier lists a confirmed invoice, an SPV makes a tenor-based discount offer, and on acceptance the supplier receives funds early rather than waiting for the buyer's payment term.",
  },
  {
    q: 'Does IOU Exchange move money, or is it a bank?',
    a: 'No. IOU Exchange orchestrates the receivables workflow and provides settlement visibility. Money movement is performed by licensed settlement partners, not by IOU Exchange.',
  },
  {
    q: 'How is the discount calculated?',
    a: 'Pricing is tenor-based — the discount reflects the time to maturity of the invoice. Rates are shown up front, not negotiated opaquely.',
  },
  {
    q: 'How are receivables confirmed?',
    a: 'Every receivable is confirmed by its counterparty before financing. A buyer-posted invoice is opted into by the supplier; a supplier-listed invoice is verified by the buyer.',
  },
  {
    q: 'How do I get onboarded?',
    a: "Reach out through the contact form below. We'll collect your organisation's details and set up your portal access.",
  },
];

const SECURITY = [
  { icon: Users, text: 'Role-based access — buyers, suppliers, SPVs and admins each see only their view' },
  { icon: FileCheck, text: 'Every action audit-logged with actor and timestamp' },
  { icon: KeyRound, text: 'OTP-verified signatures on critical actions like assignment consent' },
  { icon: Lock, text: 'Invite-only onboarding — no public signup' },
];

export default function ResourcesPage() {
  useHashScroll();
  const [open, setOpen] = useState<number | null>(0);
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <MarketingLayout>
      {/* Compact intro — warm band so it isn’t a flat white void under the nav */}
      <section className="resources-intro" id="top">
        <div className="container">
          <div className="resources-intro-inner">
            <span className="label dark">Resources</span>
            <h1 className="h2">Guides, answers, and support.</h1>
            <p className="lead">Everything you need to integrate, understand, and trust the platform.</p>
          </div>

          <div className="resources-jump">
            {JUMP.map((item) => (
              <a key={item.to} className="resources-jump-card" href={item.to}>
                <span className="resources-jump-icon">
                  <item.icon size={20} strokeWidth={2.25} />
                </span>
                <span className="resources-jump-copy">
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </span>
                <ArrowRight size={16} className="resources-jump-arrow" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="block warm" id="docs">
        <div className="container resources-docs">
          <Reveal>
            <div>
              <span className="label dark">Documentation</span>
              <h2 className="h2">Integrate your systems with {BRAND.name}.</h2>
              <p className="lead">
                Partners and buyers push confirmed invoices and payment updates through a simple REST API.
              </p>
            </div>
          </Reveal>
          <Reveal delay={1}>
            <div className="resources-docs-panel">
              <div className="resources-docs-item">
                <h3>Authentication</h3>
                <p>Each organisation is issued an API key with scoped permissions (invoices, parties, payments).</p>
              </div>
              <div className="resources-docs-item">
                <h3>Core endpoints</h3>
                <p>Submit invoice · get status · register party · push payment update.</p>
              </div>
              <pre className="resources-code">
                {`POST /api/v1/invoices
Authorization: X-API-Key <key>`}
              </pre>
              <Link to="/login" className="btn btn-dark" style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                Open portal <span className="node">→</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="block light" id="faq">
        <div className="container">
          <Reveal>
            <div className="center" style={{ maxWidth: 640 }}>
              <span className="label dark">FAQ</span>
              <h2 className="h2">Common questions.</h2>
            </div>
          </Reveal>
          <div className="acc resources-acc">
            {FAQS.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={item.q} className={`acc-item${isOpen ? ' open' : ''}`}>
                  <button
                    type="button"
                    className="acc-q"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    {item.q}
                    <span className="pm" />
                  </button>
                  <div className="acc-a" style={isOpen ? { maxHeight: 280 } : undefined}>
                    <p>{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="block dark" id="security">
        <div className="container resources-security">
          <Reveal>
            <div>
              <span className="label">Security & trust</span>
              <h2 className="h2">Access controlled. Actions logged.</h2>
              <p className="lead" style={{ color: 'var(--white-80)' }}>
                Built for invite-only health-trade organisations — with a full trail on every critical action.
              </p>
            </div>
          </Reveal>
          <Reveal delay={1}>
            <div className="resources-security-grid">
              {SECURITY.map((s) => (
                <div key={s.text} className="resources-security-card">
                  <span className="resources-security-icon">
                    <s.icon size={18} />
                  </span>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <p className="resources-security-note">
            {BRAND.name} orchestrates receivables workflows and provides settlement visibility. Money movement is performed by
            licensed settlement partners, not by {BRAND.name}.
          </p>
        </div>
      </section>

      <section className="block light" id="contact">
        <div className="container contact-grid resources-contact">
          <Reveal>
            <div>
              <span className="label dark">Contact</span>
              <h2 className="h2">Get in touch.</h2>
              <p className="lead">
                {BRAND.name} is invite-only. Tell us about your organisation and we&apos;ll reach out.
              </p>
              <a href={`mailto:${BRAND.supportEmail}`} className="resources-email">
                {BRAND.supportEmail}
              </a>
              <div className="media-frame resources-contact-media">
                <img src="/images/about-hero.jpg" alt="" />
              </div>
            </div>
          </Reveal>
          <Reveal delay={1}>
            {sent ? (
              <div className="resources-form-card">
                <h3>Message received</h3>
                <p>
                  Thanks — we&apos;ll follow up at your email. You can also reach us at {BRAND.supportEmail}.
                </p>
                <Link to="/portals" className="btn btn-dark" style={{ marginTop: 20 }}>
                  Enter portal <span className="node">→</span>
                </Link>
              </div>
            ) : (
              <form className="resources-form-card" onSubmit={onSubmit}>
                <div className="field">
                  <label htmlFor="name">Name</label>
                  <input id="name" name="name" type="text" placeholder="Your name" required />
                </div>
                <div className="field">
                  <label htmlFor="org">Organisation</label>
                  <input id="org" name="org" type="text" placeholder="Company name" required />
                </div>
                <div className="field">
                  <label htmlFor="role">Role</label>
                  <select id="role" name="role" defaultValue="Supplier">
                    <option>Supplier</option>
                    <option>Buyer</option>
                    <option>SPV / Financier</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" placeholder="you@company.com" required />
                </div>
                <div className="field">
                  <label htmlFor="message">Message</label>
                  <textarea id="message" name="message" rows={4} placeholder="How can we help?" required />
                </div>
                <button className="btn btn-dark" type="submit">
                  Send message <span className="node">→</span>
                </button>
              </form>
            )}
          </Reveal>
        </div>
      </section>
    </MarketingLayout>
  );
}
