import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Always land at the top when the route path changes. Hash targets are handled separately. */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' } as ScrollToOptions);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, hash]);

  return null;
}
