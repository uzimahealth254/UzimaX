import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Profile completion nudge */
export default function ProfileCompletionCard({ className }: { className?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const checks = [
    { ok: !!user.name, label: 'Full name', required: true },
    { ok: !!user.email, label: 'Email', required: true },
    { ok: !!user.organisationName, label: 'Organisation', required: true },
    { ok: !!(user.organisationId && user.organisationId.length > 0), label: 'Organisation link', required: true },
  ];

  const filled = checks.filter(c => c.ok).length;
  const percentage = Math.round((filled / checks.length) * 100);
  const missing = checks.filter(c => c.required && !c.ok).map(c => c.label);
  const profilePath = `/${user.role}/profile`;

  if (percentage >= 100) {
    return (
      <div className={cn('surface-card border-l-[3px] border-l-[#D3F36B] px-3 py-2 flex items-center gap-2', className)}>
        <CheckCircle size={16} className="text-[#0E1F1A] shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#0E1F1A]">Profile complete</p>
          <p className="text-[11px] text-[#5A6B7D]">Account ready for trading.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('surface-card border-l-[3px] border-l-[#F0C419] px-3 py-2.5', className)}>
      <div className="flex items-start gap-2">
        <AlertCircle size={16} className="text-[#8A6A00] shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-xs font-bold text-[#0E1F1A]">Complete your profile</p>
            <span className="text-[11px] font-mono font-bold text-[#0E1F1A]">{percentage}%</span>
          </div>
          <div className="h-1 bg-[#0E1F1A]/10 rounded-full overflow-hidden mb-1.5">
            <div className="h-full bg-[#D3F36B] rounded-full transition-all" style={{ width: `${percentage}%` }} />
          </div>
          {missing.length > 0 && (
            <p className="text-[11px] text-[#5A6B7D] mb-1.5">Missing: {missing.join(', ')}</p>
          )}
          <button
            type="button"
            onClick={() => navigate(profilePath)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0E1F1A] hover:underline"
          >
            Go to settings <ArrowRight size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
