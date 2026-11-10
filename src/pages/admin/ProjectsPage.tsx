import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import { toast } from 'sonner';

export default function ProjectsPage() {
  const { organisations } = useData();
  const qc = useQueryClient();
  const invites = useQuery({
    queryKey: ['credential-invites'],
    queryFn: async () => (await api.get('/credential-invites')).data.data as any[],
  });
  const [form, setForm] = useState({ orgId: '', projectName: '', contactName: '', contactEmail: '', environment: 'production' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/credential-invites', form);
      toast.success('Single-use link emailed. The key is not in the email.');
      qc.invalidateQueries({ queryKey: ['credential-invites'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not send invite');
    }
  };

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader title="Project credentials" subtitle="Send a 48-hour link. The technical contact sees the API key once, on that page. The email does not contain the key." />
      <section className="portal-section">
        <header className="portal-section__head"><h2 className="portal-section__title">New project</h2></header>
      <form onSubmit={submit} className="portal-section__body--pad grid gap-3 md:grid-cols-2">
        <select className="field-input" required value={form.orgId} onChange={(e) => setForm({ ...form, orgId: e.target.value })}>
          <option value="">Organisation</option>
          {(organisations || []).map((org: any) => <option key={org.id} value={org.id}>{org.name}</option>)}
        </select>
        <input className="field-input" required placeholder="Project name" value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} />
        <input className="field-input" required placeholder="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
        <input className="field-input" required type="email" placeholder="Contact email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
        <select className="field-input" value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}>
          <option value="production">Production</option>
          <option value="sandbox">Sandbox</option>
        </select>
        <button className="btn-primary" type="submit">Email single-use link</button>
      </form>
      </section>
      <section className="portal-section">
        <header className="portal-section__head"><h2 className="portal-section__title">Invitations</h2></header>
      <ul className="divide-y divide-[#0E1F1A]/8">
        {(invites.data || []).map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
            <span>{row.projectName} · {row.contactEmail} · {row.claimedAt ? 'claimed' : row.revokedAt ? 'revoked' : 'pending'}</span>
            {!row.revokedAt && <button className="btn-secondary" type="button" onClick={() => api.post(`/credential-invites/${row.id}/revoke`).then(() => qc.invalidateQueries({ queryKey: ['credential-invites'] }))}>Revoke</button>}
          </li>
        ))}
      </ul>
      </section>
    </div>
  );
}
