import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/hooks/usePlatformData';
import { useActor } from '@/hooks/useActor';
import PageHeader from '@/components/layout/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import LifecycleTimeline from '@/components/shared/LifecycleTimeline';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, FileText, Building2, Calendar, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { invoices, offers, respondToOffer } = useData();
  const actor = useActor();
  const [confirmModal, setConfirmModal] = useState<{ offerId: string; accept: boolean } | null>(null);

  const invoice = invoices.find(inv => inv.id === id);
  const invoiceOffers = offers.filter(o => o.invoiceId === id);

  if (!invoice) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Invoice not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary hover:underline text-sm">Go back</button>
      </div>
    );
  }

  const handleOfferResponse = () => {
    if (!confirmModal) return;
    respondToOffer(confirmModal.offerId, confirmModal.accept, actor);
    toast.success(confirmModal.accept ? 'Offer accepted successfully' : 'Offer rejected');
    setConfirmModal(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> Back to invoices
      </button>

      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`IOU Registry: ${invoice.iouRegistryId}`}
        actions={<StatusBadge status={invoice.status} />}
      />

      {/* Lifecycle */}
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">Invoice Lifecycle</h3>
        <LifecycleTimeline currentStatus={invoice.status} />
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-5 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2"><FileText size={16} /> Invoice Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-muted-foreground text-xs">Amount</p><p className="font-mono font-medium">{formatCurrency(invoice.amount)}</p></div>
            <div><p className="text-muted-foreground text-xs">Currency</p><p>{invoice.currency}</p></div>
            <div><p className="text-muted-foreground text-xs">Issue Date</p><p>{formatDate(invoice.issueDate)}</p></div>
            <div><p className="text-muted-foreground text-xs">Due Date</p><p>{formatDate(invoice.dueDate)}</p></div>
          </div>
          <div><p className="text-muted-foreground text-xs">Description</p><p className="text-sm mt-0.5">{invoice.description}</p></div>
        </div>

        <div className="border rounded-lg p-5 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Building2 size={16} /> Parties</h3>
          <div className="space-y-3 text-sm">
            <div><p className="text-muted-foreground text-xs">Supplier</p><p className="font-medium">{invoice.supplierName}</p></div>
            <div><p className="text-muted-foreground text-xs">Buyer</p><p className="font-medium">{invoice.buyerName}</p></div>
          </div>
          <h3 className="font-semibold text-sm flex items-center gap-2 pt-2"><Calendar size={16} /> Timeline</h3>
          <div className="space-y-2 text-sm">
            {invoice.listedAt && <div><p className="text-muted-foreground text-xs">Listed</p><p>{formatDate(invoice.listedAt)}</p></div>}
            {invoice.verifiedAt && <div><p className="text-muted-foreground text-xs">Verified</p><p>{formatDate(invoice.verifiedAt)}</p></div>}
          </div>
        </div>
      </div>

      {/* Offers */}
      {invoiceOffers.length > 0 && (
        <div className="border rounded-lg">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm flex items-center gap-2"><DollarSign size={16} /> Purchase Offers</h3>
          </div>
          <div className="divide-y">
            {invoiceOffers.map(offer => (
              <div key={offer.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{offer.spvName}</p>
                  <p className="text-xs text-muted-foreground break-words">
                    {offer.discountRate}% discount · {offer.tenor} day tenor · Offer: {formatCurrency(offer.offerPrice)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <StatusBadge status={offer.status} />
                  {offer.status === 'pending' && (
                    <div className="flex gap-2 w-full sm:w-auto sm:ml-2">
                      <button
                        onClick={() => setConfirmModal({ offerId: offer.id, accept: true })}
                        className="flex-1 sm:flex-none min-h-[40px] px-3 py-2 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent/90 transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => setConfirmModal({ offerId: offer.id, accept: false })}
                        className="flex-1 sm:flex-none min-h-[40px] px-3 py-2 text-xs font-medium border rounded-md hover:bg-secondary transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmationModal
        open={!!confirmModal}
        title={confirmModal?.accept ? 'Accept Offer' : 'Reject Offer'}
        description={confirmModal?.accept ? 'Are you sure you want to accept this offer? This action cannot be undone.' : 'Are you sure you want to reject this offer?'}
        confirmLabel={confirmModal?.accept ? 'Accept' : 'Reject'}
        variant={confirmModal?.accept ? 'default' : 'destructive'}
        onConfirm={handleOfferResponse}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  );
}
