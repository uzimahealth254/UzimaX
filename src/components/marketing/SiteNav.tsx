import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { BRAND } from '@/lib/brand';

const SOLUTIONS = [
  { label: 'For Suppliers', hint: 'Get paid early on invoices', to: '/solutions#suppliers' },
  { label: 'For Buyers', hint: 'Confirm and manage payables', to: '/solutions#buyers' },
  { label: 'For SPVs & Financiers', hint: 'Purchase quality receivables', to: '/solutions#spv' },
  { label: 'How it works', hint: 'From invoice to cash', to: '/solutions#how' },
];

const RESOURCES = [
  { label: 'Documentation', hint: 'API & integration guides', to: '/resources#docs' },
  { label: 'FAQ', hint: 'Common questions', to: '/resources#faq' },
  { label: 'Security', hint: 'How we protect access & data', to: '/resources#security' },
  { label: 'Contact', hint: 'Request onboarding', to: '/resources#contact' },
];

function BrandMark() {
  return (
    <span className="mark" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M6 4v9a6 6 0 0012 0V4" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="18" cy="6" r="2.6" fill="#D3F36B" />
      </svg>
    </span>
  );
}

export default function SiteNav({ overlay = false }: { overlay?: boolean }) {
  const { pathname } = useLocation();
  const [progress, setProgress] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!overlay) {
      setProgress(1);
      return;
    }
    const onScroll = () => {
      // Blend over ~180px of scroll for a slow white fade-in
      const p = Math.min(1, Math.max(0, window.scrollY / 180));
      setProgress(p);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [overlay]);

  useEffect(() => {
    setMobileOpen(false);
    document.body.style.overflow = '';
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const active = (path: string) =>
    path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);

  const solutionsActive = pathname.startsWith('/solutions');
  const resourcesActive = pathname.startsWith('/resources');
  const solid = progress > 0.72;

  const navCls = ['nav', overlay ? 'on-hero' : '', solid ? 'scrolled' : ''].filter(Boolean).join(' ');

  const navStyle = overlay
    ? ({
        ['--nav-progress' as string]: String(progress),
        background: `rgba(255, 255, 255, ${(progress * 0.98).toFixed(3)})`,
        borderBottomColor: `rgba(227, 231, 224, ${progress.toFixed(3)})`,
        boxShadow:
          progress > 0.08
            ? `0 8px 28px rgba(14, 31, 26, ${(0.07 * progress).toFixed(3)})`
            : 'none',
        backdropFilter: progress > 0.05 ? `blur(${(12 * progress).toFixed(1)}px)` : 'none',
        WebkitBackdropFilter: progress > 0.05 ? `blur(${(12 * progress).toFixed(1)}px)` : 'none',
      } as CSSProperties)
    : undefined;

  return (
    <>
      <nav className={navCls} style={navStyle}>
        <div className="container nav-inner">
          <Link to="/" className="brand">
            <BrandMark />
            <span className="brand-text">{BRAND.name}</span>
          </Link>

          <div className="nav-links">
            <Link to="/" className={active('/') ? 'active' : undefined} data-nav="home">
              Home
            </Link>
            <Link to="/about" className={active('/about') ? 'active' : undefined} data-nav="about">
              About us
            </Link>
            <span className="has-drop">
              <button type="button" className={`drop-toggle${solutionsActive ? ' active' : ''}`} data-nav="solutions">
                Solutions <i className="caret" />
              </button>
              <span className="drop">
                {SOLUTIONS.map((s) => (
                  <Link key={s.to} to={s.to}>
                    {s.label}
                    <span className="d-sub">{s.hint}</span>
                  </Link>
                ))}
              </span>
            </span>
            <Link to="/portals" className={active('/portals') ? 'active' : undefined} data-nav="portals">
              Portals
            </Link>
            <span className="has-drop">
              <button type="button" className={`drop-toggle${resourcesActive ? ' active' : ''}`} data-nav="resources">
                Resources <i className="caret" />
              </button>
              <span className="drop">
                {RESOURCES.map((r) => (
                  <Link key={r.to} to={r.to}>
                    {r.label}
                    <span className="d-sub">{r.hint}</span>
                  </Link>
                ))}
              </span>
            </span>
          </div>

          <div className="nav-right">
            <Link to="/login" className="signin">
              Sign in
            </Link>
            <Link to="/login" className="btn btn-dark">
              Enter portal <span className="node">→</span>
            </Link>
            <button type="button" className="nav-burger" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <div className="mobile-sheet">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12 }}>
            <Link to="/" className="brand" onClick={() => setMobileOpen(false)} style={{ color: '#fff', minWidth: 0 }}>
              <BrandMark />
              <span className="brand-text">{BRAND.name}</span>
            </Link>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setMobileOpen(false)}
              className="touch-target"
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 10, flexShrink: 0 }}
            >
              <X size={22} />
            </button>
          </div>
          <Link to="/" onClick={() => setMobileOpen(false)}>Home</Link>
          <Link to="/about" onClick={() => setMobileOpen(false)}>About us</Link>
          <Link to="/solutions" onClick={() => setMobileOpen(false)}>Solutions</Link>
          {SOLUTIONS.map((s) => (
            <Link key={s.to} to={s.to} className="sub" onClick={() => setMobileOpen(false)}>
              {s.label}
            </Link>
          ))}
          <Link to="/portals" onClick={() => setMobileOpen(false)}>Portals</Link>
          <Link to="/resources" onClick={() => setMobileOpen(false)}>Resources</Link>
          {RESOURCES.map((r) => (
            <Link key={r.to} to={r.to} className="sub" onClick={() => setMobileOpen(false)}>
              {r.label}
            </Link>
          ))}
          <div className="sheet-actions">
            <Link to="/login" className="btn btn-lime" onClick={() => setMobileOpen(false)} style={{ justifyContent: 'center' }}>
              Sign in <span className="node">→</span>
            </Link>
            <Link to="/login" className="btn btn-ghost-light" onClick={() => setMobileOpen(false)} style={{ justifyContent: 'center' }}>
              Enter portal <span className="node">→</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export { BrandMark };
