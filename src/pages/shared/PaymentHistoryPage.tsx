import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToCsv } from '@/lib/exportUtils';

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
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [method, setMethod] = useState('');
  const [q, setQ] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const filtered = useMemo(() => updates.filter((row) => {
    const at = new Date(row.receivedAt);
    if (from && at < new Date(from)) return false;
    if (to && at > new Date(`${to}T23:59:59`)) return false;
    if (method && (row.paymentMethod || row.source) !== method) return false;
    if (min && Number(row.amountPaid) < Number(min)) return false;
    if (max && Number(row.amountPaid) > Number(max)) return false;
    const blob = `${row.afyaxReference || ''} ${row.source} ${row.invoiceId}`.toLowerCase();
    if (q && !blob.includes(q.toLowerCase())) return false;
    return true;
  }), [updates, from, to, method, q, min, max]);

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Payments"
        subtitle="Repayment records. Cash movement stays with the settlement partner."
        actions={
          <button
            type="button"
            className="btn-secondary"
            onClick={() => exportToCsv(
              'ioux-payments.csv',
              ['received', 'amount', 'outstanding', 'source', 'method', 'reference'],
              filtered.map((u) => [u.receivedAt, u.amountPaid, u.outstandingBalance, u.source, u.paymentMethod || '', u.afyaxReference || '']),
            )}
          >
            Export CSV
          </button>
        }
      />
      <div className="grid gap-2 md:grid-cols-6 mb-3">
        <input className="field-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className="field-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <input className="field-input" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} />
        <input className="field-input" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} />
        <input className="field-input" placeholder="Method or source" value={method} onChange={(e) => setMethod(e.target.value)} />
        <input className="field-input" placeholder="Reference" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Updates</h2>
            <p className="portal-section__desc">
              {isLoading ? 'Loading…' : `${filtered.length} record${filtered.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </header>
        <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
          {isLoading ? (
            <p className="px-3 py-4 text-xs text-[#5A6B7D]">Loading…</p>
          ) : (
            <DataTable
              data={filtered}
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
