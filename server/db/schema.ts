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
  /** Stable AfyaX / originator user reference */
  afyaxUserId: text('afyax_user_id').unique(),
  phone: text('phone'),
  /** E.164 country calling code, e.g. +254 */
  phoneCountryCode: text('phone_country_code'),
  phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
  /** Consent to receive SMS notifications (captured for future SMS use) */
  smsOptIn: boolean('sms_opt_in').default(false),
  /** Granular permissions (see server/lib/permissions.ts). NULL = role defaults. */
  permissions: text('permissions').array(),
  /** Can manage users / access requests for their own organisation */
  isOrgAdmin: boolean('is_org_admin').default(false),
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
  /** sandbox | production */
  environment: text('environment').default('production'),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
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
  /** maker | checker | both */
  capacity: text('capacity').notNull().default('checker'),
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
  invoiceId: uuid('invoice_id'),
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
  /** Originating aggregator / AfyaX-style platform org (nullable) */
  sourcePlatformOrgId: uuid('source_platform_org_id').references(() => organisations.id),
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
  interestAmount: numeric('interest_amount', { precision: 15, scale: 2 }).default('0'),
  charges: numeric('charges', { precision: 15, scale: 2 }).default('0'),
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
  /**
   * Buyer verification rule for supplier-originated IOUs:
   * required (default) | waive_with_commitment (waived when the obligor commitment and a standing-order
   * reference are on record) | waive_for_source (waived when submitted by a trusted source platform via API)
   */
  buyerVerificationRule: text('buyer_verification_rule').default('required'),
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
  /** Request id echoed on the response, so a support case can be tied to one call */
  correlationId: text('correlation_id'),
  orgId: uuid('org_id'),
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

/** Per-platform AfyaX / aggregator webhook configuration */
export const platformIntegrations = pgTable('platform_integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  platformOrgId: uuid('platform_org_id').notNull().references(() => organisations.id).unique(),
  /** afyax_purchase = Sule /iou/purchase spec; ioux_envelope = generic signed events */
  webhookFormat: text('webhook_format').notNull().default('afyax_purchase'),
  sandboxBaseUrl: text('sandbox_base_url'),
  productionBaseUrl: text('production_base_url'),
  sandboxWebhookUrl: text('sandbox_webhook_url'),
  productionWebhookUrl: text('production_webhook_url'),
  sandboxLifecycleWebhookUrl: text('sandbox_lifecycle_webhook_url'),
  productionLifecycleWebhookUrl: text('production_lifecycle_webhook_url'),
  /** HMAC secret for signing IOUX → platform outbound webhooks (ioux_envelope mode) */
  webhookSecret: text('webhook_secret'),
  activeEnvironment: text('active_environment').notNull().default('sandbox'), // sandbox | production
  enabledEvents: text('enabled_events').array().default([
    'iou.created',
    'iou.status_changed',
    'iou.assigned',
    'iou.acquired',
    'iou.payment_updated',
    'iou.settled',
  ]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Outbound webhook delivery log (IOUX → AfyaX) */
export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  platformOrgId: uuid('platform_org_id').notNull().references(() => organisations.id),
  eventId: text('event_id').notNull(),
  eventType: text('event_type').notNull(),
  targetUrl: text('target_url').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  status: text('status').notNull().default('pending'), // pending | delivered | failed
  httpStatus: integer('http_status'),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('webhook_deliveries_event_id_idx').on(t.eventId),
  index('idx_webhook_deliveries_platform').on(t.platformOrgId),
  index('idx_webhook_deliveries_created').on(t.createdAt),
]);

/** WS-07 — every outbound email attempt for admin visibility */
export const emailSendLog = pgTable('email_send_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  toEmail: text('to_email').notNull(),
  template: text('template').notNull().default('generic'),
  subject: text('subject'),
  status: text('status').notNull(), // sent | failed | stub
  provider: text('provider'),
  providerMessageId: text('provider_message_id'),
  error: text('error'),
  relatedType: text('related_type'),
  relatedId: uuid('related_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_email_send_log_created').on(t.createdAt),
  index('idx_email_send_log_to').on(t.toEmail),
]);

/** Readers of docs.ioux.africa — separate from portal users so access can be revoked independently. */
export const docsUsers = pgTable('docs_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  /** docs_admin | docs_reader */
  role: text('role').notNull().default('docs_reader'),
  /** active | revoked */
  status: text('status').notNull().default('active'),
  mustChangePassword: boolean('must_change_password').default(false),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const docsOtpCodes = pgTable('docs_otp_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => docsUsers.id, { onDelete: 'cascade' }),
  purpose: text('purpose').notNull(),
  codeHash: text('code_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Platform-wide settings (security policy etc.). Changes are written to audit_log. */
export const platformSettings = pgTable('platform_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<Record<string, unknown>>().notNull().default({}),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Bank standing-order lifecycle per instrument (IOUX records it; the bank executes it). */
export const standingOrders = pgTable('standing_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  buyerOrgId: uuid('buyer_org_id').notNull().references(() => organisations.id),
  bankName: text('bank_name').notNull(),
  /** Masked debit account, e.g. ****4321 — never a full account number */
  accountMasked: text('account_masked'),
  reference: text('reference'),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('KES'),
  firstExecutionDate: date('first_execution_date').notNull(),
  /** once | monthly | per_installment */
  frequency: text('frequency').notNull().default('once'),
  /** requested | confirmed | executed | failed | cancelled | amended */
  status: text('status').notNull().default('requested'),
  statusReason: text('status_reason'),
  history: jsonb('history').$type<Record<string, unknown>[]>().default([]),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_standing_orders_invoice').on(t.invoiceId),
]);

/** One-time secure link that releases API credentials to a project's technical contact. */
export const credentialInvites = pgTable('credential_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organisations.id),
  projectName: text('project_name').notNull(),
  contactName: text('contact_name').notNull(),
  contactEmail: text('contact_email').notNull(),
  environment: text('environment').notNull().default('production'),
  scopes: text('scopes').array().default([]),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  claimedIp: text('claimed_ip'),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Organisation-proposed users awaiting super-admin approval, then a time-limited invitation. */
export const userAccessRequests = pgTable('user_access_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organisations.id),
  requestedBy: uuid('requested_by').references(() => users.id),
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  phoneCountryCode: text('phone_country_code'),
  capacity: text('capacity'),
  permissions: text('permissions').array(),
  isSignatory: boolean('is_signatory').default(false),
  documents: jsonb('documents').$type<{ name: string; fileUrl: string }[]>().default([]),
  /** pending | approved | rejected | accepted | revoked */
  status: text('status').notNull().default('pending'),
  decisionReason: text('decision_reason'),
  decidedBy: uuid('decided_by').references(() => users.id),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  inviteTokenHash: text('invite_token_hash'),
  inviteExpiresAt: timestamp('invite_expires_at', { withTimezone: true }),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  userId: uuid('user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
