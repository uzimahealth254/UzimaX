import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import { toast } from 'sonner';

export default function TeamAccessPage() {
  const qc = useQueryClient();
  const requests = useQuery({
    queryKey: ['access-requests'],
    queryFn: async () => (await api.get('/access-requests')).data.data as any[],
  });
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', phoneCountryCode: '+254', capacity: '', isSignatory: false });
  const [file, setFile] = useState<File | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/access-requests', form);
      if (file) {
        const body = new FormData();
        body.append('file', file);
        await api.post(`/access-requests/${data.id}/documents`, body);
      }
      toast.success('Request sent to the platform administrator');
      setForm({ fullName: '', email: '', phone: '', phoneCountryCode: '+254', capacity: '', isSignatory: false });
      qc.invalidateQueries({ queryKey: ['access-requests'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not submit request');
    }
  };

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader title="Team access" subtitle="Propose a colleague. A platform administrator approves, then that person sets their own password from a time-limited link." />
      <section className="portal-section">
        <header className="portal-section__head"><h2 className="portal-section__title">Propose a person</h2></header>
      <form onSubmit={submit} className="portal-section__body--pad grid gap-3 md:grid-cols-2">
        <input className="field-input" required placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <input className="field-input" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="field-input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="field-input" placeholder="Country code" value={form.phoneCountryCode} onChange={(e) => setForm({ ...form, phoneCountryCode: e.target.value })} />
        <input className="field-input" placeholder="Capacity" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isSignatory} onChange={(e) => setForm({ ...form, isSignatory: e.target.checked })} /> Signatory</label>
        <input className="field-input" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button className="btn-primary md:col-span-2" type="submit">Submit for approval</button>
      </form>
      </section>
      <section className="portal-section">
        <header className="portal-section__head"><h2 className="portal-section__title">Requests</h2></header>
      <ul className="divide-y divide-[#0E1F1A]/8">
        {(requests.data || []).map((row) => (
          <li key={row.id} className="px-3 py-2.5 text-sm">
            <strong>{row.fullName}</strong>
            <span className="text-[#5A6B7D]"> · {row.email} · {row.status}</span>
            {(row.documents || []).length > 0 && <span className="text-xs text-[#5A6B7D]"> · {row.documents.length} file(s)</span>}
          </li>
        ))}
      </ul>
      </section>
    </div>
  );
}
