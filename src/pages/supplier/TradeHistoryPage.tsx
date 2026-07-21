import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import StatCard from '@/components/shared/StatCard';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice } from '@/types';
import { CheckCircle2, DollarSign, BarChart3 } from 'lucide-react';

export default function TradeHistoryPage() {
  const { user } = useAuth();
  const { invoices } = useData();

  const completedInvoices = invoices.filter(
    inv => inv.supplierId === user?.organisationId &&
    ['disbursed', 'matured', 'settled'].includes(inv.status)
  );

  const totalDisbursed = completedInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const avgSize = completedInvoices.length > 0 ? totalDisbursed / completedInvoices.length : 0;

  const columns = [
    { key: 'number', header: 'Invoice #', primary: true, render: (inv: Invoice) => <span className="font-mono text-xs font-semibold">{inv.invoiceNumber}</span> },
    { key: 'buyer', header: 'Buyer', render: (inv: Invoice) => <span className="font-medium">{inv.buyerName}</span> },
    { key: 'amount', header: 'Face value', render: (inv: Invoice) => <span className="font-mono font-semibold">{formatCurrency(inv.amount)}</span> },
    { key: 'due', header: 'Maturity', render: (inv: Invoice) => formatDate(inv.dueDate) },
    { key: 'status', header: 'Status', render: (inv: Invoice) => <StatusBadge status={inv.status} /> },
  ];

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Trade history"
        subtitle="Completed securitisation trades"
      />

      <div className="portal-metrics portal-metrics--3">
        <StatCard label="Completed trades" value={completedInvoices.length} icon={CheckCircle2} accent="lime" />
        <StatCard label="Total value traded" value={formatCurrency(totalDisbursed)} icon={DollarSign} accent="forest" />
        <StatCard label="Avg trade size" value={formatCurrency(avgSize)} icon={BarChart3} accent="gold" />
      </div>

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Completed trades</h2>
            <p className="portal-section__desc">{completedInvoices.length} record{completedInvoices.length === 1 ? '' : 's'}</p>
          </div>
        </header>
        <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
          <DataTable
            columns={columns}
            data={completedInvoices}
            emptyMessage="No completed trades yet"
          />
        </div>
      </section>
    </div>
  );
}
