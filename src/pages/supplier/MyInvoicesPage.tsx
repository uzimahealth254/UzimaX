import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import FinancingProgress from '@/components/shared/FinancingProgress';
import EmptyState from '@/components/shared/EmptyState';
import { QuerySurface } from '@/components/shared/QueryState';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice } from '@/types';
import { Search, Filter, Plus } from 'lucide-react';

const COMPLETED = ['disbursed', 'matured', 'settled'];

export default function MyInvoicesPage() {
  const { user } = useAuth();
  const { invoices, loading, error, refetchAll } = useData();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('filter') === 'completed' ? 'completed' : 'all',
  );

  useEffect(() => {
    if (searchParams.get('filter') === 'completed') setStatusFilter('completed');
  }, [searchParams]);

  const myInvoices = invoices.filter(inv => inv.supplierId === user?.organisationId);
  const filtered = myInvoices.filter(inv => {
    const matchSearch = inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.buyerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all'
      || (statusFilter === 'completed' ? COMPLETED.includes(inv.status) : inv.status === statusFilter);
    return matchSearch && matchStatus;
  });

  const setFilter = (value: string) => {
    setStatusFilter(value);
    if (value === 'completed') setSearchParams({ filter: 'completed' });
    else setSearchParams({});
  };

  const columns = [
    { key: 'number', header: 'Invoice #', primary: true, render: (inv: Invoice) => <span className="font-mono text-xs font-semibold">{inv.invoiceNumber}</span> },
    { key: 'buyer', header: 'Buyer', render: (inv: Invoice) => <span className="font-medium">{inv.buyerName}</span> },
    { key: 'amount', header: 'Amount', render: (inv: Invoice) => <span className="font-mono font-semibold">{formatCurrency(inv.amount)}</span> },
    { key: 'due', header: 'Due date', render: (inv: Invoice) => formatDate(inv.dueDate) },
    {
      key: 'progress',
      header: 'Progress',
      hideOnMobile: true,
      render: (inv: Invoice) => <FinancingProgress status={inv.status} />,
    },
    { key: 'status', header: 'Status', render: (inv: Invoice) => <StatusBadge status={inv.status} /> },
  ];

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="My invoices"
        subtitle={`${myInvoices.length} invoices listed`}
        actions={
          <button
            type="button"
            onClick={() => navigate('/supplier/post-invoice')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#D3F36B] text-[#0E1F1A] px-3 py-2 text-xs font-bold hover:bg-[#C5E85A] min-h-[36px]"
          >
            <Plus size={13} />
            Post invoice
          </button>
        }
      />

      <section className="portal-section">
        <header className="portal-section__head">
          <div className="min-w-0">
            <h2 className="portal-section__title">
              {statusFilter === 'completed' ? 'Completed' : 'All invoices'}
            </h2>
            <p className="portal-section__desc">
              {filtered.length === myInvoices.length
                ? `${myInvoices.length} total`
                : `${filtered.length} of ${myInvoices.length} shown`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-48">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5A6B7D]" />
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="field-input pl-8 !min-h-[34px] !py-1.5 text-xs"
              />
            </div>
            <div className="relative">
              <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5A6B7D]" />
              <select
                value={statusFilter}
                onChange={e => setFilter(e.target.value)}
                className="field-input appearance-none pl-8 !min-h-[34px] !py-1.5 text-xs w-full sm:w-40"
              >
                <option value="all">All statuses</option>
                <option value="completed">Completed</option>
                <option value="listed">Listed</option>
                <option value="verified">Verified</option>
                <option value="awaiting_opt_in">Awaiting opt-in</option>
                <option value="offer_received">Offer received</option>
                <option value="offer_accepted">Offer accepted</option>
                <option value="assigned">Assigned</option>
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
            empty={
              <EmptyState
                compact
                title="No invoices found"
                description={statusFilter === 'completed'
                  ? 'Completed trades appear here once disbursed or settled.'
                  : 'Post an invoice or wait for a buyer-posted IOU in Opt-in.'}
              />
            }
          >
            <DataTable
              columns={columns}
              data={filtered}
              onRowClick={(inv) => navigate(`/supplier/invoices/${inv.id}`)}
              emptyMessage="No invoices found matching your criteria"
            />
          </QuerySurface>
        </div>
      </section>
    </div>
  );
}
