import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import StatCard from '@/components/shared/StatCard';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Calendar, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

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
    { key: 'iou', header: 'IOU', primary: true, render: (p: ScheduleRow) => <span className="font-mono text-xs font-semibold">{p.iouRegistryId || p.invoiceId.slice(0, 8)}</span> },
    { key: 'buyer', header: 'Payee', render: (p: ScheduleRow) => <span className="font-medium">{p.payee}</span> },
    { key: 'amount', header: 'Amount', render: (p: ScheduleRow) => <span className="font-mono font-semibold">{formatCurrency(p.amount)}</span> },
    { key: 'due', header: 'Due date', render: (p: ScheduleRow) => formatDate(p.dueDate) },
    { key: 'status', header: 'Status', render: (p: ScheduleRow) => <StatusBadge status={p.status} /> },
    {
      key: 'action',
      header: 'Note',
      hideOnMobile: true,
      render: (p: ScheduleRow) => (
        p.status === 'paid'
          ? <span className="text-xs text-[#5A6B7D]">{p.paidAt ? formatDate(p.paidAt) : 'Settled'}</span>
          : <span className="text-xs text-[#5A6B7D]">Awaiting AfyaX</span>
      ),
    },
  ];

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Payment schedule"
        subtitle="Maturity schedule for SPV-assigned receivables"
        actions={
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-[#D3F36B] text-[#0E1F1A] font-bold hover:bg-[#C5E85A] min-h-[36px]"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        }
      />

      <div className="portal-metrics portal-metrics--3">
        <StatCard label="Upcoming" value={upcoming.length} icon={Calendar} accent="gold" />
        <StatCard label="Overdue" value={overdue.length} icon={AlertTriangle} accent="red" />
        <StatCard label="Paid" value={paid.length} icon={CheckCircle2} accent="lime" />
      </div>

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Schedule</h2>
            <p className="portal-section__desc">{myPayments.length} payment{myPayments.length === 1 ? '' : 's'}</p>
          </div>
        </header>
        <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
          {isLoading
            ? <p className="px-3 py-4 text-xs text-[#5A6B7D]">Loading schedule…</p>
            : <DataTable columns={columns} data={myPayments} emptyMessage="No payments scheduled" />}
        </div>
      </section>
    </div>
  );
}
