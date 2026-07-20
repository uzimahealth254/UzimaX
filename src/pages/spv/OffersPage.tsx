import { useState } from 'react';
import { useData } from '@/hooks/usePlatformData';
import { useActor } from '@/hooks/useActor';
import IOURegistryId from '@/components/shared/IOURegistryId';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils';
import { Invoice, PurchaseOffer } from '@/types';
import { toast } from 'sonner';
import OfferCalculator from '@/components/shared/OfferCalculator';

export default function OffersPage() {
  const { invoices, offers, makeOffer } = useData();
  const actor = useActor();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [discountRate, setDiscountRate] = useState('5');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'available' | 'pending' | 'accepted' | 'receivables' | 'closed'>('available');

  const available = invoices.filter(inv => inv.status === 'verified' || inv.status === 'assigned');
  const pendingOffers = offers.filter(o => o.status === 'pending');
  const acceptedOffers = offers.filter(o => o.status === 'accepted');
  const receivableInvoices = invoices.filter(inv => ['disbursed', 'matured'].includes(inv.status));
  const closedOffers = offers.filter(o => ['rejected', 'expired', 'withdrawn'].includes(o.status));

  const handleMakeOffer = async () => {
    if (!selectedInvoice) return;
    setLoading(true);
    try {
      const rate = parseFloat(discountRate);
      await makeOffer({
        invoiceId: selectedInvoice.id,
        discountRate: rate,
        discountRateBps: Math.round(rate * 100),
      }, actor);
      toast.success('Offer submitted');
      setSelectedInvoice(null);
      setAgreed(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Offer failed');
    } finally {
      setLoading(false);
    }
  };

  const availableColumns = [
    { key: 'iou', header: 'IOU ID', render: (inv: Invoice) => <IOURegistryId id={inv.iouRegistryId} /> },
    { key: 'supplier', header: 'Supplier', render: (inv: Invoice) => inv.supplierName },
    { key: 'amount', header: 'Face Value', render: (inv: Invoice) => <span className="font-mono">{formatCurrency(inv.amount)}</span> },
    { key: 'action', header: '', render: (inv: Invoice) => (
      <button
        onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); }}
        className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Make Offer
      </button>
    )},
  ];

  const offersColumns = [
    { key: 'iou', header: 'IOU ID', render: (o: PurchaseOffer) => <IOURegistryId id={o.iouRegistryId} /> },
    { key: 'supplier', header: 'Supplier', render: (o: PurchaseOffer) => o.supplierName },
    { key: 'face', header: 'Face Value', render: (o: PurchaseOffer) => <span className="font-mono">{formatCurrency(o.faceValue)}</span> },
    { key: 'offer', header: 'Offer Price', render: (o: PurchaseOffer) => <span className="font-mono">{formatCurrency(o.offerPrice)}</span> },
    { key: 'rate', header: 'Discount', render: (o: PurchaseOffer) => <span className="font-mono">{o.discountRate}%</span> },
    { key: 'status', header: 'Status', render: (o: PurchaseOffer) => <StatusBadge status={o.status} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Offers & Receivables" subtitle="Purchase offers and active receivable positions" />

      <div className="scroll-x-pad border-b pb-px">
        {([
          { id: 'available' as const, label: 'Available', count: available.length },
          { id: 'pending' as const, label: 'Pending', count: pendingOffers.length },
          { id: 'accepted' as const, label: 'Accepted', count: acceptedOffers.length },
          { id: 'receivables' as const, label: 'Receivables', count: receivableInvoices.length },
          { id: 'closed' as const, label: 'Closed', count: closedOffers.length },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 min-h-[44px] ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {tab === 'available' && (
        <DataTable columns={availableColumns} data={available} emptyMessage="No verified IOUs available for offers" />
      )}

      {tab === 'pending' && (
        <DataTable columns={offersColumns} data={pendingOffers} emptyMessage="No pending offers" />
      )}

      {tab === 'accepted' && (
        <DataTable columns={offersColumns} data={acceptedOffers} emptyMessage="No accepted offers" />
      )}

      {tab === 'receivables' && (
        <DataTable
          columns={[
            { key: 'iou', header: 'IOU ID', render: (inv: Invoice) => <IOURegistryId id={inv.iouRegistryId} /> },
            { key: 'supplier', header: 'Supplier', render: (inv: Invoice) => inv.supplierName },
            { key: 'amount', header: 'Face Value', render: (inv: Invoice) => <span className="font-mono">{formatCurrency(inv.amount)}</span> },
            { key: 'status', header: 'Status', render: (inv: Invoice) => <StatusBadge status={inv.status} /> },
          ]}
          data={receivableInvoices}
          emptyMessage="No active receivables"
        />
      )}

      {tab === 'closed' && (
        <DataTable columns={offersColumns} data={closedOffers} emptyMessage="No closed offers" />
      )}

      {/* Offer modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setSelectedInvoice(null); setAgreed(false); }} />
          <div className="relative bg-card rounded-t-3xl sm:rounded-xl shadow-lg border p-5 sm:p-6 w-full max-w-md animate-fade-in max-h-[85dvh] overflow-y-auto scroll-touch safe-pad-bottom">
            <div className="sm:hidden w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-1">Make purchase offer</h2>
            <p className="text-xs text-muted-foreground font-mono mb-4 break-anywhere">{selectedInvoice.iouRegistryId}</p>

            <OfferCalculator
              faceValue={selectedInvoice.amount}
              supplierName={selectedInvoice.supplierName}
              buyerName={selectedInvoice.buyerName}
              issueDate={selectedInvoice.issueDate}
              dueDate={selectedInvoice.dueDate}
              discountRate={discountRate}
              onDiscountChange={setDiscountRate}
            />

            <label className="flex items-start gap-2 mt-4 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5" />
              I confirm this offer is binding upon supplier acceptance and initiates the assignment workflow.
            </label>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleMakeOffer}
                disabled={loading || !agreed}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit offer'}
              </button>
              <button
                onClick={() => { setSelectedInvoice(null); setAgreed(false); }}
                className="flex-1 py-2.5 border rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
