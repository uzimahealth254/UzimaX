import { AlertTriangle, RefreshCw } from 'lucide-react';

/** Pulse skeleton for portal-section bodies */
export function LoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 px-3 py-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-1.5 py-1.5">
          <div className="h-3 rounded bg-[#0E1F1A]/8 w-[40%]" />
          <div className="h-2.5 rounded bg-[#0E1F1A]/6 w-[70%]" />
        </div>
      ))}
    </div>
  );
}

/** Error + retry for react-query surfaces */
export function QueryError({
  message = 'Could not load data',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="px-3 py-6 text-center space-y-2" role="alert">
      <AlertTriangle size={18} className="mx-auto text-red-600" />
      <p className="text-xs font-bold text-[#0E1F1A]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 min-h-[34px] px-3 rounded-lg border border-[#0E1F1A]/15 text-xs font-bold text-[#0E1F1A] hover:bg-[#f7faf6]"
        >
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}

/** Gate section body on loading / error before rendering children */
export function QuerySurface({
  loading,
  error,
  onRetry,
  empty,
  isEmpty,
  children,
  skeletonRows = 5,
}: {
  loading?: boolean;
  error?: Error | null | boolean | string;
  onRetry?: () => void;
  empty?: React.ReactNode;
  isEmpty?: boolean;
  children: React.ReactNode;
  skeletonRows?: number;
}) {
  if (loading) return <LoadingState rows={skeletonRows} />;
  if (error) {
    const message = typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : 'Could not load data';
    return <QueryError message={message} onRetry={onRetry} />;
  }
  if (isEmpty && empty) return <>{empty}</>;
  return <>{children}</>;
}
