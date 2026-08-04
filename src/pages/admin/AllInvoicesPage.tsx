import { useState } from 'react';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice, InvoiceOrigin } from '@/types';
import { Search, Filter, Download } from 'lucide-react';
import { exportInvoicesToCsv } from '@/lib/exportUtils';
import { toast } from 'sonner';

const ORIGIN_LABELS: Record<InvoiceOrigin, string> = {
  buyer_posted: 'Buyer posted',
  supplier_listed: 'Supplier listed',
  api_upload: 'API upload',
};

export default function AllInvoicesPage() {
  const { invoices } = useData();
  const [search, setSearch] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [originFilter, setOriginFilter] = useState<string>('all');

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.iouRegistryId.toLowerCase().includes(q);
    const partyQ = partySearch.toLowerCase();
    const matchParty = !partyQ ||
      inv.supplierName.toLowerCase().includes(partyQ) ||
      inv.buyerName.toLowerCase().includes(partyQ);
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchOrigin = originFilter === 'all' || inv.origin === originFilter;
    return matchSearch && matchParty && matchStatus && matchOrigin;
  });

  const columns = [
    { key: 'iou', header: 'IOU ID', render: (inv: Invoice) => <span className="font-mono text-xs">{inv.iouRegistryId}</span> },
    { key: 'number', header: 'Invoice #', primary: true, render: (inv: Invoice) => <span className="font-mono text-xs font-semibold">{inv.invoiceNumber}</span> },
    { key: 'origin', header: 'Origin', hideOnMobile: true, render: (inv: Invoice) => (
      <span className="text-xs">{inv.origin ? ORIGIN_LABELS[inv.origin] || inv.origin : '—'}</span>
    ) },
    {
      key: 'platform',
      header: 'Platform',
      hideOnMobile: true,
      render: (inv: Invoice) => (
        <span className="text-xs text-[#5A6B7D]">{inv.sourcePlatformName || '—'}</span>
      ),
    },
    { key: 'supplier', header: 'Supplier', render: (inv: Invoice) => <span className="font-medium">{inv.supplierName}</span> },
    { key: 'buyer', header: 'Buyer', render: (inv: Invoice) => inv.buyerName },
    { key: 'amount', header: 'Amount', render: (inv: Invoice) => <span className="font-mono font-semibold">{formatCurrency(inv.amount)}</span> },
    { key: 'due', header: 'Due date', hideOnMobile: true, render: (inv: Invoice) => formatDate(inv.dueDate) },
    { key: 'status', header: 'Status', render: (inv: Invoice) => <StatusBadge status={inv.status} /> },
  ];

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="All invoices"
        subtitle={`${invoices.length} invoices on platform`}
        actions={
          <button
            type="button"
            onClick={() => {
              exportInvoicesToCsv(filtered);
              toast.success(`Exported ${filtered.length} invoices`);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D3F36B] text-[#0E1F1A] text-xs font-bold hover:bg-[#C5E85A] min-h-[36px]"
          >
            <Download size={12} />
            Export CSV
          </button>
        }
      />

      <section className="portal-section">
        <header className="portal-section__head">
          <div className="min-w-0">
            <h2 className="portal-section__title">Platform register</h2>
            <p className="portal-section__desc">
              {filtered.length === invoices.length
                ? `${invoices.length} total`
                : `${filtered.length} of ${invoices.length} shown`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-44">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5A6B7D]" />
              <input
                type="text"
                placeholder="IOU or invoice #…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="field-input pl-8 !min-h-[34px] !py-1.5 text-xs w-full"
              />
            </div>
            <div className="relative flex-1 sm:flex-none sm:w-44">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5A6B7D]" />
              <input
                type="text"
                placeholder="Supplier or buyer…"
                value={partySearch}
                onChange={e => setPartySearch(e.target.value)}
                className="field-input pl-8 !min-h-[34px] !py-1.5 text-xs w-full"
              />
            </div>
            <div className="relative flex-1 sm:flex-none sm:w-40">
              <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5A6B7D] pointer-events-none" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="field-input pl-8 !min-h-[34px] !py-1.5 text-xs appearance-none pr-8 w-full"
              >
                <option value="all">All statuses</option>
                <option value="listed">Listed</option>
                <option value="verified">Verified</option>
                <option value="offer_received">Offer Received</option>
                <option value="offer_accepted">Offer Accepted</option>
                <option value="assigned">Assigned</option>
                <option value="packaged">Packaged</option>
                <option value="disbursed">Disbursed</option>
                <option value="settled">Settled</option>
                <option value="defaulted">Defaulted</option>
              </select>
            </div>
            <div className="relative flex-1 sm:flex-none sm:w-40">
              <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5A6B7D] pointer-events-none" />
              <select
                value={originFilter}
                onChange={e => setOriginFilter(e.target.value)}
                className="field-input pl-8 !min-h-[34px] !py-1.5 text-xs appearance-none pr-8 w-full"
              >
                <option value="all">All origins</option>
                <option value="buyer_posted">Buyer posted</option>
                <option value="supplier_listed">Supplier listed</option>
                <option value="api_upload">API upload</option>
              </select>
            </div>
          </div>
        </header>
        <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
          <DataTable columns={columns} data={filtered} emptyMessage="No invoices match your filters" />
        </div>
      </section>
    </div>
  );
}
