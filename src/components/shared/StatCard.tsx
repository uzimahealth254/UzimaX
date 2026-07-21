import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  accent?: 'lime' | 'gold' | 'forest' | 'red' | 'blue' | 'green' | 'teal';
}

const accentMap = {
  lime: {
    bar: 'bg-[#D3F36B]',
    soft: 'bg-[#D3F36B]/25',
    icon: 'text-[#0E1F1A]',
  },
  gold: {
    bar: 'bg-[#F0C419]',
    soft: 'bg-[#FFF8E0]',
    icon: 'text-[#8A6A00]',
  },
  forest: {
    bar: 'bg-[#0E1F1A]',
    soft: 'bg-[#0E1F1A]/10',
    icon: 'text-[#0E1F1A]',
  },
  red: {
    bar: 'bg-red-500',
    soft: 'bg-red-50',
    icon: 'text-red-600',
  },
  blue: {
    bar: 'bg-[#0E1F1A]',
    soft: 'bg-[#0E1F1A]/10',
    icon: 'text-[#0E1F1A]',
  },
  green: {
    bar: 'bg-[#D3F36B]',
    soft: 'bg-[#D3F36B]/25',
    icon: 'text-[#0E1F1A]',
  },
  teal: {
    bar: 'bg-[#F0C419]',
    soft: 'bg-[#FFF8E0]',
    icon: 'text-[#8A6A00]',
  },
};

export default function StatCard({ label, value, icon: Icon, change, accent = 'lime' }: StatCardProps) {
  const styles = accentMap[accent] || accentMap.lime;
  return (
    <div className="stat-card relative overflow-hidden">
      <div className={cn('absolute left-0 top-0 bottom-0 w-0.5', styles.bar)} />
      <div className="flex items-center justify-between gap-2 pl-1.5">
        <div className="min-w-0">
          <p className="text-[11px] text-[#5A6B7D] font-semibold truncate leading-tight">{label}</p>
          <p className="text-lg sm:text-xl font-extrabold text-[#0E1F1A] tracking-tight mt-0.5 leading-none">{value}</p>
          {change && <p className="text-[10px] text-[#5A6B7D] mt-1 font-semibold truncate">{change}</p>}
        </div>
        <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0', styles.soft)}>
          <Icon size={14} strokeWidth={1.75} className={styles.icon} />
        </div>
      </div>
    </div>
  );
}
