import { type LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={`portal-empty flex flex-col items-center justify-center text-center ${compact ? 'py-6' : 'py-10'}`}>
      <div className="w-10 h-10 rounded-lg bg-[#f7faf6] border border-[#0E1F1A]/8 flex items-center justify-center mb-2.5">
        <Icon size={18} className="text-[#5A6B7D]" />
      </div>
      <h3 className="text-xs font-bold text-[#0E1F1A]">{title}</h3>
      {description && <p className="text-[11px] text-[#5A6B7D] mt-0.5 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
