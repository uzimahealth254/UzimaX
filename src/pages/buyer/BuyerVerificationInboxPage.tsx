import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function BuyerVerificationInboxPage() {
  const { buyerVerifications, invoices, respondToBuyerVerification } = useData();
  const pending = buyerVerifications.filter((v: any) => v.status === 'pending');

  const act = async (id: string, accept: boolean) => {
    try {
      await respondToBuyerVerification(id, accept, accept ? undefined : 'Rejected by buyer');
      toast.success(accept ? 'Verified — assigned to SPV' : 'Rejected');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Verification inbox" subtitle="Supplier-listed invoices awaiting your accept / reject" />
      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending verifications</p>
      ) : (
        <div className="space-y-3">
          {pending.map((v: any) => {
            const inv = invoices.find((i: any) => i.id === v.invoiceId);
            return (
              <div key={v.id} className="border rounded-2xl p-4 space-y-3">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-semibold font-mono text-sm">{inv?.iouRegistryId || v.invoiceId}</p>
                    <p className="text-xs text-muted-foreground">{inv?.supplierName} · {inv ? formatCurrency(inv.amount) : '—'}</p>
                    <p className="text-xs text-muted-foreground">Due {inv ? formatDate(inv.dueDate) : '—'}</p>
                  </div>
                  <StatusBadge status={v.status} />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button type="button" className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm" onClick={() => act(v.id, true)}>Verify &amp; assign</button>
                  <button type="button" className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl border text-sm" onClick={() => act(v.id, false)}>Reject</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
