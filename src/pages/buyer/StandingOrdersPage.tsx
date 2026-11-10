import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import { toast } from 'sonner';

export default function StandingOrdersPage() {
  const { invoices } = useData();
  const qc = useQueryClient();
  const orders = useQuery({
    queryKey: ['standing-orders'],
    queryFn: async () => (await api.get('/standing-orders')).data.data as any[],
  });
  const [form, setForm] = useState({
    invoiceId: '', bankName: '', accountMasked: '', reference: '', amount: '', firstExecutionDate: '', frequency: 'once',
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/standing-orders', {
        ...form,
        amount: Number(form.amount),
        accountMasked: form.accountMasked || undefined,
        reference: form.reference || undefined,
      });
      toast.success('Standing order recorded. The bank executes it; IOU Exchange does not move the funds.');
      setForm({ invoiceId: '', bankName: '', accountMasked: '', reference: '', amount: '', firstExecutionDate: '', frequency: 'once' });
      qc.invalidateQueries({ queryKey: ['standing-orders'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not record standing order');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/standing-orders/${id}`, { status });
      qc.invalidateQueries({ queryKey: ['standing-orders'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader title="Standing orders" subtitle="Record the bank instruction against an IOU. Status updates are recorded here. The bank still executes the debit." />
      <section className="portal-section">
        <header className="portal-section__head">
          <h2 className="portal-section__title">New instruction</h2>
        </header>
        <form onSubmit={submit} className="portal-section__body--pad grid gap-3 md:grid-cols-2">
        <select className="field-input" required value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}>
          <option value="">Select IOU</option>
          {(invoices || []).map((inv: any) => (
            <option key={inv.id} value={inv.id}>{inv.iouRegistryId || inv.id} · KES {Number(inv.faceValue).toLocaleString()}</option>
          ))}
        </select>
        <input className="field-input" required placeholder="Bank name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
        <input className="field-input" placeholder="Masked account (****1234)" value={form.accountMasked} onChange={(e) => setForm({ ...form, accountMasked: e.target.value })} />
        <input className="field-input" placeholder="Bank reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        <input className="field-input" required type="number" min="1" placeholder="Amount (KES)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <input className="field-input" required type="date" value={form.firstExecutionDate} onChange={(e) => setForm({ ...form, firstExecutionDate: e.target.value })} />
        <select className="field-input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
          <option value="once">Once</option>
          <option value="monthly">Monthly</option>
          <option value="per_installment">Per instalment</option>
        </select>
        <button className="btn-primary" type="submit">Record instruction</button>
        </form>
      </section>
      <section className="portal-section">
        <header className="portal-section__head">
          <h2 className="portal-section__title">Recorded instructions</h2>
          <p className="portal-section__desc">{(orders.data || []).length} on file</p>
        </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[#5A6B7D]">
            <tr><th className="p-3">Bank</th><th>Amount</th><th>Date</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {(orders.data || []).map((row) => (
              <tr key={row.id} className="border-t border-[#E4EDE6]">
                <td className="p-3">{row.bankName}<div className="text-xs text-[#5A6B7D]">{row.accountMasked || row.reference}</div></td>
                <td>KES {Number(row.amount).toLocaleString()}</td>
                <td>{row.firstExecutionDate}</td>
                <td>{row.status}</td>
                <td className="p-3">
                  <select className="field-input" value={row.status} onChange={(e) => updateStatus(row.id, e.target.value)}>
                    {['requested', 'confirmed', 'executed', 'failed', 'cancelled', 'amended'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </section>
    </div>
  );
}
