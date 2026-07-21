import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { fetchMe, loginApi, logoutApi, getAccessToken, setTokens, type UzimaUser } from '@/lib/apiClient';

interface AuthContextType {
  user: UzimaUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<UzimaUser, 'name' | 'email' | 'mustChangePassword'>>) => void;
  showIdleWarning: boolean;
  dismissIdleWarning: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const IDLE_WARNING_MS = 25 * 60 * 1000;

export function getRoleRedirect(role: string): string {
  return { supplier: '/supplier', buyer: '/buyer', spv: '/spv', admin: '/admin' }[role] || '/login';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UzimaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIdleWarning, setShowIdleWarning] = useState(false);

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      return;
    }
    const me = await fetchMe();
    setUser(me);
  }, []);

  useEffect(() => {
    (async () => {
      if (!getAccessToken()) {
        setLoading(false);
        return;
      }
      try {
        await refreshUser();
      } catch {
        setTokens(null, null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

  const logout = useCallback(() => {
    void logoutApi();
    setUser(null);
    setShowIdleWarning(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    let idleTimer: ReturnType<typeof setTimeout>;
    let warnTimer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(idleTimer);
      clearTimeout(warnTimer);
      setShowIdleWarning(false);
      warnTimer = setTimeout(() => setShowIdleWarning(true), IDLE_WARNING_MS);
      idleTimer = setTimeout(logout, IDLE_TIMEOUT_MS);
    };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      clearTimeout(idleTimer);
      clearTimeout(warnTimer);
    };
  }, [user, logout]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await loginApi(email, password);
      setUser(data.user);
      return { success: true, role: data.user.role };
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string; code?: string };
      const msg = ax.response?.data?.message
        || (ax.code === 'ERR_NETWORK' ? 'Cannot reach the IOU Exchange API. Check your connection or try again later.' : null)
        || ax.message
        || 'Login failed';
      return { success: false, error: msg };
    }
  }, []);

  const updateProfile = useCallback((updates: Partial<Pick<UzimaUser, 'name' | 'email' | 'mustChangePassword'>>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      login,
      logout,
      refreshUser,
      updateProfile,
      showIdleWarning,
      dismissIdleWarning: () => setShowIdleWarning(false),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
