import { useData } from '@/hooks/usePlatformData';
import { useActor } from '@/hooks/useActor';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AssignmentConsent, Invoice, ReceivableAssignment } from '@/types';
import { toast } from 'sonner';

export default function AssignmentRegistryPage() {
  const { invoices, consents, assignments, requestConsent } = useData();
  const actor = useActor();

  const acceptedInvoices = invoices.filter(inv => inv.status === 'offer_accepted');
  const autoAssigned = invoices.filter(inv => inv.origin === 'buyer_posted' || inv.origin === 'api_upload');

  const handleRequestConsent = async (inv: Invoice) => {
    try {
      await requestConsent({
        invoiceId: inv.id,
        iouRegistryId: inv.iouRegistryId,
        buyerId: inv.buyerId,
        buyerName: inv.buyerName,
        supplierId: inv.supplierId,
        supplierName: inv.supplierName,
        amount: inv.amount,
      }, actor);
      toast.success(`Consent request sent to ${inv.buyerName}`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Failed to request consent');
    }
  };

  const pendingColumns = [
    { key: 'iou', header: 'IOU ID', render: (inv: Invoice) => <span className="font-mono text-xs">{inv.iouRegistryId}</span> },
    { key: 'supplier', header: 'Supplier', render: (inv: Invoice) => inv.supplierName },
    { key: 'buyer', header: 'Buyer', render: (inv: Invoice) => inv.buyerName },
    { key: 'amount', header: 'Amount', render: (inv: Invoice) => <span className="font-mono">{formatCurrency(inv.amount)}</span> },
    { key: 'action', header: '', render: (inv: Invoice) => (
      <button
        onClick={(e) => { e.stopPropagation(); handleRequestConsent(inv); }}
        className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Request Consent
      </button>
    )},
  ];

  const assignmentColumns = [
    { key: 'iou', header: 'IOU ID', render: (a: ReceivableAssignment) => <span className="font-mono text-xs">{a.iouRegistryId}</span> },
    { key: 'supplier', header: 'Supplier', render: (a: ReceivableAssignment) => a.supplierName },
    { key: 'buyer', header: 'Buyer', render: (a: ReceivableAssignment) => a.buyerName },
    { key: 'amount', header: 'Amount', render: (a: ReceivableAssignment) => <span className="font-mono">{formatCurrency(a.amount)}</span> },
    { key: 'trigger', header: 'Trigger', render: (a: ReceivableAssignment) => (
      <span className="text-xs">{a.triggeredBy === 'supplier_opt_in' ? 'Supplier opt-in' : 'Consent signed'}</span>
    ) },
    { key: 'when', header: 'Assigned', render: (a: ReceivableAssignment) => formatDate(a.createdAt) },
  ];

  const consentColumns = [
    { key: 'iou', header: 'IOU ID', render: (c: AssignmentConsent) => <span className="font-mono text-xs">{c.iouRegistryId}</span> },
    { key: 'buyer', header: 'Buyer', render: (c: AssignmentConsent) => c.buyerName },
    { key: 'supplier', header: 'Supplier', render: (c: AssignmentConsent) => c.supplierName },
    { key: 'amount', header: 'Amount', render: (c: AssignmentConsent) => <span className="font-mono">{formatCurrency(c.amount)}</span> },
    { key: 'requested', header: 'Requested', render: (c: AssignmentConsent) => formatDate(c.requestedAt) },
    { key: 'status', header: 'Status', render: (c: AssignmentConsent) => <StatusBadge status={c.status} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Assignment Registry" subtitle="Opt-in auto-assignments, consent trail, and SPV queue" />

      <div>
        <h3 className="font-semibold text-sm mb-3">Receivable assignments to SPV ({assignments.length})</h3>
        <DataTable columns={assignmentColumns} data={assignments} emptyMessage="No assignments yet — supplier opt-in or signed consent creates them" />
      </div>

      {acceptedInvoices.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3">Offer-accepted — request buyer consent ({acceptedInvoices.length})</h3>
          <DataTable columns={pendingColumns} data={acceptedInvoices} emptyMessage="" />
        </div>
      )}

      <div>
        <h3 className="font-semibold text-sm mb-3">Consent registry ({consents.length})</h3>
        <DataTable columns={consentColumns} data={consents} emptyMessage="No consent requests yet" />
      </div>

      {autoAssigned.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Buyer/API-origin IOUs in pipeline: {autoAssigned.length} (including awaiting opt-in / declined).
        </p>
      )}
    </div>
  );
}
