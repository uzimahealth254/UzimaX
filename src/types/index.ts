export type UserRole = 'supplier' | 'buyer' | 'spv' | 'admin';

export type InvoiceStatus =
  | 'draft'
  | 'listed'
  | 'awaiting_opt_in'
  | 'awaiting_buyer_verification'
  | 'verified'
  | 'offer_received'
  | 'offer_accepted'
  | 'assigned'
  | 'packaged'
  | 'disbursed'
  | 'matured'
  | 'settled'
  | 'defaulted'
  | 'opt_in_declined';

export type InvoiceOrigin = 'supplier_listed' | 'buyer_posted' | 'api_upload';

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';
export type ConsentStatus = 'pending' | 'signed' | 'rejected';
export type PackageStatus = 'draft' | 'structured' | 'listed' | 'placed';
export type OptInStatus = 'pending' | 'accepted' | 'declined';
export type EscrowLegType = 'disbursement' | 'collection';
export type EscrowStatus = 'pending' | 'released' | 'collected' | 'failed';
export type ProgramStatus = 'active' | 'paused' | 'closed';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organisationId: string;
  organisationName: string;
  avatarUrl?: string;
  createdAt: string;
  /** Deprecated client field — API keys are managed server-side and shown once on create */
  apiKey?: string;
}

export interface Organisation {
  id: string;
  name: string;
  type: 'supplier' | 'buyer' | 'spv';
  sector?: string;
  registrationNumber?: string;
  contactEmail: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
}

export interface Invoice {
  id: string;
  iouRegistryId: string;
  supplierId: string;
  supplierName: string;
  buyerId: string;
  buyerName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  description: string;
  status: InvoiceStatus;
  origin?: InvoiceOrigin;
  listedAt?: string;
  verifiedAt?: string;
  postedAt?: string;
  assignedAt?: string;
  documents?: string[];
  statusHistory?: StatusHistoryEntry[];
  createdAt: string;
}

export interface StatusHistoryEntry {
  status: InvoiceStatus;
  at: string;
  by?: string;
  note?: string;
}

export interface ConsentSignature {
  consentId: string;
  signedBy: string;
  signedByName: string;
  signedAt: string;
  method: 'clickwrap';
  artifactHash: string;
}

export interface SupplierOptIn {
  id: string;
  invoiceId: string;
  iouRegistryId: string;
  supplierId: string;
  supplierName: string;
  buyerId: string;
  buyerName: string;
  amount: number;
  status: OptInStatus;
  notifiedAt: string;
  respondedAt?: string;
  declineReason?: string;
}

export interface ReceivableAssignment {
  id: string;
  invoiceId: string;
  iouRegistryId: string;
  supplierId: string;
  supplierName: string;
  buyerId: string;
  buyerName: string;
  spvId: string;
  spvName: string;
  amount: number;
  createdAt: string;
  triggeredBy: 'supplier_opt_in' | 'consent_signed';
}

export interface PurchaseOffer {
  id: string;
  invoiceId: string;
  iouRegistryId: string;
  spvId: string;
  spvName: string;
  supplierId: string;
  supplierName: string;
  faceValue: number;
  offerPrice: number;
  discountRate: number;
  tenor: number;
  status: OfferStatus;
  expiresAt: string;
  createdAt: string;
  respondedAt?: string;
}

export interface AssignmentConsent {
  id: string;
  invoiceId: string;
  iouRegistryId: string;
  buyerId: string;
  buyerName: string;
  supplierId: string;
  supplierName: string;
  spvId: string;
  amount: number;
  status: ConsentStatus;
  requestedAt: string;
  respondedAt?: string;
  signatoryId?: string | null;
  signedAt?: string | null;
}

export interface SecuritisationPackage {
  id: string;
  name: string;
  spvId: string;
  invoiceIds: string[];
  totalFaceValue: number;
  weightedAvgDiscount: number;
  weightedAvgTenor: number;
  status: PackageStatus;
  createdAt: string;
  listedAt?: string;
  nseReference?: string;
}

export interface FinancingProgram {
  id: string;
  name: string;
  buyerId?: string;
  buyerName?: string;
  maxFacility: number;
  utilised: number;
  discountMin: number;
  discountMax: number;
  maxTenorDays: number;
  status: ProgramStatus;
  createdAt: string;
}

export interface EscrowLeg {
  id: string;
  invoiceId: string;
  iouRegistryId: string;
  type: EscrowLegType;
  counterparty: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: EscrowStatus;
  paidAt?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  buyerId: string;
  buyerName: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: 'upcoming' | 'due' | 'overdue' | 'paid';
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: 'invoice' | 'offer' | 'consent' | 'package' | 'payment' | 'user' | 'opt_in' | 'assignment' | 'api';
  entityId: string;
  details?: string;
  timestamp: string;
}
