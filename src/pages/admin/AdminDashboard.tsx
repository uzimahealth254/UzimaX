import { useData } from '@/hooks/usePlatformData';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/layout/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { FileText, Users, AlertTriangle, TrendingUp, ArrowRight, Activity, HeartPulse } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { invoices, activityLogs, organisations } = useData();
  const navigate = useNavigate();

  const healthQ = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => (await api.get('/system/health')).data,
    refetchInterval: 60_000,
  });

  const totalInvoices = invoices.length;
  const totalOrgs = organisations.length;
  const now = Date.now();
  const overdueInvoices = invoices.filter((i) => {
    if (i.status === 'settled') return false;
    if (!i.dueDate) return false;
    return new Date(i.dueDate).getTime() < now;
  });
  const totalVolume = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  const statusBreakdown = [
    { label: 'Awaiting opt-in', count: invoices.filter((i) => i.status === 'awaiting_opt_in').length },
    { label: 'Listed / verified', count: invoices.filter((i) => ['listed', 'verified'].includes(i.status)).length },
    { label: 'Offer path', count: invoices.filter((i) => ['offer_received', 'offer_accepted'].includes(i.status)).length },
    { label: 'Assigned', count: invoices.filter((i) => i.status === 'assigned').length },
    { label: 'Packaged', count: invoices.filter((i) => i.status === 'packaged').length },
    { label: 'Disbursed', count: invoices.filter((i) => i.status === 'disbursed').length },
    { label: 'Settled', count: invoices.filter((i) => i.status === 'settled').length },
  ];

  const health = healthQ.data;
  const healthOk = health?.status === 'ok' || health?.db === 'up';

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0] || 'Admin'}`}
        subtitle="IOU Exchange · Admin operations"
      />

      <div className="portal-callout mb-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 text-xs">
          <HeartPulse size={14} className={healthOk ? 'text-emerald-700' : 'text-amber-700'} />
          <span className="font-semibold text-[#0E1F1A]">System</span>
          <span className="text-[#5A6B7D]">
            {healthQ.isLoading ? 'Checking…' : healthOk ? 'API & database healthy' : 'Degraded — check Profile → System health'}
          </span>
          {health?.lastAfyaXWebhookAt && (
            <span className="text-[10px] text-[#5A6B7D]">· Last AfyaX webhook {formatDate(health.lastAfyaXWebhookAt)}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" className="text-[11px] font-bold underline" onClick={() => navigate('/admin/users')}>Invite users</button>
          <button type="button" className="text-[11px] font-bold underline" onClick={() => navigate('/admin/programs')}>Programmes</button>
          <button type="button" className="text-[11px] font-bold underline" onClick={() => navigate('/admin/profile')}>Health detail</button>
        </div>
      </div>

      <div className="portal-metrics">
        <StatCard label="Total invoices" value={totalInvoices} icon={FileText} accent="forest" />
        <StatCard label="Organisations" value={totalOrgs} icon={Users} accent="lime" />
        <StatCard
          label="Overdue invoices"
          value={overdueInvoices.length}
          icon={AlertTriangle}
          accent="red"
          change={overdueInvoices.length > 0 ? 'Past due date' : undefined}
        />
        <StatCard label="Platform volume" value={formatCurrency(totalVolume)} icon={TrendingUp} accent="gold" />
      </div>

      <div className="portal-split portal-split--aside">
        <section className="portal-section">
          <header className="portal-section__head">
            <div>
              <h2 className="portal-section__title">Invoice pipeline</h2>
              <p className="portal-section__desc">Status breakdown across platform</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/invoices')}
              className="text-[11px] font-bold text-[#0E1F1A] hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight size={11} />
            </button>
          </header>
          <div className="portal-section__body--pad space-y-2">
            {statusBreakdown.map((item) => (
              <div key={item.label} className="flex items-center gap-2.5">
                <span className="text-[11px] text-[#5A6B7D] w-28 shrink-0">{item.label}</span>
                <div className="flex-1 h-1.5 bg-[#0E1F1A]/8 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0E1F1A]/50 rounded-full"
                    style={{ width: `${totalInvoices ? (item.count / totalInvoices) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-[#0E1F1A] w-6 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="portal-section">
          <header className="portal-section__head">
            <div>
              <h2 className="portal-section__title">Recent activity</h2>
              <p className="portal-section__desc">Latest platform events</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/workflow')}
              className="text-[11px] font-bold text-[#0E1F1A] hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight size={11} />
            </button>
          </header>
          <div className="divide-y divide-[#0E1F1A]/8 max-h-72 overflow-y-auto">
            {activityLogs.slice(0, 8).length === 0 ? (
              <div className="portal-empty px-3 py-5">
                <p className="text-xs font-medium text-[#5A6B7D]">No recent activity</p>
              </div>
            ) : (
              activityLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="px-3 py-2.5">
                  <p className="text-xs">
                    <span className="font-semibold text-[#0E1F1A]">{log.userName}</span>{' '}
                    <span className="text-[#5A6B7D]">{log.action}</span>
                  </p>
                  <p className="text-[11px] text-[#5A6B7D] mt-0.5 leading-snug line-clamp-2">{log.details}</p>
                  <p className="text-[10px] text-[#5A6B7D]/80 mt-1 font-medium inline-flex items-center gap-1">
                    <Activity size={10} /> {formatDate(log.timestamp)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
