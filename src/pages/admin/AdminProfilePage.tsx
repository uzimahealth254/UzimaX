import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import { api } from '@/lib/apiClient';
import ProfileEditor from '@/components/shared/ProfileEditor';
import ProfileHub from '@/components/shared/ProfileHub';
import DocumentsPage from '@/pages/shared/DocumentsPage';
import StatusBadge from '@/components/shared/StatusBadge';
import { Building2, Mail, Hash, Shield, Calendar, Database, Bell, Webhook, Clock } from 'lucide-react';

type SystemHealth = {
  status: string;
  service: string;
  version: string;
  db: 'up' | 'down';
  lastAfyaXWebhookAt: string | null;
  unreadNotifications: number;
  time: string;
};

function SystemHealthPanel() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => (await api.get('/system/health')).data as SystemHealth,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return <p className="text-xs text-[#5A6B7D]">Loading system health…</p>;
  }

  if (isError || !data) {
    return <p className="text-xs text-red-600">Unable to load system health.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <StatusBadge status={data.status === 'ok' ? 'active' : 'pending'} />
        <span className="text-xs text-[#5A6B7D]">
          {data.service} · v{data.version}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2.5">
          <Database size={13} className="text-[#5A6B7D] shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-[#5A6B7D]">Database</p>
            <p className={`text-xs font-bold capitalize ${data.db === 'up' ? 'text-[#0E1F1A]' : 'text-red-600'}`}>
              {data.db}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2.5">
          <Bell size={13} className="text-[#5A6B7D] shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-[#5A6B7D]">Unread notifications</p>
            <p className="text-xs font-bold text-[#0E1F1A]">{data.unreadNotifications}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2.5 sm:col-span-2">
          <Webhook size={13} className="text-[#5A6B7D] shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[#5A6B7D]">Last AfyaX webhook</p>
            <p className="text-[11px] font-mono truncate">
              {data.lastAfyaXWebhookAt
                ? new Date(data.lastAfyaXWebhookAt).toLocaleString()
                : 'No webhooks recorded'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2.5 sm:col-span-2">
          <Clock size={13} className="text-[#5A6B7D] shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-[#5A6B7D]">Server time</p>
            <p className="text-[11px] font-mono">{new Date(data.time).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminProfilePage() {
  const { user } = useAuth();
  const { organisations } = useData();
  const org = organisations.find((o: any) => o.id === user?.organisationId);

  const account = (
    <div className="space-y-4">
      <div className="portal-grid-2 !gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6B7D] mb-2">Profile</p>
          <ProfileEditor />
        </div>
        <div className="space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6B7D]">Account</p>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold bg-[#D3F36B] text-[#0E1F1A]">
              {user?.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0E1F1A] truncate">{user?.name}</p>
              <p className="text-xs text-[#5A6B7D] truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#5A6B7D]">
            <Shield size={12} />
            <span>Platform administrator</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#5A6B7D]">
            <Calendar size={12} />
            <span>Organisation account</span>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6B7D] mb-2">Organisation</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-2 rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2.5">
            <Building2 size={13} className="text-[#5A6B7D] shrink-0" />
            <span className="font-semibold text-[#0E1F1A] text-xs truncate">{org?.name || 'IOU Exchange Platform'}</span>
          </div>
          {org?.registrationNumber && (
            <div className="flex items-center gap-2 rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2.5">
              <Hash size={13} className="text-[#5A6B7D] shrink-0" />
              <span className="font-mono text-[11px] truncate">{org.registrationNumber}</span>
            </div>
          )}
          {org?.contactEmail && (
            <div className="flex items-center gap-2 rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2.5">
              <Mail size={13} className="text-[#5A6B7D] shrink-0" />
              <span className="text-xs truncate">{org.contactEmail}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const tabs = useMemo(() => [
    { id: 'account', label: 'Account', content: null },
    { id: 'documents', label: 'Documents', content: <DocumentsPage embedded /> },
    { id: 'health', label: 'System health', content: <SystemHealthPanel /> },
  ], []);

  return <ProfileHub tabs={tabs} account={account} />;
}
