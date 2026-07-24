import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/hooks/usePlatformData';
import { useActor } from '@/hooks/useActor';
import PageHeader from '@/components/layout/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import LifecycleTimeline from '@/components/shared/LifecycleTimeline';
import OfferCalculator from '@/components/shared/OfferCalculator';
import { formatCurrency, formatDate } from '@/lib/utils';
import { isValidIOURegistryId } from '@/lib/iouId';
import { toAssignmentTrack, trackExplanation, trackLabel } from '@/lib/assignmentTracks';
import { ArrowLeft, FileText, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const OFFER_ELIGIBLE = new Set([
  'listed', 'verified', 'awaiting_opt_in', 'awaiting_buyer_verification', 'offer_received',
]);

export default function IOUDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, assignments, optIns, escrowLegs, consents, makeOffer, requestConsent } = useData();
  const actor = useActor();
  const [discountRate, setDiscountRate] = useState('5');
  const [agreed, setAgreed] = useState(false);
  const [offerBusy, setOfferBusy] = useState(false);
  const [consentBusy, setConsentBusy] = useState(false);
  const inv = invoices.find(i => i.id === id || i.iouRegistryId === id);

  if (!inv) {
    return (
      <div className="portal-page animate-fade-in">
        <div className="portal-empty">
          <p className="text-xs font-bold text-[#0E1F1A]">IOU not found</p>
          <button
            type="button"
            onClick={() => navigate('/spv/registry')}
            className="mt-2 text-[11px] font-bold text-[#0E1F1A] hover:underline"
          >
            Back to registry
          </button>
        </div>
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
  const consent = consents.find(c => c.invoiceId === inv.id);
  const escrow = escrowLegs.filter(e => e.invoiceId === inv.id);
  const schemeOk = isValidIOURegistryId(inv.iouRegistryId) || inv.iouRegistryId.startsWith('IOU-KE-');
  const track = asgn?.assignmentType ? toAssignmentTrack(asgn.assignmentType) : null;
  const trackLine = track
    ? trackExplanation(track, asgn?.createdAt || inv.assignedAt || inv.commitmentAckAt)
    : consent?.status === 'pending'
      ? 'Awaiting obligor consent to negotiated terms.'
      : null;

  const canMakeOffer = OFFER_ELIGIBLE.has(inv.status);
  const canRequestConsent = inv.status === 'offer_accepted' && !consent;

  const handleMakeOffer = async () => {
    setOfferBusy(true);
    try {
      const rate = parseFloat(discountRate);
      await makeOffer({
        invoiceId: inv.id,
        discountRate: rate,
        discountRateBps: Math.round(rate * 100),
      }, actor);
      toast.success('Offer recorded');
      setAgreed(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Offer failed');
    } finally {
      setOfferBusy(false);
    }
  };

  const handleRequestConsent = async () => {
    setConsentBusy(true);
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
    } finally {
      setConsentBusy(false);
    }
  };

  return (
    <div className="portal-page animate-fade-in">
      <button
        type="button"
        onClick={() => navigate('/spv/registry')}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#5A6B7D] hover:text-[#0E1F1A] min-h-[32px] -mt-1"
      >
        <ArrowLeft size={14} /> Back to registry
      </button>

      <PageHeader
        title={inv.iouRegistryId}
        subtitle={`${inv.invoiceNumber} · ${inv.origin || 'supplier_listed'}`}
        actions={<StatusBadge status={inv.status} />}
      />

      {!schemeOk && (
        <div className="portal-callout">
          Legacy demo ID format — new IOUs use IOU-KE-YYYY-SEQ-CHK (Sule scheme draft).
        </div>
      )}

      {trackLine && (
        <div className="portal-callout">
          {track ? <strong>{trackLabel(track)}. </strong> : null}
          {trackLine}
        </div>
      )}

      <section className="portal-section">
        <header className="portal-section__head">
          <h2 className="portal-section__title">Lifecycle</h2>
        </header>
        <div className="portal-section__body--pad">
          <LifecycleTimeline currentStatus={inv.status} />
        </div>
      </section>

      <div className="portal-grid-2">
        <section className="portal-section">
          <header className="portal-section__head">
            <div className="flex items-center gap-1.5">
              <FileText size={13} className="text-[#0E1F1A]" />
              <h2 className="portal-section__title">IOU details</h2>
            </div>
          </header>
          <div className="portal-section__body--pad space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Face value</p>
                <p className="font-mono font-bold text-[#0E1F1A] mt-0.5">{formatCurrency(inv.amount)}</p>
              </div>
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Origin</p>
                <p className="font-medium text-[#0E1F1A] mt-0.5">{inv.origin || 'supplier_listed'}</p>
              </div>
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Issue date</p>
                <p className="font-medium text-[#0E1F1A] mt-0.5">{formatDate(inv.issueDate)}</p>
              </div>
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Due date</p>
                <p className="font-medium text-[#0E1F1A] mt-0.5">{formatDate(inv.dueDate)}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#5A6B7D]">Description</p>
              <p className="text-xs text-[#0E1F1A] mt-0.5 leading-snug">{inv.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#0E1F1A]/8">
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Commitment to pay</p>
                <p className="font-medium text-[#0E1F1A] mt-0.5">
                  {inv.commitmentToPay
                    ? `Recorded${inv.commitmentAckAt ? ` · ${formatDate(inv.commitmentAckAt)}` : ''}`
                    : 'Not recorded'}
                </p>
              </div>
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Standing order ref</p>
                <p className="font-mono font-medium text-[#0E1F1A] mt-0.5 break-anywhere">
                  {inv.bankStandingOrderRef || '—'}
                </p>
                {inv.standingOrderBank && (
                  <p className="text-[10px] text-[#5A6B7D] mt-0.5">{inv.standingOrderBank}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="portal-section">
          <header className="portal-section__head">
            <div className="flex items-center gap-1.5">
              <Building2 size={13} className="text-[#0E1F1A]" />
              <h2 className="portal-section__title">Parties &amp; status history</h2>
            </div>
          </header>
          <div className="portal-section__body--pad space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Supplier</p>
                <p className="font-semibold text-[#0E1F1A] mt-0.5">{inv.supplierName}</p>
              </div>
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Buyer</p>
                <p className="font-semibold text-[#0E1F1A] mt-0.5">{inv.buyerName}</p>
              </div>
            </div>
            <div className="space-y-2 pt-1 border-t border-[#0E1F1A]/8">
              {history.map((h: any, i: number) => (
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
        </section>
      </div>

      {(canMakeOffer || canRequestConsent) && (
        <section className="portal-section">
          <header className="portal-section__head">
            <h2 className="portal-section__title">SPV actions</h2>
            <p className="portal-section__desc">
              {canMakeOffer ? 'Submit a purchase offer on this receivable' : 'Request buyer assignment consent'}
            </p>
          </header>
          <div className="portal-section__body--pad">
            {canMakeOffer && (
              <div className="space-y-3">
                <OfferCalculator
                  faceValue={inv.amount}
                  supplierName={inv.supplierName}
                  buyerName={inv.buyerName}
                  issueDate={inv.issueDate}
                  dueDate={inv.dueDate}
                  discountRate={discountRate}
                  onDiscountChange={setDiscountRate}
                />
                <label className="flex items-start gap-2 text-[11px] text-[#5A6B7D] cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5" />
                  I confirm this offer is binding upon supplier acceptance and initiates the assignment workflow.
                </label>
                <button
                  type="button"
                  onClick={handleMakeOffer}
                  disabled={offerBusy || !agreed}
                  className="inline-flex items-center justify-center min-h-[36px] px-4 py-2 bg-[#0E1F1A] text-white rounded-lg text-xs font-bold hover:bg-[#1A3A2E] disabled:opacity-50"
                >
                  {offerBusy ? 'Submitting…' : 'Submit offer'}
                </button>
              </div>
            )}
            {canRequestConsent && (
              <button
                type="button"
                onClick={handleRequestConsent}
                disabled={consentBusy}
                className="inline-flex items-center justify-center min-h-[36px] px-4 py-2 bg-[#D3F36B] text-[#0E1F1A] rounded-lg text-xs font-bold hover:bg-[#C5E85A] disabled:opacity-50"
              >
                {consentBusy ? 'Sending…' : 'Request consent'}
              </button>
            )}
          </div>
        </section>
      )}

      {(asgn || opt || escrow.length > 0 || consent) && (
        <section className="portal-section">
          <header className="portal-section__head">
            <h2 className="portal-section__title">Linked records</h2>
            <p className="portal-section__desc">Opt-in, assignment, and escrow legs</p>
          </header>
          <div className="portal-section__body--pad space-y-2 text-xs">
            {opt && (
              <p className="text-[#0E1F1A]">
                <span className="text-[#5A6B7D]">Opt-in · </span>
                <StatusBadge status={opt.status} />
              </p>
            )}
            {asgn && (
              <p className="text-[#0E1F1A]">
                <span className="text-[#5A6B7D]">Assignment · </span>
                {asgn.id} · {asgn.triggeredBy} · {formatDate(asgn.createdAt)}
              </p>
            )}
            {consent && (
              <p className="text-[#0E1F1A]">
                <span className="text-[#5A6B7D]">Consent · </span>
                <StatusBadge status={consent.status} /> · {formatDate(consent.requestedAt)}
              </p>
            )}
            {escrow.map(e => (
              <p key={e.id} className="text-[#0E1F1A]">
                <span className="text-[#5A6B7D]">{e.type} · </span>
                {formatCurrency(e.amount)} → {e.counterparty} · <StatusBadge status={e.status} />
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
