import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { toast } from 'sonner';

export default function SignatoriesPage({ embedded = false }: { embedded?: boolean }) {
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
    <div className={embedded ? 'space-y-3' : 'portal-page animate-fade-in'}>
      {!embedded && (
        <PageHeader
          title="Signatory management"
          subtitle="Board-approved signatories for OTP consents"
        />
      )}

      <section className={embedded ? 'space-y-3' : 'portal-section'}>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="field-input !min-h-[34px] !py-1.5 text-xs w-full sm:w-40"
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            placeholder="Role title"
          />
          <button
            type="button"
            onClick={addSelf}
            className="px-3 py-1.5 min-h-[34px] rounded-lg bg-[#0E1F1A] text-white text-xs font-bold"
          >
            Register me
          </button>
        </div>
        <div className={embedded ? '' : '[&_.surface-card]:border-0 [&_.surface-card]:rounded-none'}>
          {isLoading ? (
            <p className="px-3 py-4 text-xs text-[#5A6B7D]">Loading…</p>
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
                    <button
                      type="button"
                      className="text-xs font-bold underline min-h-[32px] text-[#0E1F1A]"
                      onClick={(e) => { e.stopPropagation(); void toggle(s.id, !!s.isActive); }}
                    >
                      {s.isActive ? 'Active' : 'Inactive'}
                    </button>
                  ),
                },
              ]}
            />
          )}
        </div>
      </section>
    </div>
  );
}
