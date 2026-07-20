import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import { useNotifications } from '@/contexts/NotificationContext';
import PageHeader from '@/components/layout/PageHeader';
import StatCard from '@/components/shared/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import ProfileCompletionCard from '@/components/shared/ProfileCompletionCard';
import { FileText, ClipboardCheck, Calendar, AlertTriangle, ArrowRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function BuyerDashboard() {
  const { user } = useAuth();
  const { invoices, consents, payments } = useData();
  const { notifications } = useNotifications();
  const navigate = useNavigate();

  const myInvoices = invoices.filter(inv => inv.buyerId === user?.organisationId);
  const pendingConsents = consents.filter(c => c.buyerId === user?.organisationId && c.status === 'pending');
  const myPayments = payments.filter(p => p.buyerId === user?.organisationId);
  const overduePayments = myPayments.filter(p => p.status === 'overdue');
  const upcomingPayments = myPayments.filter(p => p.status === 'upcoming' || p.status === 'due');
  const userNotifs = notifications.filter(n => n.userId === user?.id && !n.read);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0]}`}
        subtitle={`${user?.organisationName} — Buyer Dashboard`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Registered Invoices" value={myInvoices.length} icon={FileText} accent="blue" />
        <StatCard label="Pending Consents" value={pendingConsents.length} icon={ClipboardCheck} accent="green" change={pendingConsents.length > 0 ? 'Action required' : undefined} />
        <StatCard label="Upcoming Payments" value={upcomingPayments.length} icon={Calendar} accent="green" />
        <StatCard label="Overdue" value={overduePayments.length} icon={AlertTriangle} accent="red" />
      </div>

      <button
        type="button"
        onClick={() => navigate('/buyer/post-iou')}
        className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20"
      >
        Post approved invoice / IOU <ArrowRight size={16} />
      </button>

      <ProfileCompletionCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending consents */}
        <div className="lg:col-span-2 surface-card">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-sm">Pending Consent Requests</h3>
            <button onClick={() => navigate('/buyer/consent')} className="text-xs text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y">
            {pendingConsents.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No pending consent requests</p>
            ) : (
              pendingConsents.slice(0, 5).map(consent => (
                <div key={consent.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{consent.supplierName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{consent.iouRegistryId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono">{formatCurrency(consent.amount)}</p>
                    <StatusBadge status={consent.status} />
                  </div>
                </div>
              ))
            )}
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
              userNotifs.map(n => (
                <div key={n.id} className="px-4 py-3">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
