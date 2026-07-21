import { useState } from 'react';
import { useData } from '@/hooks/usePlatformData';
import { useActor } from '@/hooks/useActor';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import DetailDrawer from '@/components/shared/DetailDrawer';
import LifecycleTimeline from '@/components/shared/LifecycleTimeline';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AssignmentConsent, Invoice, ReceivableAssignment } from '@/types';
import { toast } from 'sonner';

export default function AssignmentRegistryPage() {
  const { invoices, consents, assignments, requestConsent } = useData();
  const actor = useActor();
  const [selectedAssignment, setSelectedAssignment] = useState<ReceivableAssignment | null>(null);

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
    { key: 'iou', header: 'IOU ID', primary: true, render: (inv: Invoice) => <span className="font-mono text-xs font-semibold">{inv.iouRegistryId}</span> },
    { key: 'supplier', header: 'Supplier', render: (inv: Invoice) => inv.supplierName },
    { key: 'buyer', header: 'Buyer', render: (inv: Invoice) => inv.buyerName },
    { key: 'amount', header: 'Amount', render: (inv: Invoice) => <span className="font-mono font-semibold">{formatCurrency(inv.amount)}</span> },
    {
      key: 'action',
      header: '',
      render: (inv: Invoice) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleRequestConsent(inv); }}
          className="min-h-[32px] px-2.5 py-1 text-[11px] font-bold rounded-md bg-[#0E1F1A] text-white hover:bg-[#1A3A2E]"
        >
          Request consent
        </button>
      ),
    },
  ];

  const assignmentColumns = [
    { key: 'iou', header: 'IOU ID', primary: true, render: (a: ReceivableAssignment) => <span className="font-mono text-xs font-semibold">{a.iouRegistryId}</span> },
    { key: 'supplier', header: 'Supplier', render: (a: ReceivableAssignment) => a.supplierName },
    { key: 'buyer', header: 'Buyer', render: (a: ReceivableAssignment) => a.buyerName },
    { key: 'amount', header: 'Amount', render: (a: ReceivableAssignment) => <span className="font-mono font-semibold">{formatCurrency(a.amount)}</span> },
    {
      key: 'trigger',
      header: 'Trigger',
      hideOnMobile: true,
      render: (a: ReceivableAssignment) => (
        <span className="text-xs">{a.triggeredBy === 'supplier_opt_in' ? 'Supplier opt-in' : 'Consent signed'}</span>
      ),
    },
    { key: 'when', header: 'Assigned', render: (a: ReceivableAssignment) => formatDate(a.createdAt) },
  ];

  const consentColumns = [
    { key: 'iou', header: 'IOU ID', primary: true, render: (c: AssignmentConsent) => <span className="font-mono text-xs font-semibold">{c.iouRegistryId}</span> },
    { key: 'buyer', header: 'Buyer', render: (c: AssignmentConsent) => c.buyerName },
    { key: 'supplier', header: 'Supplier', render: (c: AssignmentConsent) => c.supplierName },
    { key: 'amount', header: 'Amount', render: (c: AssignmentConsent) => <span className="font-mono font-semibold">{formatCurrency(c.amount)}</span> },
    { key: 'requested', header: 'Requested', hideOnMobile: true, render: (c: AssignmentConsent) => formatDate(c.requestedAt) },
    { key: 'status', header: 'Status', render: (c: AssignmentConsent) => <StatusBadge status={c.status} /> },
  ];

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader title="Assignment registry" subtitle="Opt-in auto-assignments, consent trail, and SPV queue" />

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Receivable assignments to SPV</h2>
            <p className="portal-section__desc">{assignments.length} assignment{assignments.length === 1 ? '' : 's'}</p>
          </div>
        </header>
        <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
          <DataTable
            columns={assignmentColumns}
            data={assignments}
            onRowClick={setSelectedAssignment}
            emptyMessage="No assignments yet — supplier opt-in or signed consent creates them"
          />
        </div>
      </section>

      {acceptedInvoices.length > 0 && (
        <section className="portal-section">
          <header className="portal-section__head">
            <div>
              <h2 className="portal-section__title">Offer accepted — request buyer consent</h2>
              <p className="portal-section__desc">{acceptedInvoices.length} awaiting consent request</p>
            </div>
          </header>
          <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
            <DataTable columns={pendingColumns} data={acceptedInvoices} emptyMessage="" />
          </div>
        </section>
      )}

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Consent registry</h2>
            <p className="portal-section__desc">{consents.length} consent request{consents.length === 1 ? '' : 's'}</p>
          </div>
        </header>
        <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
          <DataTable columns={consentColumns} data={consents} emptyMessage="No consent requests yet" />
        </div>
      </section>

      {autoAssigned.length > 0 && (
        <div className="portal-callout">
          Buyer/API-origin IOUs in pipeline: {autoAssigned.length} (including awaiting opt-in / declined).
        </div>
      )}

      {selectedAssignment && (() => {
        const inv = invoices.find(i => i.id === selectedAssignment.invoiceId);
        const consent = consents.find(c => c.invoiceId === selectedAssignment.invoiceId);
        const history = inv?.statusHistory?.length
          ? inv.statusHistory
          : inv
            ? [{
                status: inv.status,
                at: inv.assignedAt || inv.postedAt || inv.listedAt || inv.createdAt,
                note: 'Current status',
              }]
            : [];
        return (
          <DetailDrawer
            open
            title={selectedAssignment.iouRegistryId}
            subtitle={selectedAssignment.id}
            onClose={() => setSelectedAssignment(null)}
          >
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Supplier</p>
                <p className="font-semibold text-[#0E1F1A] mt-0.5">{selectedAssignment.supplierName}</p>
              </div>
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Buyer</p>
                <p className="font-semibold text-[#0E1F1A] mt-0.5">{selectedAssignment.buyerName}</p>
              </div>
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Amount</p>
                <p className="font-mono font-bold text-[#0E1F1A] mt-0.5">{formatCurrency(selectedAssignment.amount)}</p>
              </div>
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Trigger</p>
                <p className="text-[#0E1F1A] mt-0.5">
                  {selectedAssignment.triggeredBy === 'supplier_opt_in' ? 'Supplier opt-in' : 'Consent signed'}
                </p>
              </div>
            </div>

            {inv && (
              <>
                <div>
                  <p className="text-[10px] font-semibold text-[#5A6B7D] uppercase tracking-wide mb-2">Invoice lifecycle</p>
                  <LifecycleTimeline currentStatus={inv.status} />
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-[#5A6B7D] uppercase tracking-wide mb-2">Status history</p>
                  <div className="space-y-2 text-xs">
                    {history.map((h: { status: string; at: string; by?: string; note?: string }, i: number) => (
                      <div key={`${h.at}-${i}`} className="flex gap-2">
                        <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-[#0E1F1A] shrink-0" />
                        <div>
                          <StatusBadge status={h.status} />
                          <p className="text-[11px] text-[#5A6B7D] mt-1">
                            {formatDate(h.at)}{h.by ? ` · ${h.by}` : ''}
                          </p>
                          {h.note && <p className="text-[11px] text-[#0E1F1A] mt-0.5">{h.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {consent && (
              <div>
                <p className="text-[10px] font-semibold text-[#5A6B7D] uppercase tracking-wide mb-2">Linked consent</p>
                <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={consent.status} />
                    <span className="text-[11px] text-[#5A6B7D]">Requested {formatDate(consent.requestedAt)}</span>
                  </div>
                  {consent.signedAt && (
                    <p className="text-[11px] text-[#5A6B7D] mt-1">Signed {formatDate(consent.signedAt)}</p>
                  )}
                </div>
              </div>
            )}

            {!inv && (
              <p className="text-xs text-[#5A6B7D]">Linked invoice record not found in current data.</p>
            )}
          </DetailDrawer>
        );
      })()}
    </div>
  );
}
