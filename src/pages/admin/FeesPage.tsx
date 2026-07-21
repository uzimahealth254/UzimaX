import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatCard from '@/components/shared/StatCard';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Clock, CheckCircle2 } from 'lucide-react';

interface FeeConfig {
  id: string;
  feeType: string;
  rateBps: number | null;
  flatAmount: string | null;
  appliesTo: string;
  isActive: boolean | null;
  description: string | null;
}

type LedgerEntry = { id: string; amount: string; status: string | null; createdAt: string };
type LedgerTab = 'accrued' | 'collected';

const ACCRUED_STATUSES = new Set(['accrued', 'earned', 'pending']);
const COLLECTED_STATUSES = new Set(['collected', 'paid', 'settled']);

function ledgerBucket(status: string | null | undefined): LedgerTab | null {
  const s = (status || 'pending').toLowerCase();
  if (ACCRUED_STATUSES.has(s)) return 'accrued';
  if (COLLECTED_STATUSES.has(s)) return 'collected';
  return null;
}

function sumLedger(rows: LedgerEntry[]) {
  return rows.reduce((n, r) => n + Number(r.amount || 0), 0);
}

export default function FeesPage() {
  const qc = useQueryClient();
  const [ledgerTab, setLedgerTab] = useState<LedgerTab>('accrued');
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
      ledger: LedgerEntry[];
    },
  });

  const ledger = data?.ledger || [];
  const accruedRows = useMemo(
    () => ledger.filter((l) => ledgerBucket(l.status) === 'accrued'),
    [ledger],
  );
  const collectedRows = useMemo(
    () => ledger.filter((l) => ledgerBucket(l.status) === 'collected'),
    [ledger],
  );
  const accruedTotal = useMemo(() => sumLedger(accruedRows), [accruedRows]);
  const collectedTotal = useMemo(() => sumLedger(collectedRows), [collectedRows]);
  const visibleLedger = ledgerTab === 'accrued' ? accruedRows : collectedRows;

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

  const remove = async (row: FeeConfig) => {
    try {
      await api.delete(`/fees/${row.id}`);
      toast.success('Fee rule removed');
      qc.invalidateQueries({ queryKey: ['fees'] });
    } catch {
      toast.error('Delete failed — try deactivating instead');
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
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Fee configuration"
        subtitle="Platform spreads, bps charges, and immutable ledger"
      />

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Add fee rule</h2>
            <p className="portal-section__desc">Configure rate and applicability</p>
          </div>
        </header>
        <div className="portal-section__body--pad">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-[10px] font-semibold text-[#5A6B7D]">Fee type</label>
              <select
                className="field-input mt-1 !min-h-[34px] text-xs"
                value={form.feeType}
                onChange={(e) => setForm({ ...form, feeType: e.target.value })}
              >
                <option value="transaction_pct">Transaction %</option>
                <option value="platform_spread">Platform spread</option>
                <option value="per_payment">Per payment</option>
                <option value="flat">Flat fee</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#5A6B7D]">Rate (bps)</label>
              <input
                type="number"
                inputMode="numeric"
                className="field-input mt-1 !min-h-[34px] text-xs"
                value={form.rateBps}
                onChange={(e) => setForm({ ...form, rateBps: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#5A6B7D]">Flat amount (KES)</label>
              <input
                inputMode="decimal"
                className="field-input mt-1 !min-h-[34px] text-xs"
                value={form.flatAmount}
                onChange={(e) => setForm({ ...form, flatAmount: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#5A6B7D]">Applies to</label>
              <select
                className="field-input mt-1 !min-h-[34px] text-xs"
                value={form.appliesTo}
                onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}
              >
                <option value="assignment">Assignment</option>
                <option value="spv">SPV</option>
                <option value="supplier">Supplier</option>
                <option value="payment">Payment</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-semibold text-[#5A6B7D]">Description</label>
              <input
                className="field-input mt-1 !min-h-[34px] text-xs"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={create}
                className="w-full sm:w-auto min-h-[36px] px-3 py-2 rounded-lg bg-[#0E1F1A] text-white text-xs font-bold hover:bg-[#1A3A2E]"
              >
                Add fee rule
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Fee rules</h2>
            <p className="portal-section__desc">{data?.configurations.length || 0} configured</p>
          </div>
        </header>
        <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
          {isLoading ? (
            <p className="px-3 py-4 text-xs text-[#5A6B7D]">Loading…</p>
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
                      <p className="font-medium text-xs">{c.feeType}</p>
                      <p className="text-[11px] text-[#5A6B7D]">{c.description}</p>
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
                { key: 'applies', header: 'Applies', render: (c) => <span className="text-xs">{c.appliesTo}</span> },
                {
                  key: 'active',
                  header: 'Active',
                  render: (c) => (
                    <div className="flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void toggle(c); }}
                        className="text-[11px] font-bold text-[#0E1F1A] underline min-h-[34px]"
                      >
                        {c.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void remove(c); }}
                        className="text-[11px] font-bold text-red-700/80 hover:text-red-800 underline min-h-[34px]"
                      >
                        Delete
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </div>
      </section>

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Fee ledger</h2>
            <p className="portal-section__desc">
              {ledgerTab === 'accrued'
                ? `${accruedRows.length} accrued · ${formatCurrency(accruedTotal)} total`
                : `${collectedRows.length} collected · ${formatCurrency(collectedTotal)} total`}
            </p>
          </div>
          <div className="flex gap-0 border-b border-[#0E1F1A]/10 w-full sm:w-auto">
            {(['accrued', 'collected'] as LedgerTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setLedgerTab(t)}
                className={`px-3 py-1.5 text-xs font-bold capitalize border-b-2 whitespace-nowrap shrink-0 min-h-[34px] transition-colors ${
                  ledgerTab === t
                    ? 'border-[#0E1F1A] text-[#0E1F1A]'
                    : 'border-transparent text-[#5A6B7D] hover:text-[#0E1F1A]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </header>
        <div className="portal-section__body--pad border-b border-[#0E1F1A]/6">
          <div className="portal-grid-2 !gap-2">
            <StatCard
              label="Accrued total"
              value={formatCurrency(accruedTotal)}
              icon={Clock}
              accent="gold"
            />
            <StatCard
              label="Collected total"
              value={formatCurrency(collectedTotal)}
              icon={CheckCircle2}
              accent="lime"
            />
          </div>
        </div>
        <div className="[&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
          <DataTable
            data={visibleLedger.slice(0, 50)}
            emptyMessage={ledgerTab === 'accrued' ? 'No accrued fees' : 'No collected fees'}
            getRowKey={(l) => l.id}
            columns={[
              {
                key: 'amt',
                header: 'Amount',
                primary: true,
                render: (l) => <span className="font-mono text-xs font-semibold">{formatCurrency(Number(l.amount))}</span>,
              },
              { key: 'status', header: 'Status', render: (l) => <span className="text-xs capitalize">{l.status || '—'}</span> },
              {
                key: 'when',
                header: 'When',
                hideOnMobile: true,
                render: (l) => <span className="text-[11px] font-mono text-[#5A6B7D]">{new Date(l.createdAt).toLocaleString()}</span>,
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
