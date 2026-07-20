import { Link } from 'react-router-dom';
import { useAuth, getRoleRedirect } from '@/contexts/AuthContext';
import { ShieldCheck } from 'lucide-react';

export default function NotFound() {
  const { isAuthenticated, user } = useAuth();
  const home = isAuthenticated && user ? getRoleRedirect(user.role) : '/login';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <ShieldCheck size={48} className="text-primary mb-4" />
      <h1 className="font-display text-4xl font-bold mb-2">404</h1>
      <p className="text-muted-foreground mb-6">This page does not exist on the Uzima Platform.</p>
      <Link
        to={home}
        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        {isAuthenticated ? 'Back to Dashboard' : 'Go to Sign In'}
      </Link>
    </div>
  );
}
