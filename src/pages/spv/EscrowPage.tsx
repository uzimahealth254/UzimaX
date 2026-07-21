import { useData } from '@/hooks/usePlatformData';
import { useActor } from '@/hooks/useActor';
import PageHeader from '@/components/layout/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import DataTable from '@/components/shared/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { EscrowLeg } from '@/types';
import { toast } from 'sonner';
import EmptyState from '@/components/shared/EmptyState';
import { QuerySurface } from '@/components/shared/QueryState';

export default function EscrowPage() {
  const { escrowLegs, releaseEscrow, collectEscrow, loading, error, refetchAll } = useData();
  const actor = useActor();

  const disbursements = escrowLegs.filter(l => l.type === 'disbursement');
  const collections = escrowLegs.filter(l => l.type === 'collection');

  const columns = (kind: 'disbursement' | 'collection') => [
    { key: 'iou', header: 'IOU', primary: true, render: (l: EscrowLeg) => <span className="font-mono text-xs font-semibold">{l.iouRegistryId}</span> },
    { key: 'party', header: kind === 'disbursement' ? 'Supplier' : 'Buyer', render: (l: EscrowLeg) => <span className="font-medium">{l.counterparty}</span> },
    { key: 'amount', header: 'Amount', render: (l: EscrowLeg) => <span className="font-mono font-semibold">{formatCurrency(l.amount)}</span> },
    { key: 'due', header: 'Due', hideOnMobile: true, render: (l: EscrowLeg) => formatDate(l.dueDate) },
    { key: 'status', header: 'Status', render: (l: EscrowLeg) => <StatusBadge status={l.status} /> },
    {
      key: 'action',
      header: '',
      render: (l: EscrowLeg) => {
        if (kind === 'disbursement' && l.status === 'pending') {
          return (
            <button
              type="button"
              className="min-h-[32px] px-2.5 py-1 text-[11px] font-bold rounded-md bg-[#0E1F1A] text-white hover:bg-[#1A3A2E]"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await releaseEscrow(l.id, actor);
                  toast.success('Escrow leg recorded');
                } catch (err: any) {
                  toast.error(err.response?.data?.message || err.message || 'Disbursement failed');
                }
              }}
            >
              Mark disbursed (simulated)
            </button>
          );
        }
        if (kind === 'collection' && l.status === 'pending') {
          return (
            <button
              type="button"
              className="min-h-[32px] px-2.5 py-1 text-[11px] font-bold rounded-md bg-[#D3F36B] text-[#0E1F1A] hover:bg-[#C5E85A]"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await collectEscrow(l.id, actor);
                  toast.success('Escrow leg recorded');
                } catch (err: any) {
                  toast.error(err.response?.data?.message || err.message || 'Collection failed');
                }
              }}
            >
              Record collection (simulated)
            </button>
          );
        }
        return <span className="text-xs text-[#5A6B7D]">{l.paidAt ? formatDate(l.paidAt) : '—'}</span>;
      },
    },
  ];

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Escrow settlement"
        subtitle="Workflow recording only — settlement partner moves the cash"
      />

      <div className="portal-callout">
        Escrow legs are tracked here for workflow and reconciliation. No funds move through IOU Exchange; disbursement and collection are executed by the settlement partner.
      </div>

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Disbursements to suppliers</h2>
            <p className="portal-section__desc">{disbursements.length} leg{disbursements.length === 1 ? '' : 's'}</p>
          </div>
        </header>
        <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
          <QuerySurface
            loading={loading}
            error={error}
            onRetry={refetchAll}
            isEmpty={!loading && disbursements.length === 0}
            empty={<EmptyState compact title="No disbursement legs" description="Legs appear after assignment when a disbursement is scheduled." />}
          >
            <DataTable columns={columns('disbursement')} data={disbursements} emptyMessage="No disbursement legs" />
          </QuerySurface>
        </div>
      </section>

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Collections from buyers</h2>
            <p className="portal-section__desc">{collections.length} leg{collections.length === 1 ? '' : 's'}</p>
          </div>
        </header>
        <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
          <QuerySurface
            loading={loading}
            error={error}
            onRetry={refetchAll}
            isEmpty={!loading && collections.length === 0}
            empty={<EmptyState compact title="No collection legs" description="Collection legs track buyer repayment at maturity." />}
          >
            <DataTable columns={columns('collection')} data={collections} emptyMessage="No collection legs" />
          </QuerySurface>
        </div>
      </section>
    </div>
  );
}
