import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useData } from '@/hooks/usePlatformData';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { QuerySurface } from '@/components/shared/QueryState';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProgramsPage() {
  const { programs, organisations, refetchAll, loading, error } = useData();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    buyerOrgId: '',
    maxExposure: '100000000',
    buyerSublimit: '',
    maxTenorDays: '120',
    discountBandMinBps: '350',
    discountBandMaxBps: '650',
    effectiveFrom: '',
    expiresAt: '',
  });

  const buyers = organisations.filter((o: any) => (o.orgType || o.type) === 'buyer');

  const create = async () => {
    if (!form.name.trim()) {
      toast.error('Name required');
      return;
    }
    try {
      await api.post('/programmes', {
        name: form.name,
        buyerOrgId: form.buyerOrgId || null,
        maxExposure: Number(form.maxExposure),
        buyerSublimit: form.buyerSublimit ? Number(form.buyerSublimit) : null,
        maxTenorDays: Number(form.maxTenorDays),
        discountBandMinBps: Number(form.discountBandMinBps),
        discountBandMaxBps: Number(form.discountBandMaxBps),
        effectiveFrom: form.effectiveFrom || null,
        expiresAt: form.expiresAt || null,
      });
      toast.success('Programme created');
      setForm({ ...form, name: '', buyerSublimit: '', effectiveFrom: '', expiresAt: '' });
      qc.invalidateQueries({ queryKey: ['programmes'] });
      refetchAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Create failed');
    }
  };

  const toggleStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/programmes/${id}`, { status: status === 'active' ? 'paused' : 'active' });
      qc.invalidateQueries({ queryKey: ['programmes'] });
      refetchAll();
    } catch {
      toast.error('Update failed');
    }
  };

  const closeProgramme = async (id: string) => {
    try {
      await api.patch(`/programmes/${id}`, { status: 'closed' });
      toast.success('Programme closed');
      qc.invalidateQueries({ queryKey: ['programmes'] });
      refetchAll();
    } catch {
      toast.error('Close failed');
    }
  };

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader
        title="Financing programmes"
        subtitle="Buyer / open-market facility limits — enforced server-side on post, offer, and assignment"
      />

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Create programme</h2>
            <p className="portal-section__desc">Exposure, sublimit, tenor, discount band, and effective window</p>
          </div>
        </header>
        <div className="portal-section__body--pad">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="text-[10px] font-semibold text-[#5A6B7D]">Name</label>
              <input
                className="field-input mt-1 !min-h-[34px] text-xs"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="KBC Approved Payables"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#5A6B7D]">Buyer (optional)</label>
              <select
                className="field-input mt-1 !min-h-[34px] text-xs"
                value={form.buyerOrgId}
                onChange={(e) => setForm({ ...form, buyerOrgId: e.target.value })}
              >
                <option value="">Open market</option>
                {buyers.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#5A6B7D]">Max exposure (KES)</label>
              <input
                className="field-input mt-1 !min-h-[34px] text-xs font-mono"
                value={form.maxExposure}
                onChange={(e) => setForm({ ...form, maxExposure: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#5A6B7D]">Buyer sublimit (KES)</label>
              <input
                className="field-input mt-1 !min-h-[34px] text-xs font-mono"
                value={form.buyerSublimit}
                onChange={(e) => setForm({ ...form, buyerSublimit: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#5A6B7D]">Max tenor (days)</label>
              <input
                className="field-input mt-1 !min-h-[34px] text-xs font-mono"
                value={form.maxTenorDays}
                onChange={(e) => setForm({ ...form, maxTenorDays: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#5A6B7D]">Discount min/max bps</label>
              <div className="flex gap-2 mt-1">
                <input
                  className="field-input !min-h-[34px] text-xs font-mono"
                  value={form.discountBandMinBps}
                  onChange={(e) => setForm({ ...form, discountBandMinBps: e.target.value })}
                />
                <input
                  className="field-input !min-h-[34px] text-xs font-mono"
                  value={form.discountBandMaxBps}
                  onChange={(e) => setForm({ ...form, discountBandMaxBps: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#5A6B7D]">Effective from</label>
              <input
                type="date"
                className="field-input mt-1 !min-h-[34px] text-xs"
                value={form.effectiveFrom}
                onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#5A6B7D]">Expires</label>
              <input
                type="date"
                className="field-input mt-1 !min-h-[34px] text-xs"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={create}
                className="w-full sm:w-auto min-h-[36px] px-3 py-2 rounded-lg bg-[#0E1F1A] text-white text-xs font-bold hover:bg-[#1A3A2E]"
              >
                Create programme
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Active programmes</h2>
            <p className="portal-section__desc">{programs.length} programme{programs.length === 1 ? '' : 's'}</p>
          </div>
        </header>
        <div className="portal-section__body--pad">
          <QuerySurface
            loading={loading}
            error={error}
            onRetry={refetchAll}
            isEmpty={programs.length === 0}
            empty={
              <EmptyState
                compact
                title="No programmes yet"
                description="Create one using the form above. Limits are hard-blocked on invoice post, offers, and assignment."
              />
            }
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {programs.map(p => {
                const pct = Math.min(100, Math.round((p.utilised / (p.maxFacility || 1)) * 100));
                return (
                  <div key={p.id} className="rounded-md border border-[#0E1F1A]/8 p-3 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#0E1F1A] truncate">{p.name}</p>
                        <p className="text-[11px] text-[#5A6B7D]">{p.buyerName || 'Open market'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <button type="button" onClick={() => toggleStatus(p.id, p.status)} title="Pause / activate">
                          <StatusBadge status={p.status} />
                        </button>
                        {p.status !== 'closed' && (
                          <button
                            type="button"
                            className="text-[10px] font-bold text-[#5A6B7D] hover:text-[#0E1F1A] underline"
                            onClick={() => closeProgramme(p.id)}
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-[#5A6B7D] font-semibold">Utilisation</span>
                        <span className="font-mono font-bold text-[#0E1F1A]">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#0E1F1A]/8 overflow-hidden">
                        <div className="h-full bg-[#D3F36B]" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[11px] mt-1.5 font-mono text-[#5A6B7D]">
                        {formatCurrency(p.utilised)} / {formatCurrency(p.maxFacility)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                        <p className="text-[10px] font-semibold text-[#5A6B7D]">Discount band</p>
                        <p className="font-mono font-bold text-[#0E1F1A] mt-0.5">{p.discountMin}% – {p.discountMax}%</p>
                      </div>
                      <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                        <p className="text-[10px] font-semibold text-[#5A6B7D]">Max tenor</p>
                        <p className="font-mono font-bold text-[#0E1F1A] mt-0.5">{p.maxTenorDays} days</p>
                      </div>
                      {p.buyerSublimit != null && (
                        <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                          <p className="text-[10px] font-semibold text-[#5A6B7D]">Buyer sublimit</p>
                          <p className="font-mono font-bold text-[#0E1F1A] mt-0.5">{formatCurrency(p.buyerSublimit)}</p>
                        </div>
                      )}
                      {(p.effectiveFrom || p.expiresAt) && (
                        <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2">
                          <p className="text-[10px] font-semibold text-[#5A6B7D]">Window</p>
                          <p className="font-mono text-[10px] font-bold text-[#0E1F1A] mt-0.5">
                            {p.effectiveFrom || '…'} → {p.expiresAt || 'open'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </QuerySurface>
        </div>
      </section>
    </div>
  );
}
