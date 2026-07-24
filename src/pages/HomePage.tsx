import { Link } from 'react-router-dom';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import Reveal from '@/components/marketing/Reveal';
import { BRAND } from '@/lib/brand';

const HERO =
  'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1920&q=80';

const STEPS = [
  ['01', 'List', 'A buyer posts a confirmed payable — or a supplier lists an invoice for verification.'],
  ['02', 'Confirm', 'The counterparty confirms. Consent and assignment follow with a full audit trail.'],
  ['03', 'Fund early', 'The SPV purchases at a clear discount. The supplier is paid now, not at maturity.'],
  ['04', 'Settle', 'The buyer pays the full amount when due. The cycle closes cleanly.'],
] as const;

const ROLES = [
  {
    index: '01 — Supplier',
    title: 'Cash against confirmed invoices',
    body: 'Turn unpaid trade receivables into earlier cash. List, accept an offer, get paid before maturity.',
    to: '/solutions#suppliers',
    link: 'Explore supplier path',
    img: '/images/role-supplier.jpg',
  },
  {
    index: '02 — Buyer',
    title: 'Keep your supply chain liquid',
    body: 'Confirm what you owe, sign assignment consents, and keep suppliers stocked without changing your terms.',
    to: '/solutions#buyers',
    link: 'Explore buyer path',
    img: '/images/role-buyer.jpg',
  },
  {
    index: '03 — SPV',
    title: 'Originate quality trade receivables',
    body: 'Purchase verified trade paper, manage assignments and maturity, package toward listing readiness.',
    to: '/solutions#spv',
    link: 'Explore financier path',
    img: '/images/role-spv.jpg',
  },
] as const;

export default function HomePage() {
  return (
    <MarketingLayout overlayNav>
      <section className="mk-hero">
        <div className="mk-hero__media" style={{ backgroundImage: `url('${HERO}')` }} aria-hidden />
        <div className="mk-hero__shade" aria-hidden />
        <div className="container mk-hero__inner">
          <p className="mk-brand">{BRAND.name}</p>
          <div className="mk-hero__rule" aria-hidden />
          <h1>
            Trade receivables
            <br />
            securitisation management
          </h1>
          <p className="sub">
            A management service for suppliers, buyers, and SPVs — from confirmation and assignment through settlement records.
          </p>
          <div className="jump">
            <Link to="/portals" className="btn btn-lime" style={{ border: 'none' }}>
              Enter portals <span className="node">→</span>
            </Link>
            <Link to="/solutions" className="btn btn-ghost-light">
              See how it works <span className="node">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="mk-problem">
        <div className="container mk-problem__grid">
          <Reveal>
            <span className="label dark">The bind</span>
            <h2>Suppliers wait months to get paid.</h2>
          </Reveal>
          <Reveal delay={1}>
            <div className="mk-problem__aside">
              <p>
                Across many B2B trades, 60–90 day credit is normal. Stock and services move now; cash arrives a quarter later.
              </p>
              <p>
                That trapped capital slows the whole chain — thinner inventory, fewer orders, weaker margins.{' '}
                {BRAND.name} helps manage the receivables path so capital can move sooner.
              </p>
            </div>
          </Reveal>
        </div>
        <div className="mk-problem__big" aria-hidden>
          90d
        </div>
      </section>

      <section className="mk-flow">
        <div className="container">
          <Reveal>
            <div className="mk-flow__head">
              <span className="label">How it works</span>
              <h2>From confirmed invoice to early cash.</h2>
            </div>
          </Reveal>
          <div className="mk-rail">
            {STEPS.map(([n, title, body], i) => (
              <Reveal key={n} delay={(i + 1) as 1 | 2 | 3 | 4}>
                <div className="mk-step">
                  <div className="mk-step__n">{n}</div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="mk-slash" aria-hidden />

      <section className="mk-roles">
        <div className="container">
          <Reveal>
            <div className="mk-roles__intro">
              <span className="label dark">Who it&apos;s for</span>
              <h2>One platform. Three sides of the trade.</h2>
            </div>
          </Reveal>
        </div>
        {ROLES.map((r, i) => (
          <Reveal key={r.title} delay={(Math.min(i + 1, 4)) as 1 | 2 | 3 | 4}>
            <article className="mk-ribbon">
              <div className="mk-ribbon__media">
                <img src={r.img} alt="" />
              </div>
              <div className="mk-ribbon__copy">
                <div className="mk-ribbon__index">{r.index}</div>
                <h3>{r.title}</h3>
                <p>{r.body}</p>
                <Link className="clink" to={r.to}>
                  {r.link} <span className="node">→</span>
                </Link>
              </div>
            </article>
          </Reveal>
        ))}
      </section>
    </MarketingLayout>
  );
}
