import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useData } from '@/hooks/usePlatformData';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProgramsPage() {
  const { programs, organisations, refetchAll } = useData();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    buyerOrgId: '',
    maxExposure: '100000000',
    maxTenorDays: '120',
    discountBandMinBps: '350',
    discountBandMaxBps: '650',
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
        maxTenorDays: Number(form.maxTenorDays),
        discountBandMinBps: Number(form.discountBandMinBps),
        discountBandMaxBps: Number(form.discountBandMaxBps),
      });
      toast.success('Programme created');
      setForm({ ...form, name: '' });
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

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Financing programmes"
        subtitle="Buyer / open-market facility limits and pricing bands"
      />

      <div className="border rounded-2xl p-5 grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground">Name</label>
          <input className="block w-full border rounded-lg px-3 py-2 text-sm" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="KBC Approved Payables" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Buyer (optional)</label>
          <select className="block w-full border rounded-lg px-3 py-2 text-sm" value={form.buyerOrgId}
            onChange={(e) => setForm({ ...form, buyerOrgId: e.target.value })}>
            <option value="">Open market</option>
            {buyers.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Max exposure (KES)</label>
          <input className="block w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.maxExposure}
            onChange={(e) => setForm({ ...form, maxExposure: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Max tenor (days)</label>
          <input className="block w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.maxTenorDays}
            onChange={(e) => setForm({ ...form, maxTenorDays: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Discount min/max bps</label>
          <div className="flex gap-2">
            <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.discountBandMinBps}
              onChange={(e) => setForm({ ...form, discountBandMinBps: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.discountBandMaxBps}
              onChange={(e) => setForm({ ...form, discountBandMaxBps: e.target.value })} />
          </div>
        </div>
        <div className="flex items-end">
          <button type="button" onClick={create} className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
            Create programme
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {programs.map(p => {
          const pct = Math.min(100, Math.round((p.utilised / (p.maxFacility || 1)) * 100));
          return (
            <div key={p.id} className="border rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.buyerName || 'Open market'}</p>
                </div>
                <button type="button" onClick={() => toggleStatus(p.id, p.status)}>
                  <StatusBadge status={p.status} />
                </button>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Utilisation</span>
                  <span className="font-mono">{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs mt-2 font-mono text-muted-foreground">
                  {formatCurrency(p.utilised)} / {formatCurrency(p.maxFacility)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Discount band</p>
                  <p className="font-mono">{p.discountMin}% – {p.discountMax}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Max tenor</p>
                  <p className="font-mono">{p.maxTenorDays} days</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
