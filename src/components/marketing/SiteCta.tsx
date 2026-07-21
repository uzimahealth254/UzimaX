import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

type CtaProps = {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

/** Dark forest CTA with lime arrow chip — portal entry */
export function PortalCta({ to, children, className = '', onClick }: CtaProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full bg-[#0E1F1A] py-2.5 pl-6 pr-2 text-sm font-bold text-white hover:bg-[#1A3A2E] transition-colors shadow-lg ${className}`}
    >
      <span className="pr-1">{children}</span>
      <span className="btn-action-chip flex h-8 w-8 items-center justify-center rounded-full bg-[#D3F36B] text-[#0E1F1A]">
        <ArrowRight size={15} strokeWidth={2.5} />
      </span>
    </Link>
  );
}

/** Lime pill CTA for lime bands */
export function LimeCta({ to, children, className = '', onClick }: CtaProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full bg-[#0E1F1A] py-2.5 pl-6 pr-2 text-sm font-bold text-white hover:bg-[#1A3A2E] transition-colors ${className}`}
    >
      <span className="pr-1">{children}</span>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D3F36B] text-[#0E1F1A]">
        <ArrowRight size={15} strokeWidth={2.5} />
      </span>
    </Link>
  );
}

/** Outline / ghost */
export function GhostCta({ to, children, className = '', dark = false }: CtaProps & { dark?: boolean }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-bold transition-colors ${
        dark
          ? 'border-[#0E1F1A] text-[#0E1F1A] hover:bg-[#0E1F1A]/5'
          : 'border-[#D3F36B] text-[#D3F36B] hover:bg-[#D3F36B]/10'
      } ${className}`}
    >
      {children}
    </Link>
  );
}
