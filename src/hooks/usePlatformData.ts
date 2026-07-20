import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';

type Actor = { userId: string; userName: string };

interface ApiDataContextType {
  invoices: any[];
  offers: any[];
  consents: any[];
  packages: any[];
  payments: any[];
  organisations: any[];
  activityLogs: any[];
  optIns: any[];
  assignments: any[];
  programs: any[];
  escrowLegs: any[];
  buyerVerifications: any[];
  wallet: any | null;
  walletTxs: any[];
  notifications: any[];
  loading: boolean;
  refetchAll: () => void;

  listInvoice: (data: any, actor?: Actor) => Promise<any>;
  postBuyerIOU: (data: any, actor?: Actor) => Promise<any>;
  postSupplierInvoice: (data: any) => Promise<any>;
  respondToOptIn: (optInId: string, accept: boolean, declineReason?: string, actor?: Actor) => Promise<any>;
  respondToBuyerVerification: (id: string, accept: boolean, reason?: string) => Promise<any>;
  updateInvoiceStatus: (invoiceId: string, status: string, actor?: Actor) => void;
  makeOffer: (offer: any, actor?: Actor) => Promise<any>;
  respondToOffer: (offerId: string, accept: boolean, actor?: Actor) => Promise<any>;
  requestConsent: (consent: any, actor?: Actor) => Promise<any>;
  signConsent: (consentId: string, approve: boolean, actor?: Actor, otp?: string) => Promise<any>;
  requestConsentOtp: (consentId: string) => Promise<any>;
  createPackage: (pkg: any, actor?: Actor) => Promise<any>;
  updatePackageStatus: (packageId: string, status: string, actor?: Actor) => Promise<any>;
  confirmPayment: (paymentId: string, actor?: Actor) => void;
  releaseEscrow: (legId: string, actor?: Actor) => Promise<any>;
  collectEscrow: (legId: string, actor?: Actor) => Promise<any>;
  addActivityLog: (log: any) => void;
  creditRisk: any | null;
}

function mapInvoice(inv: any) {
  return {
    ...inv,
    amount: Number(inv.faceValue ?? inv.amount ?? 0),
    supplierId: inv.supplierOrgId,
    buyerId: inv.buyerOrgId,
    supplierName: inv.supplierName,
    buyerName: inv.buyerName,
  };
}

export function usePlatformData() {
  const { isAuthenticated, user } = useAuth();
  const qc = useQueryClient();
  const enabled = isAuthenticated;

  const invoicesQ = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => (await api.get('/invoices')).data.data,
    enabled,
  });
  const orgsQ = useQuery({
    queryKey: ['organisations'],
    queryFn: async () => (await api.get('/organisations')).data.data,
    enabled,
  });
  const optInsQ = useQuery({
    queryKey: ['opt-ins'],
    queryFn: async () => (await api.get('/opt-ins')).data.data,
    enabled,
  });
  const verificationsQ = useQuery({
    queryKey: ['buyer-verifications'],
    queryFn: async () => (await api.get('/buyer-verifications')).data.data,
    enabled,
  });
  const assignmentsQ = useQuery({
    queryKey: ['assignments'],
    queryFn: async () => (await api.get('/assignments')).data.data,
    enabled,
  });
  const offersQ = useQuery({
    queryKey: ['offers'],
    queryFn: async () => (await api.get('/offers')).data.data,
    enabled,
  });
  const consentsQ = useQuery({
    queryKey: ['consents'],
    queryFn: async () => (await api.get('/consents')).data.data,
    enabled,
  });
  const escrowQ = useQuery({
    queryKey: ['escrow'],
    queryFn: async () => (await api.get('/escrow')).data.data,
    enabled: enabled && (user?.role === 'spv' || user?.role === 'admin'),
  });
  const packagesQ = useQuery({
    queryKey: ['packages'],
    queryFn: async () => (await api.get('/packages')).data.data,
    enabled: enabled && (user?.role === 'spv' || user?.role === 'admin'),
  });
  const programmesQ = useQuery({
    queryKey: ['programmes'],
    queryFn: async () => (await api.get('/programmes')).data.data,
    enabled,
  });
  const walletQ = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => (await api.get('/wallets/me')).data,
    enabled: enabled && user?.role !== 'admin',
  });
  const notifQ = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data.data,
    enabled,
  });
  const auditQ = useQuery({
    queryKey: ['audit'],
    queryFn: async () => (await api.get('/admin/audit')).data.data,
    enabled: enabled && user?.role === 'admin',
  });
  const paymentsQ = useQuery({
    queryKey: ['payment-updates'],
    queryFn: async () => (await api.get('/payment-updates')).data.data,
    enabled,
  });
  const creditRiskQ = useQuery({
    queryKey: ['credit-risk', user?.organisationId],
    queryFn: async () => (await api.get(`/buyers/${user!.organisationId}/credit-risk`)).data,
    enabled: enabled && !!user?.organisationId && (user.role === 'buyer' || user.role === 'spv' || user.role === 'admin'),
  });

  const orgMap = Object.fromEntries((orgsQ.data || []).map((o: any) => [o.id, o.name]));

  const invoices = (invoicesQ.data || []).map((inv: any) => ({
    ...mapInvoice(inv),
    supplierName: orgMap[inv.supplierOrgId] || inv.supplierOrgId,
    buyerName: orgMap[inv.buyerOrgId] || inv.buyerOrgId,
  }));

  const invalidate = () => {
    void qc.invalidateQueries();
  };

  const postBuyerIOU = useCallback(async (data: any) => {
    const { data: inv } = await api.post('/invoices', {
      supplierOrgId: data.supplierId || data.supplierOrgId,
      invoiceNumber: data.invoiceNumber,
      faceValue: data.amount || data.faceValue,
      currency: data.currency || 'KES',
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      description: data.description,
    });
    invalidate();
    return inv;
  }, [qc]);

  const postSupplierInvoice = useCallback(async (data: any) => {
    const { data: inv } = await api.post('/invoices', {
      buyerOrgId: data.buyerId || data.buyerOrgId,
      invoiceNumber: data.invoiceNumber,
      faceValue: data.amount || data.faceValue,
      currency: data.currency || 'KES',
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      description: data.description,
    });
    invalidate();
    return inv;
  }, [qc]);

  const listInvoice = postSupplierInvoice;

  const respondToOptIn = useCallback(async (optInId: string, accept: boolean, declineReason?: string) => {
    const { data } = await api.post(`/opt-ins/${optInId}/respond`, { accept, declineReason });
    invalidate();
    return data;
  }, [qc]);

  const respondToBuyerVerification = useCallback(async (id: string, accept: boolean, rejectReason?: string) => {
    const { data } = await api.post(`/buyer-verifications/${id}/respond`, { accept, rejectReason });
    invalidate();
    return data;
  }, [qc]);

  const makeOffer = useCallback(async (offer: any) => {
    const { data } = await api.post('/offers', {
      invoiceId: offer.invoiceId,
      discountRate: offer.discountRate,
      discountRateBps: offer.discountRateBps,
    });
    invalidate();
    return data;
  }, [qc]);

  const respondToOffer = useCallback(async (offerId: string, accept: boolean) => {
    const { data } = await api.post(`/offers/${offerId}/respond`, { accept });
    invalidate();
    return data;
  }, [qc]);

  const signConsent = useCallback(async (consentId: string, approve: boolean, _actor?: Actor, otp?: string) => {
    if (!approve) return;
    const code = otp;
    if (!code) throw new Error('OTP required');
    const { data } = await api.post(`/consents/${consentId}/confirm-sign`, { otp: code });
    invalidate();
    return data;
  }, [qc]);

  const requestConsentOtp = useCallback(async (consentId: string) => {
    const { data } = await api.post(`/consents/${consentId}/request-otp`);
    return data;
  }, []);

  const requestConsent = useCallback(async (consent: any) => {
    const { data } = await api.post('/consents', { invoiceId: consent.invoiceId });
    invalidate();
    return data;
  }, [qc]);

  const updateInvoiceStatus = useCallback(async (invoiceId: string, status: string) => {
    // Buyer "verify" on register page maps to buyer-verification accept when applicable
    if (status === 'verified') {
      const verifications = (qc.getQueryData(['buyer-verifications']) as any[]) || [];
      const pending = verifications.find((v: any) => v.invoiceId === invoiceId && v.status === 'pending');
      if (pending) {
        await api.post(`/buyer-verifications/${pending.id}/respond`, { accept: true });
        invalidate();
        return;
      }
    }
    throw new Error(`Status update '${status}' is not supported for invoice ${invoiceId}`);
  }, [qc]);

  const confirmPayment = useCallback((_paymentId: string) => {
    // Payments arrive via AfyaX webhook; portal confirms by refreshing payment-updates
    invalidate();
  }, [qc]);

  const createPackage = useCallback(async (pkg: any) => {
    let assignmentIds = pkg.assignmentIds || [];
    if ((!assignmentIds.length) && pkg.invoiceIds?.length) {
      const asgns = (qc.getQueryData(['assignments']) as any[]) || [];
      assignmentIds = asgns.filter((a: any) => pkg.invoiceIds.includes(a.invoiceId)).map((a: any) => a.id);
    }
    if (!assignmentIds.length) throw new Error('No assignments to package');
    const { data } = await api.post('/packages', {
      packageRef: pkg.name || pkg.packageRef || `PKG-${Date.now()}`,
      assignmentIds,
    });
    invalidate();
    return data;
  }, [qc]);

  const updatePackageStatus = useCallback(async (packageId: string, status: string) => {
    const { data } = await api.patch(`/packages/${packageId}/status`, { status });
    invalidate();
    return data;
  }, [qc]);

  const releaseEscrow = useCallback(async (legId: string) => {
    const { data } = await api.post(`/escrow/${legId}/release`);
    invalidate();
    return data;
  }, [qc]);

  const value: ApiDataContextType = {
    invoices,
    offers: (offersQ.data || []).map((o: any) => ({
      ...o,
      discountRate: (o.discountRateBps || 0) / 100,
      offerPrice: Number(o.purchasePrice),
      faceValue: Number(o.faceValue),
      supplierName: orgMap[o.supplierOrgId] || '',
      tenor: o.tenorDays || 90,
    })),
    consents: (consentsQ.data || []).map((c: any) => {
      const inv = invoices.find((i: any) => i.id === c.invoiceId);
      return {
        ...c,
        buyerId: c.buyerOrgId,
        amount: Number(inv?.amount || c.amount || 0),
        buyerName: orgMap[c.buyerOrgId] || '',
        supplierName: inv?.supplierName || '',
        iouRegistryId: inv?.iouRegistryId || '',
        requestedAt: c.createdAt,
      };
    }),
    packages: (packagesQ.data || []).map((p: any) => ({
      ...p,
      name: p.packageRef,
      totalFaceValue: Number(p.totalFaceValue || 0),
      weightedAvgDiscount: 0,
      weightedAvgTenor: p.weightedAvgTenor || 0,
      invoiceIds: [],
      nseReference: p.nseReference,
    })),
    payments: (paymentsQ.data || []).map((p: any) => ({
      id: p.id,
      invoiceId: p.invoiceId,
      amount: Number(p.amountPaid),
      outstandingBalance: Number(p.outstandingBalance),
      status: Number(p.outstandingBalance) <= 0 ? 'paid' : 'partial',
      dueDate: p.nextDueDate || p.receivedAt,
      paidAt: p.receivedAt,
      method: p.paymentMethod,
      reference: p.afyaxReference,
      iouRegistryId: invoices.find((i: any) => i.id === p.invoiceId)?.iouRegistryId || '',
    })),
    organisations: (orgsQ.data || []).map((o: any) => ({
      ...o,
      type: o.orgType,
      registrationNumber: o.registrationNo,
    })),
    activityLogs: (auditQ.data || []).map((a: any) => ({
      id: a.id,
      userId: a.actorId,
      userName: a.actorEmail || 'system',
      action: a.action,
      entityType: a.resourceType,
      entityId: a.resourceId,
      details: JSON.stringify(a.details || {}),
      timestamp: a.createdAt,
    })),
    optIns: (optInsQ.data || []).map((o: any) => {
      const inv = invoices.find((i: any) => i.id === o.invoiceId);
      return {
        ...o,
        supplierId: o.supplierOrgId,
        supplierName: orgMap[o.supplierOrgId] || '',
        buyerName: inv?.buyerName || '',
        amount: inv?.amount || 0,
        iouRegistryId: inv?.iouRegistryId || '',
        notifiedAt: o.createdAt,
      };
    }),
    assignments: (assignmentsQ.data || []).map((a: any) => ({
      ...a,
      amount: Number(a.faceValue),
      supplierName: orgMap[a.supplierOrgId] || '',
      buyerName: orgMap[a.buyerOrgId] || '',
      spvName: orgMap[a.spvOrgId] || 'Uzima Capital SPV',
      triggeredBy: a.assignmentType === 'opt_in_auto' ? 'supplier_opt_in' : 'consent_signed',
      createdAt: a.assignedAt,
      iouRegistryId: invoices.find((i: any) => i.id === a.invoiceId)?.iouRegistryId || '',
    })),
    programs: (programmesQ.data || []).map((p: any) => ({
      ...p,
      maxFacility: Number(p.maxFacility ?? p.maxExposure ?? 0),
      utilised: Number(p.utilised || 0),
      discountMin: (p.discountBandMinBps || 0) / 100,
      discountMax: (p.discountBandMaxBps || 0) / 100,
      buyerName: p.buyerOrgId ? orgMap[p.buyerOrgId] : 'Open market',
    })),
    escrowLegs: (escrowQ.data || []).map((e: any) => {
      const asgn = (assignmentsQ.data || []).find((a: any) => a.id === e.assignmentId);
      const inv = invoices.find((i: any) => i.id === asgn?.invoiceId);
      return {
        ...e,
        type: e.legType?.includes('disbursement') ? 'disbursement' : e.legType?.includes('collection') ? 'collection' : e.legType,
        amount: Number(e.amount),
        counterparty: e.legType,
        invoiceId: asgn?.invoiceId,
        iouRegistryId: inv?.iouRegistryId || '',
        dueDate: e.createdAt,
        paidAt: e.executedAt,
      };
    }),
    buyerVerifications: verificationsQ.data || [],
    wallet: walletQ.data?.wallet || null,
    walletTxs: walletQ.data?.transactions || [],
    notifications: notifQ.data || [],
    loading: invoicesQ.isLoading,
    refetchAll: invalidate,
    listInvoice,
    postBuyerIOU,
    postSupplierInvoice,
    respondToOptIn,
    respondToBuyerVerification,
    updateInvoiceStatus,
    makeOffer,
    respondToOffer,
    requestConsent,
    requestConsentOtp,
    signConsent,
    createPackage,
    updatePackageStatus,
    confirmPayment,
    releaseEscrow,
    collectEscrow: releaseEscrow,
    addActivityLog: () => undefined,
    creditRisk: creditRiskQ.data || null,
  };

  return value;
}

/** Alias for portal pages — react-query backed, no Context provider */
export function useData() {
  return usePlatformData();
}
