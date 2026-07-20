import { useData } from '@/hooks/usePlatformData';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/layout/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { FileText, Users, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { invoices, offers, consents, activityLogs, organisations, payments } = useData();
  const navigate = useNavigate();

  const totalInvoices = invoices.length;
  const totalOrgs = organisations.length;
  const overduePayments = payments.filter(p => p.status === 'overdue');
  const totalVolume = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  const statusBreakdown = [
    { label: 'Listed', count: invoices.filter(i => i.status === 'listed').length },
    { label: 'Verified', count: invoices.filter(i => i.status === 'verified').length },
    { label: 'Offer Received', count: invoices.filter(i => i.status === 'offer_received').length },
    { label: 'Assigned', count: invoices.filter(i => i.status === 'assigned').length },
    { label: 'Packaged', count: invoices.filter(i => i.status === 'packaged').length },
    { label: 'Disbursed', count: invoices.filter(i => i.status === 'disbursed').length },
    { label: 'Settled', count: invoices.filter(i => i.status === 'settled').length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Welcome, ${user?.name.split(' ')[0]}`}
        subtitle="Uzima Platform — Admin Dashboard"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Invoices" value={totalInvoices} icon={FileText} accent="blue" />
        <StatCard label="Organisations" value={totalOrgs} icon={Users} accent="green" />
        <StatCard label="Overdue Payments" value={overduePayments.length} icon={AlertTriangle} accent="red" />
        <StatCard label="Platform Volume" value={formatCurrency(totalVolume)} icon={TrendingUp} accent="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline */}
        <div className="lg:col-span-2 border rounded-lg">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-sm">Invoice Pipeline</h3>
            <button onClick={() => navigate('/admin/invoices')} className="text-xs text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="p-4 space-y-2">
            {statusBreakdown.map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-32">{item.label}</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded-full"
                    style={{ width: `${(item.count / totalInvoices) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-mono w-8 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="border rounded-lg">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-sm">Recent Activity</h3>
            <button onClick={() => navigate('/admin/workflow')} className="text-xs text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y max-h-72 overflow-y-auto">
            {activityLogs.slice(0, 8).map(log => (
              <div key={log.id} className="px-4 py-3">
                <p className="text-sm"><span className="font-medium">{log.userName}</span> {log.action}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{formatDate(log.timestamp)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
