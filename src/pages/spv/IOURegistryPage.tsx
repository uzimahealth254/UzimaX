import { useState } from 'react';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice } from '@/types';
import { Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function IOURegistryPage() {
  const { invoices } = useData();
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
    { key: 'iou', header: 'IOU Registry ID', render: (inv: Invoice) => <span className="font-mono text-xs font-medium">{inv.iouRegistryId}</span> },
    { key: 'supplier', header: 'Supplier', render: (inv: Invoice) => inv.supplierName },
    { key: 'buyer', header: 'Buyer', render: (inv: Invoice) => inv.buyerName },
    { key: 'amount', header: 'Face Value', render: (inv: Invoice) => <span className="font-mono">{formatCurrency(inv.amount)}</span> },
    { key: 'due', header: 'Maturity', render: (inv: Invoice) => formatDate(inv.dueDate) },
    { key: 'status', header: 'Status', render: (inv: Invoice) => <StatusBadge status={inv.status} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="IOU Registry"
        subtitle={`${registryInvoices.length} trade receivables on platform`}
        actions={
          <button
            onClick={() => navigate('/spv/offers')}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Make Offer
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by IOU ID, supplier, or buyer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2 border rounded-lg text-sm appearance-none bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Statuses</option>
            <option value="awaiting_opt_in">Awaiting Opt-in</option>
            <option value="listed">Listed</option>
            <option value="verified">Verified</option>
            <option value="offer_received">Offer Made</option>
            <option value="offer_accepted">Accepted</option>
            <option value="assigned">Assigned</option>
            <option value="packaged">Packaged</option>
            <option value="disbursed">Disbursed</option>
            <option value="settled">Settled</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage="No IOUs match your search criteria"
        onRowClick={(inv: Invoice) => navigate(`/spv/registry/${inv.id}`)}
      />
    </div>
  );
}
