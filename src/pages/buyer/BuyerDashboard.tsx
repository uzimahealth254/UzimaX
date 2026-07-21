import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import { useNotifications } from '@/contexts/NotificationContext';
import PageHeader from '@/components/layout/PageHeader';
import StatCard from '@/components/shared/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import ProfileCompletionCard from '@/components/shared/ProfileCompletionCard';
import HowItWorks from '@/components/shared/HowItWorks';
import { FileText, ClipboardCheck, Calendar, AlertTriangle, ArrowRight, Bell } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function BuyerDashboard() {
  const { user } = useAuth();
  const { invoices, consents, payments, buyerVerifications } = useData();
  const { notifications } = useNotifications();
  const navigate = useNavigate();

  const myInvoices = invoices.filter(inv => inv.buyerId === user?.organisationId);
  const pendingVerify = (buyerVerifications || []).filter(
    (v: any) => (v.buyerOrgId === user?.organisationId || v.buyerId === user?.organisationId) && v.status === 'pending',
  );
  const pendingConsents = consents.filter(c => c.buyerId === user?.organisationId && c.status === 'pending');
  const myPayments = payments.filter(p => p.buyerId === user?.organisationId);
  const overduePayments = myPayments.filter(p => p.status === 'overdue');
  const dueThisWeek = myPayments.filter((p) => {
    if (p.status === 'paid') return false;
    const due = new Date(p.dueDate).getTime();
    const now = Date.now();
    const week = 7 * 86400000;
    return due >= now && due <= now + week;
  });
  const userNotifs = notifications.filter(n => n.userId === user?.id && !n.read);

  const actions = [
    { label: `${pendingVerify.length} invoice${pendingVerify.length === 1 ? '' : 's'} awaiting verification`, count: pendingVerify.length, path: '/buyer/verification' },
    { label: `${pendingConsents.length} consent${pendingConsents.length === 1 ? '' : 's'} to sign`, count: pendingConsents.length, path: '/buyer/consent' },
    { label: `${dueThisWeek.length} payment${dueThisWeek.length === 1 ? '' : 's'} due this week`, count: dueThisWeek.length, path: '/buyer/payments' },
  ].filter((a) => a.count > 0);

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0]}`}
        subtitle={`${user?.organisationName} · Buyer operations`}
        actions={
          <div className="flex items-center gap-2">
            <HowItWorks role="buyer" />
            <button
              type="button"
              onClick={() => navigate('/buyer/post-iou')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#D3F36B] text-[#0E1F1A] px-3 py-2 text-xs font-bold hover:bg-[#C5E85A] transition-colors min-h-[36px]"
            >
              Post IOU
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
                Nothing to verify or sign right now. When a supplier lists an invoice against you, it appears in Verification.
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
        <StatCard label="Registered invoices" value={myInvoices.length} icon={FileText} accent="forest" />
        <StatCard label="Pending consents" value={pendingConsents.length} icon={ClipboardCheck} accent="gold" />
        <StatCard label="Due this week" value={dueThisWeek.length} icon={Calendar} accent="lime" />
        <StatCard label="Overdue" value={overduePayments.length} icon={AlertTriangle} accent="red" />
      </div>

      <ProfileCompletionCard />

      <div className="portal-split portal-split--aside">
        <section className="portal-section">
          <header className="portal-section__head">
            <div>
              <h2 className="portal-section__title">Pending consents</h2>
              <p className="portal-section__desc">OTP assignment approvals</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/buyer/consent')}
              className="text-[11px] font-bold text-[#0E1F1A] hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight size={11} />
            </button>
          </header>
          <div className="divide-y divide-[#0E1F1A]/8">
            {pendingConsents.length === 0 ? (
              <div className="px-3 py-5 text-center">
                <p className="text-xs font-semibold text-[#0E1F1A]">No pending consents</p>
                <p className="text-[11px] text-[#5A6B7D] mt-0.5">New requests appear here.</p>
              </div>
            ) : (
              pendingConsents.slice(0, 6).map(consent => (
                <button
                  key={consent.id}
                  type="button"
                  onClick={() => navigate('/buyer/consent')}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[#f7faf6] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#0E1F1A] truncate">{consent.supplierName}</p>
                    <p className="text-[11px] text-[#5A6B7D] font-mono truncate">{consent.iouRegistryId}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs font-mono font-bold text-[#0E1F1A]">{formatCurrency(consent.amount)}</p>
                    <div className="mt-0.5 flex justify-end"><StatusBadge status={consent.status} /></div>
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
