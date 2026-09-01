import { useEffect, type ReactNode } from 'react';

interface ConfirmationModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export default function ConfirmationModal({
  open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'default', onConfirm, onCancel, children,
}: ConfirmationModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="modal-sheet relative w-full sm:max-w-md animate-fade-in flex flex-col max-h-[min(92dvh,100%)]"
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/20 mb-4 shrink-0 sm:hidden" />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-touch px-5 pt-1 sm:px-6 sm:pt-2">
          <h2 id="confirm-modal-title" className="text-lg font-semibold mb-2">{title}</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{description}</p>
          {children ? <div className="mb-2">{children}</div> : null}
        </div>
        <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 px-5 pb-5 pt-3 sm:px-6 sm:pb-6 border-t border-[#0E1F1A]/08 bg-white safe-pad-bottom">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] px-4 text-sm font-medium rounded-xl border border-[#0E1F1A]/15 bg-white hover:bg-[#f7faf6] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[48px] px-4 text-sm font-semibold rounded-xl transition-all active:scale-[0.985] ${
              variant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'btn-primary shadow-md'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
