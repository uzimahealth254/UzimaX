import { useMemo } from 'react';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';

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
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <PageHeader
        title="Settlement engine"
        subtitle="Live wallets, escrow legs, and package distributions from Postgres"
      />

      <div>
        <h3 className="font-semibold text-sm mb-3">Trust / org accounts</h3>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {trustAccounts.map((a: any) => (
            <div key={a.id} className="border rounded-2xl p-4">
              <p className="font-medium text-sm break-words">{a.name}</p>
              <p className="text-xs text-muted-foreground capitalize mt-1">{a.type}</p>
            </div>
          ))}
          {wallet && (
            <div className="border rounded-2xl p-4 border-primary/30">
              <p className="font-medium text-sm">Your wallet</p>
              <p className="text-xl font-mono mt-2">{formatCurrency(Number(wallet.balance))}</p>
              <p className="text-xs text-muted-foreground">{(walletTxs || []).length} ledger entries</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-3">Escrow settlement queue ({settlement.length})</h3>
        <DataTable
          data={settlement}
          emptyMessage="No escrow legs"
          getRowKey={(e: any) => e.id}
          columns={[
            { key: 'leg', header: 'Leg', primary: true, render: (e: any) => e.type || e.legType },
            { key: 'amt', header: 'Amount', render: (e: any) => <span className="font-mono">{formatCurrency(Number(e.amount))}</span> },
            { key: 'status', header: 'Status', render: (e: any) => <span className="capitalize">{e.status}</span> },
            { key: 'iou', header: 'IOU', hideOnMobile: true, render: (e: any) => <span className="font-mono text-xs">{e.iouRegistryId || '—'}</span> },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        <div>
          <h3 className="font-semibold text-sm mb-3">Assignments ({assignments.length})</h3>
          <div className="border rounded-2xl divide-y max-h-64 overflow-y-auto scroll-touch">
            {assignments.slice(0, 15).map((a: any) => (
              <div key={a.id} className="px-4 py-3 text-sm flex justify-between gap-2">
                <span className="font-mono text-xs truncate min-w-0">{a.iouRegistryId}</span>
                <span className="font-mono shrink-0">{formatCurrency(a.amount)}</span>
              </div>
            ))}
            {assignments.length === 0 && <p className="p-4 text-sm text-muted-foreground">No assignments</p>}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-sm mb-3">Listed / placed packages</h3>
          <div className="border rounded-2xl divide-y max-h-64 overflow-y-auto scroll-touch">
            {distributions.map((p: any) => (
              <div key={p.id} className="px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="font-medium truncate">{p.name || p.packageRef}</span>
                  <span className="capitalize text-xs shrink-0">{p.status}</span>
                </div>
                <p className="font-mono text-xs">{formatCurrency(p.totalFaceValue)} · {p.nseReference || 'no NSE ref'}</p>
                <p className="text-[10px] text-muted-foreground">{formatDate(p.createdAt)}</p>
              </div>
            ))}
            {distributions.length === 0 && <p className="p-4 text-sm text-muted-foreground">No listed packages yet</p>}
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-3">Recent payment updates ({(payments || []).length})</h3>
        <div className="border rounded-2xl divide-y">
          {(payments || []).slice(0, 10).map((p: any) => (
            <div key={p.id} className="px-4 py-3 text-sm flex justify-between gap-2">
              <span className="font-mono text-xs truncate min-w-0">{p.iouRegistryId || p.invoiceId?.slice?.(0, 8)}</span>
              <span className="font-mono shrink-0">{formatCurrency(p.amount)}</span>
            </div>
          ))}
          {(payments || []).length === 0 && <p className="p-4 text-sm text-muted-foreground">No AfyaX payment updates yet</p>}
        </div>
      </div>
    </div>
  );
}
