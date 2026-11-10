import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function WalletPage() {
  const { user } = useAuth();
  const { wallet, walletTxs, invoices, refetchAll } = useData();
  const qc = useQueryClient();
  const [amount, setAmount] = useState('100000');
  const [reference, setReference] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [held, setHeld] = useState(false);
  const [busy, setBusy] = useState(false);
  const ledger = useQuery({
    queryKey: ['wallet-page'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/wallets/me');
        setHeld(false);
        return data as { wallet: { balance: string; currency?: string }; transactions: any[] };
      } catch (err: any) {
        if (err?.response?.status === 403) setHeld(true);
        throw err;
      }
    },
    retry: false,
  });

  const act = async (kind: 'deposit' | 'withdraw') => {
    const n = Number(amount);
    if (!n || n <= 0) {
      toast.error('Enter a positive amount');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/wallets/me/${kind}`, { amount: n, description: reference || undefined });
      toast.success(kind === 'deposit' ? 'Deposit recorded' : 'Withdrawal recorded');
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['wallet-page'] });
      refetchAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Wallet operation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Ledger (simulated)"
        subtitle={`${user?.organisationName || 'Organisation'} ledger · simulated until a processor connects`}
      />

      <div className="portal-callout">
        {held
          ? 'This ledger is built and held. Entries stay off in production until a licensed processor is connected. No bank or mobile-money movement happens here.'
          : 'Balances below are a simulated ledger. A deposit or withdrawal records an entry. It does not move money at a bank.'}
      </div>

      <div className="portal-grid-2">
        <section className="portal-section">
          <header className="portal-section__head">
            <div>
              <h2 className="portal-section__title">Balance</h2>
              <p className="portal-section__desc">{wallet?.currency || 'KES'}</p>
            </div>
          </header>
          <div className="portal-section__body--pad space-y-3">
            <p className="text-2xl font-mono font-bold text-[#0E1F1A] leading-none">{formatCurrency(Number(ledger.data?.wallet?.balance || wallet?.balance || 0))}</p>
            <div className="flex flex-wrap gap-2 items-end pt-2 border-t border-[#0E1F1A]/8">
              <div className="flex-1 min-w-[7rem]">
                <label className="text-[10px] font-semibold text-[#5A6B7D]">Amount</label>
                <input
                  type="number"
                  className="field-input font-mono mt-1 !min-h-[36px] !py-1.5"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <input
                  className="field-input mt-1 !min-h-[36px] !py-1.5"
                  placeholder="Reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => act('deposit')}
                className="px-3 py-1.5 min-h-[36px] rounded-lg bg-[#0E1F1A] text-white text-xs font-bold hover:bg-[#1A3A2E] disabled:opacity-50"
              >
                Deposit
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => act('withdraw')}
                className="px-3 py-1.5 min-h-[36px] rounded-lg border border-[#0E1F1A]/15 text-xs font-bold text-[#0E1F1A] hover:bg-[#f7faf6] disabled:opacity-50"
              >
                Withdraw
              </button>
            </div>
          </div>
        </section>

        <section className="portal-section">
          <header className="portal-section__head">
            <h2 className="portal-section__title">Recent transactions</h2>
          </header>
          <div className="divide-y divide-[#0E1F1A]/8 max-h-56 overflow-y-auto">
            {(walletTxs || []).length === 0 && (
              <p className="px-3 py-4 text-xs text-[#5A6B7D]">No transactions yet</p>
            )}
            {(ledger.data?.transactions || walletTxs || []).slice(0, 50).map((t: any) => (
              <div key={t.id} className="px-3 py-2 flex justify-between text-xs gap-2">
                <div className="min-w-0">
                  <p className="font-semibold capitalize text-[#0E1F1A]">{t.type}</p>
                  <p className="text-[11px] text-[#5A6B7D] truncate">{t.description || t.reference}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-mono font-bold ${t.type === 'credit' ? 'text-[#1A3A2E]' : 'text-red-600'}`}>
                    {t.type === 'credit' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                  </p>
                  <p className="text-[10px] text-[#5A6B7D]">{formatDate(t.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      {(user?.role === 'spv' || user?.role === 'admin') && (
        <form
          className="portal-section p-4 grid gap-2 md:grid-cols-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api.post('/wallets/simulated-settlement', {
                invoiceId,
                amount: Number(amount),
                reference: reference || undefined,
              });
              toast.success('Simulated purchase payment recorded. No bank was contacted.');
              qc.invalidateQueries({ queryKey: ['wallet-page'] });
            } catch (err: any) {
              toast.error(err?.response?.data?.message || 'Could not record the simulated payment');
            } finally {
              setBusy(false);
            }
          }}
        >
          <select className="field-input" required value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
            <option value="">IOU for a simulated purchase payment</option>
            {(invoices || []).map((inv: any) => (
              <option key={inv.id} value={inv.id}>{inv.iouRegistryId || inv.id}</option>
            ))}
          </select>
          <button className="btn-primary" type="submit" disabled={busy || held}>Record simulated payment</button>
        </form>
      )}
    </div>
  );
}
