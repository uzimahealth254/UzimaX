import { useState } from 'react';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, FileText, ExternalLink } from 'lucide-react';

type DocEntry = { name: string; url?: string };

function invoiceDocs(inv: any): DocEntry[] {
  const raw = inv?.supportingDocs ?? inv?.documents ?? [];
  if (!Array.isArray(raw)) return [];
  return raw.map((d: unknown) => {
    if (typeof d === 'string') return { name: d, url: undefined };
    const o = d as { name?: string; url?: string; fileUrl?: string };
    return {
      name: o.name || 'Document',
      url: o.url || o.fileUrl,
    };
  });
}

export default function BuyerVerificationInboxPage() {
  const { buyerVerifications, invoices, respondToBuyerVerification } = useData();
  const pending = buyerVerifications.filter((v: any) => v.status === 'pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [standingRef, setStandingRef] = useState('');
  const [standingBank, setStandingBank] = useState('');
  const [committed, setCommitted] = useState(false);

  const act = async (id: string, accept: boolean) => {
    if (accept && !committed) {
      toast.error('Confirm commitment to pay before verifying');
      return;
    }
    setBusyId(id);
    try {
      await respondToBuyerVerification(
        id,
        accept,
        accept ? undefined : 'Rejected by buyer',
        accept
          ? {
              bankStandingOrderRef: standingRef || undefined,
              standingOrderBank: standingBank || undefined,
            }
          : undefined,
      );
      toast.success(accept ? 'Verified — assigned to SPV (standard confirmation track)' : 'Rejected');
      setRejectId(null);
      setVerifyId(null);
      setCommitted(false);
      setStandingRef('');
      setStandingBank('');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Verification inbox"
        subtitle="Supplier-listed invoices awaiting accept or reject"
      />

      {pending.length === 0 ? (
        <div className="portal-empty">
          <p className="text-xs font-bold text-[#0E1F1A]">No pending verifications</p>
          <p className="text-[11px] text-[#5A6B7D] mt-0.5">
            When a supplier lists an invoice naming you, it appears here for verification.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map((v: any) => {
            const inv = invoices.find((i: any) => i.id === v.invoiceId);
            const busy = busyId === v.id;
            const docs = invoiceDocs(inv);
            return (
              <section key={v.id} className="portal-section">
                <div className="px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold font-mono text-xs text-[#0E1F1A] break-anywhere">{inv?.iouRegistryId || v.invoiceId}</p>
                      <StatusBadge status={v.status} />
                    </div>
                    <p className="text-xs text-[#5A6B7D] mt-0.5">
                      {inv?.supplierName} · {inv ? formatCurrency(inv.amount) : '—'} · Due {inv ? formatDate(inv.dueDate) : '—'}
                    </p>
                    {docs.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[#0E1F1A]/8">
                        <p className="text-[10px] font-semibold text-[#5A6B7D] uppercase tracking-wide mb-1.5">
                          Supplier documents ({docs.length})
                        </p>
                        <ul className="space-y-1">
                          {docs.map((doc, i) => (
                            <li key={`${doc.name}-${i}`} className="flex items-center gap-1.5 text-xs">
                              <FileText size={12} className="text-[#0E1F1A] shrink-0" />
                              {doc.url ? (
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#0E1F1A] font-medium hover:underline truncate flex items-center gap-1"
                                >
                                  {doc.name}
                                  <ExternalLink size={10} className="shrink-0 opacity-60" />
                                </a>
                              ) : (
                                <span className="text-[#0E1F1A] font-medium truncate">{doc.name}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-[#0E1F1A] text-white text-xs font-bold hover:bg-[#1A3A2E] disabled:opacity-50 min-h-[34px]"
                      onClick={() => {
                        setVerifyId(v.id);
                        setCommitted(false);
                        setStandingRef('');
                        setStandingBank('');
                      }}
                    >
                      <CheckCircle2 size={13} />
                      {busy ? '…' : 'Verify'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-[#0E1F1A]/15 text-xs font-semibold text-[#0E1F1A] hover:bg-[#f7faf6] disabled:opacity-50 min-h-[34px]"
                      onClick={() => setRejectId(v.id)}
                    >
                      <XCircle size={13} />
                      Reject
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <ConfirmationModal
        open={!!verifyId}
        title="Verify and commit to pay?"
        description="Verification records your acknowledgement of this payable and assigns it to the SPV on the standard confirmation track."
        confirmLabel="Verify & assign"
        onCancel={() => setVerifyId(null)}
        onConfirm={() => verifyId && act(verifyId, true)}
      >
        <div className="space-y-3 text-left mt-2">
          <label className="flex items-start gap-2 text-xs text-[#0E1F1A]">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={committed}
              onChange={(e) => setCommitted(e.target.checked)}
            />
            <span>
              I confirm this is an approved, undisputed payable and commit to pay on the due date.
            </span>
          </label>
          <div>
            <label className="block text-[11px] font-semibold text-[#0E1F1A] mb-1">
              Standing-order reference <span className="font-normal text-[#5A6B7D]">(optional)</span>
            </label>
            <input
              className="field-input text-xs"
              value={standingRef}
              onChange={(e) => setStandingRef(e.target.value)}
              placeholder="External bank reference"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#0E1F1A] mb-1">
              Bank name <span className="font-normal text-[#5A6B7D]">(optional)</span>
            </label>
            <input
              className="field-input text-xs"
              value={standingBank}
              onChange={(e) => setStandingBank(e.target.value)}
              placeholder="e.g. Equity Bank"
            />
          </div>
        </div>
      </ConfirmationModal>

      <ConfirmationModal
        open={!!rejectId}
        title="Reject verification?"
        description="This supplier invoice will be rejected and will not be assigned to the SPV."
        confirmLabel="Reject invoice"
        variant="destructive"
        onCancel={() => setRejectId(null)}
        onConfirm={() => rejectId && act(rejectId, false)}
      />
    </div>
  );
}
