import { useData } from '@/hooks/usePlatformData';
import { useActor } from '@/hooks/useActor';
import PageHeader from '@/components/layout/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import DataTable from '@/components/shared/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { EscrowLeg } from '@/types';
import { toast } from 'sonner';

export default function EscrowPage() {
  const { escrowLegs, releaseEscrow, collectEscrow } = useData();
  const actor = useActor();

  const disbursements = escrowLegs.filter(l => l.type === 'disbursement');
  const collections = escrowLegs.filter(l => l.type === 'collection');

  const columns = (kind: 'disbursement' | 'collection') => [
    { key: 'iou', header: 'IOU', render: (l: EscrowLeg) => <span className="font-mono text-xs">{l.iouRegistryId}</span> },
    { key: 'party', header: kind === 'disbursement' ? 'Supplier' : 'Buyer', render: (l: EscrowLeg) => l.counterparty },
    { key: 'amount', header: 'Amount', render: (l: EscrowLeg) => <span className="font-mono">{formatCurrency(l.amount)}</span> },
    { key: 'due', header: 'Due', render: (l: EscrowLeg) => formatDate(l.dueDate) },
    { key: 'status', header: 'Status', render: (l: EscrowLeg) => <StatusBadge status={l.status} /> },
    {
      key: 'action',
      header: '',
      render: (l: EscrowLeg) => {
        if (kind === 'disbursement' && l.status === 'pending') {
          return (
            <button
              type="button"
              className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground"
              onClick={(e) => {
                e.stopPropagation();
                releaseEscrow(l.id, actor);
                toast.success('Disbursement released');
              }}
            >
              Release
            </button>
          );
        }
        if (kind === 'collection' && l.status === 'pending') {
          return (
            <button
              type="button"
              className="text-xs px-3 py-1.5 rounded-md bg-accent text-white"
              onClick={(e) => {
                e.stopPropagation();
                collectEscrow(l.id, actor);
                toast.success('Collection recorded');
              }}
            >
              Mark collected
            </button>
          );
        }
        return <span className="text-xs text-muted-foreground">{l.paidAt ? formatDate(l.paidAt) : '—'}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Escrow settlement"
        subtitle="Trust-style legs: fund supplier · collect from buyer at maturity"
      />

      <div>
        <h3 className="font-semibold text-sm mb-3">Disbursements to suppliers ({disbursements.length})</h3>
        <DataTable columns={columns('disbursement')} data={disbursements} emptyMessage="No disbursement legs" />
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-3">Collections from buyers ({collections.length})</h3>
        <DataTable columns={columns('collection')} data={collections} emptyMessage="No collection legs" />
      </div>
    </div>
  );
}
