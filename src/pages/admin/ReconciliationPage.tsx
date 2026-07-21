import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useData } from '@/hooks/usePlatformData';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToCsv } from '@/lib/exportUtils';
import { toast } from 'sonner';
import { ArrowDownCircle, ArrowUpCircle, AlertTriangle, Download } from 'lucide-react';

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
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Reconciliation & settlement"
        subtitle="Period match of escrow legs vs payable records · variance flags"
        actions={
          <button
            type="button"
            onClick={exportReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D3F36B] text-[#0E1F1A] text-xs font-bold hover:bg-[#C5E85A] min-h-[36px]"
          >
            <Download size={12} />
            Export CSV
          </button>
        }
      />

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Reporting period</h2>
            <p className="portal-section__desc">Filter escrow activity by date range</p>
          </div>
          <div className="flex flex-wrap items-end gap-2 w-full sm:w-auto">
            <div>
              <label className="text-[10px] font-semibold text-[#5A6B7D]">From</label>
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="field-input mt-1 !min-h-[34px] text-xs block"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#5A6B7D]">To</label>
              <input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="field-input mt-1 !min-h-[34px] text-xs block"
              />
            </div>
          </div>
        </header>
        {apiReport.data && (
          <div className="portal-section__body--pad pt-0">
            <p className="text-[11px] text-[#5A6B7D]">
              API summary · variance {formatCurrency(apiReport.data.variance)} · pending escrow {apiReport.data.pendingEscrow}
            </p>
          </div>
        )}
      </section>

      {Math.abs(report.variance) > 0 && (
        <div className="portal-callout flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-[#8A6A00]" />
          <p>
            Variance of {formatCurrency(report.variance)} detected — investigate open legs and timing mismatches.
          </p>
        </div>
      )}

      <div className="portal-metrics portal-metrics--3">
        <StatCard label="Disbursed (period)" value={formatCurrency(report.sumD)} icon={ArrowDownCircle} accent="forest" />
        <StatCard label="Collected (period)" value={formatCurrency(report.sumC)} icon={ArrowUpCircle} accent="lime" />
        <StatCard
          label="Variance"
          value={formatCurrency(report.variance)}
          icon={AlertTriangle}
          accent={Math.abs(report.variance) > 0 ? 'gold' : 'lime'}
          change={Math.abs(report.variance) > 0 ? 'Investigate open legs' : undefined}
        />
      </div>

      <div className="portal-grid-2">
        <section className="portal-section">
          <header className="portal-section__head">
            <h2 className="portal-section__title">Pending disbursements</h2>
            <p className="portal-section__desc">{report.pendingDisb.length} open</p>
          </header>
          <div className="portal-section__body--pad pt-0 max-h-48 overflow-y-auto space-y-2">
            {report.pendingDisb.slice(0, 20).length === 0 ? (
              <p className="text-xs text-[#5A6B7D]">None pending</p>
            ) : (
              report.pendingDisb.slice(0, 20).map(l => (
                <div key={l.id} className="flex justify-between gap-2 text-xs">
                  <span className="font-mono text-[11px] truncate text-[#0E1F1A]">{l.iouRegistryId}</span>
                  <span className="font-mono font-semibold shrink-0">{formatCurrency(l.amount)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="portal-section">
          <header className="portal-section__head">
            <h2 className="portal-section__title">Pending collections</h2>
            <p className="portal-section__desc">{report.pendingColl.length} open</p>
          </header>
          <div className="portal-section__body--pad pt-0 max-h-48 overflow-y-auto space-y-2">
            {report.pendingColl.slice(0, 20).length === 0 ? (
              <p className="text-xs text-[#5A6B7D]">None pending</p>
            ) : (
              report.pendingColl.slice(0, 20).map(l => (
                <div key={l.id} className="flex justify-between gap-2 text-xs">
                  <span className="font-mono text-[11px] truncate text-[#0E1F1A]">{l.iouRegistryId}</span>
                  <span className="font-mono font-semibold shrink-0 text-right">
                    {formatCurrency(l.amount)} · due {formatDate(l.dueDate)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Settled invoice match check</h2>
            <p className="portal-section__desc">Payment vs collection alignment</p>
          </div>
        </header>
        <div className="divide-y divide-[#0E1F1A]/8 max-h-64 overflow-y-auto">
          {report.matchFlags.slice(0, 30).length === 0 ? (
            <div className="portal-empty px-3 py-5">
              <p className="text-xs font-medium text-[#5A6B7D]">No settled invoices to check</p>
            </div>
          ) : (
            report.matchFlags.slice(0, 30).map(({ inv, ok }) => (
              <div key={inv.id} className="flex items-center justify-between px-3 py-2.5 text-xs">
                <span className="font-mono text-[11px] text-[#0E1F1A]">{inv.iouRegistryId}</span>
                <span className={`text-[11px] font-bold ${ok ? 'text-[#0E1F1A]' : 'text-[#8A6A00]'}`}>
                  {ok ? 'Matched' : 'Variance / incomplete'}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
