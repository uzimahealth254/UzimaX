import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import { useActor } from '@/hooks/useActor';
import PageHeader from '@/components/layout/PageHeader';
import { toast } from 'sonner';
import DocumentAttach from '@/components/shared/DocumentAttach';
import { ArrowRight } from 'lucide-react';

type AttachedDoc = {
  id?: string;
  name: string;
  url?: string;
  fileUrl?: string;
  docType?: string;
};

export default function PostIOUPage() {
  const { user } = useAuth();
  const { postBuyerIOU, organisations } = useData();
  const actor = useActor();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<AttachedDoc[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  const suppliers = organisations.filter((o: any) => o.orgType === 'supplier');

  const [form, setForm] = useState({
    supplierId: '',
    invoiceNumber: '',
    poReference: '',
    amount: '',
    issueDate: '',
    dueDate: '',
    description: '',
    currency: 'KES',
    bankStandingOrderRef: '',
  });

  useEffect(() => {
    if (!form.supplierId && suppliers[0]?.id) {
      setForm((f) => ({ ...f, supplierId: suppliers[0].id }));
    }
  }, [suppliers, form.supplierId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!confirmed) {
      toast.error('Confirm this is an approved, undisputed payable');
      return;
    }
    setLoading(true);
    try {
      const supplier = suppliers.find((s: any) => s.id === form.supplierId);
      await postBuyerIOU({
        supplierId: form.supplierId,
        supplierName: supplier?.name || '',
        buyerId: user.organisationId,
        buyerName: user.organisationName,
        invoiceNumber: form.invoiceNumber,
        poReference: form.poReference || undefined,
        amount: Number(form.amount),
        currency: form.currency,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        description: form.description,
        commitmentToPay: true,
        bankStandingOrderRef: form.bankStandingOrderRef || undefined,
        supportingDocs: docs.map((d) => ({
          id: d.id,
          name: d.name,
          url: d.url || d.fileUrl,
          fileUrl: d.fileUrl || d.url,
          docType: d.docType || 'supporting',
        })),
        origin: 'buyer_posted',
      }, actor);
      toast.success('IOU recorded — supplier notified to opt in');
      navigate('/buyer/register');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to post IOU');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Post approved invoice / IOU"
        subtitle="Confirm payable → notify supplier → assign to SPV on accept"
      />

      <div className="portal-callout">
        IOU Exchange registers the IOU and alerts the supplier. Acceptance assigns the receivable to the SPV.
      </div>

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Invoice details</h2>
            <p className="portal-section__desc">Required fields unless noted</p>
          </div>
        </header>
        <form onSubmit={handleSubmit} className="portal-section__body--pad space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">Invoice number</label>
              <input
                required
                value={form.invoiceNumber}
                onChange={e => setForm({ ...form, invoiceNumber: e.target.value })}
                placeholder="INV-…"
                className="field-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">PO reference</label>
              <input
                value={form.poReference}
                onChange={e => setForm({ ...form, poReference: e.target.value })}
                placeholder="PO-… (optional)"
                className="field-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">Supplier</label>
              <select
                required
                value={form.supplierId}
                onChange={e => setForm({ ...form, supplierId: e.target.value })}
                className="field-input appearance-none"
              >
                {suppliers.length === 0 && <option value="">No suppliers available</option>}
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">Face value</label>
              <input
                required
                type="number"
                min={1}
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                className="field-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">Currency</label>
              <input value={form.currency} readOnly className="field-input opacity-80" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">Issue date</label>
              <input
                required
                type="date"
                value={form.issueDate}
                onChange={e => setForm({ ...form, issueDate: e.target.value })}
                className="field-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">Due date</label>
              <input
                required
                type="date"
                value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })}
                className="field-input"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">
                Bank standing-order reference <span className="font-normal text-[#5A6B7D]">(optional)</span>
              </label>
              <input
                value={form.bankStandingOrderRef}
                onChange={e => setForm({ ...form, bankStandingOrderRef: e.target.value })}
                placeholder="External settlement / standing-order ref — not executed by IOU Exchange"
                className="field-input"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">Description</label>
            <textarea
              required
              rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="field-input"
              placeholder="Confirmed goods / services payable"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">Supporting documents</label>
            <DocumentAttach onChange={setDocs} />
          </div>
          <label className="flex items-start gap-2 text-xs text-[#0E1F1A] pt-1">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              required
            />
            <span>
              I confirm this is an approved, undisputed payable and record my <strong>commitment to pay</strong> at maturity
              (settlement is executed by the settlement partner — not by IOU Exchange).
            </span>
          </label>
          <div className="pt-2 border-t border-[#0E1F1A]/8 flex justify-end">
            <button
              type="submit"
              disabled={loading || suppliers.length === 0 || !confirmed}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0E1F1A] text-white px-4 py-2 text-xs font-bold hover:bg-[#1A3A2E] disabled:opacity-60 min-h-[40px]"
            >
              {loading ? 'Posting…' : 'Post IOU & notify supplier'}
              {!loading && <ArrowRight size={13} strokeWidth={2.25} />}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
