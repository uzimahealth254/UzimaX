import { Link } from 'react-router-dom';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import Reveal from '@/components/marketing/Reveal';
import { BRAND } from '@/lib/brand';

const HERO =
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1920&q=80';

export default function AboutPage() {
  return (
    <MarketingLayout>
      <section className="mk-hero" style={{ minHeight: 'min(78vh, 720px)' }}>
        <div className="mk-hero__media" style={{ backgroundImage: `url('${HERO}')` }} aria-hidden />
        <div className="mk-hero__shade" aria-hidden />
        <div className="container mk-hero__inner">
          <p className="mk-brand">About {BRAND.name}</p>
          <div className="mk-hero__rule" aria-hidden />
          <h1 style={{ maxWidth: '13ch', fontSize: 'clamp(36px, 5.8vw, 72px)' }}>
            The working-capital layer for health trade.
          </h1>
          <p className="sub">
            We connect the people who move medicine — suppliers, buyers, and the capital that keeps them liquid.
          </p>
        </div>
      </section>

      <section className="mk-problem">
        <div className="container mk-problem__grid">
          <Reveal>
            <span className="label dark">Mission</span>
            <h2>Liquidity where the chain needs it most.</h2>
          </Reveal>
          <Reveal delay={1}>
            <div className="mk-problem__aside">
              <p>
                In Kenya&apos;s pharmaceutical trade, most B2B sales happen on credit. Suppliers deliver stock and then
                wait 60, 90, sometimes more than 120 days to be paid.
              </p>
              <p>
                {BRAND.name} turns those confirmed receivables into cash today — while the buyer settles at maturity as
                planned. Everyone keeps trading.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mk-statement">
        <div className="container">
          <Reveal>
            <p className="mk-statement__text">
              Trade credit keeps medicine <span className="mk-statement__lime">moving</span>
              {' '}— and the money{' '}
              <span className="mk-statement__lime">stuck</span>.
            </p>
          </Reveal>
          <div className="mk-metrics">
            {[
              ['60–90', 'days — typical payment terms'],
              ['~70%', 'of formal B2B health trade runs on credit'],
              ['Months→days', `the gap ${BRAND.name} closes`],
            ].map(([n, c], i) => (
              <Reveal key={c} delay={(i + 1) as 1 | 2 | 3}>
                <div className="mk-metric">
                  <div className="mk-metric__n">{n}</div>
                  <div className="mk-metric__c">{c}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-panel mk-panel--paper">
        <div className="container" style={{ maxWidth: 760 }}>
          <Reveal>
            <span className="label dark">How we work</span>
            <h2 className="h2" style={{ marginTop: 12, maxWidth: '16ch' }}>
              Honest tooling for a complex trade.
            </h2>
            <div className="body-copy" style={{ marginTop: 24 }}>
              <p>
                We record workflow, consent, assignment, and settlement updates with a full trail. Cash movement and
                exchange listing sit with settlement partners and markets — we never pretend otherwise.
              </p>
              <p>
                Access is invite-only. We onboard organisations deliberately so every receivable on the platform has a
                clear counterparty and programme context.
              </p>
            </div>
            <Link to="/resources#contact" className="btn btn-dark" style={{ marginTop: 28 }}>
              Talk to us <span className="node">→</span>
            </Link>
          </Reveal>
        </div>
      </section>
    </MarketingLayout>
  );
}
