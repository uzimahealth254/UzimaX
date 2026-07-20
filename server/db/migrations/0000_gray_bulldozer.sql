CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text,
	"label" text,
	"scopes" text[] DEFAULT '{}',
	"is_active" boolean DEFAULT true,
	"last_used" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignment_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"buyer_org_id" uuid NOT NULL,
	"spv_org_id" uuid NOT NULL,
	"signatory_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"otp_verified" boolean DEFAULT false,
	"signature_hash" text,
	"payment_redirect_acct" text,
	"signed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"offer_id" uuid,
	"consent_id" uuid,
	"spv_org_id" uuid NOT NULL,
	"supplier_org_id" uuid NOT NULL,
	"buyer_org_id" uuid NOT NULL,
	"assignment_type" text NOT NULL,
	"purchase_price" numeric(15, 2),
	"face_value" numeric(15, 2) NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_email" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid,
	"details" jsonb DEFAULT '{}'::jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyer_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"buyer_org_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reject_reason" text,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrow_legs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"leg_type" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reference" text,
	"executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fee_type" text NOT NULL,
	"rate_bps" integer,
	"flat_amount" numeric(15, 2),
	"applies_to" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid,
	"fee_config_id" uuid,
	"charged_to_org" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"status" text DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installment_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"installment_no" integer NOT NULL,
	"due_date" date NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"status" text DEFAULT 'pending',
	"paid_amount" numeric(15, 2) DEFAULT '0',
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"changed_by" uuid,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iou_registry_id" text,
	"origin" text NOT NULL,
	"originator_id" uuid NOT NULL,
	"buyer_org_id" uuid NOT NULL,
	"supplier_org_id" uuid NOT NULL,
	"invoice_number" text,
	"po_reference" text,
	"face_value" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"payment_terms_days" integer,
	"interest_rate" numeric(6, 4),
	"interest_type" text,
	"installment_frequency" text,
	"num_installments" integer,
	"total_interest" numeric(15, 2),
	"total_payable" numeric(15, 2),
	"listed_amount" numeric(15, 2),
	"listing_status" text DEFAULT 'unlisted',
	"discount_rate_bps" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"line_items" jsonb,
	"supporting_docs" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_iou_registry_id_unique" UNIQUE("iou_registry_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"reference_type" text,
	"reference_id" uuid,
	"is_read" boolean DEFAULT false,
	"channel" text DEFAULT 'in_app',
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opt_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"supplier_org_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decline_reason" text,
	"responded_by" uuid,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"doc_type" text NOT NULL,
	"file_url" text NOT NULL,
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"registration_no" text,
	"org_type" text NOT NULL,
	"afyax_id" text,
	"uzima_party_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organisations_afyax_id_unique" UNIQUE("afyax_id"),
	CONSTRAINT "organisations_uzima_party_id_unique" UNIQUE("uzima_party_id")
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "package_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_ref" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"risk_band" text,
	"weighted_avg_tenor" integer,
	"total_face_value" numeric(15, 2),
	"total_purchase_price" numeric(15, 2),
	"nse_reference" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "packages_package_ref_unique" UNIQUE("package_ref")
);
--> statement-breakpoint
CREATE TABLE "payment_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"source" text DEFAULT 'afyax' NOT NULL,
	"amount_paid" numeric(15, 2) NOT NULL,
	"outstanding_balance" numeric(15, 2) NOT NULL,
	"next_due_date" date,
	"payment_method" text,
	"afyax_reference" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programmes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"buyer_org_id" uuid,
	"max_exposure" numeric(15, 2),
	"max_tenor_days" integer,
	"discount_band_min_bps" integer,
	"discount_band_max_bps" integer,
	"status" text DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"spv_org_id" uuid NOT NULL,
	"discount_rate_bps" integer NOT NULL,
	"tenor_days" integer NOT NULL,
	"purchase_price" numeric(15, 2) NOT NULL,
	"face_value" numeric(15, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signatories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"role_title" text,
	"approval_cert_url" text,
	"specimen_sig_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"org_id" uuid,
	"is_signatory" boolean DEFAULT false,
	"status" text DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"reference" text,
	"description" text,
	"counterparty_wallet_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_consents" ADD CONSTRAINT "assignment_consents_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_consents" ADD CONSTRAINT "assignment_consents_buyer_org_id_organisations_id_fk" FOREIGN KEY ("buyer_org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_consents" ADD CONSTRAINT "assignment_consents_spv_org_id_organisations_id_fk" FOREIGN KEY ("spv_org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_consents" ADD CONSTRAINT "assignment_consents_signatory_id_signatories_id_fk" FOREIGN KEY ("signatory_id") REFERENCES "public"."signatories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_offer_id_purchase_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."purchase_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_consent_id_assignment_consents_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."assignment_consents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_spv_org_id_organisations_id_fk" FOREIGN KEY ("spv_org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_supplier_org_id_organisations_id_fk" FOREIGN KEY ("supplier_org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_buyer_org_id_organisations_id_fk" FOREIGN KEY ("buyer_org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_verifications" ADD CONSTRAINT "buyer_verifications_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_verifications" ADD CONSTRAINT "buyer_verifications_buyer_org_id_organisations_id_fk" FOREIGN KEY ("buyer_org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_verifications" ADD CONSTRAINT "buyer_verifications_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_legs" ADD CONSTRAINT "escrow_legs_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_ledger" ADD CONSTRAINT "fee_ledger_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_ledger" ADD CONSTRAINT "fee_ledger_fee_config_id_fee_configurations_id_fk" FOREIGN KEY ("fee_config_id") REFERENCES "public"."fee_configurations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_ledger" ADD CONSTRAINT "fee_ledger_charged_to_org_organisations_id_fk" FOREIGN KEY ("charged_to_org") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment_schedules" ADD CONSTRAINT "installment_schedules_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_status_history" ADD CONSTRAINT "invoice_status_history_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_status_history" ADD CONSTRAINT "invoice_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_originator_id_organisations_id_fk" FOREIGN KEY ("originator_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_buyer_org_id_organisations_id_fk" FOREIGN KEY ("buyer_org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_supplier_org_id_organisations_id_fk" FOREIGN KEY ("supplier_org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opt_ins" ADD CONSTRAINT "opt_ins_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opt_ins" ADD CONSTRAINT "opt_ins_supplier_org_id_organisations_id_fk" FOREIGN KEY ("supplier_org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opt_ins" ADD CONSTRAINT "opt_ins_responded_by_users_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_documents" ADD CONSTRAINT "org_documents_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_documents" ADD CONSTRAINT "org_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_updates" ADD CONSTRAINT "payment_updates_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_buyer_org_id_organisations_id_fk" FOREIGN KEY ("buyer_org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_offers" ADD CONSTRAINT "purchase_offers_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_offers" ADD CONSTRAINT "purchase_offers_spv_org_id_organisations_id_fk" FOREIGN KEY ("spv_org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signatories" ADD CONSTRAINT "signatories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signatories" ADD CONSTRAINT "signatories_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_counterparty_wallet_id_wallets_id_fk" FOREIGN KEY ("counterparty_wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_prefix_idx" ON "api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "idx_audit_actor" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_audit_resource" ON "audit_log" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_invoices_buyer" ON "invoices" USING btree ("buyer_org_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_supplier" ON "invoices" USING btree ("supplier_org_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_status" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_invoices_iou" ON "invoices" USING btree ("iou_registry_id");