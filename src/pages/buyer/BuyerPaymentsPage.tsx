import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import { QuerySurface } from '@/components/shared/QueryState';
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

type Tab = 'schedule' | 'history';

const tabBtn = (active: boolean) =>
  `px-3 py-1.5 text-xs font-bold border-b-2 whitespace-nowrap shrink-0 min-h-[34px] transition-colors ${
    active ? 'border-[#0E1F1A] text-[#0E1F1A]' : 'border-transparent text-[#5A6B7D] hover:text-[#0E1F1A]'
  }`;

export default function BuyerPaymentsPage() {
  const { user } = useAuth();
  const { refetchAll } = useData();
  const [tab, setTab] = useState<Tab>('schedule');

  const scheduleQ = useQuery({
    queryKey: ['payment-schedule'],
    queryFn: async () => (await api.get('/payment-schedule')).data.data as ScheduleRow[],
  });

  const historyQ = useQuery({
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

  const myPayments = (scheduleQ.data || []).filter(
    (p) => user?.role !== 'buyer' || p.buyerId === user?.organisationId,
  );
  const upcoming = myPayments.filter((p) => p.status === 'upcoming' || p.status === 'due');
  const overdue = myPayments.filter((p) => p.status === 'overdue');
  const paid = myPayments.filter((p) => p.status === 'paid');
  const updates = historyQ.data || [];

  const handleReload = async () => {
    await Promise.all([scheduleQ.refetch(), historyQ.refetch()]);
    refetchAll();
    toast.success('Payments reloaded');
  };

  const scheduleColumns = [
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

  const loading = tab === 'schedule' ? scheduleQ.isLoading : historyQ.isLoading;
  const error = tab === 'schedule'
    ? (scheduleQ.error as Error | null)
    : (historyQ.error as Error | null);

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Payments"
        subtitle="Schedule of what’s due and AfyaX payment history — settlement is external"
        actions={
          <button
            type="button"
            onClick={handleReload}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-[#D3F36B] text-[#0E1F1A] font-bold hover:bg-[#C5E85A] min-h-[36px]"
          >
            <RefreshCw size={12} />
            Reload
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
            <h2 className="portal-section__title">{tab === 'schedule' ? 'Schedule' : 'History'}</h2>
            <p className="portal-section__desc">
              {tab === 'schedule'
                ? `${myPayments.length} installment${myPayments.length === 1 ? '' : 's'}`
                : historyQ.isLoading ? 'Loading…' : `${updates.length} update${updates.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <div className="flex gap-0 border-b border-[#0E1F1A]/10">
            <button type="button" className={tabBtn(tab === 'schedule')} onClick={() => setTab('schedule')}>
              Schedule
            </button>
            <button type="button" className={tabBtn(tab === 'history')} onClick={() => setTab('history')}>
              History
            </button>
          </div>
        </header>
        <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
          <QuerySurface
            loading={loading}
            error={error}
            onRetry={() => { void (tab === 'schedule' ? scheduleQ.refetch() : historyQ.refetch()); }}
            isEmpty={tab === 'schedule' ? myPayments.length === 0 : updates.length === 0}
            empty={
              <EmptyState
                compact
                title={tab === 'schedule' ? 'No payments scheduled' : 'No payment updates yet'}
                description={tab === 'schedule'
                  ? 'Installments appear after receivables are assigned to the SPV.'
                  : 'AfyaX payment updates will appear here when received.'}
              />
            }
          >
            {tab === 'schedule' ? (
              <DataTable columns={scheduleColumns} data={myPayments} emptyMessage="No payments scheduled" />
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
          </QuerySurface>
        </div>
      </section>
    </div>
  );
}
