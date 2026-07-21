import { useState } from 'react';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice } from '@/types';
import { Search, Filter, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '@/components/shared/EmptyState';
import { QuerySurface } from '@/components/shared/QueryState';

export default function IOURegistryPage() {
  const { invoices, loading, error, refetchAll } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const registryInvoices = invoices.filter(inv => inv.status !== 'draft');
  const filtered = registryInvoices.filter(inv => {
    const matchSearch = inv.iouRegistryId.toLowerCase().includes(search.toLowerCase()) ||
      inv.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      inv.buyerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    { key: 'iou', header: 'IOU Registry ID', primary: true, render: (inv: Invoice) => <span className="font-mono text-xs font-semibold">{inv.iouRegistryId}</span> },
    { key: 'supplier', header: 'Supplier', render: (inv: Invoice) => <span className="font-medium">{inv.supplierName}</span> },
    { key: 'buyer', header: 'Buyer', render: (inv: Invoice) => inv.buyerName },
    { key: 'amount', header: 'Face value', render: (inv: Invoice) => <span className="font-mono font-semibold">{formatCurrency(inv.amount)}</span> },
    { key: 'due', header: 'Maturity', hideOnMobile: true, render: (inv: Invoice) => formatDate(inv.dueDate) },
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
            <h2 className="portal-section__title">All IOUs</h2>
            <p className="portal-section__desc">
              {filtered.length === registryInvoices.length
                ? `${registryInvoices.length} total`
                : `${filtered.length} of ${registryInvoices.length} shown`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
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
            <div className="relative flex-1 sm:flex-none sm:w-44">
              <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5A6B7D] pointer-events-none" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="field-input pl-8 !min-h-[34px] !py-1.5 text-xs appearance-none pr-8"
              >
                <option value="all">All statuses</option>
                <option value="awaiting_opt_in">Awaiting opt-in</option>
                <option value="listed">Listed</option>
                <option value="verified">Verified</option>
                <option value="offer_received">Offer made</option>
                <option value="offer_accepted">Accepted</option>
                <option value="assigned">Assigned</option>
                <option value="packaged">Packaged</option>
                <option value="disbursed">Disbursed</option>
                <option value="settled">Settled</option>
              </select>
            </div>
          </div>
        </header>
        <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
          <QuerySurface
            loading={loading}
            error={error}
            onRetry={refetchAll}
            isEmpty={!loading && filtered.length === 0}
            empty={<EmptyState compact title="No IOUs match" description="Adjust filters or wait for new origination." />}
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
