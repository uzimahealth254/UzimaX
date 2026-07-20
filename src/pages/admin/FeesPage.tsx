import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface FeeConfig {
  id: string;
  feeType: string;
  rateBps: number | null;
  flatAmount: string | null;
  appliesTo: string;
  isActive: boolean | null;
  description: string | null;
}

export default function FeesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    feeType: 'transaction_pct',
    rateBps: 50,
    flatAmount: '',
    appliesTo: 'assignment',
    description: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['fees'],
    queryFn: async () => (await api.get('/fees')).data as {
      configurations: FeeConfig[];
      ledger: Array<{ id: string; amount: string; status: string | null; createdAt: string }>;
    },
  });

  const create = async () => {
    try {
      await api.post('/fees', {
        feeType: form.feeType,
        rateBps: form.rateBps || undefined,
        flatAmount: form.flatAmount ? Number(form.flatAmount) : undefined,
        appliesTo: form.appliesTo,
        description: form.description || undefined,
      });
      toast.success('Fee rule created');
      qc.invalidateQueries({ queryKey: ['fees'] });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to create fee');
    }
  };

  const toggle = async (row: FeeConfig) => {
    try {
      await api.patch(`/fees/${row.id}`, { isActive: !row.isActive });
      qc.invalidateQueries({ queryKey: ['fees'] });
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <PageHeader
        title="Fee configuration"
        subtitle="Platform spreads, bps charges, and immutable ledger"
      />

      <div className="border rounded-2xl p-4 sm:p-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="text-xs text-muted-foreground">Fee type</label>
          <select className="block w-full border rounded-lg px-3 py-2.5 text-sm" value={form.feeType}
            onChange={(e) => setForm({ ...form, feeType: e.target.value })}>
            <option value="transaction_pct">Transaction %</option>
            <option value="platform_spread">Platform spread</option>
            <option value="per_payment">Per payment</option>
            <option value="flat">Flat fee</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Rate (bps)</label>
          <input type="number" inputMode="numeric" className="block w-full border rounded-lg px-3 py-2.5 text-sm" value={form.rateBps}
            onChange={(e) => setForm({ ...form, rateBps: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Flat amount (KES)</label>
          <input inputMode="decimal" className="block w-full border rounded-lg px-3 py-2.5 text-sm" value={form.flatAmount}
            onChange={(e) => setForm({ ...form, flatAmount: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Applies to</label>
          <select className="block w-full border rounded-lg px-3 py-2.5 text-sm" value={form.appliesTo}
            onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}>
            <option value="assignment">Assignment</option>
            <option value="spv">SPV</option>
            <option value="supplier">Supplier</option>
            <option value="payment">Payment</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground">Description</label>
          <input className="block w-full border rounded-lg px-3 py-2.5 text-sm" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex items-end">
          <button type="button" onClick={create} className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl bg-primary text-primary-foreground text-sm font-medium">
            Add fee rule
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DataTable
          data={data?.configurations || []}
          emptyMessage="No fee rules"
          getRowKey={(c) => c.id}
          columns={[
            {
              key: 'type',
              header: 'Type',
              primary: true,
              render: (c) => (
                <div>
                  <p className="font-medium">{c.feeType}</p>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                </div>
              ),
            },
            {
              key: 'rate',
              header: 'Rate',
              render: (c) => (
                <span className="font-mono text-xs">
                  {c.rateBps != null ? `${c.rateBps} bps` : '—'}
                  {c.flatAmount ? ` + ${formatCurrency(Number(c.flatAmount))}` : ''}
                </span>
              ),
            },
            { key: 'applies', header: 'Applies', render: (c) => c.appliesTo },
            {
              key: 'active',
              header: 'Active',
              render: (c) => (
                <button type="button" onClick={(e) => { e.stopPropagation(); void toggle(c); }} className="text-xs underline min-h-[40px]">
                  {c.isActive ? 'Active' : 'Inactive'}
                </button>
              ),
            },
          ]}
        />
      )}

      <div>
        <h3 className="font-semibold mb-2 text-sm sm:text-base">Fee ledger (immutable)</h3>
        <DataTable
          data={(data?.ledger || []).slice(0, 50)}
          emptyMessage="No fees recorded yet"
          getRowKey={(l) => l.id}
          columns={[
            {
              key: 'amt',
              header: 'Amount',
              primary: true,
              render: (l) => <span className="font-mono">{formatCurrency(Number(l.amount))}</span>,
            },
            { key: 'status', header: 'Status', render: (l) => l.status || '—' },
            {
              key: 'when',
              header: 'When',
              render: (l) => <span className="text-xs font-mono">{new Date(l.createdAt).toLocaleString()}</span>,
            },
          ]}
        />
      </div>
    </div>
  );
}
