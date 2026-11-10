import { useQuery } from '@tanstack/react-query';
import { api, getAccessToken } from '@/lib/apiClient';
import { getApiBaseUrl } from '@/lib/apiBase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export type InstallmentRow = {
  id: string;
  installmentNo: number;
  dueDate: string;
  amount: string | number;
  interestAmount?: string | number | null;
  charges?: string | number | null;
  paidAmount?: string | number | null;
  status?: string | null;
};

export type InstrumentDoc = {
  id: string;
  docType: string;
  fileUrl: string;
  uploadedAt: string;
};

type Detail = {
  lineItems?: { description?: string; name?: string; quantity?: number; unitPrice?: number; amount?: number }[] | null;
  installments?: InstallmentRow[];
  documents?: InstrumentDoc[];
};

const DOC_LABEL: Record<string, string> = {
  purchase_note: 'Purchase note',
  payment_receipt: 'Payment receipt',
  assignment_letter: 'Assignment letter',
};

export function useInstrumentDetail(invoiceId?: string) {
  return useQuery({
    queryKey: ['invoice-detail', invoiceId],
    queryFn: async () => (await api.get(`/invoices/${invoiceId}`)).data as Detail,
    enabled: Boolean(invoiceId),
  });
}

export function InstallmentTable({ rows }: { rows: InstallmentRow[] }) {
  if (!rows.length) {
    return <p className="text-xs text-[#5A6B7D]">No instalment schedule was submitted with this IOU.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-[#5A6B7D]">
            <th className="py-1 pr-3">#</th>
            <th className="py-1 pr-3">Due</th>
            <th className="py-1 pr-3">Amount</th>
            <th className="py-1 pr-3">Interest</th>
            <th className="py-1 pr-3">Charges</th>
            <th className="py-1 pr-3">Paid</th>
            <th className="py-1">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const due = Number(row.amount);
            const paid = Number(row.paidAmount || 0);
            const outstanding = Math.max(0, due - paid);
            return (
              <tr key={row.id} className="border-t border-[#0E1F1A]/8">
                <td className="py-1.5 pr-3 font-mono">{row.installmentNo}</td>
                <td className="py-1.5 pr-3">{formatDate(row.dueDate)}</td>
                <td className="py-1.5 pr-3 font-mono">{formatCurrency(due)}</td>
                <td className="py-1.5 pr-3 font-mono">{formatCurrency(Number(row.interestAmount || 0))}</td>
                <td className="py-1.5 pr-3 font-mono">{formatCurrency(Number(row.charges || 0))}</td>
                <td className="py-1.5 pr-3 font-mono">{formatCurrency(paid)} <span className="text-[#5A6B7D]">/ left {formatCurrency(outstanding)}</span></td>
                <td className="py-1.5 capitalize">{row.status || 'pending'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LineItems({ items }: { items: Detail['lineItems'] }) {
  if (!items?.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-[#5A6B7D]">
            <th className="py-1 pr-3">Item</th>
            <th className="py-1 pr-3">Qty</th>
            <th className="py-1">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-t border-[#0E1F1A]/8">
              <td className="py-1.5 pr-3">{item.description || item.name || 'Line'}</td>
              <td className="py-1.5 pr-3">{item.quantity ?? '—'}</td>
              <td className="py-1.5 font-mono">{item.amount != null ? formatCurrency(Number(item.amount)) : item.unitPrice != null ? formatCurrency(Number(item.unitPrice)) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function openStoredFile(fileUrl: string) {
  const url = fileUrl.startsWith('http') ? fileUrl : `${getApiBaseUrl()}${fileUrl}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${getAccessToken()}` } });
  if (!res.ok) throw new Error('Could not open the document');
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

export function DocumentLinks({ docs }: { docs: InstrumentDoc[] }) {
  if (!docs.length) {
    return <p className="text-xs text-[#5A6B7D]">No purchase note or receipt has been filed on this IOU yet. A purchase note is created when the receivable is assigned. A receipt is created when a repayment is recorded.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {docs.map((doc) => (
        <li key={doc.id}>
          <button
            type="button"
            className="text-xs font-semibold underline"
            onClick={() => void openStoredFile(doc.fileUrl).catch(() => toast.error('Could not open the document'))}
          >
            {DOC_LABEL[doc.docType] || doc.docType} · {formatDate(doc.uploadedAt)}
          </button>
        </li>
      ))}
    </ul>
  );
}
