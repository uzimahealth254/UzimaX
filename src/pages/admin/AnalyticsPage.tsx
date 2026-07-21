import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useState } from 'react';
import { FileText, DollarSign, TrendingUp, Building2, Factory, Landmark, Percent, CheckCircle2, CreditCard } from 'lucide-react';

type Tab = 'volume' | 'pipeline' | 'participants' | 'performance';

const CHART_COLORS = ['#0E1F1A', '#D3F36B', '#F0C419', '#5A6B7D', '#1A3A2E', '#8A6A00'];

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

  const pipelineData = Object.entries(data?.pipeline || {}).map(([name, value]) => ({ name, value }));
  const participantData = [
    { type: 'Suppliers', count: data?.participants.suppliers || 0 },
    { type: 'Buyers', count: data?.participants.buyers || 0 },
    { type: 'SPV', count: data?.participants.spv || 0 },
  ];

  if (isLoading || !data) {
    return (
      <div className="portal-page animate-fade-in">
        <PageHeader title="Analytics" subtitle="Live aggregations from Postgres" />
        <p className="text-xs text-[#5A6B7D] px-1">Loading analytics…</p>
      </div>
    );
  }

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader title="Analytics" subtitle="Live aggregations from Postgres" />

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">Reports</h2>
            <p className="portal-section__desc">Platform-wide metrics and trends</p>
          </div>
          <div className="flex gap-0 border-b border-[#0E1F1A]/10 w-full sm:w-auto overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 min-h-[34px] ${
                  tab === t.id
                    ? 'border-[#0E1F1A] text-[#0E1F1A]'
                    : 'border-transparent text-[#5A6B7D] hover:text-[#0E1F1A]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        <div className="portal-section__body--pad">
          {tab === 'volume' && (
            <div className="space-y-4">
              <div className="portal-metrics portal-metrics--3">
                <StatCard label="Total invoices" value={data.totals.invoices} icon={FileText} accent="forest" />
                <StatCard label="Face value" value={formatCurrency(data.totals.totalFaceValue)} icon={DollarSign} accent="lime" />
                <StatCard label="Assigned exposure" value={formatCurrency(data.totals.assignedFaceValue)} icon={TrendingUp} accent="gold" />
              </div>
              <div className="h-72 rounded-md border border-[#0E1F1A]/8 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyVolume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0E1F1A" strokeOpacity={0.08} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#5A6B7D' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#5A6B7D' }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0E1F1A" name="Face value" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tab === 'pipeline' && (
            <div className="h-80 rounded-md border border-[#0E1F1A]/8 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pipelineData} dataKey="value" nameKey="name" outerRadius={110} label>
                    {pipelineData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {tab === 'participants' && (
            <div className="portal-metrics portal-metrics--3">
              <StatCard label="Suppliers" value={participantData[0].count} icon={Factory} accent="forest" />
              <StatCard label="Buyers" value={participantData[1].count} icon={Building2} accent="lime" />
              <StatCard label="SPV" value={participantData[2].count} icon={Landmark} accent="gold" />
            </div>
          )}

          {tab === 'performance' && (
            <div className="portal-metrics portal-metrics--3">
              <StatCard label="Avg discount" value={`${data.performance.avgDiscountPct}%`} icon={Percent} accent="forest" />
              <StatCard label="Payment events" value={data.performance.paymentEvents} icon={CreditCard} accent="lime" />
              <StatCard label="Fully settled events" value={data.performance.settlementEvents} icon={CheckCircle2} accent="gold" />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
