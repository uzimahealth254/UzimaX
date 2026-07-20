import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useState } from 'react';

type Tab = 'volume' | 'pipeline' | 'participants' | 'performance';

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('volume');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => (await api.get('/admin/analytics')).data as {
      totals: { invoices: number; totalFaceValue: number; assignedFaceValue: number; organisations: number; packages: number; paymentUpdates: number };
      pipeline: Record<string, number>;
      monthlyVolume: { month: string; count: number; value: number }[];
      participants: { suppliers: number; buyers: number; spv: number };
      performance: { avgDiscountPct: number; settlementEvents: number; paymentEvents: number };
    },
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'volume', label: 'Volume' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'participants', label: 'Participants' },
    { id: 'performance', label: 'Performance' },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6', '#14b8a6'];
  const pipelineData = Object.entries(data?.pipeline || {}).map(([name, value]) => ({ name, value }));
  const participantData = [
    { type: 'Suppliers', count: data?.participants.suppliers || 0 },
    { type: 'Buyers', count: data?.participants.buyers || 0 },
    { type: 'SPV', count: data?.participants.spv || 0 },
  ];

  if (isLoading || !data) {
    return <div className="p-8 text-sm text-muted-foreground">Loading analytics…</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Analytics" subtitle="Live aggregations from Postgres" />

      <div className="flex gap-1 border-b scroll-x-pad">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'volume' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card border-l-4 border-l-blue-500">
              <p className="text-sm text-muted-foreground">Total Invoices</p>
              <p className="text-2xl font-bold font-mono mt-1">{data.totals.invoices}</p>
            </div>
            <div className="stat-card border-l-4 border-l-primary">
              <p className="text-sm text-muted-foreground">Face value</p>
              <p className="text-2xl font-bold font-mono mt-1">{formatCurrency(data.totals.totalFaceValue)}</p>
            </div>
            <div className="stat-card border-l-4 border-l-accent">
              <p className="text-sm text-muted-foreground">Assigned exposure</p>
              <p className="text-2xl font-bold font-mono mt-1">{formatCurrency(data.totals.assignedFaceValue)}</p>
            </div>
          </div>
          <div className="h-72 border rounded-2xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyVolume}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0d9488" name="Face value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'pipeline' && (
        <div className="h-80 border rounded-2xl p-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pipelineData} dataKey="value" nameKey="name" outerRadius={110} label>
                {pipelineData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === 'participants' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {participantData.map((p) => (
            <div key={p.type} className="stat-card">
              <p className="text-sm text-muted-foreground">{p.type}</p>
              <p className="text-2xl font-bold font-mono mt-1">{p.count}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Avg discount</p>
            <p className="text-2xl font-bold font-mono mt-1">{data.performance.avgDiscountPct}%</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Payment events</p>
            <p className="text-2xl font-bold font-mono mt-1">{data.performance.paymentEvents}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Fully settled events</p>
            <p className="text-2xl font-bold font-mono mt-1">{data.performance.settlementEvents}</p>
          </div>
        </div>
      )}
    </div>
  );
}
