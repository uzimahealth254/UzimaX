import { Link } from 'react-router-dom';
import { BRAND } from '@/lib/brand';
import { BrandMark } from './SiteNav';

export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="foot-grid">
          <div className="foot-brand">
            <Link to="/" className="brand">
              <BrandMark />
              {BRAND.name}
            </Link>
            <p>{BRAND.tagline}.</p>
          </div>
          <div className="foot-col">
            <h4>Product</h4>
            <Link to="/solutions">Solutions</Link>
            <Link to="/portals">Portals</Link>
            <Link to="/solutions#how">How it works</Link>
          </div>
          <div className="foot-col">
            <h4>Company</h4>
            <Link to="/about">About us</Link>
            <Link to="/resources#contact">Contact</Link>
          </div>
          <div className="foot-col">
            <h4>Resources</h4>
            <Link to="/resources#docs">Documentation</Link>
            <Link to="/resources#faq">FAQ</Link>
            <Link to="/resources#security">Security</Link>
          </div>
        </div>
        <div className="foot-bottom">
          <div>
            <div className="cr">© 2026 {BRAND.name}. All rights reserved.</div>
            <div className="honesty">
              {BRAND.name} facilitates trade-receivables workflows and settlement visibility. It is not a bank and does not
              provide money-transmission services; funds are moved by licensed settlement partners.
            </div>
          </div>
          <div className="legal">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
