import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useData } from '@/hooks/usePlatformData';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToCsv } from '@/lib/exportUtils';
import { toast } from 'sonner';

/** Period reconciliation from API + live escrow/payments detail */
export default function ReconciliationPage() {
  const { escrowLegs, payments, invoices } = useData();
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const apiReport = useQuery({
    queryKey: ['admin-reconciliation', from, to],
    queryFn: async () => (await api.get('/admin/reconciliation', { params: { from, to } })).data,
  });

  const report = useMemo(() => {
    const fromT = new Date(from).getTime();
    const toT = new Date(to).getTime() + 86400000;

    const disbursed = escrowLegs.filter(l =>
      l.type === 'disbursement' && l.status === 'released' && l.paidAt
      && new Date(l.paidAt).getTime() >= fromT && new Date(l.paidAt).getTime() <= toT,
    );
    const collected = escrowLegs.filter(l =>
      l.type === 'collection' && l.status === 'collected' && l.paidAt
      && new Date(l.paidAt).getTime() >= fromT && new Date(l.paidAt).getTime() <= toT,
    );
    const pendingDisb = escrowLegs.filter(l => l.type === 'disbursement' && l.status === 'pending');
    const pendingColl = escrowLegs.filter(l => l.type === 'collection' && l.status === 'pending');

    const sumD = disbursed.reduce((s, l) => s + l.amount, 0);
    const sumC = collected.reduce((s, l) => s + l.amount, 0);
    const variance = sumC - sumD;

    const settledInv = invoices.filter(i => i.status === 'settled');
    const paidPayments = payments.filter(p => p.status === 'paid');
    const matchFlags = settledInv.map(inv => {
      const pay = paidPayments.find(p => p.invoiceId === inv.id);
      const coll = escrowLegs.find(e => e.invoiceId === inv.id && e.type === 'collection');
      const ok = !!pay && !!coll && coll.status === 'collected' && Math.abs((pay?.amount || 0) - (coll?.amount || 0)) < 1;
      return { inv, ok, pay, coll };
    });

    return { disbursed, collected, pendingDisb, pendingColl, sumD, sumC, variance, matchFlags };
  }, [escrowLegs, payments, invoices, from, to]);

  const exportReport = () => {
    exportToCsv(
      `uzima-reconciliation-${from}_${to}.csv`,
      ['iou', 'type', 'counterparty', 'amount', 'status', 'paidAt'],
      [...report.disbursed, ...report.collected].map(l => [
        l.iouRegistryId, l.type, l.counterparty, l.amount, l.status, l.paidAt || '',
      ]),
    );
    toast.success('Reconciliation exported');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Reconciliation & settlement"
        subtitle="Period match of escrow legs vs payable records · variance flags"
        actions={
          <button type="button" onClick={exportReport} className="px-4 py-2 text-sm rounded-xl border font-medium">
            Export CSV
          </button>
        }
      />

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="block border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="block border rounded-lg px-3 py-2 text-sm" />
        </div>
        {apiReport.data && (
          <p className="text-xs text-muted-foreground pb-2">
            API summary · variance {formatCurrency(apiReport.data.variance)} · pending escrow {apiReport.data.pendingEscrow}
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Disbursed (period)</p>
          <p className="font-mono text-lg font-semibold">{formatCurrency(report.sumD)}</p>
        </div>
        <div className="border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Collected (period)</p>
          <p className="font-mono text-lg font-semibold">{formatCurrency(report.sumC)}</p>
        </div>
        <div className={`border rounded-2xl p-4 ${Math.abs(report.variance) > 0 ? 'border-amber-300 bg-amber-50/50' : ''}`}>
          <p className="text-xs text-muted-foreground">Variance (collect − disburse)</p>
          <p className="font-mono text-lg font-semibold">{formatCurrency(report.variance)}</p>
          {Math.abs(report.variance) > 0 && <p className="text-xs text-amber-700 mt-1">Flag: investigate open legs / timing</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-2">Pending disbursements ({report.pendingDisb.length})</h3>
          <ul className="space-y-2 text-sm max-h-48 overflow-y-auto">
            {report.pendingDisb.slice(0, 20).map(l => (
              <li key={l.id} className="flex justify-between gap-2">
                <span className="font-mono text-xs truncate">{l.iouRegistryId}</span>
                <span className="font-mono">{formatCurrency(l.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-2">Pending collections ({report.pendingColl.length})</h3>
          <ul className="space-y-2 text-sm max-h-48 overflow-y-auto">
            {report.pendingColl.slice(0, 20).map(l => (
              <li key={l.id} className="flex justify-between gap-2">
                <span className="font-mono text-xs truncate">{l.iouRegistryId}</span>
                <span className="font-mono">{formatCurrency(l.amount)} · due {formatDate(l.dueDate)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border rounded-2xl p-4">
        <h3 className="text-sm font-semibold mb-3">Settled invoice match check</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {report.matchFlags.slice(0, 30).map(({ inv, ok }) => (
            <div key={inv.id} className="flex items-center justify-between text-sm border-b pb-2">
              <span className="font-mono text-xs">{inv.iouRegistryId}</span>
              <span className={ok ? 'text-emerald-700 text-xs font-medium' : 'text-amber-700 text-xs font-medium'}>
                {ok ? 'Matched' : 'Variance / incomplete'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
