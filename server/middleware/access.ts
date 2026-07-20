import type { AuthUser } from '../middleware/auth.js';
import { AppError } from '../lib/errors.js';

type InvoiceLike = {
  id: string;
  buyerOrgId: string;
  supplierOrgId: string;
};

/** Return 404 for cross-tenant to avoid resource enumeration */
export function assertInvoiceAccess(user: AuthUser, inv: InvoiceLike | null | undefined): asserts inv is InvoiceLike {
  if (!inv) throw new AppError(404, 'not_found', 'Invoice not found');
  if (user.role === 'admin' || user.role === 'spv') return;
  if (user.role === 'buyer' && user.orgId === inv.buyerOrgId) return;
  if (user.role === 'supplier' && user.orgId === inv.supplierOrgId) return;
  throw new AppError(404, 'not_found', 'Invoice not found');
}

export function assertOrgMatch(
  user: AuthUser,
  orgId: string | null | undefined,
  message = 'Resource not found',
): void {
  if (user.role === 'admin') return;
  if (!orgId || user.orgId !== orgId) {
    throw new AppError(404, 'not_found', message);
  }
}

export function assertBuyerOrg(user: AuthUser, buyerOrgId: string): void {
  if (user.role === 'admin') return;
  if (user.role !== 'buyer' || user.orgId !== buyerOrgId) {
    throw new AppError(404, 'not_found', 'Resource not found');
  }
}

export function assertSupplierOrg(user: AuthUser, supplierOrgId: string): void {
  if (user.role === 'admin') return;
  if (user.role !== 'supplier' || user.orgId !== supplierOrgId) {
    throw new AppError(404, 'not_found', 'Resource not found');
  }
}
