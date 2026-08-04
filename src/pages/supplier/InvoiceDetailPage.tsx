import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import LifecycleTimeline from '@/components/shared/LifecycleTimeline';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { api } from '@/lib/apiClient';
import { ArrowLeft, FileText, Building2, Calendar, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { invoices, offers, respondToOffer } = useData();
  const [confirmModal, setConfirmModal] = useState<{ offerId: string; accept: boolean } | null>(null);
  const [otp, setOtp] = useState('');
  const [otpHint, setOtpHint] = useState<string | null>(null);

  const invoice = invoices.find(inv => inv.id === id);
  const invoiceOffers = offers.filter(o => o.invoiceId === id);

  if (!invoice) {
    return (
      <div className="portal-page animate-fade-in">
        <div className="portal-empty">
          <p className="text-xs font-bold text-[#0E1F1A]">Invoice not found</p>
          <button
            type="button"
            onClick={() => navigate('/supplier/invoices')}
            className="mt-2 text-[11px] font-bold text-[#0E1F1A] hover:underline"
          >
            Back to invoices
          </button>
        </div>
      </div>
    );
  }

  const openAccept = async (offerId: string) => {
    setConfirmModal({ offerId, accept: true });
    setOtp('');
    setOtpHint(null);
    try {
      const { data } = await api.post(`/offers/${offerId}/request-otp`);
      setOtpHint(data?.demoHint || null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not send OTP');
    }
  };

  const handleOfferResponse = async () => {
    if (!confirmModal) return;
    if (confirmModal.accept && !otp.trim()) {
      toast.error('Enter OTP to accept');
      return;
    }
    try {
      await respondToOffer(confirmModal.offerId, confirmModal.accept, confirmModal.accept ? otp.trim() : undefined);
      toast.success(confirmModal.accept ? 'Offer accepted successfully' : 'Offer rejected');
      setConfirmModal(null);
      setOtp('');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div className="portal-page animate-fade-in">
      <button
        type="button"
        onClick={() => navigate('/supplier/invoices')}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#5A6B7D] hover:text-[#0E1F1A] min-h-[32px] -mt-1"
      >
        <ArrowLeft size={14} /> Back to invoices
      </button>

      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`IOU registry · ${invoice.iouRegistryId}`}
        actions={<StatusBadge status={invoice.status} />}
      />

      <section className="portal-section">
        <header className="portal-section__head">
          <h2 className="portal-section__title">Lifecycle</h2>
        </header>
        <div className="portal-section__body--pad">
          <LifecycleTimeline currentStatus={invoice.status} />
        </div>
      </section>

      <div className="portal-grid-2">
        <section className="portal-section">
          <header className="portal-section__head">
            <div className="flex items-center gap-1.5">
              <FileText size={13} className="text-[#0E1F1A]" />
              <h2 className="portal-section__title">Invoice details</h2>
            </div>
          </header>
          <div className="portal-section__body--pad space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Amount</p>
                <p className="font-mono font-bold text-[#0E1F1A] mt-0.5">{formatCurrency(invoice.amount)}</p>
              </div>
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Currency</p>
                <p className="font-medium text-[#0E1F1A] mt-0.5">{invoice.currency}</p>
              </div>
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Issue date</p>
                <p className="font-medium text-[#0E1F1A] mt-0.5">{formatDate(invoice.issueDate)}</p>
              </div>
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Due date</p>
                <p className="font-medium text-[#0E1F1A] mt-0.5">{formatDate(invoice.dueDate)}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#5A6B7D]">Description</p>
              <p className="text-xs text-[#0E1F1A] mt-0.5 leading-snug">{invoice.description}</p>
            </div>
          </div>
        </section>

        <section className="portal-section">
          <header className="portal-section__head">
            <div className="flex items-center gap-1.5">
              <Building2 size={13} className="text-[#0E1F1A]" />
              <h2 className="portal-section__title">Parties &amp; timeline</h2>
            </div>
          </header>
          <div className="portal-section__body--pad space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Supplier</p>
                <p className="font-semibold text-[#0E1F1A] mt-0.5">{invoice.supplierName}</p>
              </div>
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Buyer</p>
                <p className="font-semibold text-[#0E1F1A] mt-0.5">{invoice.buyerName}</p>
              </div>
            </div>
            <div className="space-y-1.5 pt-1 border-t border-[#0E1F1A]/8">
              <div className="flex items-center gap-1.5 text-[#5A6B7D]">
                <Calendar size={12} />
                <span className="font-semibold text-[10px] uppercase tracking-wide">Events</span>
              </div>
              {invoice.listedAt && (
                <p className="text-[#0E1F1A]"><span className="text-[#5A6B7D]">Listed · </span>{formatDate(invoice.listedAt)}</p>
              )}
              {invoice.verifiedAt && (
                <p className="text-[#0E1F1A]"><span className="text-[#5A6B7D]">Verified · </span>{formatDate(invoice.verifiedAt)}</p>
              )}
              {!invoice.listedAt && !invoice.verifiedAt && (
                <p className="text-[#5A6B7D]">No lifecycle events yet</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {invoiceOffers.length > 0 && (
        <section className="portal-section">
          <header className="portal-section__head">
            <div className="flex items-center gap-1.5">
              <DollarSign size={13} className="text-[#0E1F1A]" />
              <div>
                <h2 className="portal-section__title">Purchase offers</h2>
                <p className="portal-section__desc">{invoiceOffers.length} offer{invoiceOffers.length === 1 ? '' : 's'}</p>
              </div>
            </div>
          </header>
          <div className="divide-y divide-[#0E1F1A]/8">
            {invoiceOffers.map(offer => (
              <div key={offer.id} className="px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0E1F1A]">{offer.spvName}</p>
                  <p className="text-[11px] text-[#5A6B7D]">
                    {offer.discountRate}% discount · {offer.tenor} day tenor · {formatCurrency(offer.offerPrice)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <StatusBadge status={offer.status} />
                  {offer.status === 'pending' && (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => void openAccept(offer.id)}
                        className="min-h-[32px] px-2.5 py-1 text-[11px] font-bold rounded-md bg-[#0E1F1A] text-white hover:bg-[#1A3A2E]"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmModal({ offerId: offer.id, accept: false })}
                        className="min-h-[32px] px-2.5 py-1 text-[11px] font-semibold rounded-md border border-[#0E1F1A]/15 text-[#0E1F1A] hover:bg-[#f7faf6]"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <ConfirmationModal
        open={!!confirmModal}
        title={confirmModal?.accept ? 'Accept offer?' : 'Reject offer?'}
        description={
          confirmModal?.accept
            ? 'Accepting requires checker OTP and cannot be undone.'
            : 'This offer will be rejected.'
        }
        confirmLabel={confirmModal?.accept ? 'Accept' : 'Reject'}
        variant={confirmModal?.accept ? 'default' : 'destructive'}
        onConfirm={() => void handleOfferResponse()}
        onCancel={() => { setConfirmModal(null); setOtp(''); }}
      >
        {confirmModal?.accept && (
          <div className="text-left mt-2">
            <label className="block text-[11px] font-semibold text-[#0E1F1A] mb-1">Confirmation OTP</label>
            <input
              className="field-input text-xs font-mono tracking-widest"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit code"
              maxLength={8}
            />
            {otpHint && <p className="text-[10px] text-[#5A6B7D] mt-1">Demo: <span className="font-mono font-bold">{otpHint}</span></p>}
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
}
