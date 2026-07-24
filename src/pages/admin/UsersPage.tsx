import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useData } from '@/hooks/usePlatformData';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';

type Tab = 'organisations' | 'users' | 'invite' | 'create-org';

const defaultOrgForm = {
  name: '',
  orgType: 'buyer' as 'buyer' | 'supplier' | 'spv',
  registrationNo: '',
  kraPin: '',
  address: '',
  contactEmail: '',
  contactPhone: '',
  ppbRegistration: '',
  ppbLicence: '',
  cmaReference: '',
  kycStatus: 'pending' as 'pending' | 'verified' | 'rejected',
};

export default function UsersPage() {
  const { organisations, refetchAll } = useData();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('organisations');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('supplier');
  const [inviteOrgId, setInviteOrgId] = useState('');
  const [sending, setSending] = useState(false);
  const [orgForm, setOrgForm] = useState(defaultOrgForm);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);

  const usersQ = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get('/admin/users')).data.data,
  });

  const orgsForRole = useMemo(
    () => organisations.filter((o: any) => (o.orgType || o.type) === inviteRole),
    [organisations, inviteRole],
  );

  useEffect(() => {
    if (inviteRole === 'admin') {
      setInviteOrgId('');
      return;
    }
    if (!orgsForRole.some((o: any) => o.id === inviteOrgId)) {
      setInviteOrgId(orgsForRole[0]?.id || '');
    }
  }, [inviteRole, orgsForRole, inviteOrgId]);

  const tabMeta = {
    organisations: { title: 'Organisations', desc: `${organisations.length} registered` },
    users: { title: 'Users', desc: `${(usersQ.data || []).length} accounts` },
    invite: { title: 'Invite user', desc: 'Create user and email temporary password' },
    'create-org': { title: 'Create organisation', desc: 'Register buyer, supplier, or SPV with KYC fields' },
  }[tab];

  const orgColumns = [
    { key: 'name', header: 'Organisation', primary: true, render: (o: any) => <span className="font-medium">{o.name}</span> },
    { key: 'type', header: 'Type', render: (o: any) => <span className="capitalize text-xs">{o.orgType || o.type}</span> },
    { key: 'party', header: 'Party ID', hideOnMobile: true, render: (o: any) => <span className="font-mono text-xs">{o.uzimaPartyId}</span> },
    {
      key: 'kyc',
      header: 'KYC',
      render: (o: any) => {
        const kyc = (o.metadata as any)?.kycStatus || 'pending';
        return <StatusBadge status={kyc} />;
      },
    },
    { key: 'status', header: 'Status', render: (o: any) => <StatusBadge status={o.status} /> },
    {
      key: 'actions',
      header: '',
      render: (o: any) => (
        <div className="flex flex-wrap gap-1 justify-end">
          <button
            type="button"
            disabled={editingOrgId === o.id}
            className="text-[10px] font-bold px-2 py-1 rounded bg-[#F4FBE3] text-[#0E1F1A] hover:bg-[#D3F36B]"
            onClick={async (e) => {
              e.stopPropagation();
              const cur = (o.metadata as any)?.kycStatus || 'pending';
              const next = cur === 'pending' ? 'verified' : cur === 'verified' ? 'rejected' : 'pending';
              setEditingOrgId(o.id);
              try {
                await api.patch(`/organisations/${o.id}`, { kycStatus: next });
                toast.success(`KYC → ${next}`);
                refetchAll();
                qc.invalidateQueries({ queryKey: ['organisations'] });
              } catch (err: any) {
                toast.error(err.response?.data?.message || 'KYC update failed');
              } finally {
                setEditingOrgId(null);
              }
            }}
          >
            Cycle KYC
          </button>
          <button
            type="button"
            disabled={editingOrgId === o.id || o.orgType === 'platform'}
            className="text-[10px] font-bold px-2 py-1 rounded border border-[#0E1F1A]/15 text-[#0E1F1A] hover:bg-[#0E1F1A]/5"
            onClick={async (e) => {
              e.stopPropagation();
              const next = o.status === 'active' ? 'suspended' : 'active';
              setEditingOrgId(o.id);
              try {
                await api.patch(`/organisations/${o.id}`, { status: next });
                toast.success(`Org ${next}`);
                refetchAll();
                qc.invalidateQueries({ queryKey: ['organisations'] });
              } catch (err: any) {
                toast.error(err.response?.data?.message || 'Status update failed');
              } finally {
                setEditingOrgId(null);
              }
            }}
          >
            {o.status === 'active' ? 'Suspend' : 'Activate'}
          </button>
        </div>
      ),
    },
  ];

  const userColumns = [
    { key: 'name', header: 'Name', primary: true, render: (u: any) => <span className="font-medium">{u.fullName || u.name}</span> },
    { key: 'email', header: 'Email', render: (u: any) => <span className="text-[#5A6B7D] text-xs">{u.email}</span> },
    { key: 'role', header: 'Role', render: (u: any) => <span className="capitalize text-xs">{u.role}</span> },
    { key: 'status', header: 'Status', render: (u: any) => <StatusBadge status={u.status || 'active'} /> },
  ];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteRole !== 'admin' && !inviteOrgId) {
      toast.error('Select an organisation for this invite');
      return;
    }
    setSending(true);
    try {
      const { data } = await api.post('/admin/users/invite', {
        email: inviteEmail,
        fullName: inviteName || undefined,
        role: inviteRole,
        orgId: inviteRole === 'admin' ? undefined : inviteOrgId,
      });
      if (data?.emailSent) {
        toast.success('Invite sent — temporary password emailed to the user');
      } else {
        toast.warning(
          data?.emailWarning
            || `User created but email was not sent (mode=${data?.emailMode || 'unknown'}). Share credentials out-of-band.`,
        );
      }
      setInviteEmail('');
      setInviteName('');
      usersQ.refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invite failed');
    } finally {
      setSending(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgForm.name.trim()) {
      toast.error('Organisation name is required');
      return;
    }
    setCreatingOrg(true);
    try {
      const payload: Record<string, string> = {
        name: orgForm.name.trim(),
        orgType: orgForm.orgType,
        kycStatus: orgForm.kycStatus,
      };
      if (orgForm.registrationNo.trim()) payload.registrationNo = orgForm.registrationNo.trim();
      if (orgForm.kraPin.trim()) payload.kraPin = orgForm.kraPin.trim();
      if (orgForm.address.trim()) payload.address = orgForm.address.trim();
      if (orgForm.contactEmail.trim()) payload.contactEmail = orgForm.contactEmail.trim();
      if (orgForm.contactPhone.trim()) payload.contactPhone = orgForm.contactPhone.trim();
      if (orgForm.orgType !== 'spv') {
        if (orgForm.ppbRegistration.trim()) payload.ppbRegistration = orgForm.ppbRegistration.trim();
        if (orgForm.ppbLicence.trim()) payload.ppbLicence = orgForm.ppbLicence.trim();
      }
      if (orgForm.orgType === 'spv' && orgForm.cmaReference.trim()) {
        payload.cmaReference = orgForm.cmaReference.trim();
      }

      const { data } = await api.post('/organisations', payload);
      toast.success(`Organisation created — ${data.uzimaPartyId || data.name}`);
      setOrgForm(defaultOrgForm);
      refetchAll();
      qc.invalidateQueries({ queryKey: ['organisations'] });
      setTab('organisations');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Create organisation failed');
    } finally {
      setCreatingOrg(false);
    }
  };

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader title="Users & organisations" subtitle="Platform directory" />

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">{tabMeta.title}</h2>
            <p className="portal-section__desc">{tabMeta.desc}</p>
          </div>
          <div className="flex gap-0 border-b border-[#0E1F1A]/10 w-full sm:w-auto overflow-x-auto">
            {(['organisations', 'users', 'invite', 'create-org'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs font-bold capitalize border-b-2 whitespace-nowrap shrink-0 min-h-[34px] transition-colors ${
                  tab === t
                    ? 'border-[#0E1F1A] text-[#0E1F1A]'
                    : 'border-transparent text-[#5A6B7D] hover:text-[#0E1F1A]'
                }`}
              >
                {t === 'create-org' ? 'Create org' : t}
              </button>
            ))}
          </div>
        </header>

        {tab === 'organisations' && (
          <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
            <DataTable columns={orgColumns} data={organisations} emptyMessage="No organisations" />
          </div>
        )}

        {tab === 'users' && (
          <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
            <DataTable columns={userColumns} data={usersQ.data || []} emptyMessage="No users" />
          </div>
        )}

        {tab === 'invite' && (
          <div className="portal-section__body--pad">
            <form onSubmit={handleInvite} className="max-w-md space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-[#5A6B7D]">Full name</label>
                <input
                  className="field-input mt-1 !min-h-[34px] text-xs"
                  placeholder="Jane Wanjiku"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#5A6B7D]">Email</label>
                <input
                  className="field-input mt-1 !min-h-[34px] text-xs"
                  placeholder="user@company.co.ke"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#5A6B7D]">Role</label>
                <select
                  className="field-input mt-1 !min-h-[34px] text-xs"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="supplier">Supplier</option>
                  <option value="buyer">Buyer</option>
                  <option value="spv">SPV</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {inviteRole !== 'admin' && (
                <div>
                  <label className="text-[10px] font-semibold text-[#5A6B7D]">Organisation</label>
                  <select
                    className="field-input mt-1 !min-h-[34px] text-xs"
                    value={inviteOrgId}
                    onChange={(e) => setInviteOrgId(e.target.value)}
                    required
                  >
                    {orgsForRole.length === 0 && <option value="">No {inviteRole} organisations</option>}
                    {orgsForRole.map((o: any) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <p className="text-[11px] text-[#5A6B7D]">
                A temporary password is emailed to the user. It is never shown in this portal.
              </p>
              <button
                type="submit"
                disabled={sending || (inviteRole !== 'admin' && !inviteOrgId)}
                className="min-h-[36px] px-3 py-2 rounded-lg bg-[#0E1F1A] text-white text-xs font-bold hover:bg-[#1A3A2E] disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send invite'}
              </button>
            </form>
          </div>
        )}

        {tab === 'create-org' && (
          <div className="portal-section__body--pad">
            <form onSubmit={handleCreateOrg} className="max-w-2xl space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold text-[#5A6B7D]">Organisation name</label>
                  <input
                    className="field-input mt-1 !min-h-[34px] text-xs w-full"
                    placeholder="Acme Healthcare Ltd"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#5A6B7D]">Organisation type</label>
                  <select
                    className="field-input mt-1 !min-h-[34px] text-xs w-full"
                    value={orgForm.orgType}
                    onChange={(e) => setOrgForm({ ...orgForm, orgType: e.target.value as typeof orgForm.orgType })}
                  >
                    <option value="buyer">Buyer</option>
                    <option value="supplier">Supplier</option>
                    <option value="spv">SPV</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#5A6B7D]">KYC status</label>
                  <select
                    className="field-input mt-1 !min-h-[34px] text-xs w-full"
                    value={orgForm.kycStatus}
                    onChange={(e) => setOrgForm({ ...orgForm, kycStatus: e.target.value as typeof orgForm.kycStatus })}
                  >
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#5A6B7D]">Registration no.</label>
                  <input
                    className="field-input mt-1 !min-h-[34px] text-xs w-full"
                    value={orgForm.registrationNo}
                    onChange={(e) => setOrgForm({ ...orgForm, registrationNo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#5A6B7D]">KRA PIN</label>
                  <input
                    className="field-input mt-1 !min-h-[34px] text-xs w-full"
                    value={orgForm.kraPin}
                    onChange={(e) => setOrgForm({ ...orgForm, kraPin: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold text-[#5A6B7D]">Address</label>
                  <input
                    className="field-input mt-1 !min-h-[34px] text-xs w-full"
                    value={orgForm.address}
                    onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#5A6B7D]">Contact email</label>
                  <input
                    type="email"
                    className="field-input mt-1 !min-h-[34px] text-xs w-full"
                    value={orgForm.contactEmail}
                    onChange={(e) => setOrgForm({ ...orgForm, contactEmail: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#5A6B7D]">Contact phone</label>
                  <input
                    className="field-input mt-1 !min-h-[34px] text-xs w-full"
                    value={orgForm.contactPhone}
                    onChange={(e) => setOrgForm({ ...orgForm, contactPhone: e.target.value })}
                  />
                </div>
                {orgForm.orgType !== 'spv' && (
                  <>
                    <div>
                      <label className="text-[10px] font-semibold text-[#5A6B7D]">PPB registration</label>
                      <input
                        className="field-input mt-1 !min-h-[34px] text-xs w-full"
                        value={orgForm.ppbRegistration}
                        onChange={(e) => setOrgForm({ ...orgForm, ppbRegistration: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#5A6B7D]">PPB licence</label>
                      <input
                        className="field-input mt-1 !min-h-[34px] text-xs w-full"
                        value={orgForm.ppbLicence}
                        onChange={(e) => setOrgForm({ ...orgForm, ppbLicence: e.target.value })}
                      />
                    </div>
                  </>
                )}
                {orgForm.orgType === 'spv' && (
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-semibold text-[#5A6B7D]">CMA reference</label>
                    <input
                      className="field-input mt-1 !min-h-[34px] text-xs w-full"
                      value={orgForm.cmaReference}
                      onChange={(e) => setOrgForm({ ...orgForm, cmaReference: e.target.value })}
                    />
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={creatingOrg}
                className="min-h-[36px] px-3 py-2 rounded-lg bg-[#0E1F1A] text-white text-xs font-bold hover:bg-[#1A3A2E] disabled:opacity-50"
              >
                {creatingOrg ? 'Creating…' : 'Create organisation'}
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}

