import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AssignmentConsent } from '@/types';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function ConsentInboxPage() {
  const { user } = useAuth();
  const { consents, signConsent, requestConsentOtp } = useData();
  const [selected, setSelected] = useState<AssignmentConsent | null>(null);
  const [otp, setOtp] = useState('');
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const myConsents = consents.filter(c => c.buyerId === user?.organisationId);
  const pending = myConsents.filter(c => c.status === 'pending');
  const completed = myConsents.filter(c => c.status !== 'pending');

  const sendOtp = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await requestConsentOtp(selected.id);
      setOtpHint(res.demoHint || null);
      toast.success(res.demoHint ? `OTP sent (demo: ${res.demoHint})` : 'OTP sent to your email');
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
      toast.success('Consent signed with OTP verification');
      setSelected(null);
      setOtp('');
      setOtpHint(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Sign failed');
    } finally {
      setBusy(false);
    }
  };

  const detail = selected && (
    <div className="border rounded-2xl p-4 sm:p-6 space-y-4">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <button
            type="button"
            className="lg:hidden inline-flex items-center gap-1 text-sm text-muted-foreground mb-2 min-h-[40px]"
            onClick={() => setSelected(null)}
          >
            <ArrowLeft size={16} /> Back to list
          </button>
          <h3 className="font-semibold text-lg">Assignment consent</h3>
          <p className="text-sm text-muted-foreground font-mono break-anywhere">{selected.iouRegistryId}</p>
        </div>
        <StatusBadge status={selected.status} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Supplier</p>
          <p className="font-medium break-words">{selected.supplierName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Amount</p>
          <p className="font-mono">{formatCurrency(selected.amount)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Requested</p>
          <p>{formatDate(selected.requestedAt)}</p>
        </div>
      </div>

      {selected.status === 'pending' && (
        <div className="border-t pt-4 space-y-3">
          <p className="text-sm">Signatory verification requires a one-time password.</p>
          <button
            type="button"
            disabled={busy}
            onClick={sendOtp}
            className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] text-sm rounded-xl border font-medium"
          >
            Send OTP
          </button>
          {otpHint && <p className="text-xs text-muted-foreground">Demo code: <span className="font-mono">{otpHint}</span></p>}
          <div>
            <label className="text-xs text-muted-foreground">Enter OTP</label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="block border rounded-lg px-3 py-2.5 text-sm font-mono tracking-widest w-full sm:w-40"
              placeholder="123456"
              maxLength={6}
              inputMode="numeric"
            />
          </div>
          <button
            type="button"
            disabled={busy || otp.length < 4}
            onClick={handleSign}
            className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] text-sm rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            Confirm & sign
          </button>
        </div>
      )}
    </div>
  );

  const list = (
    <div className="border rounded-2xl overflow-hidden">
      <div className="p-3 border-b bg-secondary/30">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Pending ({pending.length})
        </p>
      </div>
      <div className="divide-y max-h-[min(50dvh,420px)] lg:max-h-[500px] overflow-y-auto scroll-touch">
        {pending.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No pending consents</p>
        ) : (
          pending.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setSelected(c); setOtp(''); setOtpHint(null); }}
              className={`w-full text-left px-4 py-3.5 min-h-[64px] hover:bg-secondary/30 transition-colors ${selected?.id === c.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
            >
              <p className="text-sm font-medium truncate">{c.supplierName || 'Supplier'}</p>
              <p className="text-xs text-muted-foreground font-mono truncate">{c.iouRegistryId}</p>
              <p className="text-xs font-mono mt-1">{formatCurrency(c.amount)}</p>
            </button>
          ))
        )}
      </div>
      {completed.length > 0 && (
        <>
          <div className="p-3 border-b border-t bg-secondary/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Completed ({completed.length})
            </p>
          </div>
          <div className="divide-y max-h-40 overflow-y-auto scroll-touch">
            {completed.slice(0, 10).map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                className={`w-full text-left px-4 py-3 min-h-[52px] hover:bg-secondary/30 ${selected?.id === c.id ? 'bg-primary/5' : ''}`}
              >
                <div className="flex justify-between items-center gap-2">
                  <p className="text-sm truncate">{c.supplierName || 'Supplier'}</p>
                  <StatusBadge status={c.status} />
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <PageHeader
        title="Consent Inbox"
        subtitle="OTP-verified assignment consent signatures"
      />

      {/* Mobile: list OR detail */}
      <div className="lg:hidden">
        {selected ? detail : list}
      </div>

      {/* Desktop: side by side */}
      <div className="hidden lg:grid grid-cols-3 gap-6">
        <div className="col-span-1">{list}</div>
        <div className="col-span-2">
          {selected ? detail : (
            <div className="border rounded-2xl p-6 text-sm text-muted-foreground">
              Select a consent to review and sign
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
