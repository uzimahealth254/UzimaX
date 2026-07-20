import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice } from '@/types';

export default function TradeHistoryPage() {
  const { user } = useAuth();
  const { invoices } = useData();

  const completedInvoices = invoices.filter(
    inv => inv.supplierId === user?.organisationId &&
    ['disbursed', 'matured', 'settled'].includes(inv.status)
  );

  const totalDisbursed = completedInvoices
    .filter(inv => ['disbursed', 'matured', 'settled'].includes(inv.status))
    .reduce((sum, inv) => sum + inv.amount, 0);

  const columns = [
    { key: 'number', header: 'Invoice #', render: (inv: Invoice) => <span className="font-mono text-xs">{inv.invoiceNumber}</span> },
    { key: 'buyer', header: 'Buyer', render: (inv: Invoice) => inv.buyerName },
    { key: 'amount', header: 'Face Value', render: (inv: Invoice) => <span className="font-mono">{formatCurrency(inv.amount)}</span> },
    { key: 'due', header: 'Maturity', render: (inv: Invoice) => formatDate(inv.dueDate) },
    { key: 'status', header: 'Status', render: (inv: Invoice) => <StatusBadge status={inv.status} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Trade History"
        subtitle="Completed securitisation trades"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card border-l-4 border-l-emerald-500">
          <p className="text-sm text-muted-foreground">Completed Trades</p>
          <p className="text-2xl font-bold font-mono mt-1">{completedInvoices.length}</p>
        </div>
        <div className="stat-card border-l-4 border-l-primary">
          <p className="text-sm text-muted-foreground">Total Value Traded</p>
          <p className="text-2xl font-bold font-mono mt-1">{formatCurrency(totalDisbursed)}</p>
        </div>
        <div className="stat-card border-l-4 border-l-blue-500">
          <p className="text-sm text-muted-foreground">Avg Trade Size</p>
          <p className="text-2xl font-bold font-mono mt-1">{completedInvoices.length > 0 ? formatCurrency(totalDisbursed / completedInvoices.length) : 'KES 0'}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={completedInvoices}
        emptyMessage="No completed trades yet"
      />
    </div>
  );
}
