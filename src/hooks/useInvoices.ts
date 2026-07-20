import { useMemo } from 'react';
import { useData } from '@/hooks/usePlatformData';
import { useAuth } from '@/contexts/AuthContext';
import { Invoice, InvoiceStatus } from '@/types';

export function useInvoices(filters?: { status?: InvoiceStatus | InvoiceStatus[]; supplierId?: string; buyerId?: string }) {
  const { invoices } = useData();
  const { user } = useAuth();

  return useMemo(() => {
    let result = [...invoices];

    if (filters?.supplierId) {
      result = result.filter(inv => inv.supplierId === filters.supplierId);
    } else if (filters?.buyerId) {
      result = result.filter(inv => inv.buyerId === filters.buyerId);
    } else if (user?.role === 'supplier') {
      result = result.filter(inv => inv.supplierId === user.organisationId);
    } else if (user?.role === 'buyer') {
      result = result.filter(inv => inv.buyerId === user.organisationId);
    }

    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      result = result.filter(inv => statuses.includes(inv.status));
    }

    return result;
  }, [invoices, user, filters?.status, filters?.supplierId, filters?.buyerId]);
}
