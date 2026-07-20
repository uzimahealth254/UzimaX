import { useData } from '@/hooks/usePlatformData';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/layout/PageHeader';
import StatCard from '@/components/shared/StatCard';
import ProfileCompletionCard from '@/components/shared/ProfileCompletionCard';
import { Database, Send, Layers, DollarSign, ArrowRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function SPVDashboard() {
  const { user } = useAuth();
  const { invoices, offers, packages, consents } = useData();
  const { notifications } = useNotifications();
  const navigate = useNavigate();

  const verifiedInvoices = invoices.filter(inv => inv.status === 'verified');
  const activeOffers = offers.filter(o => o.status === 'pending');
  const totalAUM = packages.reduce((sum, p) => sum + p.totalFaceValue, 0);
  const pendingConsents = consents.filter(c => c.status === 'pending');
  const userNotifs = notifications.filter(n => n.userId === user?.id && !n.read);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0]}`}
        subtitle="Uzima Capital SPV — Operations Dashboard"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Available IOUs" value={verifiedInvoices.length} icon={Database} accent="blue" />
        <StatCard label="Active Offers" value={activeOffers.length} icon={Send} accent="green" />
        <StatCard label="Packages" value={packages.length} icon={Layers} accent="teal" />
        <StatCard label="Total AUM" value={formatCurrency(totalAUM)} icon={DollarSign} accent="blue" />
      </div>

      <ProfileCompletionCard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline summary */}
        <div className="surface-card">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-sm">Pipeline Overview</h3>
            <button onClick={() => navigate('/spv/registry')} className="text-xs text-primary hover:underline flex items-center gap-1">
              Go to Registry <ArrowRight size={12} />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Verified (ready for offer)</span>
              <span className="font-mono font-medium">{verifiedInvoices.length}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Offers pending response</span>
              <span className="font-mono font-medium">{activeOffers.length}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Awaiting buyer consent</span>
              <span className="font-mono font-medium">{pendingConsents.length}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Assigned (packagable)</span>
              <span className="font-mono font-medium">{invoices.filter(i => i.status === 'assigned').length}</span>
            </div>
          </div>
        </div>

        {/* Recent notifications */}
        <div className="border rounded-lg">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm">Notifications</h3>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
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
