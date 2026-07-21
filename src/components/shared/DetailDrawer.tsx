import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** Slide-in detail panel for register / assignments tables */
export default function DetailDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Close" onClick={onClose} />
      <aside className="relative w-full max-w-md h-full bg-white border-l border-[#0E1F1A]/10 shadow-xl flex flex-col animate-fade-in safe-pad-bottom">
        <header className="flex items-start justify-between gap-3 px-4 py-3 border-b border-[#0E1F1A]/8">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#0E1F1A] truncate">{title}</h2>
            {subtitle && <p className="text-[11px] text-[#5A6B7D] mt-0.5 font-mono truncate">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-[#f7faf6]" aria-label="Close drawer">
            <X size={16} className="text-[#5A6B7D]" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-touch">{children}</div>
        {footer && <div className="border-t border-[#0E1F1A]/8 px-4 py-3">{footer}</div>}
      </aside>
    </div>
  );
}
