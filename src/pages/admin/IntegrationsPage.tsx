import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';

const EVENT_OPTIONS = [
  'iou.created',
  'iou.status_changed',
  'iou.assigned',
  'iou.acquired',
  'iou.disbursed',
  'iou.payment_updated',
  'iou.settled',
];

type IntegrationRow = {
  platformOrgId: string;
  name: string;
  uzimaPartyId: string;
  integration: {
    id: string;
    webhookFormat?: string;
    sandboxBaseUrl: string | null;
    productionBaseUrl: string | null;
    sandboxWebhookUrl: string | null;
    productionWebhookUrl: string | null;
    sandboxLifecycleWebhookUrl: string | null;
    productionLifecycleWebhookUrl: string | null;
    activeEnvironment: string;
    enabledEvents: string[];
    isActive: boolean;
    webhookSecretSet?: boolean;
  } | null;
};

export default function IntegrationsPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    webhookFormat: 'afyax_purchase' as 'afyax_purchase' | 'ioux_envelope',
    sandboxBaseUrl: '',
    productionBaseUrl: '',
    sandboxWebhookUrl: '',
    productionWebhookUrl: '',
    sandboxLifecycleWebhookUrl: '',
    productionLifecycleWebhookUrl: '',
    webhookSecret: '',
    activeEnvironment: 'sandbox' as 'sandbox' | 'production',
    isActive: true,
    enabledEvents: [...EVENT_OPTIONS],
  });
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);

  const integrationsQ = useQuery({
    queryKey: ['admin-integrations'],
    queryFn: async () => (await api.get('/admin/integrations')).data.data as IntegrationRow[],
  });

  const deliveriesQ = useQuery({
    queryKey: ['admin-webhook-deliveries'],
    queryFn: async () => (await api.get('/admin/webhook-deliveries?limit=40')).data.data,
  });

  const activityQ = useQuery({
    queryKey: ['admin-integration-activity'],
    queryFn: async () => (await api.get('/admin/integration/activity')).data,
  });

  const selected = integrationsQ.data?.find((r) => r.platformOrgId === selectedId) || integrationsQ.data?.[0];

  useEffect(() => {
    if (!selectedId && integrationsQ.data?.[0]) {
      setSelectedId(integrationsQ.data[0].platformOrgId);
    }
  }, [integrationsQ.data, selectedId]);

  useEffect(() => {
    if (!selected) return;
    const cfg = selected.integration;
    setForm({
      webhookFormat: (cfg?.webhookFormat as 'afyax_purchase' | 'ioux_envelope') || 'afyax_purchase',
      sandboxBaseUrl: cfg?.sandboxBaseUrl || '',
      productionBaseUrl: cfg?.productionBaseUrl || '',
      sandboxWebhookUrl: cfg?.sandboxWebhookUrl || '',
      productionWebhookUrl: cfg?.productionWebhookUrl || '',
      sandboxLifecycleWebhookUrl: cfg?.sandboxLifecycleWebhookUrl || '',
      productionLifecycleWebhookUrl: cfg?.productionLifecycleWebhookUrl || '',
      webhookSecret: '',
      activeEnvironment: (cfg?.activeEnvironment as 'sandbox' | 'production') || 'sandbox',
      isActive: cfg?.isActive ?? true,
      enabledEvents: cfg?.enabledEvents?.length ? cfg.enabledEvents : [...EVENT_OPTIONS],
    });
  }, [selected?.platformOrgId, selected?.integration?.id]);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        webhookFormat: form.webhookFormat,
        sandboxBaseUrl: form.sandboxBaseUrl || null,
        productionBaseUrl: form.productionBaseUrl || null,
        sandboxWebhookUrl: form.sandboxWebhookUrl || null,
        productionWebhookUrl: form.productionWebhookUrl || null,
        sandboxLifecycleWebhookUrl: form.sandboxLifecycleWebhookUrl || null,
        productionLifecycleWebhookUrl: form.productionLifecycleWebhookUrl || null,
        activeEnvironment: form.activeEnvironment,
        isActive: form.isActive,
        enabledEvents: form.enabledEvents,
      };
      if (form.webhookSecret.trim().length >= 16) {
        body.webhookSecret = form.webhookSecret.trim();
      }
      const res = await api.put(`/admin/integrations/${selected.platformOrgId}`, body);
      toast.success('Integration settings saved');
      qc.invalidateQueries({ queryKey: ['admin-integrations'] });
      if (res.data?.webhookSecretPlain) {
        setForm((f) => ({ ...f, webhookSecret: res.data.webhookSecretPlain }));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const rotateSecret = async () => {
    if (!selected) return;
    setRotating(true);
    try {
      if (!selected.integration) {
        const secret = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
        setForm((f) => ({ ...f, webhookSecret: secret }));
        toast.success('Secret generated — click Save configuration to store it');
        return;
      }
      const { data } = await api.post(`/admin/integrations/${selected.platformOrgId}/rotate-secret`);
      setForm((f) => ({ ...f, webhookSecret: data.webhookSecret }));
      toast.success('New webhook secret generated — copy it now');
      qc.invalidateQueries({ queryKey: ['admin-integrations'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Rotate failed');
    } finally {
      setRotating(false);
    }
  };

  const retryDelivery = async (id: string) => {
    try {
      await api.post(`/admin/webhook-deliveries/${id}/retry`);
      toast.success('Retry sent');
      qc.invalidateQueries({ queryKey: ['admin-webhook-deliveries'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Retry failed');
    }
  };

  const pipeline = activityQ.data?.pipeline;

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="AfyaX & platform integrations"
        subtitle="Webhook URLs, secrets, delivery log, and pipeline activity for Sule to connect AfyaX"
      />

      {pipeline && (
        <div className="portal-metrics mb-4">
          {[
            { label: 'Total IOUs', value: pipeline.posted },
            { label: 'Awaiting opt-in', value: pipeline.awaitingOptIn },
            { label: 'Awaiting verify', value: pipeline.awaitingBuyerVerification },
            { label: 'Assigned', value: pipeline.assigned },
            { label: 'Settled', value: pipeline.settled },
            { label: 'Payments synced', value: pipeline.paymentsRecorded },
          ].map((s) => (
            <div key={s.label} className="portal-metric">
              <p className="portal-metric__label">{s.label}</p>
              <p className="portal-metric__value">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="portal-section lg:col-span-1">
          <h2 className="portal-section__title">Platform orgs</h2>
          <p className="portal-section__desc">Register AfyaX under Users & Orgs → type Platform, then issue API key.</p>
          <div className="space-y-2 mt-3">
            {(integrationsQ.data || []).map((row) => (
              <button
                key={row.platformOrgId}
                type="button"
                onClick={() => setSelectedId(row.platformOrgId)}
                className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  selected?.platformOrgId === row.platformOrgId
                    ? 'border-[#D3F36B] bg-[#F4FBE3]'
                    : 'border-[#0E1F1A]/10 hover:bg-[#0E1F1A]/5'
                }`}
              >
                <p className="font-semibold text-[#0E1F1A]">{row.name}</p>
                <p className="font-mono text-[10px] text-[#5A6B7D]">{row.uzimaPartyId}</p>
                <p className="text-[10px] mt-1">
                  {row.integration ? (
                    <StatusBadge status={row.integration.isActive ? 'active' : 'suspended'} />
                  ) : (
                    <span className="text-amber-700">Not configured</span>
                  )}
                </p>
              </button>
            ))}
            {!integrationsQ.data?.length && (
              <p className="text-xs text-[#5A6B7D]">No platform organisations yet.</p>
            )}
          </div>
        </section>

        <section className="portal-section lg:col-span-2">
          <h2 className="portal-section__title">Webhook configuration</h2>
          {selected ? (
            <div className="grid gap-3 mt-3">
              <label className="block">
                <span className="text-[11px] font-semibold">Webhook format</span>
                <select
                  className="portal-input mt-1 w-full"
                  value={form.webhookFormat}
                  onChange={(e) => setForm({ ...form, webhookFormat: e.target.value as 'afyax_purchase' | 'ioux_envelope' })}
                >
                  <option value="afyax_purchase">AfyaX purchase (POST /api/v1/iou/purchase)</option>
                  <option value="ioux_envelope">IOUX signed envelope (generic)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold">Sandbox base URL (AfyaX)</span>
                <input
                  className="portal-input mt-1 w-full"
                  value={form.sandboxBaseUrl}
                  onChange={(e) => setForm({ ...form, sandboxBaseUrl: e.target.value })}
                  placeholder="https://manager.smplystore.com"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold">Sandbox purchase webhook URL (optional override)</span>
                <input
                  className="portal-input mt-1 w-full"
                  value={form.sandboxWebhookUrl}
                  onChange={(e) => setForm({ ...form, sandboxWebhookUrl: e.target.value })}
                  placeholder="https://manager.smplystore.com/api/v1/iou/purchase"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold">Sandbox lifecycle webhook URL (iou.created, payment_updated, etc.)</span>
                <input
                  className="portal-input mt-1 w-full"
                  value={form.sandboxLifecycleWebhookUrl}
                  onChange={(e) => setForm({ ...form, sandboxLifecycleWebhookUrl: e.target.value })}
                  placeholder="Ask Sule — not in purchase doc yet"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold">Production base URL</span>
                <input
                  className="portal-input mt-1 w-full"
                  value={form.productionBaseUrl}
                  onChange={(e) => setForm({ ...form, productionBaseUrl: e.target.value })}
                  placeholder="https://vendor.afyax.health"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold">Production purchase webhook URL</span>
                <input
                  className="portal-input mt-1 w-full"
                  value={form.productionWebhookUrl}
                  onChange={(e) => setForm({ ...form, productionWebhookUrl: e.target.value })}
                  placeholder="https://vendor.afyax.health/api/v1/iou/purchase"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold">Production lifecycle webhook URL</span>
                <input
                  className="portal-input mt-1 w-full"
                  value={form.productionLifecycleWebhookUrl}
                  onChange={(e) => setForm({ ...form, productionLifecycleWebhookUrl: e.target.value })}
                  placeholder="Ask Sule — lifecycle events"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] font-semibold">Active environment</span>
                  <select
                    className="portal-input mt-1 w-full"
                    value={form.activeEnvironment}
                    onChange={(e) => setForm({ ...form, activeEnvironment: e.target.value as 'sandbox' | 'production' })}
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="production">Production</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  <span className="text-xs font-medium">Integration active</span>
                </label>
              </div>
              <label className="block">
                <span className="text-[11px] font-semibold">Webhook HMAC secret (min 16 chars — share with Sule)</span>
                <p className="text-[10px] text-[#5A6B7D] mt-0.5 mb-1">
                  Type your own secret, or click <strong>Generate secret</strong>, then <strong>Save configuration</strong>. Copy it to <code className="font-mono">.env</code> as <code className="font-mono">IOUX_WEBHOOK_SECRET</code>.
                </p>
                <input
                  className="portal-input mt-1 w-full font-mono text-xs"
                  value={form.webhookSecret}
                  onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
                  placeholder={selected.integration?.webhookSecretSet ? '•••••• (leave blank to keep)' : 'Generate on save or rotate'}
                />
              </label>
              <div>
                <p className="text-[11px] font-semibold mb-2">Enabled events</p>
                <div className="flex flex-wrap gap-2">
                  {EVENT_OPTIONS.map((ev) => (
                    <label key={ev} className="inline-flex items-center gap-1 text-[10px] bg-[#0E1F1A]/5 rounded px-2 py-1">
                      <input
                        type="checkbox"
                        checked={form.enabledEvents.includes(ev)}
                        onChange={(e) => {
                          setForm((f) => ({
                            ...f,
                            enabledEvents: e.target.checked
                              ? [...f.enabledEvents, ev]
                              : f.enabledEvents.filter((x) => x !== ev),
                          }));
                        }}
                      />
                      {ev}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-4 mt-2 border-t border-[#0E1F1A]/10 sticky bottom-0 bg-white py-3 z-10">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#D3F36B] text-[#0E1F1A] text-sm font-bold hover:bg-[#C5E85A] disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'Saving…' : 'Save configuration'}
                </button>
                <button
                  type="button"
                  disabled={rotating}
                  onClick={() => void rotateSecret()}
                  className="min-h-[44px] px-5 py-2.5 rounded-lg border-2 border-[#0E1F1A] text-[#0E1F1A] text-sm font-bold hover:bg-[#0E1F1A]/5 disabled:opacity-50"
                >
                  {rotating ? 'Generating…' : 'Generate secret'}
                </button>
              </div>
              <p className="text-[10px] text-[#5A6B7D]">
                <strong>AfyaX purchase mode:</strong> IOUX POSTs to <code className="font-mono">/api/v1/iou/purchase</code> when an IOU is assigned to SPV.
                Lifecycle events need a separate URL from Sule. IP whitelist required on AfyaX side.
              </p>
            </div>
          ) : (
            <p className="text-xs text-[#5A6B7D] mt-3">Select a platform organisation.</p>
          )}
        </section>
      </div>

      <section className="portal-section mt-4">
        <h2 className="portal-section__title">Recent webhook deliveries</h2>
        <DataTable
          columns={[
            { key: 'event', header: 'Event', primary: true, render: (r: any) => <span className="font-mono text-xs">{r.eventType}</span> },
            { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
            { key: 'http', header: 'HTTP', hideOnMobile: true, render: (r: any) => r.httpStatus || '—' },
            { key: 'attempts', header: 'Tries', render: (r: any) => r.attempts },
            { key: 'when', header: 'When', hideOnMobile: true, render: (r: any) => new Date(r.createdAt).toLocaleString() },
            {
              key: 'act',
              header: '',
              render: (r: any) => r.status === 'failed' ? (
                <button type="button" className="text-[10px] font-bold text-[#0E1F1A]" onClick={() => void retryDelivery(r.id)}>
                  Retry
                </button>
              ) : null,
            },
          ]}
          data={deliveriesQ.data || []}
          emptyMessage="No outbound webhooks yet — events fire when AfyaX pushes IOUs and lifecycle changes occur."
        />
      </section>
    </div>
  );
}
