import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import DocumentAttach from '@/components/shared/DocumentAttach';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';

type AttachedDoc = {
  id?: string;
  name: string;
  url?: string;
  fileUrl?: string;
  docType?: string;
};

export default function PostSupplierInvoicePage() {
  const { organisations, postSupplierInvoice } = useData();
  const navigate = useNavigate();
  const buyers = organisations.filter((o: any) => o.orgType === 'buyer');
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<AttachedDoc[]>([]);
  const [form, setForm] = useState({
    buyerOrgId: '',
    invoiceNumber: '',
    amount: '',
    issueDate: '',
    dueDate: '',
    description: '',
    currency: 'KES',
  });

  useEffect(() => {
    if (!form.buyerOrgId && buyers[0]?.id) {
      setForm((f) => ({ ...f, buyerOrgId: buyers[0].id }));
    }
  }, [buyers, form.buyerOrgId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await postSupplierInvoice({
        buyerOrgId: form.buyerOrgId,
        invoiceNumber: form.invoiceNumber,
        amount: Number(form.amount),
        currency: form.currency,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        description: form.description,
        supportingDocs: docs.map((d) => ({
          id: d.id,
          name: d.name,
          url: d.url || d.fileUrl,
          fileUrl: d.fileUrl || d.url,
          docType: d.docType || 'supporting',
        })),
      });
      toast.success('Invoice recorded — awaiting buyer verification');
      navigate('/supplier/invoices');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to post invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Post invoice / sale offer"
        subtitle="Supplier-originated path — buyer verifies before SPV assignment"
      />

      <div className="portal-callout">
        On submit, the buyer receives a verification request. Acceptance assigns the receivable to the SPV.
      </div>

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Invoice details</h2>
            <p className="portal-section__desc">Required fields unless noted</p>
          </div>
        </header>
        <form onSubmit={submit} className="portal-section__body--pad space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">Buyer</label>
              <select
                required
                className="field-input appearance-none"
                value={form.buyerOrgId}
                onChange={(e) => setForm({ ...form, buyerOrgId: e.target.value })}
              >
                {buyers.length === 0 && <option value="">No buyers available</option>}
                {buyers.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">Invoice number</label>
              <input
                required
                className="field-input"
                value={form.invoiceNumber}
                onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                placeholder="INV-…"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">Face value</label>
              <input
                required
                type="number"
                min={1}
                className="field-input"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
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
                className="field-input"
                value={form.issueDate}
                onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">Due date</label>
              <input
                required
                type="date"
                className="field-input"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">Description</label>
            <textarea
              required
              rows={2}
              className="field-input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Goods / services receivable"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">Supporting documents</label>
            <p className="text-[11px] text-[#5A6B7D] mb-1.5">
              Attach evidence the buyer will review before verifying.
            </p>
            <DocumentAttach onChange={setDocs} />
          </div>
          <div className="pt-2 border-t border-[#0E1F1A]/8 flex justify-end">
            <button
              type="submit"
              disabled={loading || buyers.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0E1F1A] text-white px-4 py-2 text-xs font-bold hover:bg-[#1A3A2E] disabled:opacity-60 min-h-[40px]"
            >
              {loading ? 'Submitting…' : 'Submit for buyer verification'}
              {!loading && <ArrowRight size={13} strokeWidth={2.25} />}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
