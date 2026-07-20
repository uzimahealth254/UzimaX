import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';
import { exportToCsv } from '@/lib/exportUtils';
import { toast } from 'sonner';

export default function WorkflowMonitorPage() {
  const { activityLogs, invoices } = useData();

  const recentTransitions = invoices
    .filter(inv => inv.listedAt || inv.verifiedAt || inv.postedAt || inv.assignedAt)
    .slice(0, 20)
    .map(inv => ({
      id: inv.id,
      iouRegistryId: inv.iouRegistryId,
      supplierName: inv.supplierName,
      buyerName: inv.buyerName,
      amount: inv.amount,
      status: inv.status,
      lastUpdate: inv.assignedAt || inv.verifiedAt || inv.postedAt || inv.listedAt || inv.createdAt,
    }));

  const exportAudit = () => {
    exportToCsv(
      'uzima-audit-log.csv',
      ['timestamp', 'user', 'action', 'entityType', 'entityId', 'details'],
      activityLogs.map(l => [l.timestamp, l.userName, l.action, l.entityType, l.entityId, l.details || '']),
    );
    toast.success('Audit log exported');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Workflow Monitor"
        subtitle="Track invoice lifecycle transitions and platform activity"
        actions={
          <button type="button" onClick={exportAudit} className="px-4 py-2 text-sm rounded-xl border font-medium">
            Export audit CSV
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm">Recent Transitions</h3>
          </div>
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {recentTransitions.map(item => (
              <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono">{item.iouRegistryId}</p>
                  <p className="text-xs text-muted-foreground">{item.supplierName} → {item.buyerName}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={item.status} />
                  <p className="text-[10px] text-muted-foreground mt-1">{formatDate(item.lastUpdate)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border rounded-lg">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm">Activity Log</h3>
          </div>
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {activityLogs.map(log => (
              <div key={log.id} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {log.userName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm"><span className="font-medium">{log.userName}</span> {log.action}</p>
                    {log.details && <p className="text-xs text-muted-foreground">{log.details}</p>}
                    <p className="text-[10px] text-muted-foreground">{formatDate(log.timestamp)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
