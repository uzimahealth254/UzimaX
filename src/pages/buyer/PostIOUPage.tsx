import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import { useActor } from '@/hooks/useActor';
import PageHeader from '@/components/layout/PageHeader';
import { toast } from 'sonner';
import DocumentAttach from '@/components/shared/DocumentAttach';

export default function PostIOUPage() {
  const { user } = useAuth();
  const { postBuyerIOU, organisations } = useData();
  const actor = useActor();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<string[]>([]);

  const suppliers = organisations.filter((o: any) => o.orgType === 'supplier');

  const [form, setForm] = useState({
    supplierId: '',
    invoiceNumber: '',
    amount: '',
    issueDate: '',
    dueDate: '',
    description: '',
    currency: 'KES',
  });

  useEffect(() => {
    if (!form.supplierId && suppliers[0]?.id) {
      setForm((f) => ({ ...f, supplierId: suppliers[0].id }));
    }
  }, [suppliers, form.supplierId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const supplier = suppliers.find((s: any) => s.id === form.supplierId);
      await postBuyerIOU({
        supplierId: form.supplierId,
        supplierName: supplier?.name || '',
        buyerId: user.organisationId,
        buyerName: user.organisationName,
        invoiceNumber: form.invoiceNumber,
        amount: Number(form.amount),
        currency: form.currency,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        description: form.description,
        documents: docs,
        origin: 'buyer_posted',
      }, actor);
      toast.success('IOU posted — supplier notified to opt in');
      navigate('/buyer/register');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to post IOU');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Post approved invoice / IOU"
        subtitle="Confirm a payable → notify supplier to opt in / sell → assignment to SPV on accept"
      />

      <div className="max-w-2xl rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
        On submit, Uzima registers an IOU, alerts the supplier, and waits for opt-in.
        Acceptance auto-generates assignment of the receivable to Uzima Capital SPV.
      </div>

      <form onSubmit={handleSubmit} className="form-surface">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Invoice Number</label>
            <input
              required
              value={form.invoiceNumber}
              onChange={e => setForm({ ...form, invoiceNumber: e.target.value })}
              placeholder="INV-KBC-APPROVED-...."
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Supplier</label>
            <select
              required
              value={form.supplierId}
              onChange={e => setForm({ ...form, supplierId: e.target.value })}
              className="w-full px-3 py-2.5 border rounded-lg text-sm appearance-none bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Amount (KES)</label>
            <input
              required
              type="number"
              min={1}
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Currency</label>
            <input
              value={form.currency}
              readOnly
              className="w-full px-3 py-2.5 border rounded-lg text-sm bg-muted/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Issue date</label>
            <input
              required
              type="date"
              value={form.issueDate}
              onChange={e => setForm({ ...form, issueDate: e.target.value })}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Due date</label>
            <input
              required
              type="date"
              value={form.dueDate}
              onChange={e => setForm({ ...form, dueDate: e.target.value })}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Description</label>
          <textarea
            required
            rows={3}
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Confirmed goods / services payable"
          />
        </div>
        <DocumentAttach onChange={files => setDocs(files.map(f => `${f.category}:${f.name}`))} />
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-6 py-3 min-h-[48px] rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-60"
        >
          {loading ? 'Posting…' : 'Post IOU & notify supplier'}
        </button>
      </form>
    </div>
  );
}
