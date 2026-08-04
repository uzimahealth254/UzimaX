import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { toast } from 'sonner';

type Capacity = 'maker' | 'checker' | 'both';

export default function SignatoriesPage({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [roleTitle, setRoleTitle] = useState('Director');
  const [capacity, setCapacity] = useState<Capacity>('checker');
  const [nominateUserId, setNominateUserId] = useState('');

  const { data: signatories = [], isLoading } = useQuery({
    queryKey: ['signatories'],
    queryFn: async () => (await api.get('/signatories')).data.data as Array<{
      id: string; userId: string; roleTitle: string | null; capacity?: string; isActive: boolean | null; createdAt: string;
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

  const nominate = async () => {
    const userId = nominateUserId || user?.id;
    if (!userId) return;
    try {
      await api.post('/signatories', { userId, roleTitle, capacity });
      toast.success('Signatory nominated');
      setNominateUserId('');
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

  const setCap = async (id: string, next: Capacity) => {
    try {
      await api.patch(`/signatories/${id}`, { capacity: next });
      qc.invalidateQueries({ queryKey: ['signatories'] });
    } catch {
      toast.error('Could not update capacity');
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
          title="Maker / checker signatories"
          subtitle="Nominate makers (initiate) and checkers (OTP confirm). Critical confirms require an active checker."
        />
      )}

      <section className={embedded ? 'space-y-3' : 'portal-section'}>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="text-[10px] font-semibold text-[#5A6B7D]">Org user</label>
            <select
              className="field-input !min-h-[34px] !py-1.5 text-xs w-full sm:w-52 mt-0.5"
              value={nominateUserId}
              onChange={(e) => setNominateUserId(e.target.value)}
            >
              <option value="">Myself ({user?.email})</option>
              {orgUsers.filter((u) => u.id !== user?.id).map((u) => (
                <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#5A6B7D]">Title</label>
            <input
              className="field-input !min-h-[34px] !py-1.5 text-xs w-full sm:w-36 mt-0.5"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="Role title"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#5A6B7D]">Capacity</label>
            <select
              className="field-input !min-h-[34px] !py-1.5 text-xs w-full sm:w-32 mt-0.5"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value as Capacity)}
            >
              <option value="maker">Maker</option>
              <option value="checker">Checker</option>
              <option value="both">Both</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => void nominate()}
            className="px-3 py-1.5 min-h-[34px] rounded-lg bg-[#0E1F1A] text-white text-xs font-bold"
          >
            Nominate
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
                  key: 'capacity',
                  header: 'Capacity',
                  render: (s) => (
                    <select
                      className="text-xs border border-[#0E1F1A]/15 rounded-md px-1.5 py-1"
                      value={(s.capacity as Capacity) || 'checker'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => void setCap(s.id, e.target.value as Capacity)}
                    >
                      <option value="maker">Maker</option>
                      <option value="checker">Checker</option>
                      <option value="both">Both</option>
                    </select>
                  ),
                },
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
