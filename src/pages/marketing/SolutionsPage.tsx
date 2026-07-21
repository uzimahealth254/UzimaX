import { Link } from 'react-router-dom';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import Reveal from '@/components/marketing/Reveal';
import { useHashScroll } from '@/components/marketing/useHashScroll';
import { BRAND } from '@/lib/brand';

const HERO =
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=80';

export default function SolutionsPage() {
  useHashScroll();

  return (
    <MarketingLayout>
      <section className="mk-hero" style={{ minHeight: 'min(70vh, 640px)' }}>
        <div className="mk-hero__media" style={{ backgroundImage: `url('${HERO}')` }} aria-hidden />
        <div className="mk-hero__shade" aria-hidden />
        <div className="container mk-hero__inner" style={{ paddingTop: 120, paddingBottom: 56 }}>
          <p className="mk-brand">{BRAND.name}</p>
          <div className="mk-hero__rule" aria-hidden />
          <h1 style={{ maxWidth: '14ch', fontSize: 'clamp(36px, 5.5vw, 68px)' }}>
            Working capital, tailored to your role.
          </h1>
          <p className="sub">Whether you sell, buy, or finance — {BRAND.name} fits your side of the trade.</p>
          <div className="jump">
            <a href="#suppliers">Suppliers</a>
            <a href="#buyers">Buyers</a>
            <a href="#spv">Financiers</a>
          </div>
        </div>
      </section>

      <section className="mk-panel mk-panel--mist" id="suppliers">
        <div className="container mk-panel__layout">
          <Reveal>
            <span className="label dark">For suppliers</span>
            <h2 className="h2" style={{ marginTop: 12 }}>Get paid now, not in 90 days.</h2>
            <ul className="mk-ticks">
              <li><span className="dot">1</span><span>List a confirmed invoice in minutes</span></li>
              <li><span className="dot">2</span><span>See a clear, tenor-based discount up front</span></li>
              <li><span className="dot">3</span><span>Accept and receive funds early</span></li>
              <li><span className="dot">4</span><span>Track every trade from listing to settlement</span></li>
            </ul>
            <Link to="/portals" className="btn btn-dark" style={{ marginTop: 28 }}>
              Enter supplier portal <span className="node">→</span>
            </Link>
          </Reveal>
          <Reveal delay={1}>
            <div className="mk-panel__media">
              <img src="/images/solutions-supplier.jpg" alt="Pharmacy supplier operations" />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mk-panel mk-panel--forest" id="buyers">
        <div className="container mk-panel__layout">
          <Reveal>
            <div className="mk-panel__media">
              <img src="/images/solutions-buyer.jpg" alt="Buyer warehouse and logistics" />
            </div>
          </Reveal>
          <Reveal delay={1}>
            <span className="label">For buyers</span>
            <h2 className="h2" style={{ marginTop: 12 }}>Keep your suppliers strong.</h2>
            <ul className="mk-ticks">
              <li><span className="dot">1</span><span>Post confirmed payables or verify supplier-listed invoices</span></li>
              <li><span className="dot">2</span><span>Sign assignment consents securely (OTP-verified)</span></li>
              <li><span className="dot">3</span><span>See a clear schedule of what&apos;s owed and when</span></li>
              <li><span className="dot">4</span><span>Support supplier liquidity without changing your own terms</span></li>
            </ul>
            <Link to="/portals" className="btn btn-lime" style={{ border: 'none', marginTop: 28 }}>
              Enter buyer portal <span className="node">→</span>
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="mk-panel mk-panel--paper" id="spv">
        <div className="container mk-panel__layout">
          <Reveal>
            <span className="label dark">For financiers</span>
            <h2 className="h2" style={{ marginTop: 12 }}>Quality receivables, one vehicle.</h2>
            <ul className="mk-ticks">
              <li><span className="dot">1</span><span>Browse a registry of confirmed, counterparty-verified receivables</span></li>
              <li><span className="dot">2</span><span>Make tenor-based purchase offers</span></li>
              <li><span className="dot">3</span><span>Manage assignments, escrow legs and a maturity calendar</span></li>
              <li><span className="dot">4</span><span>Package receivables toward a capital-markets listing path</span></li>
            </ul>
            <Link to="/portals" className="btn btn-dark" style={{ marginTop: 28 }}>
              Enter SPV portal <span className="node">→</span>
            </Link>
          </Reveal>
          <Reveal delay={1}>
            <div className="mk-panel__media">
              <img src="/images/solutions-spv.jpg" alt="Capital and receivables portfolio" />
            </div>
          </Reveal>
        </div>
      </section>
    </MarketingLayout>
  );
}
