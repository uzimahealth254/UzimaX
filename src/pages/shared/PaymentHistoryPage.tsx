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
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <PageHeader
        title="Payment history"
        subtitle="AfyaX payment updates and collections flowing through Uzima"
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
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
  );
}
