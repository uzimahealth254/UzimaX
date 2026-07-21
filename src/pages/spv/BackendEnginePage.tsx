import { useMemo } from 'react';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatCard from '@/components/shared/StatCard';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Building2, Wallet, ArrowLeftRight, Package } from 'lucide-react';

export default function BackendEnginePage() {
  const { wallet, walletTxs, escrowLegs, packages, payments, organisations, assignments } = useData();

  const trustAccounts = useMemo(() => {
    const orgs = organisations || [];
    return orgs
      .filter((o: any) => ['spv', 'platform', 'buyer'].includes(o.orgType || o.type))
      .map((o: any) => ({
        id: o.id,
        name: o.name,
        type: o.orgType || o.type,
      }));
  }, [organisations]);

  const settlement = (escrowLegs || []).slice(0, 20);
  const distributions = (packages || []).filter((p: any) => ['listed', 'placed', 'settled'].includes(p.status));

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Settlement engine"
        subtitle="Internal ledger view — escrow legs and packages from Postgres (no funds move here)"
      />

      <div className="portal-metrics portal-metrics--3">
        <StatCard label="Trust accounts" value={trustAccounts.length} icon={Building2} accent="forest" />
        <StatCard label="Escrow queue" value={settlement.length} icon={ArrowLeftRight} accent="gold" />
        <StatCard label="Listed packages" value={distributions.length} icon={Package} accent="lime" />
      </div>

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Trust / org accounts</h2>
            <p className="portal-section__desc">{trustAccounts.length} organisation{trustAccounts.length === 1 ? '' : 's'}</p>
          </div>
        </header>
        <div className="portal-section__body--pad">
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {trustAccounts.map((a: any) => (
              <div key={a.id} className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2.5">
                <p className="font-semibold text-xs text-[#0E1F1A] break-words">{a.name}</p>
                <p className="text-[10px] text-[#5A6B7D] capitalize mt-0.5">{a.type}</p>
              </div>
            ))}
            {wallet && (
              <div className="rounded-md bg-[#F4FBE3] border border-[#D3F36B]/40 p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Wallet size={12} className="text-[#0E1F1A]" />
                  <p className="font-semibold text-xs text-[#0E1F1A]">Your wallet</p>
                </div>
                <p className="text-lg font-mono font-bold text-[#0E1F1A]">{formatCurrency(Number(wallet.balance))}</p>
                <p className="text-[10px] text-[#5A6B7D] mt-0.5">{(walletTxs || []).length} ledger entries</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Escrow settlement queue</h2>
            <p className="portal-section__desc">{settlement.length} recent leg{settlement.length === 1 ? '' : 's'}</p>
          </div>
        </header>
        <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
          <DataTable
            data={settlement}
            emptyMessage="No escrow legs"
            getRowKey={(e: any) => e.id}
            columns={[
              { key: 'leg', header: 'Leg', primary: true, render: (e: any) => <span className="capitalize text-xs font-medium">{e.type || e.legType}</span> },
              { key: 'amt', header: 'Amount', render: (e: any) => <span className="font-mono font-semibold">{formatCurrency(Number(e.amount))}</span> },
              { key: 'status', header: 'Status', render: (e: any) => <span className="capitalize text-xs">{e.status}</span> },
              { key: 'iou', header: 'IOU', hideOnMobile: true, render: (e: any) => <span className="font-mono text-xs">{e.iouRegistryId || '—'}</span> },
            ]}
          />
        </div>
      </section>

      <div className="portal-grid-2">
        <section className="portal-section">
          <header className="portal-section__head">
            <div>
              <h2 className="portal-section__title">Assignments</h2>
              <p className="portal-section__desc">{assignments.length} total</p>
            </div>
          </header>
          <div className="divide-y divide-[#0E1F1A]/8 max-h-64 overflow-y-auto">
            {assignments.length === 0 ? (
              <div className="px-3 py-5">
                <p className="text-xs font-medium text-[#5A6B7D]">No assignments</p>
              </div>
            ) : (
              assignments.slice(0, 15).map((a: any) => (
                <div key={a.id} className="px-3 py-2.5 flex justify-between gap-2 text-xs">
                  <span className="font-mono text-[11px] truncate min-w-0 text-[#0E1F1A]">{a.iouRegistryId}</span>
                  <span className="font-mono font-bold shrink-0">{formatCurrency(a.amount)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="portal-section">
          <header className="portal-section__head">
            <div>
              <h2 className="portal-section__title">Listed / placed packages</h2>
              <p className="portal-section__desc">{distributions.length} package{distributions.length === 1 ? '' : 's'}</p>
            </div>
          </header>
          <div className="divide-y divide-[#0E1F1A]/8 max-h-64 overflow-y-auto">
            {distributions.length === 0 ? (
              <div className="px-3 py-5">
                <p className="text-xs font-medium text-[#5A6B7D]">No listed packages yet</p>
              </div>
            ) : (
              distributions.map((p: any) => (
                <div key={p.id} className="px-3 py-2.5 space-y-0.5">
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#0E1F1A] truncate">{p.name || p.packageRef}</span>
                    <span className="capitalize text-[10px] font-bold text-[#5A6B7D] shrink-0">{p.status}</span>
                  </div>
                  <p className="font-mono text-[11px] text-[#0E1F1A]">
                    {formatCurrency(p.totalFaceValue)} · {p.nseReference || 'no internal ref'}
                  </p>
                  <p className="text-[10px] text-[#5A6B7D]">{formatDate(p.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Recent payment updates</h2>
            <p className="portal-section__desc">{(payments || []).length} payment record{(payments || []).length === 1 ? '' : 's'}</p>
          </div>
        </header>
        <div className="divide-y divide-[#0E1F1A]/8">
          {(payments || []).length === 0 ? (
            <div className="px-3 py-5">
              <p className="text-xs font-medium text-[#5A6B7D]">No AfyaX payment updates yet</p>
            </div>
          ) : (
            (payments || []).slice(0, 10).map((p: any) => (
              <div key={p.id} className="px-3 py-2.5 flex justify-between gap-2 text-xs">
                <span className="font-mono text-[11px] truncate min-w-0 text-[#0E1F1A]">
                  {p.iouRegistryId || p.invoiceId?.slice?.(0, 8)}
                </span>
                <span className="font-mono font-bold shrink-0">{formatCurrency(p.amount)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
