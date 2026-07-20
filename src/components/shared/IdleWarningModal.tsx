import { useAuth } from '@/contexts/AuthContext';
import { Clock } from 'lucide-react';

export default function IdleWarningModal() {
  const { showIdleWarning, dismissIdleWarning, logout } = useAuth();

  if (!showIdleWarning) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-card rounded-t-3xl sm:rounded-xl shadow-xl border p-5 sm:p-6 w-full sm:max-w-sm animate-fade-in text-center safe-pad-bottom">
        <div className="sm:hidden w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Clock size={24} className="text-amber-600" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Session Expiring</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your session will expire in 5 minutes due to inactivity. Would you like to stay signed in?
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-2.5">
          <button
            onClick={logout}
            className="flex-1 min-h-[48px] py-2.5 border rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
          >
            Sign Out
          </button>
          <button
            onClick={dismissIdleWarning}
            className="flex-1 min-h-[48px] py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Stay Signed In
          </button>
        </div>
      </div>
    </div>
  );
}
