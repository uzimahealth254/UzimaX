# IOU Exchange — Full System Guide for Claude

**Document ID:** IOUX-SYS-GUIDE-001  
**Audience:** Claude (or any senior engineer / product reviewer assisting with this codebase)  
**Purpose:** Single, thorough reference for the **entire system as built today** — brand, architecture, portals, APIs, database, auth, marketing, honesty constraints, deploy, and how to run it. Use this before proposing or implementing changes.  
**Codebase path:** `c:\Users\Admin\Downloads\CPF`  
**Date:** 21 July 2026  
**Related docs:** `docs/IOU_EXCHANGE_PRODUCTION_GOLIVE.md` (IOUX-GOLIVE-001), `docs/UZIMA_ARCH_001.md`, `docs/UZIMA_PORTAL_CONSULTATION_BRIEF.md`, `docs/AFIX_SYSTEM_STATUS_AUDIT.md`, `docs/openapi.yaml`, `docs/USER_GUIDE.md`

---

## How Claude should use this document

1. Treat this as the **source of truth for current product state**, not aspirational scope.
2. Prefer **honest under-claiming**: never imply live bank rails, real NSE listing, or licensed money transmission.
3. Prefer **edit over rebuild** unless the user explicitly asks for a rebuild.
4. Internal code still uses many `uzima_*` identifiers (CSS class `.uzima-site`, cookie `uzima_rt`, Render service names). **User-facing brand is IOU Exchange.** Do not rename infra IDs casually.
5. Out of scope unless asked: live bank rails, real NSE APIs, external KYC vendors, ERP adapters per buyer, MFA/SSO, BI warehouse.

---

## 0. Executive snapshot

### What IOU Exchange is

**IOU Exchange** (short **IOUX**, domain **ioux.africa**) is a **trade-receivables / working-capital platform** for Kenya’s pharmacy and health-trade ecosystem.

It orchestrates:

1. Registration of confirmed invoices / IOUs  
2. Counterparty confirmation (supplier **opt-in** *or* buyer **verification**)  
3. Assignment of the receivable to an **SPV**  
4. Tenor-based purchase offers, OTP-verified assignment consents  
5. Escrow-**style** settlement visibility (simulated / manual ledger — not a bank)  
6. Packaging toward an **NSE listing path** (process UI + reference fields only)

### What it is not

| Claim | Reality |
|-------|---------|
| Bank / lender / PSP | **No.** Licensed settlement partners move money; IOUX does not. |
| Live escrow / wallet rails | **Simulated** when enabled; often **off** in prod flags. |
| NSE / capital-markets listing | **UI workflow only** — no exchange integration. |
| Public SaaS signup | **Invite-only** organisations and users. |

### Roles (4)

| Role | Who | Primary job |
|------|-----|-------------|
| **Buyer** | Pharmacy / distributor buyer org | Post confirmed payables; verify supplier invoices; sign assignment consents; view payment schedule |
| **Supplier** | Wholesaler / pharma supplier | Opt in to buyer-posted IOUs; list invoices; accept/reject SPV offers |
| **SPV** | Capital / SPV operator | Registry, offers, assignments, escrow views, packaging |
| **Admin** | Platform operator | Programmes, fees, users/orgs, reconciliation, workflow, analytics |

### Assignment tracks (Hybrid — locked 24 Jul 2026, IOUX-COMPLETE-001 §2)

Two tracks coexist; they are **not** alternatives for the same deal economics:

| Track | `assignment_type` | When | Obligor acknowledgement |
|-------|-------------------|------|-------------------------|
| **Standard confirmation** | `standard_confirmation` | Path A buyer-post → supplier opt-in, or Path B supplier-list → buyer verify | Inherent in posting (Path A) or verification (Path B); `commitment_ack_at` required before assign |
| **Negotiated offer** | `negotiated_offer` | SPV proposes a specific discount; supplier accepts; buyer OTP consent | Fresh OTP-verified consent because economics changed |

SPV registry tabs: **Assigned** · **Open to offer** · **Pending consent** · **Declined / closed**.

Do **not** remove auto-assignment from `respondToOptIn` / `respondToBuyerVerification` unless the operator overrides this decision in writing.

### Maturity (honest)

| Layer | Status |
|-------|--------|
| Marketing site (Home, About, Solutions, Portals, Resources, Privacy, Terms) | **Built** |
| Four role portals + dual origination UX | **Built** |
| Express API + Postgres (Drizzle) as source of truth | **Built** |
| JWT auth, refresh cookie, invite, forgot/reset, force password change | **Built** |
| AfyaX-oriented party / invoice / payment webhook stubs | **Built** (integration-ready, not production-certified) |
| Live bank disbursement / collection | **Not built** |
| Real NSE submission | **Not built** |
| Per-buyer ERP adapters | **Not built** (generic external invoice API exists) |
| MFA / SSO / external KYC | **Not built** |

---

## 1. Brand & naming

Defined in `src/lib/brand.ts`:

| Field | Value |
|-------|--------|
| `name` | IOU Exchange |
| `short` | IOUX |
| `domain` | ioux.africa |
| Marketing | https://www.ioux.africa (`https://ioux.africa`) |
| Portal | https://app.ioux.africa |
| API | https://api.ioux.africa |
| Emails | hello@ / privacy@ / legal@ / no-reply@ioux.africa |
| Tagline | Working capital for pharmacy trade |

**npm package:** `iou-exchange` @ `2.0.0`  
**Legacy / internal:** many paths and env comments still say Uzima/UzimaX; Render service may still be named `UzimaX` / `uzima-api`; DB party id field `uzima_party_id`; session key `uzima_access`; cookie `uzima_rt`. Live public hostnames are all on **ioux.africa**.

**Visual system:** forest `#0E1F1A`, lime `#D3F36B`, gold `#F0C419`, Space Grotesk + Inter on marketing (`.uzima-site`), Plus Jakarta on portal UI.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Marketing (Vite React)  /  Portal (same SPA, role routes) │
│  AuthContext · React Query · axios → VITE_API_URL           │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS / cookies + Bearer JWT
┌────────────────────────────▼────────────────────────────────┐
│  Express 5 API  (:8787)  /api/v1/*                           │
│  JWT access · refresh cookie · API keys · rate limits        │
│  services/core.ts · email · otp · pdf · storage · programme  │
└────────────────────────────┬────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
   Postgres 15            Redis               Local ./storage
   (Docker or             (rate limit /       or S3/R2 when
    Supabase)              lockout)            S3_* set
```

**Single source of truth:** Postgres via Drizzle (`server/db/schema.ts`). No dual mock JSON store for production flows.

**Run locally:**

```bash
# Infra
docker compose up -d          # postgres + redis

# Env
cp .env.example .env          # DATABASE_URL → local docker

# DB
npm run db:migrate            # drizzle-kit push
npm run db:rls                # RLS policies
npm run db:seed               # demo orgs/users (LOCAL only — refused on hosted DB)
npm run create-admin          # production first admin
npm run db:purge-demo         # ALLOW_PURGE_DEMO=1 — remove known seed accounts from a DB

# Apps (two terminals)
npm run dev                   # Vite portal (often :5173 / :5174)
npm run dev:api               # API :8787
```

**Local demo only:** `DEMO_PASSWORD` in `.env` (default historically `Uzima2026!`). Never use on production — use `npm run create-admin`.  
**Demo users:** `admin@ioux.africa`, `buyer@ioux.africa`, `supplier@ioux.africa`, `supplier2@ioux.africa`, `spv@ioux.africa`

---

## 3. Dual origination (core product)

All paths converge on a **confirmed receivable** that can be offered to / assigned toward the SPV.

### Path A — Buyer-posted

1. Buyer posts IOU → `origin = buyer_posted` (`/buyer/post-iou`)  
2. Supplier notified → **Opt-in Inbox** (`/supplier/opt-in`)  
3. Supplier opts in → assignment toward SPV (`opt_in_auto` style)  
4. SPV may make tenor-based offer; buyer may OTP-sign assignment consent  
5. Escrow / packaging / payment schedule as applicable  

**API / service:** `createBuyerOriginatedInvoice` in `server/services/core.ts`  
**Also:** API-key / AfyaX upload as `api_upload` follows the same buyer-posted confirmation pattern.

### Path B — Supplier-listed

1. Supplier posts invoice → `origin = supplier_listed` (`/supplier/post-invoice`)  
2. Buyer **Verification** inbox (`/buyer/verification`)  
3. Buyer verifies → assignment path (`supplier_originated_auto` style)  
4. Same downstream offers / consent / settlement views  

**API / service:** `createSupplierOriginatedInvoice`

### Smoke

```bash
npm run smoke:dual    # scripts/smoke-dual-origination.ts
```

---

## 4. Public / marketing routes

| Route | Page | Notes |
|-------|------|-------|
| `/` | `HomePage` | Full-bleed hero; redirects to role home if logged in |
| `/about` | `AboutPage` | Mission, problem, model, principles |
| `/solutions` | `SolutionsPage` | `#suppliers` `#buyers` `#spv` `#how` |
| `/portals` | `PortalsPage` | Supplier / Buyer / SPV cards → `/login` (**no Admin card** on marketing) |
| `/resources` | `ResourcesPage` | Single page: `#docs` `#faq` `#security` `#contact` |
| `/resources/docs` etc. | Redirect helpers | Hash redirects into Resources |
| `/privacy` | `PrivacyPage` | Kenya DPA-oriented privacy |
| `/terms` | `TermsPage` | Terms of service |
| `/login` | `AuthPage` | Rocket launch animation on success |
| `*` | `NotFound` | |

**Chrome:** `MarketingLayout` → `SiteNav`, `SiteCtaBand`, `SiteFooter`  
**Styles:** `src/styles/uzima-marketing.css` scoped under `.uzima-site`  
**Scroll:** `ScrollToTop` on pathname change; hash sections via `useHashScroll`

---

## 5. Portal routes (complete)

Layout: `ProtectedRoute` + `PortalLayout` (forest sidebar, lime active).  
Feature flags: wallet nav only if `VITE_ENABLE_WALLET=true`; SPV engine only if `VITE_ENABLE_ENGINE=true`.

### 5.1 Supplier — `/supplier`

| Path | Component | Purpose |
|------|-----------|---------|
| `/supplier` | `SupplierDashboard` | Overview / KPIs |
| `/supplier/opt-in` | `OptInInboxPage` | Respond to buyer-posted IOUs |
| `/supplier/post-invoice` | `PostSupplierInvoicePage` | Path B listing |
| `/supplier/invoices` | `MyInvoicesPage` | Invoice list / filters |
| `/supplier/invoices/:id` | `InvoiceDetailPage` | Detail + history |
| `/supplier/payments` | `PaymentHistoryPage` | Payment visibility |
| `/supplier/documents` | `DocumentsPage` | Org documents |
| `/supplier/wallet` | `WalletPage` | Simulated ledger (**flagged**) |
| `/supplier/profile` | `SupplierProfilePage` | Org / user / signatories tabs |

Redirects: `/list` → post-invoice; `/history` → invoices completed; `/signatories` → profile tab.

### 5.2 Buyer — `/buyer`

| Path | Component | Purpose |
|------|-----------|---------|
| `/buyer` | `BuyerDashboard` | Overview |
| `/buyer/post-iou` | `PostIOUPage` | Path A post confirmed payable |
| `/buyer/verification` | `BuyerVerificationInboxPage` | Verify supplier-listed invoices |
| `/buyer/register` | `InvoiceRegisterPage` | Register / browse payables |
| `/buyer/consent` | `ConsentInboxPage` | OTP-sign assignment consents |
| `/buyer/payments` | `BuyerPaymentsPage` | Schedule / what’s owed |
| `/buyer/documents` | `DocumentsPage` | Documents |
| `/buyer/wallet` | `WalletPage` | Simulated ledger (**flagged**) |
| `/buyer/profile` | `BuyerProfilePage` | Includes developer / API key tab |

Redirects: `/api` → profile developer tab; `/payment-history` → payments; `/signatories` → profile tab.

### 5.3 SPV — `/spv`

| Path | Component | Purpose |
|------|-----------|---------|
| `/spv` | `SPVDashboard` | Overview |
| `/spv/registry` | `IOURegistryPage` | Confirmed receivables registry |
| `/spv/registry/:id` | `IOUDetailPage` | IOU detail |
| `/spv/offers` | `OffersPage` | Make / manage purchase offers |
| `/spv/assignments` | `AssignmentRegistryPage` | Assignments |
| `/spv/escrow` | `EscrowPage` | Escrow legs — release / collect (**simulated**) |
| `/spv/packaging` | `PackagingPage` | Package receivables; NSE **path** status / reference |
| `/spv/payments` | `PaymentHistoryPage` | Payments |
| `/spv/engine` | `BackendEnginePage` | Ops engine view (**flagged off by default**) |
| `/spv/wallet` | `WalletPage` | Simulated ledger (**flagged**) |
| `/spv/profile` | `SPVProfilePage` | Profile / docs / signatories |

Redirects: `/listing` → packaging; `/documents` & `/signatories` → profile tabs.

### 5.4 Admin — `/admin`

| Path | Component | Purpose |
|------|-----------|---------|
| `/admin` | `AdminDashboard` | Platform overview |
| `/admin/invoices` | `AllInvoicesPage` | Cross-org invoice view |
| `/admin/programs` | `ProgramsPage` | Financing programmes / limits |
| `/admin/fees` | `FeesPage` | Fee configurations |
| `/admin/reconciliation` | `ReconciliationPage` | Variance / recon views |
| `/admin/users` | `UsersPage` | Users, orgs, invite |
| `/admin/workflow` | `WorkflowMonitorPage` | Workflow / audit monitoring |
| `/admin/analytics` | `AnalyticsPage` | Analytics |
| `/admin/profile` | `AdminProfilePage` | Admin profile |

Admin is **not** advertised on the public Portals marketing page; access is invite / known credentials only.

### 5.5 Orphan page files (exist, not mounted)

Examples: `ListingReadinessPage.tsx`, `BuyerApiPage.tsx`, `PaymentSchedulePage.tsx`, `ListInvoicePage.tsx`, `TradeHistoryPage.tsx`, standalone `FaqPage`/`DocsPage`/`ContactPage`/`SecurityPage` (content folded into Resources). Prefer not to revive without product reason.

---

## 6. Authentication & security

| Concern | Implementation |
|---------|----------------|
| Login | `POST /api/v1/auth/login` → access JWT + refresh cookie |
| Access token | Bearer; stored client-side as `sessionStorage` key `uzima_access` |
| Refresh | HttpOnly cookie **`uzima_rt`**, path `/api/v1/auth`, ~7 days; `POST /auth/refresh` |
| Body refresh | Only if `ALLOW_BODY_REFRESH=true` (or non-prod) |
| Logout | `POST /auth/logout` |
| Me | `GET /auth/me`, `PATCH /auth/me` |
| Change password | `POST /auth/change-password`; `PasswordChangeGate` blocks UI when `mustChangePassword` |
| Invite | Admin `POST /admin/users/invite` → temp password email; force change on first login |
| Forgot / reset | `POST /auth/forgot-password`, `POST /auth/reset-password` + OTP |
| API keys | Org-scoped keys for machine/ERP; hashed at rest |
| OTP | Consent / reset; `ALLOW_DEMO_OTP` for non-prod hints |
| Lockout / rate limit | Redis-backed when `REDIS_URL` set |
| Cookies | `COOKIE_SECURE=true` behind HTTPS |
| RLS | `npm run db:rls` applies `server/db/sql/rls.sql` on tenant tables |
| Audit | App `audit_log` + optional SQL triggers on invoices |

**Key files:** `src/pages/AuthPage.tsx`, `src/contexts/AuthContext.tsx`, `src/lib/apiClient.ts`, `server/middleware/auth.ts`, `server/lib/security.ts`, `server/services/otp.ts`

**Login UX:** On success, fullscreen rocket launch (~3.4s) then navigate to role home.

---

## 7. Database (Postgres + Drizzle)

Schema: `server/db/schema.ts`  
Migrations / push: `npm run db:migrate` (drizzle-kit push)  
Seed: `npm run db:seed` (refuses hosted Supabase unless `ALLOW_PROD_SEED=1`)

### Tables (26)

| Table | Purpose |
|-------|---------|
| `organisations` | buyer \| supplier \| spv \| platform; `afyax_id`, `uzima_party_id` |
| `users` | Portal users; roles; `must_change_password` |
| `api_keys` | Machine credentials |
| `refresh_tokens` | Hashed refresh tokens |
| `signatories` | OTP consent authority |
| `org_documents` | Uploaded documents metadata |
| `invoices` | Receivables; `origin` buyer_posted \| supplier_listed \| api_upload |
| `installment_schedules` | Installments |
| `invoice_status_history` | Status trail |
| `opt_ins` | Supplier responses (Path A) |
| `buyer_verifications` | Buyer responses (Path B) |
| `purchase_offers` | SPV offers |
| `assignment_consents` | Buyer OTP consents |
| `assignments` | SPV assignments |
| `wallets` / `wallet_transactions` | Simulated ledger |
| `escrow_legs` | Simulated disburse/collect |
| `fee_configurations` / `fee_ledger` | Fees |
| `packages` / `package_items` | Securitisation packages; `nse_reference` |
| `programmes` | Programme limits |
| `payment_updates` | AfyaX (etc.) payment webhooks |
| `notifications` | In-app notifications |
| `audit_log` | Audit |
| `otp_codes` | OTP hashes |

**Seed orgs (typical):** Platform, Capital SPV, Insurance A/B, Pharmacy 1–5, Hospital 1–5, Wholesaler 1–2, Corporate 1–2, Supplier 1–6 (anonymous labels — no real brands).

---

## 8. API surface (`/api/v1`)

Mounted in `server/index.ts`: auth router + `server/routes/api.ts`.  
OpenAPI: `docs/openapi.yaml`.

### Auth (`/api/v1/auth`)

`POST /login`, `/refresh`, `/logout`, `/change-password`, `/forgot-password`, `/reset-password`  
`GET|PATCH /me`

### Domain groups (non-exhaustive but complete enough for guidance)

| Domain | Notable endpoints |
|--------|-------------------|
| Health | `GET /health`, admin `GET /system/health` |
| Parties (AfyaX) | `POST /parties`, `GET /parties/:uzimaPartyId` |
| Invoices | `POST /invoices`, `POST /external/invoices`, `GET /invoices`, `GET /invoices/:id`, `GET /ious/:iouRegistryId` |
| Opt-ins | `GET /opt-ins`, `POST /opt-ins/:id/respond` |
| Buyer verifications | `GET /buyer-verifications`, `POST …/respond` |
| Offers | `GET|POST /offers`, `POST /offers/:id/respond` |
| Consents | `GET|POST /consents`, OTP request / confirm-sign / decline |
| Assignments | `GET /assignments` |
| Escrow | `GET /escrow`, `POST …/release`, `POST …/collect` |
| Wallets | `GET /wallets/me`, deposit/withdraw (**gated** by `ENABLE_SIMULATED_WALLET`) |
| Packages | `GET|POST /packages`, `PATCH …/status` |
| Programmes / fees | Admin CRUD-ish |
| Documents | upload / list / download |
| Signatories | CRUD-ish |
| Notifications | list / mark read |
| Organisations | list; admin create |
| Admin | audit, users, invite, analytics, reconciliation |
| Payments | schedule, updates, webhook `POST /webhooks/payment-update` (+ signature) |
| Pricing | `POST /pricing/quote` |
| API keys | issue / list / revoke |
| Credit | `GET /buyers/:orgId/credit-risk` |

---

## 9. Feature flags & environment

Critical names from `.env.example` / runtime:

| Variable | Meaning |
|----------|---------|
| `DATABASE_URL` | Postgres (local Docker or Supabase pooler) |
| `REDIS_URL` | Rate limit / lockout |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Auth |
| `ALLOW_DEMO_OTP` | Dev OTP hints (**false** in prod) |
| `ALLOW_BODY_REFRESH` | Allow refresh token in body |
| `ENABLE_SIMULATED_WALLET` | Server wallet mutations |
| `VITE_ENABLE_WALLET` | Show wallet nav / routes |
| `VITE_ENABLE_ENGINE` | Show SPV engine page |
| `VITE_API_URL` | Portal → API base |
| `VITE_SHOW_DEMO` | Demo helpers on auth |
| `COOKIE_SECURE` | Secure cookies (HTTPS) |
| `CORS_ORIGINS` | Allowed origins |
| `EMAIL_PROVIDER` | stub \| resend \| smtp |
| `SMS_PROVIDER` | stub \| africastalking |
| `S3_*` | Object storage (else local `STORAGE_LOCAL_PATH`) |
| `AFYAX_WEBHOOK_SECRET` | Webhook HMAC |
| `PORTAL_URL` | Links in emails |
| `ALLOW_PROD_SEED` | Must be `1` to seed hosted Supabase |
| `DEMO_PASSWORD` | Seed user password |

**Default honesty posture for prod-like deploys:** wallets/engine **off**, demo OTP **off**, cookie secure **on**.

---

## 10. Downstream workflow (after confirmation)

Idealised happy path:

```
Confirmed invoice
  → SPV registry visibility
  → Purchase offer (tenor-based discount)
  → Supplier accept / reject
  → Assignment (+ buyer OTP consent when required)
  → Escrow legs (simulated release to supplier / collect at maturity)
  → Packaging (optional) + nse_reference status fields
  → Payment updates (AfyaX webhook or manual visibility)
```

**Pricing:** tenor-based quotes via `POST /pricing/quote` / `server/lib/pricing` (and related).

---

## 11. Integrations

| Integration | Status |
|-------------|--------|
| **AfyaX** | Party register, external invoices, payment webhook with signature header |
| **Email** | Templates under `server/templates/emails/`; Resend/SMTP when keys set; else stub/log |
| **SMS** | Africa’s Talking hooks; else stub |
| **Storage** | Local disk or S3-compatible |
| **NSE** | None — packaging UI only |
| **Banks** | None |

---

## 12. Deploy & ops

| Piece | Detail |
|-------|--------|
| **Render** | `render.yaml`: `uzima-api`, `uzima-portal`, `uzima-redis`; `DATABASE_URL` manual (e.g. Supabase); build may run `drizzle-kit push` + `db:rls` |
| **Docker Compose** | Local Postgres 15 + Redis 7 only |
| **Supabase** | Project used for hosted Postgres (ref historically `gqbwmshxiblmaicxgwko` / name UzimaX); `npm run db:setup:supabase` with `.env.supabase` |
| **Scripts** | `db:*`, `smoke`, `smoke:dual`, `check:infra`, `check:db`, `verify:db`, `emails:preview`, `test*` |

**Prod checklist (high level):** set secrets, point `DATABASE_URL` + `REDIS_URL`, turn off demo/wallet flags, configure email + CORS + `PORTAL_URL` + `VITE_API_URL`, enable HTTPS cookie secure, do **not** seed demo data on prod without intent.

---

## 13. Key file map

```
src/
  lib/brand.ts              # IOU Exchange brand constants
  App.tsx                   # All routes
  pages/{buyer,supplier,spv,admin,marketing,shared}/
  components/marketing/     # Site chrome
  components/layout/PortalLayout.tsx
  contexts/AuthContext.tsx
  hooks/                    # React Query data hooks
server/
  index.ts
  routes/api.ts             # Main API
  db/schema.ts, seed.ts, apply-rls.ts, sql/
  services/core.ts          # Dual origination + domain logic
  middleware/, lib/, templates/emails/
docs/
  openapi.yaml
  IOU_EXCHANGE_FULL_SYSTEM_GUIDE.md   # this file
  UZIMA_* / AFIX_*                  # prior architecture & audits (names lag brand)
scripts/
  smoke-dual-origination.ts, check-*.ts, supabase-db-setup.ts
```

---

## 14. Guidance for Claude when changing the system

### Do

- Preserve dual origination semantics and status honesty in UI copy.  
- Keep admin off the public Portals marketing grid unless product asks otherwise.  
- Use `BRAND` from `src/lib/brand.ts` for user-visible product name.  
- Gate wallet/engine behind existing env flags.  
- Prefer extending `server/services/core.ts` + schema migrations over new parallel stores.  
- Update this guide when adding/removing a portal page or major API group.

### Don’t

- Claim bank / NSE / live rails in marketing or portal copy.  
- Seed production Supabase without `ALLOW_PROD_SEED=1` and explicit intent.  
- Rename `.uzima-site` / Render service IDs / cookie names without a migration plan.  
- Reintroduce mock dual-store React state as source of truth.  
- Build MFA, live KYC APIs, or bank connectors unless scoped and funded.

### Suggested review questions for future work

1. Which portal pages are redundant or confuse the dual-origination story?  
2. What is the minimum production ops hardening still missing (email live, backups, secrets, monitoring)?  
3. How should AfyaX go from stub-ready to production-certified?  
4. When (if ever) should simulated wallet/escrow be replaced by a licensed partner API?

---

## 15. Quick demo walk (local)

1. `docker compose up -d` && `npm run db:setup` && `npm run db:rls`  
2. `npm run dev` + `npm run dev:api`  
3. Login `buyer@ioux.africa` / demo password → **Post IOU**  
4. Login `supplier@ioux.africa` → **Opt-in**  
5. Login `spv@ioux.africa` → **Registry / Offers / Assignments / Escrow**  
6. Optional Path B: supplier **Post Invoice** → buyer **Verification**  
7. Admin: `admin@ioux.africa` → programmes / users / recon  

---

*End of IOUX-SYS-GUIDE-001. This document describes the system as implemented in the CPF repo as of the date above; prefer the codebase if a conflict arises, then update this file.*
