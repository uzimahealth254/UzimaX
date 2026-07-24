import {
  pgTable, uuid, text, boolean, timestamp, numeric, integer, date, jsonb, uniqueIndex, index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const organisations = pgTable('organisations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  registrationNo: text('registration_no'),
  orgType: text('org_type').notNull(), // buyer | supplier | spv | platform
  afyaxId: text('afyax_id').unique(),
  uzimaPartyId: text('uzima_party_id').notNull().unique(),
  status: text('status').notNull().default('active'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull(), // admin | buyer | supplier | spv
  orgId: uuid('org_id').references(() => organisations.id),
  isSignatory: boolean('is_signatory').default(false),
  mustChangePassword: boolean('must_change_password').default(false),
  status: text('status').notNull().default('active'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organisations.id),
  keyHash: text('key_hash').notNull(),
  keyPrefix: text('key_prefix'),
  label: text('label'),
  scopes: text('scopes').array().default([]),
  isActive: boolean('is_active').default(true),
  lastUsed: timestamp('last_used', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  prefixIdx: index('api_keys_prefix_idx').on(t.keyPrefix),
}));

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const signatories = pgTable('signatories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  orgId: uuid('org_id').notNull().references(() => organisations.id),
  roleTitle: text('role_title'),
  approvalCertUrl: text('approval_cert_url'),
  specimenSigUrl: text('specimen_sig_url'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orgDocuments = pgTable('org_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organisations.id),
  docType: text('doc_type').notNull(),
  fileUrl: text('file_url').notNull(),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
});

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  iouRegistryId: text('iou_registry_id').unique(),
  origin: text('origin').notNull(), // buyer_posted | supplier_listed | api_upload
  originatorId: uuid('originator_id').notNull().references(() => organisations.id),
  buyerOrgId: uuid('buyer_org_id').notNull().references(() => organisations.id),
  supplierOrgId: uuid('supplier_org_id').notNull().references(() => organisations.id),
  invoiceNumber: text('invoice_number'),
  poReference: text('po_reference'),
  faceValue: numeric('face_value', { precision: 15, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('KES'),
  issueDate: date('issue_date').notNull(),
  dueDate: date('due_date').notNull(),
  paymentTermsDays: integer('payment_terms_days'),
  interestRate: numeric('interest_rate', { precision: 6, scale: 4 }),
  interestType: text('interest_type'),
  installmentFrequency: text('installment_frequency'),
  numInstallments: integer('num_installments'),
  totalInterest: numeric('total_interest', { precision: 15, scale: 2 }),
  totalPayable: numeric('total_payable', { precision: 15, scale: 2 }),
  listedAmount: numeric('listed_amount', { precision: 15, scale: 2 }),
  listingStatus: text('listing_status').default('unlisted'),
  discountRateBps: integer('discount_rate_bps'),
  status: text('status').notNull().default('draft'),
  lineItems: jsonb('line_items'),
  supportingDocs: jsonb('supporting_docs').$type<unknown[]>().default([]),
  /** Buyer commitment-to-pay captured at origination (workplan v1.6) */
  commitmentToPay: boolean('commitment_to_pay').notNull().default(false),
  /** User who recorded obligor acknowledgement */
  commitmentAckBy: uuid('commitment_ack_by').references(() => users.id),
  commitmentAckAt: timestamp('commitment_ack_at', { withTimezone: true }),
  /** External bank standing-order / settlement reference — not a rail executed by IOU Exchange */
  bankStandingOrderRef: text('bank_standing_order_ref'),
  standingOrderBank: text('standing_order_bank'),
  standingOrderSetAt: timestamp('standing_order_set_at', { withTimezone: true }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_invoices_buyer').on(t.buyerOrgId),
  index('idx_invoices_supplier').on(t.supplierOrgId),
  index('idx_invoices_status').on(t.status),
  index('idx_invoices_iou').on(t.iouRegistryId),
]);

export const installmentSchedules = pgTable('installment_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  installmentNo: integer('installment_no').notNull(),
  dueDate: date('due_date').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  status: text('status').default('pending'),
  paidAmount: numeric('paid_amount', { precision: 15, scale: 2 }).default('0'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const invoiceStatusHistory = pgTable('invoice_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  changedBy: uuid('changed_by').references(() => users.id),
  reason: text('reason'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const optIns = pgTable('opt_ins', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  supplierOrgId: uuid('supplier_org_id').notNull().references(() => organisations.id),
  status: text('status').notNull().default('pending'),
  declineReason: text('decline_reason'),
  respondedBy: uuid('responded_by').references(() => users.id),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const buyerVerifications = pgTable('buyer_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  buyerOrgId: uuid('buyer_org_id').notNull().references(() => organisations.id),
  status: text('status').notNull().default('pending'),
  rejectReason: text('reject_reason'),
  verifiedBy: uuid('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseOffers = pgTable('purchase_offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  spvOrgId: uuid('spv_org_id').notNull().references(() => organisations.id),
  discountRateBps: integer('discount_rate_bps').notNull(),
  tenorDays: integer('tenor_days').notNull(),
  purchasePrice: numeric('purchase_price', { precision: 15, scale: 2 }).notNull(),
  faceValue: numeric('face_value', { precision: 15, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const assignmentConsents = pgTable('assignment_consents', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  buyerOrgId: uuid('buyer_org_id').notNull().references(() => organisations.id),
  spvOrgId: uuid('spv_org_id').notNull().references(() => organisations.id),
  signatoryId: uuid('signatory_id').references(() => signatories.id),
  status: text('status').notNull().default('pending'),
  otpVerified: boolean('otp_verified').default(false),
  signatureHash: text('signature_hash'),
  paymentRedirectAcct: text('payment_redirect_acct'),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  offerId: uuid('offer_id').references(() => purchaseOffers.id),
  consentId: uuid('consent_id').references(() => assignmentConsents.id),
  spvOrgId: uuid('spv_org_id').notNull().references(() => organisations.id),
  supplierOrgId: uuid('supplier_org_id').notNull().references(() => organisations.id),
  buyerOrgId: uuid('buyer_org_id').notNull().references(() => organisations.id),
  assignmentType: text('assignment_type').notNull(),
  purchasePrice: numeric('purchase_price', { precision: 15, scale: 2 }),
  faceValue: numeric('face_value', { precision: 15, scale: 2 }).notNull(),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  status: text('status').notNull().default('active'),
});

export const wallets = pgTable('wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organisations.id).unique(),
  balance: numeric('balance', { precision: 15, scale: 2 }).notNull().default('0'),
  currency: text('currency').notNull().default('KES'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const walletTransactions = pgTable('wallet_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletId: uuid('wallet_id').notNull().references(() => wallets.id),
  type: text('type').notNull(), // credit | debit
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  reference: text('reference'),
  description: text('description'),
  counterpartyWalletId: uuid('counterparty_wallet_id').references(() => wallets.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const escrowLegs = pgTable('escrow_legs', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignmentId: uuid('assignment_id').notNull().references(() => assignments.id),
  legType: text('leg_type').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'),
  reference: text('reference'),
  executedAt: timestamp('executed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const feeConfigurations = pgTable('fee_configurations', {
  id: uuid('id').primaryKey().defaultRandom(),
  feeType: text('fee_type').notNull(),
  rateBps: integer('rate_bps'),
  flatAmount: numeric('flat_amount', { precision: 15, scale: 2 }),
  appliesTo: text('applies_to').notNull(),
  isActive: boolean('is_active').default(true),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const feeLedger = pgTable('fee_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignmentId: uuid('assignment_id').references(() => assignments.id),
  feeConfigId: uuid('fee_config_id').references(() => feeConfigurations.id),
  chargedToOrg: uuid('charged_to_org').references(() => organisations.id),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const packages = pgTable('packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  packageRef: text('package_ref').notNull().unique(),
  status: text('status').notNull().default('draft'),
  riskBand: text('risk_band'),
  weightedAvgTenor: integer('weighted_avg_tenor'),
  weightedAvgDiscountBps: integer('weighted_avg_discount_bps'),
  totalFaceValue: numeric('total_face_value', { precision: 15, scale: 2 }),
  totalPurchasePrice: numeric('total_purchase_price', { precision: 15, scale: 2 }),
  nseReference: text('nse_reference'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const packageItems = pgTable('package_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  packageId: uuid('package_id').notNull().references(() => packages.id, { onDelete: 'cascade' }),
  assignmentId: uuid('assignment_id').notNull().references(() => assignments.id),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
});

export const programmes = pgTable('programmes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  buyerOrgId: uuid('buyer_org_id').references(() => organisations.id),
  maxExposure: numeric('max_exposure', { precision: 15, scale: 2 }),
  /** Cap for this buyer within the facility (hard-enforced when set). */
  buyerSublimit: numeric('buyer_sublimit', { precision: 15, scale: 2 }),
  maxTenorDays: integer('max_tenor_days'),
  discountBandMinBps: integer('discount_band_min_bps'),
  discountBandMaxBps: integer('discount_band_max_bps'),
  effectiveFrom: date('effective_from'),
  expiresAt: date('expires_at'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const paymentUpdates = pgTable('payment_updates', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  source: text('source').notNull().default('afyax'),
  amountPaid: numeric('amount_paid', { precision: 15, scale: 2 }).notNull(),
  outstandingBalance: numeric('outstanding_balance', { precision: 15, scale: 2 }).notNull(),
  nextDueDate: date('next_due_date'),
  paymentMethod: text('payment_method'),
  afyaxReference: text('afyax_reference'),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body'),
  referenceType: text('reference_type'),
  referenceId: uuid('reference_id'),
  isRead: boolean('is_read').default(false),
  channel: text('channel').default('in_app'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id),
  actorEmail: text('actor_email'),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: uuid('resource_id'),
  details: jsonb('details').$type<Record<string, unknown>>().default({}),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_audit_actor').on(t.actorId),
  index('idx_audit_resource').on(t.resourceType, t.resourceId),
  index('idx_audit_created').on(t.createdAt),
]);

export const otpCodes = pgTable('otp_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  purpose: text('purpose').notNull(),
  codeHash: text('code_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
