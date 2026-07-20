import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice } from '@/types';
import { Search, Filter } from 'lucide-react';

export default function MyInvoicesPage() {
  const { user } = useAuth();
  const { invoices } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const myInvoices = invoices.filter(inv => inv.supplierId === user?.organisationId);
  const filtered = myInvoices.filter(inv => {
    const matchSearch = inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.buyerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    { key: 'number', header: 'Invoice #', render: (inv: Invoice) => <span className="font-mono text-xs">{inv.invoiceNumber}</span> },
    { key: 'buyer', header: 'Buyer', render: (inv: Invoice) => <span>{inv.buyerName}</span> },
    { key: 'amount', header: 'Amount', render: (inv: Invoice) => <span className="font-mono">{formatCurrency(inv.amount)}</span> },
    { key: 'due', header: 'Due Date', render: (inv: Invoice) => <span className="text-muted-foreground">{formatDate(inv.dueDate)}</span> },
    { key: 'status', header: 'Status', render: (inv: Invoice) => <StatusBadge status={inv.status} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="My Invoices"
        subtitle={`${myInvoices.length} invoices listed`}
        actions={
          <button
            onClick={() => navigate('/supplier/list')}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + List New Invoice
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by invoice number or buyer..."
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
            <option value="disbursed">Disbursed</option>
            <option value="settled">Settled</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(inv) => navigate(`/supplier/invoices/${inv.id}`)}
        emptyMessage="No invoices found matching your criteria"
      />
    </div>
  );
}
