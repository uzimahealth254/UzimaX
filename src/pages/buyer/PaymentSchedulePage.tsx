import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface ScheduleRow {
  id: string;
  invoiceId: string;
  iouRegistryId: string | null;
  buyerId: string;
  amount: number;
  dueDate: string;
  status: string;
  paidAt: string | null;
  payee: string;
}

export default function PaymentSchedulePage() {
  const { user } = useAuth();
  const { refetchAll } = useData();

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['payment-schedule'],
    queryFn: async () => (await api.get('/payment-schedule')).data.data as ScheduleRow[],
  });

  const myPayments = rows.filter((p) => user?.role !== 'buyer' || p.buyerId === user?.organisationId);
  const upcoming = myPayments.filter((p) => p.status === 'upcoming' || p.status === 'due');
  const overdue = myPayments.filter((p) => p.status === 'overdue');
  const paid = myPayments.filter((p) => p.status === 'paid');

  const handleRefresh = async () => {
    await refetch();
    refetchAll();
    toast.success('Schedule refreshed');
  };

  const columns = [
    { key: 'iou', header: 'IOU', render: (p: ScheduleRow) => <span className="font-mono text-xs">{p.iouRegistryId || p.invoiceId.slice(0, 8)}</span> },
    { key: 'buyer', header: 'Payee', render: (p: ScheduleRow) => p.payee },
    { key: 'amount', header: 'Amount', render: (p: ScheduleRow) => <span className="font-mono">{formatCurrency(p.amount)}</span> },
    { key: 'due', header: 'Due Date', render: (p: ScheduleRow) => formatDate(p.dueDate) },
    { key: 'status', header: 'Status', render: (p: ScheduleRow) => <StatusBadge status={p.status} /> },
    {
      key: 'action', header: '', render: (p: ScheduleRow) => (
        p.status === 'paid'
          ? <span className="text-xs text-muted-foreground">{p.paidAt ? formatDate(p.paidAt) : 'Settled'}</span>
          : <span className="text-xs text-muted-foreground">Awaiting AfyaX payment update</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Payment Schedule"
        subtitle="Maturity schedule for receivables assigned to Uzima Capital SPV"
        actions={
          <button type="button" onClick={handleRefresh} className="px-4 py-2 text-sm rounded-xl border font-medium">
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card border-l-4 border-l-amber-500">
          <p className="text-sm text-muted-foreground">Upcoming</p>
          <p className="text-2xl font-bold font-mono mt-1">{upcoming.length}</p>
        </div>
        <div className="stat-card border-l-4 border-l-red-500">
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className="text-2xl font-bold font-mono mt-1">{overdue.length}</p>
        </div>
        <div className="stat-card border-l-4 border-l-emerald-500">
          <p className="text-sm text-muted-foreground">Paid</p>
          <p className="text-2xl font-bold font-mono mt-1">{paid.length}</p>
        </div>
      </div>

      {isLoading
        ? <p className="text-sm text-muted-foreground">Loading schedule…</p>
        : <DataTable columns={columns} data={myPayments} emptyMessage="No payments scheduled" />}
    </div>
  );
}
