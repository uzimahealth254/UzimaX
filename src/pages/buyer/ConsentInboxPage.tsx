import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AssignmentConsent } from '@/types';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const SHOW_DEMO = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO === 'true';

export default function ConsentInboxPage() {
  const { user } = useAuth();
  const { consents, signatories, signConsent, requestConsentOtp } = useData();
  const [selected, setSelected] = useState<AssignmentConsent | null>(null);
  const [otp, setOtp] = useState('');
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const myConsents = consents.filter(c => c.buyerId === user?.organisationId);
  const orgSignatories = signatories.filter(
    (s: { orgId?: string; isActive?: boolean | null }) =>
      s.orgId === user?.organisationId && s.isActive !== false,
  );
  const pending = myConsents.filter(c => c.status === 'pending');
  const completed = myConsents.filter(c => c.status !== 'pending');

  const sendOtp = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await requestConsentOtp(selected.id);
      setOtpHint(SHOW_DEMO ? (res.demoHint || null) : null);
      toast.success(SHOW_DEMO && res.demoHint ? `OTP sent (demo: ${res.demoHint})` : 'OTP sent to your registered channels');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to send OTP');
    } finally {
      setBusy(false);
    }
  };

  const handleSign = async () => {
    if (!selected || !otp) {
      toast.error('Enter the OTP first');
      return;
    }
    setBusy(true);
    try {
      await signConsent(selected.id, true, undefined, otp);
      toast.success('Consent signature recorded');
      setSelected(null);
      setOtp('');
      setOtpHint(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Sign failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await signConsent(selected.id, false, undefined, undefined, declineReason || undefined);
      toast.message('Consent declined — SPV notified');
      setDeclineOpen(false);
      setDeclineReason('');
      setSelected(null);
      setOtp('');
      setOtpHint(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Decline failed');
    } finally {
      setBusy(false);
    }
  };

  const detail = selected && (
    <section className="portal-section h-full">
      <header className="portal-section__head">
        <div className="min-w-0">
          <button
            type="button"
            className="lg:hidden inline-flex items-center gap-1 text-xs font-semibold text-[#5A6B7D] mb-1 min-h-[32px]"
            onClick={() => setSelected(null)}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <h2 className="portal-section__title">Assignment consent</h2>
          <p className="portal-section__desc font-mono break-anywhere">{selected.iouRegistryId}</p>
        </div>
        <StatusBadge status={selected.status} />
      </header>
      <div className="portal-section__body--pad space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2.5">
            <p className="text-[10px] font-semibold text-[#5A6B7D]">Supplier</p>
            <p className="text-xs font-semibold text-[#0E1F1A] break-words mt-0.5">{selected.supplierName}</p>
          </div>
          <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2.5">
            <p className="text-[10px] font-semibold text-[#5A6B7D]">Amount</p>
            <p className="text-xs font-mono font-bold text-[#0E1F1A] mt-0.5">{formatCurrency(selected.amount)}</p>
          </div>
          <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2.5 col-span-2">
            <p className="text-[10px] font-semibold text-[#5A6B7D]">Requested</p>
            <p className="text-xs font-medium text-[#0E1F1A] mt-0.5">{formatDate(selected.requestedAt)}</p>
          </div>
        </div>

        <div className="rounded-md border border-[#0E1F1A]/8 bg-[#f7faf6] p-2.5 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6B7D]">Signatories</p>
          {orgSignatories.length === 0 ? (
            <div className="text-xs text-[#0E1F1A]">
              <p>
                Primary signatory: <span className="font-semibold">{user?.name}</span>
              </p>
              {selected.status === 'pending' && (
                <p className="text-[11px] text-[#5A6B7D] mt-1">Pending OTP verification to complete signing.</p>
              )}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {orgSignatories.map((sig: { id: string; userId: string; roleTitle?: string | null }) => {
                const signed = selected.status === 'signed' && selected.signatoryId === sig.id;
                const rejected = selected.status === 'rejected';
                const pendingSig = selected.status === 'pending';
                const label = sig.userId === user?.id ? user.name : sig.roleTitle || 'Authorised signatory';
                return (
                  <li key={sig.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-[#0E1F1A] truncate">{label}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        signed
                          ? 'bg-emerald-100 text-emerald-800'
                          : rejected
                            ? 'bg-red-100 text-red-700'
                            : pendingSig
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-[#E8F0EA] text-[#5A6B7D]'
                      }`}
                    >
                      {signed ? 'Signed' : rejected ? 'Declined' : pendingSig ? 'Pending OTP' : '—'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {selected.status === 'pending' && (
          <div className="border-t border-[#0E1F1A]/8 pt-3 space-y-2.5">
            <p className="text-xs font-medium text-[#0E1F1A]">OTP required for signatory verification.</p>
            <div className="flex flex-wrap items-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={sendOtp}
                className="px-3 py-2 min-h-[36px] text-xs rounded-lg border border-[#0E1F1A]/15 font-bold text-[#0E1F1A] hover:bg-[#f7faf6]"
              >
                Send OTP
              </button>
              <div>
                <label className="text-[10px] font-semibold text-[#5A6B7D]">OTP</label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="field-input mt-1 font-mono tracking-widest w-28 !min-h-[36px] !py-1.5"
                  placeholder="123456"
                  maxLength={6}
                  inputMode="numeric"
                />
              </div>
              <button
                type="button"
                disabled={busy || otp.length < 4}
                onClick={handleSign}
                className="px-3 py-2 min-h-[36px] text-xs rounded-lg bg-[#0E1F1A] text-white font-bold hover:bg-[#1A3A2E] disabled:opacity-50"
              >
                Confirm &amp; sign
              </button>
            </div>
            {SHOW_DEMO && otpHint && (
              <p className="text-[11px] text-[#5A6B7D]">Demo: <span className="font-mono font-bold text-[#0E1F1A]">{otpHint}</span></p>
            )}
            <div className="pt-2 border-t border-[#0E1F1A]/8">
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeclineOpen(true)}
                className="px-3 py-2 min-h-[36px] text-xs rounded-lg border border-red-200 text-red-700 font-bold hover:bg-red-50 disabled:opacity-50"
              >
                Decline consent
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  const list = (
    <section className="portal-section h-full">
      <header className="portal-section__head">
        <div>
          <h2 className="portal-section__title">Pending ({pending.length})</h2>
          <p className="portal-section__desc">Select to review</p>
        </div>
      </header>
      <div className="divide-y divide-[#0E1F1A]/8 max-h-[min(55dvh,520px)] overflow-y-auto scroll-touch">
        {pending.length === 0 ? (
          <p className="px-3 py-4 text-xs text-[#5A6B7D]">No pending consents</p>
        ) : (
          pending.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setSelected(c); setOtp(''); setOtpHint(null); }}
              className={`w-full text-left px-3 py-2.5 hover:bg-[#f7faf6] transition-colors ${selected?.id === c.id ? 'bg-[#F4FBE3] border-l-[3px] border-l-[#0E1F1A]' : ''}`}
            >
              <p className="text-xs font-semibold text-[#0E1F1A] truncate">{c.supplierName || 'Supplier'}</p>
              <p className="text-[11px] text-[#5A6B7D] font-mono truncate">{c.iouRegistryId}</p>
              <p className="text-[11px] font-mono font-bold text-[#0E1F1A] mt-0.5">{formatCurrency(c.amount)}</p>
            </button>
          ))
        )}
      </div>
      {completed.length > 0 && (
        <>
          <div className="px-3 py-1.5 border-t border-[#0E1F1A]/8 bg-[#f7faf6]">
            <p className="text-[10px] font-bold text-[#5A6B7D] uppercase tracking-wider">
              Completed ({completed.length})
            </p>
          </div>
          <div className="divide-y divide-[#0E1F1A]/8 max-h-36 overflow-y-auto scroll-touch">
            {completed.slice(0, 10).map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                className={`w-full text-left px-3 py-2 hover:bg-[#f7faf6] ${selected?.id === c.id ? 'bg-[#F4FBE3]' : ''}`}
              >
                <div className="flex justify-between items-center gap-2">
                  <p className="text-xs font-medium text-[#0E1F1A] truncate">{c.supplierName || 'Supplier'}</p>
                  <StatusBadge status={c.status} />
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Consent inbox"
        subtitle="OTP-verified assignment consent signatures"
      />

      <div className="lg:hidden">
        {selected ? detail : list}
      </div>

      <div className="hidden lg:grid portal-split min-h-[28rem]">
        <div className="min-h-0">{list}</div>
        <div className="min-h-0">
          {selected ? detail : (
            <div className="portal-empty h-full flex flex-col items-center justify-center min-h-[12rem]">
              <p className="text-xs font-bold text-[#0E1F1A]">Select a consent</p>
              <p className="text-[11px] text-[#5A6B7D] mt-0.5">Review and sign with OTP</p>
            </div>
          )}
        </div>
      </div>

      {declineOpen && selected && (
        <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => { setDeclineOpen(false); setDeclineReason(''); }} />
          <div className="relative bg-white border border-[#0E1F1A]/10 rounded-t-xl sm:rounded-xl p-4 w-full max-w-md space-y-3 max-h-[min(85dvh,100%)] overflow-y-auto scroll-touch safe-pad-bottom">
            <h2 className="text-sm font-bold text-[#0E1F1A]">Decline assignment consent?</h2>
            <p className="text-xs text-[#5A6B7D]">
              The SPV will be notified. This refuses assignment of {selected.iouRegistryId}.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={2}
              placeholder="Reason (optional)"
              className="field-input"
            />
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                className="min-h-[44px] px-3 py-2 rounded-lg border border-[#0E1F1A]/15 text-xs font-semibold"
                onClick={() => { setDeclineOpen(false); setDeclineReason(''); }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                className="min-h-[36px] px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-50"
                onClick={handleDecline}
              >
                Decline consent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
