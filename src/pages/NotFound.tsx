import { Link } from 'react-router-dom';
import { useAuth, getRoleRedirect } from '@/contexts/AuthContext';
import { ShieldCheck } from 'lucide-react';

export default function NotFound() {
  const { isAuthenticated, user } = useAuth();
  const home = isAuthenticated && user ? getRoleRedirect(user.role) : '/login';

  return (
    <div className="min-h-[100dvh] app-ambient flex flex-col items-center justify-center p-8 text-center">
      <div className="brand-mark w-14 h-14 mb-5 shadow-md">
        <ShieldCheck size={28} className="text-white" />
      </div>
      <h1 className="font-display text-4xl font-semibold text-primary mb-2">404</h1>
      <p className="text-muted-foreground mb-6 max-w-sm">This page is not on the IOU Exchange health-credit portal.</p>
      <Link to={home} className="btn-primary px-6 py-2.5 text-sm">
        {isAuthenticated ? 'Back to Dashboard' : 'Go to Sign In'}
      </Link>
    </div>
  );
}
