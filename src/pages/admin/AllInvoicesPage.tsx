import { useState } from 'react';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice } from '@/types';
import { Search, Filter, Download } from 'lucide-react';
import { exportInvoicesToCsv } from '@/lib/exportUtils';
import { toast } from 'sonner';

export default function AllInvoicesPage() {
  const { invoices } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = invoices.filter(inv => {
    const matchSearch = inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      inv.buyerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.iouRegistryId.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    { key: 'iou', header: 'IOU ID', render: (inv: Invoice) => <span className="font-mono text-xs">{inv.iouRegistryId}</span> },
    { key: 'number', header: 'Invoice #', render: (inv: Invoice) => <span className="font-mono text-xs">{inv.invoiceNumber}</span> },
    { key: 'supplier', header: 'Supplier', render: (inv: Invoice) => inv.supplierName },
    { key: 'buyer', header: 'Buyer', render: (inv: Invoice) => inv.buyerName },
    { key: 'amount', header: 'Amount', render: (inv: Invoice) => <span className="font-mono">{formatCurrency(inv.amount)}</span> },
    { key: 'due', header: 'Due Date', render: (inv: Invoice) => <span className="text-muted-foreground">{formatDate(inv.dueDate)}</span> },
    { key: 'status', header: 'Status', render: (inv: Invoice) => <StatusBadge status={inv.status} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="All Invoices"
        subtitle={`${invoices.length} invoices on platform`}
        actions={
          <button
            onClick={() => {
              exportInvoicesToCsv(filtered);
              toast.success(`Exported ${filtered.length} invoices`);
            }}
            className="w-full sm:w-auto min-h-[44px] justify-center flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by IOU ID, invoice number, supplier, or buyer..."
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
      </div>

      <DataTable columns={columns} data={filtered} emptyMessage="No invoices match your search" />
    </div>
  );
}
