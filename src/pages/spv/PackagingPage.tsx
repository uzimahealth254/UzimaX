import { useState } from 'react';
import { useData } from '@/hooks/usePlatformData';
import { useActor } from '@/hooks/useActor';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils';
import { Invoice, SecuritisationPackage } from '@/types';
import { toast } from 'sonner';

type TabId = 'packages' | 'create';

const tabBtn = (active: boolean) =>
  `px-3 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 min-h-[34px] ${
    active ? 'border-[#0E1F1A] text-[#0E1F1A]' : 'border-transparent text-[#5A6B7D] hover:text-[#0E1F1A]'
  }`;

export default function PackagingPage() {
  const { invoices, packages, createPackage, updatePackageStatus } = useData();
  const actor = useActor();
  const [tab, setTab] = useState<TabId>('packages');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [packageName, setPackageName] = useState('');

  const assignedInvoices = invoices.filter(inv => inv.status === 'assigned');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCreatePackage = async () => {
    if (selectedIds.length < 1) {
      toast.error('Select at least 1 invoice to create a package');
      return;
    }
    if (!packageName.trim()) {
      toast.error('Enter a package name');
      return;
    }
    try {
      await createPackage({
        name: packageName,
        invoiceIds: selectedIds,
      }, actor);
      toast.success('Package created');
      setSelectedIds([]);
      setPackageName('');
      setTab('packages');
    } catch (e: any) {
      toast.error(e.message || 'Package creation failed');
    }
  };

  const selectedTotal = invoices.filter(i => selectedIds.includes(i.id)).reduce((s, i) => s + i.amount, 0);

  const assignedColumns = [
    {
      key: 'select',
      header: '',
      render: (inv: Invoice) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(inv.id)}
          onChange={() => toggleSelect(inv.id)}
          className="rounded border-[#0E1F1A]/20"
        />
      ),
    },
    { key: 'iou', header: 'IOU ID', primary: true, render: (inv: Invoice) => <span className="font-mono text-xs font-semibold">{inv.iouRegistryId}</span> },
    { key: 'supplier', header: 'Supplier', render: (inv: Invoice) => <span className="font-medium">{inv.supplierName}</span> },
    { key: 'buyer', header: 'Buyer', render: (inv: Invoice) => <span className="font-medium">{inv.buyerName || '—'}</span> },
    { key: 'amount', header: 'Face value', render: (inv: Invoice) => <span className="font-mono font-semibold">{formatCurrency(inv.amount)}</span> },
  ];

  const packageColumns = [
    { key: 'name', header: 'Package name', primary: true, render: (p: SecuritisationPackage) => <span className="font-semibold">{p.name}</span> },
    { key: 'count', header: 'Face', render: (p: SecuritisationPackage) => <span className="font-mono text-xs font-semibold">{formatCurrency(p.totalFaceValue)}</span> },
    { key: 'face', header: 'Purchase', render: (p: any) => <span className="font-mono">{formatCurrency(Number(p.totalPurchasePrice || 0))}</span> },
    {
      key: 'wdisc',
      header: 'Wtd disc',
      hideOnMobile: true,
      render: (p: any) => (
        <span className="font-mono text-xs">
          {p.weightedAvgDiscount != null ? `${Number(p.weightedAvgDiscount).toFixed(2)}%` : '—'}
        </span>
      ),
    },
    {
      key: 'wtenor',
      header: 'Wtd tenor',
      hideOnMobile: true,
      render: (p: any) => (
        <span className="font-mono text-xs">{p.weightedAvgTenor != null ? `${p.weightedAvgTenor}d` : '—'}</span>
      ),
    },
    {
      key: 'discount',
      header: 'Internal ref (not exchange)',
      hideOnMobile: true,
      render: (p: any) => <span className="font-mono text-xs">{p.nseReference || '—'}</span>,
    },
    { key: 'status', header: 'Readiness', render: (p: SecuritisationPackage) => <StatusBadge status={p.status} /> },
    {
      key: 'action',
      header: '',
      render: (p: SecuritisationPackage) => (
        p.status === 'draft' ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); updatePackageStatus(p.id, 'structured', actor); toast.success('Package structured'); }}
            className="min-h-[32px] px-2.5 py-1 text-[11px] font-bold rounded-md bg-[#0E1F1A] text-white hover:bg-[#1A3A2E]"
          >
            Structure
          </button>
        ) : p.status === 'structured' ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updatePackageStatus(p.id, 'ready_for_submission', actor);
              toast.success('Package marked ready for submission');
            }}
            className="min-h-[32px] px-2.5 py-1 text-[11px] font-bold rounded-md bg-[#D3F36B] text-[#0E1F1A] hover:bg-[#C5E85A]"
          >
            Mark ready for submission
          </button>
        ) : null
      ),
    },
  ];

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Packaging & Listing"
        subtitle="Structure securitisation packages and track listing readiness — exchange onboarding is external and not live on NSE"
      />

      <div className="portal-callout">
        Exchange onboarding and NSE listing are handled outside IOU Exchange. Internal reference codes here are for workflow tracking only, not exchange confirmations.
      </div>

      <section className="portal-section">
        <header className="portal-section__head flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h2 className="portal-section__title">{tab === 'packages' ? 'My packages' : 'Create package'}</h2>
            <p className="portal-section__desc">
              {tab === 'packages'
                ? `${packages.length} package${packages.length === 1 ? '' : 's'}`
                : `${assignedInvoices.length} assigned invoice${assignedInvoices.length === 1 ? '' : 's'} available`}
            </p>
          </div>
          <div className="flex gap-0.5 overflow-x-auto scroll-x-pad -mx-1 px-1">
            <button type="button" onClick={() => setTab('packages')} className={tabBtn(tab === 'packages')}>
              My packages ({packages.length})
            </button>
            <button type="button" onClick={() => setTab('create')} className={tabBtn(tab === 'create')}>
              Create ({assignedInvoices.length})
            </button>
          </div>
        </header>

        {tab === 'packages' ? (
          <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
            <DataTable columns={packageColumns} data={packages} emptyMessage="No packages created yet" />
          </div>
        ) : (
          <div className="portal-section__body--pad space-y-3">
            <div className="max-w-sm">
              <label className="block text-[10px] font-semibold text-[#5A6B7D] mb-1">Package name</label>
              <input
                value={packageName}
                onChange={e => setPackageName(e.target.value)}
                placeholder="IOUX USP Series X"
                className="field-input !min-h-[34px] !py-1.5 text-xs"
              />
            </div>
            <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none -mx-3 sm:-mx-0">
              <DataTable columns={assignedColumns} data={assignedInvoices} emptyMessage="No assigned invoices available for packaging" />
            </div>
            {selectedIds.length > 0 && (
              <div className="portal-callout flex flex-col sm:flex-row sm:items-center gap-2">
                <p className="text-xs flex-1 min-w-0">
                  <span className="font-bold text-[#0E1F1A]">{selectedIds.length}</span> invoices selected · Total:{' '}
                  <span className="font-mono font-bold">{formatCurrency(selectedTotal)}</span>
                </p>
                <button
                  type="button"
                  onClick={handleCreatePackage}
                  className="inline-flex items-center justify-center min-h-[34px] px-3 py-1.5 rounded-lg bg-[#0E1F1A] text-white text-xs font-bold hover:bg-[#1A3A2E]"
                >
                  Create package
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
