import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import { toast } from 'sonner';

export default function AccessQueuePage() {
  const qc = useQueryClient();
  const requests = useQuery({
    queryKey: ['access-requests'],
    queryFn: async () => (await api.get('/access-requests')).data.data as any[],
  });
  const security = useQuery({
    queryKey: ['security-settings'],
    queryFn: async () => (await api.get('/settings/security')).data as { loginOtp: boolean },
  });

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    try {
      await api.post(`/access-requests/${id}/decide`, { decision });
      toast.success(decision === 'approved' ? 'Approved. Invitation email sent.' : 'Rejected');
      qc.invalidateQueries({ queryKey: ['access-requests'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Decision failed');
    }
  };

  const toggleOtp = async (loginOtp: boolean) => {
    try {
      await api.put('/settings/security', { loginOtp });
      qc.invalidateQueries({ queryKey: ['security-settings'] });
      toast.success(loginOtp ? 'Login codes are now required' : 'Login codes turned off');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update security setting');
    }
  };

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader title="Access requests" subtitle="Organisation proposals stay pending until you approve. Approval emails a link. The email does not contain a password." />
      <label className="portal-callout flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!security.data?.loginOtp} onChange={(e) => toggleOtp(e.target.checked)} />
        Require an email code after the password on every portal login
      </label>
      <section className="portal-section">
        <header className="portal-section__head"><h2 className="portal-section__title">Queue</h2></header>
      <ul className="divide-y divide-[#0E1F1A]/8">
        {(requests.data || []).map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
            <span><strong>{row.fullName}</strong> · {row.email} · {row.status}</span>
            {row.status === 'pending' && (
              <span className="flex gap-2">
                <button className="btn-primary" type="button" onClick={() => decide(row.id, 'approved')}>Approve</button>
                <button className="btn-secondary" type="button" onClick={() => decide(row.id, 'rejected')}>Reject</button>
              </span>
            )}
          </li>
        ))}
      </ul>
      </section>
    </div>
  );
}
