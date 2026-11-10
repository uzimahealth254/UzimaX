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
    <div>
      <PageHeader title="Access requests" subtitle="Organisation proposals stay pending until you approve. Approval emails a link; it does not email a password." />
      <label className="mt-4 flex items-center gap-2 rounded-xl border border-[#E4EDE6] bg-white p-4 text-sm">
        <input type="checkbox" checked={!!security.data?.loginOtp} onChange={(e) => toggleOtp(e.target.checked)} />
        Require an email code after the password on every portal login
      </label>
      <ul className="mt-4 space-y-2">
        {(requests.data || []).map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E4EDE6] bg-white p-3 text-sm">
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
    </div>
  );
}
