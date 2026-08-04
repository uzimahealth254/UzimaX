import { useMemo, useState } from 'react';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toAssignmentTrack } from '@/lib/assignmentTracks';
import { Invoice } from '@/types';
import { Search, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '@/components/shared/EmptyState';
import { QuerySurface } from '@/components/shared/QueryState';

type RegistryTab = 'assigned' | 'open_to_offer' | 'pending_consent' | 'declined';

const TABS: { id: RegistryTab; label: string }[] = [
  { id: 'assigned', label: 'Assigned' },
  { id: 'open_to_offer', label: 'Open to offer' },
  { id: 'pending_consent', label: 'Pending consent' },
  { id: 'declined', label: 'Declined / closed' },
];

const ASSIGNED = new Set(['assigned', 'packaged', 'disbursed', 'matured', 'settled']);
const OPEN_OFFER = new Set([
  'listed', 'verified', 'awaiting_opt_in', 'awaiting_buyer_verification', 'offer_received',
]);
const PENDING_CONSENT = new Set(['offer_accepted']);
const DECLINED = new Set(['opt_in_declined', 'buyer_rejected', 'cancelled', 'defaulted']);

function tabForInvoice(inv: Invoice, hasPendingConsent: boolean): RegistryTab {
  if (ASSIGNED.has(inv.status)) return 'assigned';
  if (hasPendingConsent || PENDING_CONSENT.has(inv.status)) return 'pending_consent';
  if (DECLINED.has(inv.status)) return 'declined';
  if (OPEN_OFFER.has(inv.status)) return 'open_to_offer';
  return 'declined';
}

export default function IOURegistryPage() {
  const { invoices, assignments, consents, loading, error, refetchAll } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<RegistryTab>('assigned');

  const pendingConsentIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of consents || []) {
      if ((c as { status?: string }).status === 'pending') {
        set.add((c as { invoiceId: string }).invoiceId);
      }
    }
    return set;
  }, [consents]);

  const assignmentByInvoice = useMemo(() => {
    const map = new Map<string, { assignmentType?: string; createdAt?: string }>();
    for (const a of assignments || []) {
      map.set((a as { invoiceId: string }).invoiceId, a as { assignmentType?: string; createdAt?: string });
    }
    return map;
  }, [assignments]);

  const registryInvoices = invoices.filter(inv => inv.status !== 'draft');

  const filtered = registryInvoices.filter(inv => {
    const matchSearch = inv.iouRegistryId.toLowerCase().includes(search.toLowerCase()) ||
      inv.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      inv.buyerName.toLowerCase().includes(search.toLowerCase());
    const matchTab = tabForInvoice(inv, pendingConsentIds.has(inv.id)) === tab;
    return matchSearch && matchTab;
  });

  const counts = useMemo(() => {
    const c: Record<RegistryTab, number> = {
      assigned: 0, open_to_offer: 0, pending_consent: 0, declined: 0,
    };
    for (const inv of registryInvoices) {
      c[tabForInvoice(inv, pendingConsentIds.has(inv.id))] += 1;
    }
    return c;
  }, [registryInvoices, pendingConsentIds]);

  const columns = [
    { key: 'iou', header: 'IOU Registry ID', primary: true, render: (inv: Invoice) => <span className="font-mono text-xs font-semibold">{inv.iouRegistryId}</span> },
    { key: 'supplier', header: 'Supplier', render: (inv: Invoice) => <span className="font-medium">{inv.supplierName}</span> },
    { key: 'buyer', header: 'Buyer', render: (inv: Invoice) => inv.buyerName },
    {
      key: 'platform',
      header: 'Platform',
      hideOnMobile: true,
      render: (inv: Invoice) => (
        <span className="text-[11px] text-[#5A6B7D]">
          {inv.sourcePlatformName || (inv.origin === 'api_upload' ? 'API' : '—')}
        </span>
      ),
    },
    { key: 'amount', header: 'Face value', render: (inv: Invoice) => <span className="font-mono font-semibold">{formatCurrency(inv.amount)}</span> },
    { key: 'due', header: 'Maturity', hideOnMobile: true, render: (inv: Invoice) => formatDate(inv.dueDate) },
    {
      key: 'track',
      header: 'Track',
      hideOnMobile: true,
      render: (inv: Invoice) => {
        const asgn = assignmentByInvoice.get(inv.id);
        if (!asgn?.assignmentType) return <span className="text-[11px] text-[#5A6B7D]">—</span>;
        const track = toAssignmentTrack(asgn.assignmentType);
        return (
          <span className="text-[11px] font-semibold text-[#0E1F1A]">
            {track === 'negotiated_offer' ? 'Negotiated' : 'Standard'}
          </span>
        );
      },
    },
    { key: 'status', header: 'Status', render: (inv: Invoice) => <StatusBadge status={inv.status} /> },
  ];

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="IOU registry"
        subtitle={`${registryInvoices.length} trade receivables on platform`}
        actions={
          <button
            type="button"
            onClick={() => navigate('/spv/offers')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0E1F1A] text-white px-3 py-2 text-xs font-bold hover:bg-[#1A3A2E] transition-colors min-h-[36px]"
          >
            Make offer
            <ArrowRight size={13} strokeWidth={2.25} />
          </button>
        }
      />

      <section className="portal-section">
        <header className="portal-section__head">
          <div className="min-w-0">
            <h2 className="portal-section__title">Registry</h2>
            <p className="portal-section__desc">
              Standard confirmation auto-assigns; negotiated offers need buyer OTP consent.
            </p>
          </div>
          <div className="relative flex-1 sm:flex-none sm:w-56">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5A6B7D]" />
            <input
              type="text"
              placeholder="Search IOU, supplier, buyer…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="field-input pl-8 !min-h-[34px] !py-1.5 text-xs"
            />
          </div>
        </header>

        <div className="flex flex-wrap gap-1 px-3 pb-2 border-b border-[#0E1F1A]/8">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-2.5 py-1.5 text-[11px] font-bold rounded-md min-h-[32px] transition-colors ${
                tab === t.id
                  ? 'bg-[#0E1F1A] text-white'
                  : 'text-[#5A6B7D] hover:bg-[#0E1F1A]/6 hover:text-[#0E1F1A]'
              }`}
            >
              {t.label}
              <span className="ml-1 opacity-70">{counts[t.id]}</span>
            </button>
          ))}
        </div>

        <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
          <QuerySurface
            loading={loading}
            error={error}
            onRetry={refetchAll}
            isEmpty={!loading && filtered.length === 0}
            empty={<EmptyState compact title="No IOUs in this view" description="Switch tabs or wait for new origination." />}
          >
            <DataTable
              columns={columns}
              data={filtered}
              emptyMessage="No IOUs match your search criteria"
              onRowClick={(inv: Invoice) => navigate(`/spv/registry/${inv.id}`)}
            />
          </QuerySurface>
        </div>
      </section>
    </div>
  );
}
