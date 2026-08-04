import { useData } from '@/hooks/usePlatformData';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/layout/PageHeader';
import StatCard from '@/components/shared/StatCard';
import ProfileCompletionCard from '@/components/shared/ProfileCompletionCard';
import { Database, Send, Layers, DollarSign, ArrowRight, Bell } from 'lucide-react';
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
  const assignedCount = invoices.filter(i => i.status === 'assigned').length;
  const openToOffer = invoices.filter(i => ['verified', 'listed'].includes(i.status)).length;
  const userNotifs = notifications.filter(n => n.userId === user?.id && !n.read);

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0]}`}
        subtitle={`${user?.organisationName || 'IOU Exchange Capital SPV'} · Operations`}
        actions={
          <button
            type="button"
            onClick={() => navigate('/spv/offers')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#D3F36B] text-[#0E1F1A] px-3 py-2 text-xs font-bold hover:bg-[#C5E85A] transition-colors min-h-[36px]"
          >
            Make offer
            <ArrowRight size={13} strokeWidth={2.25} />
          </button>
        }
      />

      <div className="portal-metrics">
        <StatCard label="Available IOUs" value={verifiedInvoices.length} icon={Database} accent="forest" />
        <StatCard
          label="Active offers"
          value={activeOffers.length}
          icon={Send}
          accent="gold"
          change={activeOffers.length > 0 ? 'Awaiting response' : undefined}
        />
        <StatCard label="Packages" value={packages.length} icon={Layers} accent="lime" />
        <StatCard label="Total AUM" value={formatCurrency(totalAUM)} icon={DollarSign} accent="forest" />
      </div>

      <div className="portal-metrics mt-2">
        <button type="button" className="text-left" onClick={() => navigate('/spv/assignments')}>
          <StatCard label="Assigned" value={assignedCount} icon={Database} accent="forest" />
        </button>
        <button type="button" className="text-left" onClick={() => navigate('/spv/assignments')}>
          <StatCard label="Pending consents" value={pendingConsents.length} icon={Send} accent="gold" />
        </button>
        <button type="button" className="text-left" onClick={() => navigate('/spv/registry')}>
          <StatCard label="Open to offer" value={openToOffer} icon={Layers} accent="lime" />
        </button>
        <button type="button" className="text-left" onClick={() => navigate('/spv/offers')}>
          <StatCard label="Offers pending" value={activeOffers.length} icon={DollarSign} accent="forest" />
        </button>
      </div>

      <ProfileCompletionCard />

      <div className="portal-split portal-split--aside">
        <section className="portal-section">
          <header className="portal-section__head">
            <div>
              <h2 className="portal-section__title">Pipeline overview</h2>
              <p className="portal-section__desc">Receivable lifecycle summary</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/spv/registry')}
              className="text-[11px] font-bold text-[#0E1F1A] hover:underline inline-flex items-center gap-1"
            >
              Go to registry <ArrowRight size={11} />
            </button>
          </header>
          <div className="divide-y divide-[#0E1F1A]/8">
            {[
              { label: 'Verified (ready for offer)', value: verifiedInvoices.length, to: '/spv/offers' },
              { label: 'Offers pending response', value: activeOffers.length, to: '/spv/offers' },
              { label: 'Awaiting buyer consent', value: pendingConsents.length, to: '/spv/assignments' },
              { label: 'Assigned (packagable)', value: assignedCount, to: '/spv/assignments' },
            ].map(row => (
              <button
                key={row.label}
                type="button"
                onClick={() => navigate(row.to)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-[#f7faf6]"
              >
                <span className="text-xs text-[#5A6B7D]">{row.label}</span>
                <span className="text-xs font-mono font-bold text-[#0E1F1A]">{row.value}</span>
              </button>
            ))}
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
