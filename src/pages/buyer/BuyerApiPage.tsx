import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { toast } from 'sonner';
import { Copy, KeyRound, Plus, ShieldAlert, Ban } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

type ApiKeyRow = {
  id: string;
  label: string | null;
  keyPrefix: string;
  isActive: boolean | null;
  createdAt: string;
};

export default function BuyerApiPage({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [label, setLabel] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyRow | null>(null);

  const keysQ = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => (await api.get('/api-keys')).data.data as ApiKeyRow[],
  });

  const createKey = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api-keys', { label: label.trim() || undefined });
      return data as { apiKey: string; keyPrefix: string; message?: string };
    },
    onSuccess: (data) => {
      setNewKey(data.apiKey);
      setLabel('');
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Failed to create API key');
    },
  });

  const revokeKey = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/api-keys/${id}/revoke`);
    },
    onSuccess: () => {
      toast.success('API key revoked');
      setRevokeTarget(null);
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Revoke failed');
    },
  });

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

  const body = (
    <>
      <div className="portal-callout flex items-start gap-2 !mx-0">
        <ShieldAlert size={14} className="shrink-0 mt-0.5" />
        <p>
          API keys are issued at provisioning and stored as hashes only. Copy new keys immediately — they are shown once.
        </p>
      </div>

      <div className={embedded ? 'mt-3 space-y-3' : 'portal-section mt-3'}>
        {!embedded && (
          <header className="portal-section__head">
            <div>
              <h2 className="portal-section__title">API keys</h2>
              <p className="portal-section__desc">{(keysQ.data || []).length} keys for this organisation</p>
            </div>
          </header>
        )}
        {embedded && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6B7D]">API keys</p>
        )}
        <div className={embedded ? 'space-y-3' : 'portal-section__body--pad space-y-3'}>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1 min-w-0">
              <label className="text-[10px] font-semibold text-[#5A6B7D]">Label (optional)</label>
              <input
                className="field-input mt-1 !min-h-[34px] text-xs w-full"
                placeholder="AfyaX production"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <button
              type="button"
              disabled={createKey.isPending}
              onClick={() => createKey.mutate()}
              className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3 py-2 rounded-lg bg-[#0E1F1A] text-white text-xs font-bold hover:bg-[#1A3A2E] disabled:opacity-50 shrink-0"
            >
              <Plus size={13} />
              {createKey.isPending ? 'Creating…' : 'Create key'}
            </button>
          </div>

          <div className={embedded ? '' : '[&_.surface-card]:border [&_.surface-card]:border-[#0E1F1A]/6 [&_.surface-card]:rounded-lg'}>
            <DataTable
              data={keysQ.data || []}
              emptyMessage="No API keys yet"
              getRowKey={(k) => k.id}
              columns={[
                {
                  key: 'prefix',
                  header: 'Prefix',
                  primary: true,
                  render: (k) => (
                    <div>
                      <p className="font-mono text-xs font-semibold">{k.keyPrefix}…</p>
                      {k.label && <p className="text-[11px] text-[#5A6B7D]">{k.label}</p>}
                    </div>
                  ),
                },
                {
                  key: 'created',
                  header: 'Created',
                  hideOnMobile: true,
                  render: (k) => (
                    <span className="text-[11px] font-mono text-[#5A6B7D]">
                      {new Date(k.createdAt).toLocaleString()}
                    </span>
                  ),
                },
                {
                  key: 'revoked',
                  header: 'Status',
                  render: (k) => (
                    <span className={`text-xs font-semibold ${k.isActive ? 'text-[#0E1F1A]' : 'text-red-600'}`}>
                      {k.isActive ? 'Active' : 'Revoked'}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  render: (k) => (
                    k.isActive ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setRevokeTarget(k); }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 min-h-[34px] px-1"
                      >
                        <Ban size={12} /> Revoke
                      </button>
                    ) : null
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <KeyRound size={13} className="text-[#0E1F1A] shrink-0" />
            <p className="text-xs font-bold text-[#0E1F1A] truncate">POST /api/v1/external/invoices</p>
          </div>
          <button
            type="button"
            onClick={() => copy(curl)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0E1F1A] min-h-[32px] px-2.5 rounded-md hover:bg-white border border-[#0E1F1A]/10"
          >
            <Copy size={12} /> Copy
          </button>
        </div>
        <pre className="mt-2 text-[10px] sm:text-[11px] font-mono overflow-x-auto scroll-touch bg-[#0E1F1A] text-[#D3F36B]/90 rounded-md p-2.5 sm:p-3 max-w-full whitespace-pre leading-relaxed">
          {curl}
        </pre>
      </div>

      {newKey && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setNewKey(null)} />
          <div className="relative bg-white rounded-xl border border-[#0E1F1A]/10 shadow-none p-6 w-full sm:max-w-md animate-fade-in safe-pad-bottom">
            <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/20 mb-4 sm:hidden" />
            <h2 className="text-lg font-semibold mb-2">Save your API key</h2>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Copy this key now — it will not be shown again.
            </p>
            <div className="rounded-lg bg-[#0E1F1A] p-3 mb-4">
              <code className="text-[11px] font-mono text-[#D3F36B]/90 break-all">{newKey}</code>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setNewKey(null)}
                className="min-h-[48px] px-4 text-sm font-medium rounded-xl border border-white/60 bg-white/50 hover:bg-white/80 transition-colors"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => copy(newKey)}
                className="min-h-[48px] px-4 text-sm font-semibold rounded-xl btn-primary shadow-md inline-flex items-center justify-center gap-2"
              >
                <Copy size={14} /> Copy key
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        open={!!revokeTarget}
        title="Revoke API key?"
        description={`Key prefix ${revokeTarget?.keyPrefix}… will stop working immediately.`}
        confirmLabel="Revoke"
        variant="destructive"
        onCancel={() => setRevokeTarget(null)}
        onConfirm={() => revokeTarget && revokeKey.mutate(revokeTarget.id)}
      />
    </>
  );

  if (embedded) return <div className="space-y-2">{body}</div>;

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Buyer / AfyaX API"
        subtitle="Programmatic invoice upload via API key"
      />
      {body}
    </div>
  );
}
