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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/access-requests', form);
      toast.success('Request sent to the platform administrator');
      setForm({ fullName: '', email: '', phone: '', phoneCountryCode: '+254', capacity: '', isSignatory: false });
      qc.invalidateQueries({ queryKey: ['access-requests'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not submit request');
    }
  };

  return (
    <div>
      <PageHeader title="Team access" subtitle="Propose a colleague. A platform administrator approves, then that person sets their own password from a time-limited link." />
      <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl border border-[#E4EDE6] bg-white p-4 md:grid-cols-2">
        <input className="input" required placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <input className="input" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="input" placeholder="Country code" value={form.phoneCountryCode} onChange={(e) => setForm({ ...form, phoneCountryCode: e.target.value })} />
        <input className="input" placeholder="Capacity" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isSignatory} onChange={(e) => setForm({ ...form, isSignatory: e.target.checked })} /> Signatory</label>
        <button className="btn-primary md:col-span-2" type="submit">Submit for approval</button>
      </form>
      <ul className="mt-4 space-y-2">
        {(requests.data || []).map((row) => (
          <li key={row.id} className="rounded-xl border border-[#E4EDE6] bg-white p-3 text-sm">
            <strong>{row.fullName}</strong> · {row.email} · {row.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
