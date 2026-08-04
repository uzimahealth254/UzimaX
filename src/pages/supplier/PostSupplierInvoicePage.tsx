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
    listedAmount: '',
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
    if (docs.length < 1) {
      toast.error('Attach at least one invoice, proposal, or work-evidence document');
      return;
    }
    const face = Number(form.amount);
    const listed = form.listedAmount ? Number(form.listedAmount) : face;
    if (!(listed > 0) || listed > face) {
      toast.error('Amount to sell must be greater than 0 and not exceed face value');
      return;
    }
    setLoading(true);
    try {
      await postSupplierInvoice({
        buyerOrgId: form.buyerOrgId,
        invoiceNumber: form.invoiceNumber,
        amount: face,
        listedAmount: listed,
        currency: form.currency,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        description: form.description,
        supportingDocs: docs.map((d) => ({
          id: d.id,
          name: d.name,
          url: d.url || d.fileUrl,
          fileUrl: d.fileUrl || d.url,
          docType: d.docType || 'invoice_proposal',
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
              <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">
                Amount to sell <span className="font-normal text-[#5A6B7D]">(partial OK)</span>
              </label>
              <input
                type="number"
                min={1}
                className="field-input"
                value={form.listedAmount}
                onChange={(e) => setForm({ ...form, listedAmount: e.target.value })}
                placeholder={form.amount || 'Defaults to face value'}
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
            <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">
              Invoice / proposal / work evidence <span className="text-red-600">*</span>
            </label>
            <p className="text-[11px] text-[#5A6B7D] mb-1.5">
              Required for audit and buyer verification — attach at least one document.
            </p>
            <DocumentAttach onChange={setDocs} defaultDocType="invoice_proposal" />
          </div>
          <div className="pt-2 border-t border-[#0E1F1A]/8 flex justify-end">
            <button
              type="submit"
              disabled={loading || buyers.length === 0 || docs.length < 1}
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
