import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import { useNotifications } from '@/contexts/NotificationContext';
import PageHeader from '@/components/layout/PageHeader';
import StatCard from '@/components/shared/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import ProfileCompletionCard from '@/components/shared/ProfileCompletionCard';
import HowItWorks from '@/components/shared/HowItWorks';
import { FileText, DollarSign, TrendingUp, Clock, ArrowRight, Bell } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function SupplierDashboard() {
  const { user } = useAuth();
  const { invoices, offers, optIns } = useData();
  const { notifications } = useNotifications();
  const navigate = useNavigate();

  const myInvoices = invoices.filter(inv => inv.supplierId === user?.organisationId);
  const totalListed = myInvoices.filter(inv => inv.status !== 'draft').length;
  const totalValue = myInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const pendingOffers = offers.filter(o => o.supplierId === user?.organisationId && o.status === 'pending');
  const pendingOptIns = optIns.filter(o => o.supplierId === user?.organisationId && o.status === 'pending');
  const inFinancing = myInvoices.filter(inv => ['assigned', 'disbursed', 'packaged'].includes(inv.status));
  const recentInvoices = myInvoices.slice(0, 6);
  const userNotifs = notifications.filter(n => n.userId === user?.id && !n.read);

  const actions = [
    { label: `${pendingOptIns.length} invoice${pendingOptIns.length === 1 ? '' : 's'} to opt in`, count: pendingOptIns.length, path: '/supplier/opt-in' },
    { label: `${pendingOffers.length} SPV offer${pendingOffers.length === 1 ? '' : 's'} to review`, count: pendingOffers.length, path: '/supplier/invoices' },
    { label: `${inFinancing.length} invoice${inFinancing.length === 1 ? '' : 's'} in financing`, count: inFinancing.length, path: '/supplier/invoices' },
  ].filter((a) => a.count > 0);

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0]}`}
        subtitle={`${user?.organisationName} · Supplier operations`}
        actions={
          <div className="flex items-center gap-2">
            <HowItWorks role="supplier" />
            <button
              type="button"
              onClick={() => navigate('/supplier/post-invoice')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#D3F36B] text-[#0E1F1A] px-3 py-2 text-xs font-bold hover:bg-[#C5E85A] transition-colors min-h-[36px]"
            >
              Post invoice
              <ArrowRight size={13} strokeWidth={2.25} />
            </button>
          </div>
        }
      />

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Action queue</h2>
            <p className="portal-section__desc">What needs your decision next</p>
          </div>
        </header>
        <div className="divide-y divide-[#0E1F1A]/8">
          {actions.length === 0 ? (
            <div className="px-3 py-4">
              <p className="text-xs font-semibold text-[#0E1F1A]">You're clear</p>
              <p className="text-[11px] text-[#5A6B7D] mt-0.5">
                When a buyer posts an invoice naming you, it appears in Opt-in Inbox to sell.
              </p>
            </div>
          ) : (
            actions.map((a) => (
              <button
                key={a.path + a.label}
                type="button"
                onClick={() => navigate(a.path)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[#f7faf6]"
              >
                <p className="text-xs font-semibold text-[#0E1F1A]">{a.label}</p>
                <ArrowRight size={13} className="text-[#5A6B7D]" />
              </button>
            ))
          )}
        </div>
      </section>

      <div className="portal-metrics">
        <StatCard label="Total invoices" value={totalListed} icon={FileText} accent="forest" />
        <StatCard label="Total value" value={formatCurrency(totalValue)} icon={DollarSign} accent="lime" />
        <StatCard label="Pending opt-ins" value={pendingOptIns.length} icon={Clock} accent="gold" />
        <StatCard label="Pending offers" value={pendingOffers.length} icon={TrendingUp} accent="red" />
      </div>

      <ProfileCompletionCard />

      <div className="portal-split portal-split--aside">
        <section className="portal-section">
          <header className="portal-section__head">
            <div>
              <h2 className="portal-section__title">Recent invoices</h2>
              <p className="portal-section__desc">Latest listings and status</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/supplier/invoices')}
              className="text-[11px] font-bold text-[#0E1F1A] hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight size={11} />
            </button>
          </header>
          <div className="divide-y divide-[#0E1F1A]/8">
            {recentInvoices.length === 0 ? (
              <div className="px-3 py-5 text-center">
                <p className="text-xs font-semibold text-[#0E1F1A]">No invoices yet</p>
                <p className="text-[11px] text-[#5A6B7D] mt-0.5">Post an invoice or wait for buyer opt-ins.</p>
              </div>
            ) : (
              recentInvoices.map(inv => (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => navigate(`/supplier/invoices/${inv.id}`)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[#f7faf6] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#0E1F1A] truncate">{inv.invoiceNumber}</p>
                    <p className="text-[11px] text-[#5A6B7D] truncate">{inv.buyerName}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs font-mono font-bold text-[#0E1F1A]">{formatCurrency(inv.amount)}</p>
                    <div className="mt-0.5 flex justify-end"><StatusBadge status={inv.status} /></div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="portal-section">
          <header className="portal-section__head">
            <div className="flex items-center gap-1.5">
              <Bell size={13} className="text-[#0E1F1A]" />
              <h2 className="portal-section__title">Notifications</h2>
            </div>
          </header>
          <div className="divide-y divide-[#0E1F1A]/8 max-h-64 overflow-y-auto">
            {userNotifs.length === 0 ? (
              <div className="px-3 py-5">
                <p className="text-xs font-medium text-[#5A6B7D]">You&apos;re all caught up</p>
              </div>
            ) : (
              userNotifs.map(n => (
                <div key={n.id} className="px-3 py-2.5">
                  <p className="text-xs font-semibold text-[#0E1F1A]">{n.title}</p>
                  <p className="text-[11px] text-[#5A6B7D] mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-[#5A6B7D]/80 mt-1 font-medium">{formatDate(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
