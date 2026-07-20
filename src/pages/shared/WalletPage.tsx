import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useData } from '@/hooks/usePlatformData';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function WalletPage() {
  const { wallet, walletTxs, refetchAll } = useData();
  const qc = useQueryClient();
  const [amount, setAmount] = useState('100000');
  const [busy, setBusy] = useState(false);

  const act = async (kind: 'deposit' | 'withdraw') => {
    const n = Number(amount);
    if (!n || n <= 0) {
      toast.error('Enter a positive amount');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/wallets/me/${kind}`, { amount: n });
      toast.success(kind === 'deposit' ? 'Deposit recorded' : 'Withdrawal recorded');
      qc.invalidateQueries({ queryKey: ['wallet'] });
      refetchAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Wallet operation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Wallet (simulation)" subtitle="Ledger balances — no live bank rails" />
      <div className="border rounded-2xl p-4 sm:p-6 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">Available balance</p>
          <p className="text-3xl font-mono font-semibold mt-1">{formatCurrency(Number(wallet?.balance || 0))}</p>
          <p className="text-xs text-muted-foreground mt-2">{wallet?.currency || 'KES'} · simulated</p>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Amount (KES)</label>
            <input
              type="number"
              className="block border rounded-lg px-3 py-2.5 text-sm font-mono w-full sm:w-40 min-h-[44px]"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => act('deposit')}
            className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            Deposit
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => act('withdraw')}
            className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] rounded-xl border text-sm font-medium disabled:opacity-50"
          >
            Withdraw
          </button>
        </div>
      </div>
      <div className="border rounded-2xl divide-y">
        <div className="p-4 font-semibold text-sm">Transactions</div>
        {(walletTxs || []).length === 0 && <p className="p-4 text-sm text-muted-foreground">No transactions yet</p>}
        {(walletTxs || []).slice(0, 50).map((t: any) => (
          <div key={t.id} className="px-4 py-3 flex justify-between text-sm gap-3">
            <div>
              <p className="font-medium capitalize">{t.type}</p>
              <p className="text-xs text-muted-foreground">{t.description || t.reference}</p>
              <p className="text-[10px] text-muted-foreground">{formatDate(t.createdAt)}</p>
            </div>
            <p className={`font-mono ${t.type === 'credit' ? 'text-emerald-700' : 'text-red-700'}`}>
              {t.type === 'credit' ? '+' : '-'}{formatCurrency(Number(t.amount))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
