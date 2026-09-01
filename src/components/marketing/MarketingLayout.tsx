import type { ReactNode } from 'react';
import '@/styles/uzima-marketing.css';
import SiteNav from './SiteNav';
import SiteCtaBand from './SiteCtaBand';
import SiteFooter from './SiteFooter';

export default function MarketingLayout({
  children,
  showCtaBand = true,
  overlayNav = false,
}: {
  children: ReactNode;
  showCtaBand?: boolean;
  overlayNav?: boolean;
}) {
  return (
    <div className="uzima-site relative min-h-dvh flex flex-col overflow-x-clip">
      <SiteNav overlay={overlayNav} />
      <main className="relative flex-1 w-full">{children}</main>
      {showCtaBand && <SiteCtaBand />}
      <SiteFooter />
    </div>
  );
}

export function SectionLabel({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  return <span className={`label${onDark ? '' : ' dark'}`}>{children}</span>;
}
