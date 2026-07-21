import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';
import { exportToCsv } from '@/lib/exportUtils';
import { toast } from 'sonner';
import { Download } from 'lucide-react';

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
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Workflow monitor"
        subtitle="Track invoice lifecycle transitions and platform activity"
        actions={
          <button
            type="button"
            onClick={exportAudit}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D3F36B] text-[#0E1F1A] text-xs font-bold hover:bg-[#C5E85A] min-h-[36px]"
          >
            <Download size={12} />
            Export audit CSV
          </button>
        }
      />

      <div className="portal-split">
        <section className="portal-section">
          <header className="portal-section__head">
            <div>
              <h2 className="portal-section__title">Recent transitions</h2>
              <p className="portal-section__desc">{recentTransitions.length} invoices with lifecycle events</p>
            </div>
          </header>
          <div className="divide-y divide-[#0E1F1A]/8 max-h-[500px] overflow-y-auto">
            {recentTransitions.length === 0 ? (
              <div className="portal-empty px-3 py-5">
                <p className="text-xs font-medium text-[#5A6B7D]">No transitions recorded</p>
              </div>
            ) : (
              recentTransitions.map(item => (
                <div key={item.id} className="px-3 py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-semibold text-[#0E1F1A] truncate">{item.iouRegistryId}</p>
                    <p className="text-[11px] text-[#5A6B7D] truncate">{item.supplierName} → {item.buyerName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusBadge status={item.status} />
                    <p className="text-[10px] text-[#5A6B7D]/80 mt-1 font-medium">{formatDate(item.lastUpdate)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="portal-section">
          <header className="portal-section__head">
            <div>
              <h2 className="portal-section__title">Activity log</h2>
              <p className="portal-section__desc">{activityLogs.length} events</p>
            </div>
          </header>
          <div className="divide-y divide-[#0E1F1A]/8 max-h-[500px] overflow-y-auto">
            {activityLogs.length === 0 ? (
              <div className="portal-empty px-3 py-5">
                <p className="text-xs font-medium text-[#5A6B7D]">No activity yet</p>
              </div>
            ) : (
              activityLogs.map(log => (
                <div key={log.id} className="px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold bg-[#D3F36B] text-[#0E1F1A] shrink-0">
                      {log.userName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs">
                        <span className="font-semibold text-[#0E1F1A]">{log.userName}</span>{' '}
                        <span className="text-[#5A6B7D]">{log.action}</span>
                      </p>
                      {log.details && <p className="text-[11px] text-[#5A6B7D] mt-0.5 leading-snug">{log.details}</p>}
                      <p className="text-[10px] text-[#5A6B7D]/80 mt-1 font-medium">{formatDate(log.timestamp)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
