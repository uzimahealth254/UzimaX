import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice } from '@/types';
import { Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function InvoiceRegisterPage() {
  const { user } = useAuth();
  const { invoices, refetchAll } = useData();
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);

  const myInvoices = invoices.filter(inv => inv.buyerId === user?.organisationId);
  const filtered = myInvoices.filter(inv =>
    inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    inv.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSync = async () => {
    setSyncing(true);
    try {
      refetchAll();
      await new Promise(r => setTimeout(r, 400));
      toast.success(`Register refreshed · ${myInvoices.length} invoices`);
    } finally {
      setSyncing(false);
    }
  };

  const columns = [
    { key: 'number', header: 'Invoice #', render: (inv: Invoice) => <span className="font-mono text-xs">{inv.invoiceNumber}</span> },
    { key: 'supplier', header: 'Supplier', render: (inv: Invoice) => inv.supplierName },
    { key: 'amount', header: 'Amount', render: (inv: Invoice) => <span className="font-mono">{formatCurrency(inv.amount)}</span> },
    { key: 'issue', header: 'Issue Date', render: (inv: Invoice) => formatDate(inv.issueDate) },
    { key: 'due', header: 'Due Date', render: (inv: Invoice) => formatDate(inv.dueDate) },
    { key: 'status', header: 'Status', render: (inv: Invoice) => <StatusBadge status={inv.status} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Invoice Register"
        subtitle={`${myInvoices.length} invoices registered against your organisation`}
        actions={
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full sm:w-auto min-h-[44px] justify-center flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync & Verify'}
          </button>
        }
      />

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by invoice or supplier..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <DataTable columns={columns} data={filtered} emptyMessage="No invoices in your register" />
    </div>
  );
}
