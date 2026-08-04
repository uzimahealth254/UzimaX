import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import { useActor } from '@/hooks/useActor';
import PageHeader from '@/components/layout/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { computeTenorDays, priceReceivable } from '@/lib/pricing';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import { HandCoins } from 'lucide-react';

export default function OptInInboxPage() {
  const { user } = useAuth();
  const { optIns, respondToOptIn } = useData();
  const actor = useActor();
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [sellAmount, setSellAmount] = useState('');
  const [otp, setOtp] = useState('');
  const [otpHint, setOtpHint] = useState<string | null>(null);

  const mine = optIns.filter(o => o.supplierId === user?.organisationId);
  const pending = mine.filter(o => o.status === 'pending');
  const history = mine.filter(o => o.status !== 'pending');

  const confirmOpt = useMemo(
    () => pending.find(o => o.id === confirmId) || null,
    [pending, confirmId],
  );

  const face = Number(confirmOpt?.amount || 0);
  const listedForPreview = sellAmount ? Number(sellAmount) : face;

  const preview = useMemo(() => {
    if (!confirmOpt?.amount) return null;
    const tenorDays = confirmOpt.issueDate && confirmOpt.dueDate
      ? computeTenorDays(confirmOpt.issueDate, confirmOpt.dueDate)
      : 90;
    return priceReceivable({ faceValue: listedForPreview || face, tenorDays });
  }, [confirmOpt, listedForPreview, face]);

  const requestOtp = async (id: string) => {
    try {
      const { data } = await api.post(`/opt-ins/${id}/request-otp`);
      setOtpHint(data?.demoHint || null);
      toast.success('OTP sent');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not send OTP');
    }
  };

  const accept = async () => {
    if (!confirmId) return;
    const listed = sellAmount ? Number(sellAmount) : face;
    if (!(listed > 0) || listed > face) {
      toast.error('Amount to sell must be > 0 and ≤ face value');
      return;
    }
    if (!otp.trim()) {
      toast.error('Enter OTP to confirm sell');
      return;
    }
    setBusyId(confirmId);
    try {
      await Promise.resolve(respondToOptIn(confirmId, true, undefined, actor, {
        listedAmount: listed,
        otp: otp.trim(),
      }));
      toast.success('Opt-in recorded — receivable assigned to SPV');
      setConfirmId(null);
      setSellAmount('');
      setOtp('');
      setOtpHint(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Opt-in failed');
    } finally {
      setBusyId(null);
    }
  };

  const decline = async () => {
    if (!declineId) return;
    setBusyId(declineId);
    try {
      await Promise.resolve(respondToOptIn(declineId, false, reason || 'Declined by supplier', actor));
      setDeclineId(null);
      setReason('');
      toast.message('Opt-in declined — buyer notified');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Decline failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Opt-in / Sell inbox"
        subtitle="Buyer-posted IOUs waiting for you to sell the receivable to the SPV"
      />

      {pending.length === 0 ? (
        <div className="portal-empty">
          <HandCoins size={20} className="mx-auto text-[#5A6B7D] mb-2" />
          <p className="text-xs font-bold text-[#0E1F1A]">No pending opt-ins</p>
          <p className="text-[11px] text-[#5A6B7D] mt-0.5">
            When a buyer posts an instrument naming you, it appears here for opt-in / sell.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map(o => {
            const busy = busyId === o.id;
            const tenorDays = o.issueDate && o.dueDate ? computeTenorDays(o.issueDate, o.dueDate) : 90;
            const quote = priceReceivable({ faceValue: Number(o.amount) || 0, tenorDays });
            return (
              <section key={o.id} className="portal-section">
                <div className="px-3 py-2.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0E1F1A] truncate">{o.buyerName}</p>
                      <p className="text-[11px] font-mono text-[#5A6B7D] truncate">{o.iouRegistryId}</p>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                      <p className="text-[10px] font-semibold text-[#5A6B7D]">Face value</p>
                      <p className="font-mono font-bold text-[#0E1F1A] mt-0.5">{formatCurrency(o.amount)}</p>
                    </div>
                    <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                      <p className="text-[10px] font-semibold text-[#5A6B7D]">Indicative proceeds (full)</p>
                      <p className="font-mono font-bold text-[#0E1F1A] mt-0.5">{formatCurrency(quote.offerPrice)}</p>
                      <p className="text-[10px] text-[#5A6B7D] mt-0.5">~{quote.recommendedDiscount}% discount · {quote.tenorDays}d</p>
                    </div>
                    <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2 col-span-2 sm:col-span-1">
                      <p className="text-[10px] font-semibold text-[#5A6B7D]">Notified</p>
                      <p className="font-medium text-[#0E1F1A] mt-0.5">{formatDate(o.notifiedAt)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-[#0E1F1A]/8">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setConfirmId(o.id);
                        setSellAmount(String(o.amount || ''));
                        setOtp('');
                        setOtpHint(null);
                        void requestOtp(o.id);
                      }}
                      className="inline-flex items-center justify-center px-3 py-1.5 min-h-[34px] rounded-lg bg-[#0E1F1A] text-white text-xs font-bold hover:bg-[#1A3A2E] disabled:opacity-50"
                    >
                      {busy ? '…' : 'Opt in & sell'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setDeclineId(o.id)}
                      className="inline-flex items-center justify-center px-3 py-1.5 min-h-[34px] rounded-lg border border-[#0E1F1A]/15 text-xs font-semibold text-[#0E1F1A] hover:bg-[#f7faf6] disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <section className="portal-section">
          <header className="portal-section__head">
            <div>
              <h2 className="portal-section__title">History</h2>
              <p className="portal-section__desc">{history.length} completed</p>
            </div>
          </header>
          <div className="divide-y divide-[#0E1F1A]/8 max-h-48 overflow-y-auto">
            {history.map(o => (
              <div key={o.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-[#0E1F1A] font-mono truncate">{o.iouRegistryId}</p>
                  <p className="text-[11px] text-[#5A6B7D] truncate">{o.buyerName} · {formatCurrency(o.amount)}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      <ConfirmationModal
        open={!!confirmId}
        title="Confirm opt-in & sell?"
        description={
          preview
            ? `If you sell ${formatCurrency(listedForPreview)}, you'll receive ~${formatCurrency(preview.offerPrice)} now (${preview.recommendedDiscount}% discount, ${preview.tenorDays}d tenor). Checker OTP required.`
            : 'This assigns the receivable to the SPV. Checker OTP required.'
        }
        confirmLabel="Confirm sell"
        onCancel={() => { setConfirmId(null); setSellAmount(''); setOtp(''); }}
        onConfirm={accept}
      >
        <div className="space-y-3 text-left mt-2">
          <div>
            <label className="block text-[11px] font-semibold text-[#0E1F1A] mb-1">
              Amount to sell <span className="font-normal text-[#5A6B7D]">(partial OK · max {formatCurrency(face)})</span>
            </label>
            <input
              type="number"
              className="field-input text-xs"
              min={1}
              max={face}
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-[#0E1F1A]">Confirmation OTP</label>
              <button type="button" className="text-[11px] font-bold hover:underline" onClick={() => confirmId && void requestOtp(confirmId)}>Resend</button>
            </div>
            <input
              className="field-input text-xs font-mono tracking-widest"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit code"
              maxLength={8}
            />
            {otpHint && <p className="text-[10px] text-[#5A6B7D] mt-1">Demo: <span className="font-mono font-bold">{otpHint}</span></p>}
          </div>
        </div>
      </ConfirmationModal>

      {declineId && (
        <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => { setDeclineId(null); setReason(''); }} />
          <div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-4 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-[#0E1F1A]">Decline opt-in?</h3>
            <p className="text-xs text-[#5A6B7D]">Optional reason — buyer will be notified by email.</p>
            <textarea
              className="field-input text-xs min-h-[72px]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional feedback"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" className="px-3 py-2 text-xs font-semibold" onClick={() => { setDeclineId(null); setReason(''); }}>Cancel</button>
              <button type="button" className="px-3 py-2 text-xs font-bold rounded-lg bg-[#0E1F1A] text-white" onClick={() => void decline()}>Decline</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
