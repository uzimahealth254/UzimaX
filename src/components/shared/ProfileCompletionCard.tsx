import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Profile completion nudge — pattern adapted from Malipo Polepole */
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
      <div className={cn('rounded-xl border border-accent/30 bg-brand-green-light p-4 flex items-center gap-3', className)}>
        <CheckCircle size={20} className="text-accent shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Profile complete</p>
          <p className="text-xs text-muted-foreground">Your account details are ready for trading.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-primary/20 bg-brand-blue-light p-4', className)}>
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-semibold">Complete your profile</p>
            <span className="text-xs font-mono text-primary">{percentage}%</span>
          </div>
          <div className="h-1.5 bg-white/80 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percentage}%` }} />
          </div>
          {missing.length > 0 && (
            <p className="text-xs text-muted-foreground mb-3">Missing: {missing.join(', ')}</p>
          )}
          <button
            onClick={() => navigate(profilePath)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Go to profile <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
