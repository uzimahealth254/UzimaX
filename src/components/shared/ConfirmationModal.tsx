import { useEffect } from 'react';

interface ConfirmationModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'default', onConfirm, onCancel,
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
      <div className="relative bg-white rounded-xl border border-[#0E1F1A]/10 shadow-none p-6 w-full sm:max-w-md animate-fade-in safe-pad-bottom">
        <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/20 mb-4 sm:hidden" />
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{description}</p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="min-h-[48px] px-4 text-sm font-medium rounded-xl border border-white/60 bg-white/50 hover:bg-white/80 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`min-h-[48px] px-4 text-sm font-semibold rounded-xl transition-all active:scale-[0.98] ${
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
