import { useState } from 'react';
import { useData } from '@/hooks/usePlatformData';
import { useActor } from '@/hooks/useActor';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils';
import { Invoice, SecuritisationPackage } from '@/types';
import { toast } from 'sonner';

export default function PackagingPage() {
  const { invoices, packages, createPackage, updatePackageStatus } = useData();
  const actor = useActor();
  const [tab, setTab] = useState<'create' | 'packages'>('packages');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [packageName, setPackageName] = useState('');

  const assignedInvoices = invoices.filter(inv => inv.status === 'assigned');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCreatePackage = async () => {
    if (selectedIds.length < 1) {
      toast.error('Select at least 1 invoice to create a package');
      return;
    }
    if (!packageName.trim()) {
      toast.error('Enter a package name');
      return;
    }
    try {
      await createPackage({
        name: packageName,
        invoiceIds: selectedIds,
      }, actor);
      toast.success('Package created');
      setSelectedIds([]);
      setPackageName('');
      setTab('packages');
    } catch (e: any) {
      toast.error(e.message || 'Package creation failed');
    }
  };

  const assignedColumns = [
    { key: 'select', header: '', render: (inv: Invoice) => (
      <input
        type="checkbox"
        checked={selectedIds.includes(inv.id)}
        onChange={() => toggleSelect(inv.id)}
        className="rounded border-gray-300"
      />
    )},
    { key: 'iou', header: 'IOU ID', render: (inv: Invoice) => <span className="font-mono text-xs">{inv.iouRegistryId}</span> },
    { key: 'supplier', header: 'Supplier', render: (inv: Invoice) => inv.supplierName },
    { key: 'amount', header: 'Face Value', render: (inv: Invoice) => <span className="font-mono">{formatCurrency(inv.amount)}</span> },
  ];

  const packageColumns = [
    { key: 'name', header: 'Package Name', render: (p: SecuritisationPackage) => <span className="font-medium">{p.name}</span> },
    { key: 'count', header: 'Face', render: (p: SecuritisationPackage) => <span className="font-mono text-xs">{formatCurrency(p.totalFaceValue)}</span> },
    { key: 'face', header: 'Purchase', render: (p: any) => <span className="font-mono">{formatCurrency(Number(p.totalPurchasePrice || 0))}</span> },
    { key: 'discount', header: 'NSE ref', render: (p: any) => <span className="font-mono text-xs">{p.nseReference || '—'}</span> },
    { key: 'status', header: 'Status', render: (p: SecuritisationPackage) => <StatusBadge status={p.status} /> },
    { key: 'action', header: '', render: (p: SecuritisationPackage) => (
      p.status === 'draft' ? (
        <button
          onClick={(e) => { e.stopPropagation(); updatePackageStatus(p.id, 'structured', actor); toast.success('Package structured'); }}
          className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Structure
        </button>
      ) : p.status === 'structured' ? (
        <button
          onClick={(e) => { e.stopPropagation(); updatePackageStatus(p.id, 'listed', actor); toast.success('Package listed on NSE USP'); }}
          className="px-3 py-1 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
        >
          List on NSE
        </button>
      ) : null
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Packaging & NSE USP" subtitle="Structure and list securitisation packages" />

      <div className="scroll-x-pad border-b pb-px">
        <button
          onClick={() => setTab('packages')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 min-h-[44px] ${tab === 'packages' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          My Packages ({packages.length})
        </button>
        <button
          onClick={() => setTab('create')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 min-h-[44px] ${tab === 'create' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Create Package ({assignedInvoices.length} available)
        </button>
      </div>

      {tab === 'packages' && (
        <DataTable columns={packageColumns} data={packages} emptyMessage="No packages created yet" />
      )}

      {tab === 'create' && (
        <div className="space-y-4">
          <div className="max-w-sm">
            <label className="block text-sm font-medium mb-1.5">Package Name</label>
            <input
              value={packageName}
              onChange={e => setPackageName(e.target.value)}
              placeholder="Uzima USP Series X"
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <DataTable columns={assignedColumns} data={assignedInvoices} emptyMessage="No assigned invoices available for packaging" />
          {selectedIds.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm flex-1 min-w-0"><span className="font-medium">{selectedIds.length}</span> invoices selected · Total: <span className="font-mono font-medium">{formatCurrency(invoices.filter(i => selectedIds.includes(i.id)).reduce((s, i) => s + i.amount, 0))}</span></p>
              <button
                onClick={handleCreatePackage}
                className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Create Package
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
