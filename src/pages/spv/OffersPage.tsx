import { useMemo, useState } from 'react';
import { useData } from '@/hooks/usePlatformData';
import { useActor } from '@/hooks/useActor';
import IOURegistryId from '@/components/shared/IOURegistryId';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils';
import { Invoice, PurchaseOffer } from '@/types';
import { toast } from 'sonner';
import OfferCalculator from '@/components/shared/OfferCalculator';
import EmptyState from '@/components/shared/EmptyState';
import { QuerySurface } from '@/components/shared/QueryState';

type TabId = 'available' | 'pending' | 'accepted' | 'closed';

const tabBtn = (active: boolean) =>
  `px-3 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 min-h-[34px] ${
    active ? 'border-[#0E1F1A] text-[#0E1F1A]' : 'border-transparent text-[#5A6B7D] hover:text-[#0E1F1A]'
  }`;

export default function OffersPage() {
  const { invoices, offers, makeOffer, loading: dataLoading, error, refetchAll } = useData();
  const actor = useActor();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [discountRate, setDiscountRate] = useState('5');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabId>('available');

  const available = invoices.filter(inv => inv.status === 'verified' || inv.status === 'assigned');
  const pendingOffers = offers.filter(o => o.status === 'pending');
  const acceptedOffers = offers.filter(o => o.status === 'accepted');
  const closedOffers = offers.filter(o => ['rejected', 'expired', 'withdrawn'].includes(o.status));

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'available', label: 'Available', count: available.length },
    { id: 'pending', label: 'Pending', count: pendingOffers.length },
    { id: 'accepted', label: 'Accepted', count: acceptedOffers.length },
    { id: 'closed', label: 'Closed', count: closedOffers.length },
  ];

  const discountBps = Math.round(parseFloat(discountRate || '0') * 100);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === available.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(available.map(inv => inv.id)));
    }
  };

  const submitOffer = async (invoiceId: string) => {
    const rate = parseFloat(discountRate);
    await makeOffer({
      invoiceId,
      discountRate: rate,
      discountRateBps: discountBps,
    }, actor);
  };

  const handleMakeOffer = async () => {
    if (!selectedInvoice) return;
    setLoading(true);
    try {
      await submitOffer(selectedInvoice.id);
      toast.success('Offer submitted');
      setSelectedInvoice(null);
      setAgreed(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Offer failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkOffers = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setLoading(true);
    let ok = 0;
    try {
      for (const id of ids) {
        try {
          await submitOffer(id);
          ok += 1;
        } catch (e: any) {
          toast.error(e.response?.data?.message || e.message || `Offer failed for ${id.slice(0, 8)}`);
        }
      }
      if (ok) toast.success(`${ok} offer${ok === 1 ? '' : 's'} submitted`);
      setSelectedIds(new Set());
      setBulkOpen(false);
      setAgreed(false);
    } finally {
      setLoading(false);
    }
  };

  const availableColumns = useMemo(() => [
    {
      key: 'select',
      header: '',
      render: (inv: Invoice) => (
        <input
          type="checkbox"
          checked={selectedIds.has(inv.id)}
          onChange={() => toggleSelect(inv.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${inv.iouRegistryId}`}
          className="rounded border-[#0E1F1A]/20"
        />
      ),
    },
    { key: 'iou', header: 'IOU ID', primary: true, render: (inv: Invoice) => <IOURegistryId id={inv.iouRegistryId} /> },
    { key: 'supplier', header: 'Supplier', render: (inv: Invoice) => <span className="font-medium">{inv.supplierName}</span> },
    { key: 'buyer', header: 'Buyer', render: (inv: Invoice) => <span className="font-medium">{inv.buyerName || '—'}</span> },
    { key: 'amount', header: 'Face / listed', render: (inv: Invoice) => (
      <span className="font-mono font-semibold">
        {formatCurrency(inv.amount)}
        {inv.listedAmount != null && Number(inv.listedAmount) !== Number(inv.amount)
          ? <span className="text-[#5A6B7D] font-normal"> · {formatCurrency(Number(inv.listedAmount))}</span>
          : null}
      </span>
    ) },
    {
      key: 'action',
      header: '',
      render: (inv: Invoice) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); }}
          className="min-h-[32px] px-2.5 py-1 text-[11px] font-bold rounded-md bg-[#0E1F1A] text-white hover:bg-[#1A3A2E]"
        >
          Make offer
        </button>
      ),
    },
  ], [available.length, selectedIds]);

  const offersColumns = [
    { key: 'iou', header: 'IOU ID', primary: true, render: (o: PurchaseOffer) => <IOURegistryId id={o.iouRegistryId} /> },
    { key: 'supplier', header: 'Supplier', render: (o: PurchaseOffer) => o.supplierName },
    { key: 'face', header: 'Face value', render: (o: PurchaseOffer) => <span className="font-mono font-semibold">{formatCurrency(o.faceValue)}</span> },
    { key: 'offer', header: 'Offer price', render: (o: PurchaseOffer) => <span className="font-mono">{formatCurrency(o.offerPrice)}</span> },
    { key: 'rate', header: 'Discount', render: (o: PurchaseOffer) => <span className="font-mono">{o.discountRate}%</span> },
    { key: 'status', header: 'Status', render: (o: PurchaseOffer) => <StatusBadge status={o.status} /> },
  ];

  const tabData: Record<TabId, { columns: any[]; data: any[]; empty: string }> = {
    available: { columns: availableColumns, data: available, empty: 'No verified IOUs available for offers' },
    pending: { columns: offersColumns, data: pendingOffers, empty: 'No pending offers' },
    accepted: { columns: offersColumns, data: acceptedOffers, empty: 'No accepted offers' },
    closed: { columns: offersColumns, data: closedOffers, empty: 'No closed offers' },
  };

  const active = tabData[tab];

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader title="Offers" subtitle="Purchase offer lifecycle — owned receivables live in Assignments" />

      <section className="portal-section">
        <header className="portal-section__head flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h2 className="portal-section__title">{tabs.find(t => t.id === tab)?.label}</h2>
            <p className="portal-section__desc">{active.data.length} record{active.data.length === 1 ? '' : 's'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tab === 'available' && available.length > 0 && (
              <label className="inline-flex items-center gap-1.5 text-xs text-[#5A6B7D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === available.length}
                  onChange={toggleSelectAll}
                  className="rounded border-[#0E1F1A]/20"
                />
                Select all
              </label>
            )}
            {tab === 'available' && selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => setBulkOpen(true)}
                className="min-h-[34px] px-3 py-1.5 rounded-lg bg-[#0E1F1A] text-white text-xs font-bold hover:bg-[#1A3A2E]"
              >
                Make offers ({selectedIds.size})
              </button>
            )}
            <div className="flex gap-0.5 overflow-x-auto scroll-x-pad -mx-1 px-1">
              {tabs.map(t => (
                <button key={t.id} type="button" onClick={() => setTab(t.id)} className={tabBtn(tab === t.id)}>
                  {t.label} ({t.count})
                </button>
              ))}
            </div>
          </div>
        </header>
        <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
          <QuerySurface
            loading={dataLoading}
            error={error}
            onRetry={refetchAll}
            isEmpty={!loading && active.data.length === 0}
            empty={<EmptyState compact title={active.empty} description="Owned receivables live under Assignments." />}
          >
            <DataTable columns={active.columns} data={active.data} emptyMessage={active.empty} />
          </QuerySurface>
        </div>
      </section>

      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => { setSelectedInvoice(null); setAgreed(false); }} />
          <div className="relative bg-white rounded-t-xl sm:rounded-xl border border-[#0E1F1A]/10 p-5 sm:p-6 w-full max-w-md animate-fade-in max-h-[85dvh] overflow-y-auto scroll-touch safe-pad-bottom">
            <div className="sm:hidden w-10 h-1 rounded-full bg-[#0E1F1A]/15 mx-auto mb-4" />
            <h2 className="text-sm font-bold text-[#0E1F1A] mb-1">Make purchase offer</h2>
            <p className="text-[11px] text-[#5A6B7D] font-mono mb-4 break-anywhere">{selectedInvoice.iouRegistryId}</p>

            <OfferCalculator
              faceValue={selectedInvoice.amount}
              supplierName={selectedInvoice.supplierName}
              buyerName={selectedInvoice.buyerName}
              issueDate={selectedInvoice.issueDate}
              dueDate={selectedInvoice.dueDate}
              discountRate={discountRate}
              onDiscountChange={setDiscountRate}
            />

            <label className="flex items-start gap-2 mt-4 text-[11px] text-[#5A6B7D] cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5" />
              I confirm this offer is binding upon supplier acceptance and initiates the assignment workflow.
            </label>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleMakeOffer}
                disabled={loading || !agreed}
                className="flex-1 min-h-[36px] py-2 bg-[#0E1F1A] text-white rounded-lg text-xs font-bold hover:bg-[#1A3A2E] disabled:opacity-50"
              >
                {loading ? 'Submitting…' : 'Submit offer'}
              </button>
              <button
                type="button"
                onClick={() => { setSelectedInvoice(null); setAgreed(false); }}
                className="flex-1 min-h-[36px] py-2 border border-[#0E1F1A]/15 rounded-lg text-xs font-semibold text-[#0E1F1A] hover:bg-[#f7faf6]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => { setBulkOpen(false); setAgreed(false); }} />
          <div className="relative bg-white rounded-t-xl sm:rounded-xl border border-[#0E1F1A]/10 p-5 sm:p-6 w-full max-w-md animate-fade-in max-h-[85dvh] overflow-y-auto scroll-touch safe-pad-bottom">
            <h2 className="text-sm font-bold text-[#0E1F1A] mb-1">Bulk purchase offers</h2>
            <p className="text-[11px] text-[#5A6B7D] mb-4">
              Submit the same discount rate to {selectedIds.size} selected IOU{selectedIds.size === 1 ? '' : 's'}.
            </p>
            <div className="mb-4">
              <label className="text-[10px] font-semibold text-[#5A6B7D]">Discount rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={discountRate}
                onChange={(e) => setDiscountRate(e.target.value)}
                className="field-input mt-1 font-mono !min-h-[36px]"
              />
              <p className="text-[10px] text-[#5A6B7D] mt-1">{discountBps} bps</p>
            </div>
            <label className="flex items-start gap-2 text-[11px] text-[#5A6B7D] cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5" />
              I confirm these offers are binding upon supplier acceptance.
            </label>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleBulkOffers}
                disabled={loading || !agreed || selectedIds.size === 0}
                className="flex-1 min-h-[36px] py-2 bg-[#0E1F1A] text-white rounded-lg text-xs font-bold hover:bg-[#1A3A2E] disabled:opacity-50"
              >
                {loading ? 'Submitting…' : `Submit ${selectedIds.size} offer${selectedIds.size === 1 ? '' : 's'}`}
              </button>
              <button
                type="button"
                onClick={() => { setBulkOpen(false); setAgreed(false); }}
                className="flex-1 min-h-[36px] py-2 border border-[#0E1F1A]/15 rounded-lg text-xs font-semibold text-[#0E1F1A] hover:bg-[#f7faf6]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
