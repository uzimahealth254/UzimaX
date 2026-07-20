import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import { useActor } from '@/hooks/useActor';
import PageHeader from '@/components/layout/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { HandCoins } from 'lucide-react';

export default function OptInInboxPage() {
  const { user } = useAuth();
  const { optIns, respondToOptIn } = useData();
  const actor = useActor();
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const mine = optIns.filter(o => o.supplierId === user?.organisationId);
  const pending = mine.filter(o => o.status === 'pending');
  const history = mine.filter(o => o.status !== 'pending');

  const accept = (id: string) => {
    respondToOptIn(id, true, undefined, actor);
    toast.success('Opted in — receivable assigned to Uzima Capital SPV');
  };

  const decline = () => {
    if (!declineId) return;
    respondToOptIn(declineId, false, reason || 'Declined by supplier', actor);
    setDeclineId(null);
    setReason('');
    toast.message('Opt-in declined — buyer notified');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Opt-in / Sell inbox"
        subtitle="Buyer-posted IOUs waiting for you to sell the receivable to the SPV"
      />

      {pending.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No pending opt-ins"
          description="When a buyer posts an approved invoice, it appears here for you to accept or decline."
        />
      ) : (
        <div className="space-y-3">
          {pending.map(o => (
            <div key={o.id} className="glass rounded-2xl border border-white/50 p-4 md:p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{o.buyerName}</p>
                  <p className="text-xs font-mono text-muted-foreground">{o.iouRegistryId}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Face value</p>
                  <p className="font-semibold">{formatCurrency(o.amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Notified</p>
                  <p>{formatDate(o.notifiedAt)}</p>
                </div>
                <div className="sm:col-span-2 md:col-span-1">
                  <p className="text-muted-foreground text-xs">On accept</p>
                  <p className="text-sm">Assignment → Uzima Capital SPV</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => accept(o.id)}
                  className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                >
                  Opt in &amp; sell
                </button>
                <button
                  type="button"
                  onClick={() => setDeclineId(o.id)}
                  className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl border text-sm font-medium"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">History</h3>
          {history.map(o => (
            <div key={o.id} className="flex items-center justify-between gap-3 border rounded-xl px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{o.iouRegistryId}</p>
                <p className="text-muted-foreground text-xs">{o.buyerName} · {formatCurrency(o.amount)}</p>
              </div>
              <StatusBadge status={o.status} />
            </div>
          ))}
        </div>
      )}

      {declineId && (
        <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setDeclineId(null); setReason(''); }} />
          <div className="relative glass-strong rounded-t-3xl sm:rounded-2xl p-5 w-full max-w-md space-y-3 safe-pad-bottom">
            <div className="sm:hidden w-10 h-1 rounded-full bg-muted mx-auto" />
            <h2 className="font-semibold">Decline opt-in?</h2>
            <p className="text-sm text-muted-foreground">The buyer will be notified. Optionally leave a reason.</p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              placeholder="Reason (optional)"
              className="w-full px-3 py-2.5 border rounded-lg text-sm min-h-[44px]"
            />
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" className="w-full sm:w-auto min-h-[48px] px-4 py-2.5 rounded-xl border text-sm" onClick={() => { setDeclineId(null); setReason(''); }}>Cancel</button>
              <button type="button" className="w-full sm:w-auto min-h-[48px] px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm" onClick={decline}>Decline</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
