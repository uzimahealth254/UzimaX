import { useData } from '@/hooks/usePlatformData';
import { useActor } from '@/hooks/useActor';
import PageHeader from '@/components/layout/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function ListingReadinessPage() {
  const { packages, updatePackageStatus } = useData();
  const actor = useActor();

  const advance = (id: string, status: 'structured' | 'listed' | 'placed') => {
    updatePackageStatus(id, status, actor);
    toast.success(`Package → ${status}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="NSE / USP listing path"
        subtitle="Process UI for note packaging readiness — exchange onboarding remains external"
      />

      <div className="space-y-3">
        {packages.map(pkg => (
          <div key={pkg.id} className="border rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{pkg.name}</p>
                <p className="text-xs text-muted-foreground">
                  Face {formatCurrency(pkg.totalFaceValue)} · tenor {pkg.weightedAvgTenor || '—'}d
                  {pkg.nseReference ? ` · ${pkg.nseReference}` : ''}
                </p>
              </div>
              <StatusBadge status={pkg.status} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Face value</p>
                <p className="font-mono">{formatCurrency(pkg.totalFaceValue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p>{formatDate(pkg.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Listed</p>
                <p>{pkg.listedAt ? formatDate(pkg.listedAt) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">NSE ref</p>
                <p className="font-mono text-xs">{pkg.nseReference || '—'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {pkg.status === 'draft' && (
                <button type="button" className="px-3 py-2 text-xs rounded-xl bg-primary text-primary-foreground" onClick={() => advance(pkg.id, 'structured')}>
                  Mark structured
                </button>
              )}
              {(pkg.status === 'draft' || pkg.status === 'structured') && (
                <button type="button" className="px-3 py-2 text-xs rounded-xl border" onClick={() => advance(pkg.id, 'listed')}>
                  Submit USP listing
                </button>
              )}
              {pkg.status === 'listed' && (
                <button type="button" className="px-3 py-2 text-xs rounded-xl bg-accent text-white" onClick={() => advance(pkg.id, 'placed')}>
                  Mark placed
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
