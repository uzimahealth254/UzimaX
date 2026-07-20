import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { toast } from 'sonner';

export default function SignatoriesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [roleTitle, setRoleTitle] = useState('Director');

  const { data: signatories = [], isLoading } = useQuery({
    queryKey: ['signatories'],
    queryFn: async () => (await api.get('/signatories')).data.data as Array<{
      id: string; userId: string; roleTitle: string | null; isActive: boolean | null; createdAt: string;
    }>,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-lite'],
    queryFn: async () => {
      try {
        return (await api.get('/admin/users')).data.data as Array<{ id: string; fullName: string; email: string; orgId: string }>;
      } catch {
        return [{ id: user!.id, fullName: user!.name, email: user!.email, orgId: user!.organisationId! }];
      }
    },
    enabled: !!user,
  });

  const orgUsers = users.filter((u) => u.orgId === user?.organisationId || user?.role === 'admin');

  const addSelf = async () => {
    if (!user) return;
    try {
      await api.post('/signatories', { userId: user.id, roleTitle });
      toast.success('Signatory added');
      qc.invalidateQueries({ queryKey: ['signatories'] });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to add signatory');
    }
  };

  const toggle = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/signatories/${id}`, { isActive: !isActive });
      qc.invalidateQueries({ queryKey: ['signatories'] });
    } catch {
      toast.error('Update failed');
    }
  };

  const rows = signatories.map((s) => {
    const u = orgUsers.find((x) => x.id === s.userId);
    return { ...s, displayName: u?.fullName || u?.email || s.userId.slice(0, 8) };
  });

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <PageHeader
        title="Signatory management"
        subtitle="Board-approved signatories for OTP-verified consents"
      />

      <div className="border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end">
        <div className="flex-1 min-w-0 sm:min-w-[180px]">
          <label className="text-xs text-muted-foreground">Role title</label>
          <input className="block w-full border rounded-lg px-3 py-2.5 text-sm" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
        </div>
        <button type="button" onClick={addSelf} className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl bg-primary text-primary-foreground text-sm font-medium">
          Register me as signatory
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DataTable
          data={rows}
          emptyMessage="No signatories registered"
          getRowKey={(s) => s.id}
          columns={[
            { key: 'user', header: 'User', primary: true, render: (s) => s.displayName },
            { key: 'title', header: 'Title', render: (s) => s.roleTitle || '—' },
            {
              key: 'active',
              header: 'Active',
              render: (s) => (
                <button type="button" className="text-xs underline min-h-[40px]" onClick={(e) => { e.stopPropagation(); void toggle(s.id, !!s.isActive); }}>
                  {s.isActive ? 'Active' : 'Inactive'}
                </button>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
