import { useMemo } from 'react';
import { useData } from '@/hooks/usePlatformData';
import { OfferStatus } from '@/types';

export function useOffers(filters?: { status?: OfferStatus | OfferStatus[]; supplierId?: string }) {
  const { offers } = useData();

  return useMemo(() => {
    let result = [...offers];
    if (filters?.supplierId) {
      result = result.filter(o => o.supplierId === filters.supplierId);
    }
    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      result = result.filter(o => statuses.includes(o.status));
    }
    return result;
  }, [offers, filters?.status, filters?.supplierId]);
}
