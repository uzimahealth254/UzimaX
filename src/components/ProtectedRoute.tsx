import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
  allowedRole: UserRole;
  children: React.ReactNode;
}

export default function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== allowedRole) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return <>{children}</>;
}
