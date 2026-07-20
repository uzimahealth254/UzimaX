import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/layout/PageHeader';
import { toast } from 'sonner';
import { Copy, KeyRound, ShieldAlert } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export default function BuyerApiPage() {
  const { user } = useAuth();

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  const curl = `curl -X POST ${API_BASE}/api/v1/external/invoices \\
  -H "X-API-Key: <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "invoiceNumber": "INV-ERP-1001",
    "supplierPartyId": "<UZ-SUP-...>",
    "buyerPartyId": "${user?.uzimaPartyId || '<UZ-BUY-...>'}",
    "faceValue": 2500000,
    "currency": "KES",
    "issueDate": "2026-07-01",
    "dueDate": "2026-09-30",
    "description": "Confirmed payable from ERP / AfyaX"
  }'`;

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <PageHeader title="Buyer / AfyaX API" subtitle="Upload confirmed invoices via API key" />
      <div className="border rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound size={16} className="text-primary" /> API authentication
        </div>
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-600" />
          <p>
            API keys are issued once at provisioning and stored only as hashes. They are never embedded in the portal.
            Local demo keys are printed by <code className="font-mono text-xs">npm run db:seed</code> — rotate before any production use.
          </p>
        </div>
        <button type="button" onClick={() => copy(curl)} className="inline-flex items-center justify-center gap-2 text-sm text-primary min-h-[44px]">
          <Copy size={14} /> Copy sample curl
        </button>
      </div>
      <pre className="text-[10px] sm:text-[11px] font-mono overflow-x-auto scroll-touch bg-slate-950 text-slate-100 rounded-xl p-3 sm:p-4 max-w-full whitespace-pre">{curl}</pre>
    </div>
  );
}
