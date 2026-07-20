import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import { toast } from 'sonner';

export default function PostSupplierInvoicePage() {
  const { organisations, postSupplierInvoice } = useData();
  const navigate = useNavigate();
  const buyers = organisations.filter((o: any) => o.orgType === 'buyer');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    buyerOrgId: buyers[0]?.id || '',
    invoiceNumber: '',
    amount: '',
    issueDate: '',
    dueDate: '',
    description: '',
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await postSupplierInvoice({
        buyerOrgId: form.buyerOrgId,
        invoiceNumber: form.invoiceNumber,
        amount: Number(form.amount),
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        description: form.description,
      });
      toast.success('Invoice submitted — awaiting buyer verification');
      navigate('/supplier/invoices');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to post invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Post invoice / sale offer" subtitle="Supplier-originated path — buyer must verify before SPV assignment" />
      <form onSubmit={submit} className="form-surface">
        <div>
          <label className="text-sm font-medium">Buyer</label>
          <select required className="w-full mt-1 border rounded-lg px-3 py-2.5 text-sm" value={form.buyerOrgId} onChange={(e) => setForm({ ...form, buyerOrgId: e.target.value })}>
            {buyers.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Invoice number</label>
            <input required className="w-full mt-1 border rounded-lg px-3 py-2.5 text-sm" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Face value (KES)</label>
            <input required type="number" className="w-full mt-1 border rounded-lg px-3 py-2.5 text-sm" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Issue date</label>
            <input required type="date" className="w-full mt-1 border rounded-lg px-3 py-2.5 text-sm" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Due date</label>
            <input required type="date" className="w-full mt-1 border rounded-lg px-3 py-2.5 text-sm" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea required rows={3} className="w-full mt-1 border rounded-lg px-3 py-2.5 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <button disabled={loading} className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium">{loading ? 'Submitting…' : 'Submit for buyer verification'}</button>
      </form>
    </div>
  );
}
