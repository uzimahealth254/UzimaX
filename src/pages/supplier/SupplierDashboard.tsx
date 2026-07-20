import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import { useNotifications } from '@/contexts/NotificationContext';
import PageHeader from '@/components/layout/PageHeader';
import StatCard from '@/components/shared/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import ProfileCompletionCard from '@/components/shared/ProfileCompletionCard';
import { FileText, DollarSign, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function SupplierDashboard() {
  const { user } = useAuth();
  const { invoices, offers, optIns } = useData();
  const { notifications } = useNotifications();
  const navigate = useNavigate();

  const myInvoices = invoices.filter(inv => inv.supplierId === user?.organisationId);
  const activeInvoices = myInvoices.filter(inv => !['settled', 'defaulted', 'draft', 'opt_in_declined'].includes(inv.status));
  const totalListed = myInvoices.filter(inv => inv.status !== 'draft').length;
  const totalValue = myInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const pendingOffers = offers.filter(o => o.supplierId === user?.organisationId && o.status === 'pending');
  const pendingOptIns = optIns.filter(o => o.supplierId === user?.organisationId && o.status === 'pending');
  const recentInvoices = myInvoices.slice(0, 5);
  const userNotifs = notifications.filter(n => n.userId === user?.id && !n.read);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0]}`}
        subtitle={`${user?.organisationName} — Supplier Dashboard`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Invoices" value={totalListed} icon={FileText} accent="blue" />
        <StatCard label="Total Value" value={formatCurrency(totalValue)} icon={DollarSign} accent="green" />
        <StatCard label="Pending opt-ins" value={pendingOptIns.length} icon={Clock} accent="teal" change={pendingOptIns.length > 0 ? 'Action required' : undefined} />
        <StatCard label="Pending Offers" value={pendingOffers.length} icon={TrendingUp} accent="red" change={pendingOffers.length > 0 ? 'Action required' : undefined} />
      </div>

      {pendingOptIns.length > 0 && (
        <button
          type="button"
          onClick={() => navigate('/supplier/opt-in')}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-medium"
        >
          Review {pendingOptIns.length} opt-in request{pendingOptIns.length > 1 ? 's' : ''} <ArrowRight size={16} />
        </button>
      )}

      <ProfileCompletionCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices */}
        <div className="lg:col-span-2 surface-card">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-sm">Recent Invoices</h3>
            <button onClick={() => navigate('/supplier/invoices')} className="text-xs text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y">
            {recentInvoices.map(inv => (
              <div
                key={inv.id}
                onClick={() => navigate(`/supplier/invoices/${inv.id}`)}
                className="flex items-center justify-between px-4 py-3 hover:bg-secondary/30 cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">{inv.buyerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono">{formatCurrency(inv.amount)}</p>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="border rounded-lg">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm">Notifications</h3>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {userNotifs.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No new notifications</p>
            ) : (
              userNotifs.map(notif => (
                <div key={notif.id} className="px-4 py-3">
                  <p className="text-sm font-medium">{notif.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatDate(notif.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
