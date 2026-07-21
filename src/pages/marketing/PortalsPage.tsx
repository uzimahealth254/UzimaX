import { Link } from 'react-router-dom';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import Reveal from '@/components/marketing/Reveal';
import { BRAND } from '@/lib/brand';

const PORTALS = [
  {
    title: 'Supplier portal',
    body: 'List receivables and get paid early.',
    to: '/login',
    img: '/images/role-supplier.jpg',
  },
  {
    title: 'Buyer portal',
    body: 'Confirm payables and manage schedules.',
    to: '/login',
    img: '/images/role-buyer.jpg',
  },
  {
    title: 'SPV portal',
    body: 'Purchase and manage receivables.',
    to: '/login',
    img: '/images/role-spv.jpg',
  },
];

export default function PortalsPage() {
  return (
    <MarketingLayout>
      <section className="mk-problem" style={{ paddingTop: 96, paddingBottom: 48 }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <Reveal>
            <span className="label dark">Portals</span>
            <h2 className="h2" style={{ marginTop: 12 }}>Enter your side of the trade.</h2>
            <p className="lead" style={{ marginTop: 16 }}>
              Invite-only access. Choose your role to sign in — or contact us if your organisation isn&apos;t onboarded
              yet.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mk-panel mk-panel--paper" style={{ paddingTop: 24 }}>
        <div className="container">
          <div className="mk-portal-list">
            {PORTALS.map((p, i) => (
              <Reveal key={p.title} delay={((i % 4) + 1) as 1 | 2 | 3 | 4}>
                <Link className="mk-portal-row" to={p.to}>
                  <img src={p.img} alt="" />
                  <div>
                    <h3>{p.title}</h3>
                    <p>{p.body}</p>
                  </div>
                  <span className="btn btn-lime" style={{ border: 'none' }}>
                    Sign in <span className="node">→</span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-statement" style={{ padding: '72px 0' }}>
        <div className="container center" style={{ maxWidth: 620 }}>
          <Reveal>
            <p className="mk-statement__text" style={{ maxWidth: '18ch', margin: '0 auto', fontSize: 'clamp(26px, 3.5vw, 40px)' }}>
              Not onboarded yet?
            </p>
            <p className="sub" style={{ margin: '18px auto 0', maxWidth: '36ch', textAlign: 'center' }}>
              {BRAND.name} is invite-only. Tell us about your organisation and we&apos;ll be in touch.
            </p>
            <Link to="/resources#contact" className="btn btn-lime" style={{ border: 'none', marginTop: 28 }}>
              Contact us <span className="node">→</span>
            </Link>
          </Reveal>
        </div>
      </section>
    </MarketingLayout>
  );
}
