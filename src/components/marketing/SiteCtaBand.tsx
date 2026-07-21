import { Link } from 'react-router-dom';
import { BRAND } from '@/lib/brand';

export default function SiteCtaBand() {
  return (
    <div className="cta-band">
      <div className="container">
        <h2>Ready to turn receivables into working capital?</h2>
        <p>{BRAND.name} is invite-only. Tell us about your organisation and we&apos;ll be in touch.</p>
        <div className="btns">
          <Link to="/resources#contact" className="btn btn-dark">
            Contact us <span className="node">→</span>
          </Link>
          <Link to="/portals" className="btn btn-ghost-dark">
            Enter portal <span className="node">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
