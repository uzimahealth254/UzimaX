import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scroll to hash targets after navigation (marketing anchors). */
export function useHashScroll() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' } as ScrollToOptions);
      return;
    }
    const id = hash.replace('#', '');
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
    return () => clearTimeout(t);
  }, [pathname, hash]);
}
