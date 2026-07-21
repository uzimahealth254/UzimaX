import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function PaymentHistoryPage() {
  const { data: updates = [], isLoading } = useQuery({
    queryKey: ['payment-updates'],
    queryFn: async () => (await api.get('/payment-updates')).data.data as Array<{
      id: string;
      invoiceId: string;
      amountPaid: string;
      outstandingBalance: string;
      paymentMethod: string | null;
      afyaxReference: string | null;
      receivedAt: string;
      source: string;
    }>,
  });

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Payments"
        subtitle="AfyaX repayment updates on financed invoices (read-only — settlement is external)"
      />

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Updates</h2>
            <p className="portal-section__desc">
              {isLoading ? 'Loading…' : `${updates.length} record${updates.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </header>
        <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
          {isLoading ? (
            <p className="px-3 py-4 text-xs text-[#5A6B7D]">Loading…</p>
          ) : (
            <DataTable
              data={updates}
              emptyMessage="No payment updates yet"
              getRowKey={(u) => u.id}
              columns={[
                {
                  key: 'when',
                  header: 'Received',
                  primary: true,
                  render: (u) => <span className="font-mono text-xs">{formatDate(u.receivedAt)}</span>,
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  render: (u) => <span className="font-mono">{formatCurrency(Number(u.amountPaid))}</span>,
                },
                {
                  key: 'out',
                  header: 'Outstanding',
                  render: (u) => <span className="font-mono">{formatCurrency(Number(u.outstandingBalance))}</span>,
                },
                {
                  key: 'src',
                  header: 'Source',
                  hideOnMobile: true,
                  render: (u) => `${u.source}${u.paymentMethod ? ` · ${u.paymentMethod}` : ''}`,
                },
                {
                  key: 'ref',
                  header: 'Reference',
                  render: (u) => (
                    <span className="font-mono text-xs break-anywhere">
                      {u.afyaxReference || u.invoiceId.slice(0, 8)}
                    </span>
                  ),
                },
              ]}
            />
          )}
        </div>
      </section>
    </div>
  );
}
