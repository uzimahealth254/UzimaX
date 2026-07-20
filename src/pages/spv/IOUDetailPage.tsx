import { useParams, Link } from 'react-router-dom';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import LifecycleTimeline from '@/components/shared/LifecycleTimeline';
import { formatCurrency, formatDate } from '@/lib/utils';
import { isValidIOURegistryId } from '@/lib/iouId';

export default function IOUDetailPage() {
  const { id } = useParams();
  const { invoices, assignments, optIns, escrowLegs } = useData();
  const inv = invoices.find(i => i.id === id || i.iouRegistryId === id);

  if (!inv) {
    return (
      <div className="space-y-4 animate-fade-in">
        <PageHeader title="IOU not found" />
        <Link to="/spv/registry" className="text-sm text-primary">Back to registry</Link>
      </div>
    );
  }

  const history = inv.statusHistory?.length
    ? inv.statusHistory
    : [
        { status: inv.status, at: inv.assignedAt || inv.postedAt || inv.listedAt || inv.createdAt, note: 'Current status' },
      ];
  const asgn = assignments.find(a => a.invoiceId === inv.id);
  const opt = optIns.find(o => o.invoiceId === inv.id);
  const escrow = escrowLegs.filter(e => e.invoiceId === inv.id);
  const schemeOk = isValidIOURegistryId(inv.iouRegistryId) || inv.iouRegistryId.startsWith('IOU-KE-');

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={inv.iouRegistryId}
        subtitle={`${inv.invoiceNumber} · ${inv.origin || 'supplier_listed'}`}
        actions={<StatusBadge status={inv.status} />}
      />

      {!schemeOk && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          Legacy demo ID format — new IOUs use IOU-KE-YYYY-SEQ-CHK (Sule scheme draft).
        </p>
      )}

      <LifecycleTimeline currentStatus={inv.status} />

      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded-2xl p-5 space-y-2 text-sm">
          <p><span className="text-muted-foreground">Supplier</span> · {inv.supplierName}</p>
          <p><span className="text-muted-foreground">Buyer</span> · {inv.buyerName}</p>
          <p><span className="text-muted-foreground">Face</span> · <span className="font-mono">{formatCurrency(inv.amount)}</span></p>
          <p><span className="text-muted-foreground">Issue / Due</span> · {formatDate(inv.issueDate)} → {formatDate(inv.dueDate)}</p>
          <p className="text-muted-foreground pt-2">{inv.description}</p>
        </div>
        <div className="border rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-3">Status history</h3>
          <ol className="space-y-3">
            {history.map((h: any, i: number) => (
              <li key={`${h.at}-${i}`} className="flex gap-3 text-sm">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-primary shrink-0" />
                <div>
                  <StatusBadge status={h.status} />
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(h.at)}{h.by ? ` · ${h.by}` : ''}</p>
                  {h.note && <p className="text-xs mt-0.5">{h.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {(asgn || opt || escrow.length > 0) && (
        <div className="border rounded-2xl p-5 space-y-2 text-sm">
          {opt && <p>Opt-in: <StatusBadge status={opt.status} /></p>}
          {asgn && <p>Assignment: {asgn.id} · {asgn.triggeredBy} · {formatDate(asgn.createdAt)}</p>}
          {escrow.map(e => (
            <p key={e.id}>{e.type}: {formatCurrency(e.amount)} → {e.counterparty} · <StatusBadge status={e.status} /></p>
          ))}
        </div>
      )}
    </div>
  );
}
