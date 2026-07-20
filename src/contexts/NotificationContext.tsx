import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { useAuth } from './AuthContext';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  link?: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: (userId?: string) => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data.data,
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  const notifications: AppNotification[] = (data || []).map((n: any) => ({
    id: n.id,
    userId: n.userId,
    title: n.title,
    message: n.body || '',
    type: 'info',
    read: !!n.isRead,
    createdAt: n.createdAt,
  }));

  const addNotification = useCallback((_n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
    // Server-created; just refresh
    void qc.invalidateQueries({ queryKey: ['notifications'] });
  }, [qc]);

  const markAsRead = useCallback(async (id: string) => {
    await api.post(`/notifications/${id}/read`);
    void qc.invalidateQueries({ queryKey: ['notifications'] });
  }, [qc]);

  const markAllAsRead = useCallback(async (_userId?: string) => {
    await Promise.all(notifications.filter((n) => !n.read).map((n) => api.post(`/notifications/${n.id}/read`)));
    void qc.invalidateQueries({ queryKey: ['notifications'] });
  }, [notifications, qc]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAsRead, markAllAsRead, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be inside NotificationProvider');
  return ctx;
}
