import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import DetailDrawer from '@/components/shared/DetailDrawer';
import { DocumentLinks, InstallmentTable, LineItems, RegistryPdfButton, useInstrumentDetail } from '@/components/shared/InstrumentFacts';
import LifecycleTimeline from '@/components/shared/LifecycleTimeline';
import { QuerySurface } from '@/components/shared/QueryState';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice } from '@/types';
import { Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function InvoiceRegisterPage() {
  const { user } = useAuth();
  const { invoices, assignments, consents, refetchAll, loading, error } = useData();
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);

  const myInvoices = invoices.filter(inv => inv.buyerId === user?.organisationId);
  const filtered = myInvoices.filter(inv =>
    inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    inv.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSync = async () => {
    setSyncing(true);
    try {
      refetchAll();
      await new Promise(r => setTimeout(r, 400));
      toast.success(`Register refreshed · ${myInvoices.length} invoices`);
    } finally {
      setSyncing(false);
    }
  };

  const columns = [
    { key: 'number', header: 'Invoice #', primary: true, render: (inv: Invoice) => <span className="font-mono text-xs font-semibold">{inv.invoiceNumber}</span> },
    { key: 'supplier', header: 'Supplier', render: (inv: Invoice) => <span className="font-medium">{inv.supplierName}</span> },
    { key: 'amount', header: 'Amount', render: (inv: Invoice) => <span className="font-mono font-semibold">{formatCurrency(inv.amount)}</span> },
    { key: 'issue', header: 'Issue date', hideOnMobile: true, render: (inv: Invoice) => formatDate(inv.issueDate) },
    { key: 'due', header: 'Due date', render: (inv: Invoice) => formatDate(inv.dueDate) },
    { key: 'status', header: 'Status', render: (inv: Invoice) => <StatusBadge status={inv.status} /> },
  ];

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Invoice register"
        subtitle={`${myInvoices.length} invoices registered against your organisation`}
      />

      <section className="portal-section">
        <header className="portal-section__head">
          <div className="min-w-0">
            <h2 className="portal-section__title">All invoices</h2>
            <p className="portal-section__desc">
              {filtered.length === myInvoices.length
                ? `${myInvoices.length} total`
                : `${filtered.length} of ${myInvoices.length} shown`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-56">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5A6B7D]" />
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="field-input pl-8 !min-h-[34px] !py-1.5 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D3F36B] text-[#0E1F1A] text-xs font-bold hover:bg-[#C5E85A] disabled:opacity-50 min-h-[34px]"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {syncing ? '…' : 'Refresh'}
            </button>
          </div>
        </header>
        <div className={selected ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start' : ''}>
          <div className="min-w-0 [&_.surface-card]:border-0 [&_.surface-card]:rounded-none">
            <QuerySurface
              loading={loading}
              error={error}
              onRetry={refetchAll}
              isEmpty={!loading && filtered.length === 0}
              empty={
                <EmptyState
                  compact
                  title="No invoices in your register"
                  description="When you post an IOU or a supplier lists against you, it appears here."
                />
              }
            >
              <DataTable
                columns={columns}
                data={filtered}
                onRowClick={setSelected}
                isRowSelected={(inv) => inv.id === selected?.id}
                getRowKey={(inv) => inv.id}
                emptyMessage="No invoices in your register"
              />
            </QuerySurface>
          </div>
          {selected && (
            <aside className="hidden lg:block border-l border-[#0E1F1A]/10 max-h-[calc(100dvh-8rem)] overflow-y-auto">
              <RegisterDetail invoice={selected} assignments={assignments} consents={consents} onClose={() => setSelected(null)} />
            </aside>
          )}
        </div>
      </section>

      {selected && (
        <div className="lg:hidden">
          <DetailDrawer
            open
            title={selected.invoiceNumber}
            subtitle={selected.iouRegistryId}
            onClose={() => setSelected(null)}
          >
            <RegisterDetail invoice={selected} assignments={assignments} consents={consents} />
          </DetailDrawer>
        </div>
      )}
    </div>
  );
}

function RegisterDetail({
  invoice,
  assignments,
  consents,
  onClose,
}: {
  invoice: Invoice;
  assignments: { id: string; invoiceId: string; triggeredBy?: string; createdAt: string }[];
  consents: { invoiceId: string; status: string; requestedAt: string }[];
  onClose?: () => void;
}) {
  const detail = useInstrumentDetail(invoice.id);
  const asgn = assignments.find(a => a.invoiceId === invoice.id);
  const consent = consents.find(c => c.invoiceId === invoice.id);
  const history = invoice.statusHistory?.length
    ? invoice.statusHistory
    : [{
        status: invoice.status,
        at: invoice.assignedAt || invoice.postedAt || invoice.listedAt || invoice.createdAt,
        note: 'Current status',
      }];

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#0E1F1A] truncate">{invoice.invoiceNumber}</p>
          <p className="text-[11px] font-mono text-[#5A6B7D] truncate">{invoice.iouRegistryId}</p>
        </div>
        {onClose && (
          <button type="button" className="text-xs font-semibold underline shrink-0" onClick={onClose}>Close</button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={invoice.status} />
        <span className="font-mono text-xs font-bold text-[#0E1F1A]">{formatCurrency(invoice.amount)}</span>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-[#5A6B7D] uppercase tracking-wide mb-2">Lifecycle</p>
        <LifecycleTimeline currentStatus={invoice.status} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
          <p className="text-[10px] font-semibold text-[#5A6B7D]">Supplier</p>
          <p className="font-semibold text-[#0E1F1A] mt-0.5">{invoice.supplierName}</p>
        </div>
        <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
          <p className="text-[10px] font-semibold text-[#5A6B7D]">Buyer</p>
          <p className="font-semibold text-[#0E1F1A] mt-0.5">{invoice.buyerName}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-[#5A6B7D]">Issue</p>
          <p className="text-[#0E1F1A] mt-0.5">{formatDate(invoice.issueDate)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-[#5A6B7D]">Due</p>
          <p className="text-[#0E1F1A] mt-0.5">{formatDate(invoice.dueDate)}</p>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-[#5A6B7D] uppercase tracking-wide mb-2">Line items</p>
        <LineItems items={detail.data?.lineItems} />
        {!detail.data?.lineItems?.length && <p className="text-xs text-[#5A6B7D]">No line items were supplied with this invoice.</p>}
      </div>
      <div>
        <p className="text-[10px] font-semibold text-[#5A6B7D] uppercase tracking-wide mb-2">Instalments</p>
        <InstallmentTable rows={detail.data?.installments || []} />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-[#5A6B7D] uppercase tracking-wide mb-2">Notes and receipts</p>
        <RegistryPdfButton invoiceId={invoice.id} />
        <div className="mt-2"><DocumentLinks docs={detail.data?.documents || []} /></div>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-[#5A6B7D] uppercase tracking-wide mb-2">Status history</p>
        <div className="space-y-2 text-xs">
          {history.map((h, i) => (
            <div key={`${h.at}-${i}`} className="flex gap-2">
              <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-[#0E1F1A] shrink-0" />
              <div>
                <StatusBadge status={h.status} />
                <p className="text-[11px] text-[#5A6B7D] mt-1">{formatDate(h.at)}{h.by ? ` · ${h.by}` : ''}</p>
                {h.note && <p className="text-[11px] text-[#0E1F1A] mt-0.5">{h.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
      {(asgn || consent) && (
        <div className="space-y-2 text-xs">
          {asgn && (
            <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
              <p className="text-[10px] font-semibold text-[#5A6B7D]">Assignment</p>
              <p className="text-[#0E1F1A] mt-0.5 font-mono break-all">{asgn.id}</p>
              <p className="text-[11px] text-[#5A6B7D] mt-0.5">
                {asgn.triggeredBy === 'supplier_opt_in' ? 'Supplier opt-in' : 'Consent signed'} · {formatDate(asgn.createdAt)}
              </p>
            </div>
          )}
          {consent && (
            <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
              <p className="text-[10px] font-semibold text-[#5A6B7D]">Consent</p>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={consent.status} />
                <span className="text-[11px] text-[#5A6B7D]">{formatDate(consent.requestedAt)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
