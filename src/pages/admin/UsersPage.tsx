import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useData } from '@/hooks/usePlatformData';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';

type Tab = 'organisations' | 'users' | 'invite';

export default function UsersPage() {
  const { organisations } = useData();
  const [tab, setTab] = useState<Tab>('organisations');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('supplier');

  const usersQ = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get('/admin/users')).data.data,
  });

  const orgColumns = [
    { key: 'name', header: 'Organisation', render: (o: any) => <span className="font-medium">{o.name}</span> },
    { key: 'type', header: 'Type', render: (o: any) => <span className="capitalize">{o.orgType || o.type}</span> },
    { key: 'party', header: 'Uzima Party ID', render: (o: any) => <span className="font-mono text-xs">{o.uzimaPartyId}</span> },
    { key: 'reg', header: 'Registration #', render: (o: any) => <span className="font-mono text-xs">{o.registrationNo || '—'}</span> },
    { key: 'status', header: 'Status', render: (o: any) => <StatusBadge status={o.status} /> },
  ];

  const userColumns = [
    { key: 'name', header: 'Name', render: (u: any) => <span className="font-medium">{u.fullName || u.name}</span> },
    { key: 'email', header: 'Email', render: (u: any) => <span className="text-muted-foreground">{u.email}</span> },
    { key: 'role', header: 'Role', render: (u: any) => <span className="capitalize">{u.role}</span> },
    { key: 'status', header: 'Status', render: (u: any) => <StatusBadge status={u.status || 'active'} /> },
  ];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/admin/users/invite', {
        email: inviteEmail,
        role: inviteRole,
        orgId: organisations.find((o: any) => (o.orgType || o.type) === inviteRole)?.id,
      });
      toast.success(`User created · temp password: ${data.temporaryPassword}`);
      setInviteEmail('');
      usersQ.refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invite failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Users & Organisations" subtitle="Platform directory" />
      <div className="scroll-x-pad border-b">
        {(['organisations', 'users', 'invite'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm capitalize border-b-2 whitespace-nowrap shrink-0 min-h-[44px] ${tab === t ? 'border-primary text-primary' : 'border-transparent'}`}>{t}</button>
        ))}
      </div>
      {tab === 'organisations' && <DataTable columns={orgColumns} data={organisations} emptyMessage="No organisations" />}
      {tab === 'users' && <DataTable columns={userColumns} data={usersQ.data || []} emptyMessage="No users" />}
      {tab === 'invite' && (
        <form onSubmit={handleInvite} className="max-w-md space-y-3 border rounded-2xl p-5">
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
          <select className="w-full border rounded-lg px-3 py-2 text-sm" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
            <option value="supplier">Supplier</option>
            <option value="buyer">Buyer</option>
            <option value="spv">SPV</option>
          </select>
          <button type="submit" className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl bg-primary text-primary-foreground text-sm">Send invite</button>
        </form>
      )}
    </div>
  );
}
