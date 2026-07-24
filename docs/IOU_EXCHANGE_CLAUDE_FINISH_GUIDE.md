# IOU Exchange — Claude Handoff: Finish the Project to 100%

**Document ID:** `IOUX-CLAUDE-FINISH-001`  
**Audience:** Claude (or any senior agent/engineer continuing this work)  
**Repo:** `c:\Users\Admin\Downloads\CPF` · GitHub `uzimahealth254/UzimaX` · branch **`main`**  
**Date:** 24 July 2026  
**Purpose:** Exhaustive state of what exists — roles, pages, emails, infra, honesty limits.  
**Tasking / finish order:** superseded for *how to finish Phase 1* by **`docs/IOU_EXCHANGE_COMPLETION_GUIDE.md`** (`IOUX-COMPLETE-001`).  
**Ask Claude for the full-system master plan:** **`docs/IOU_EXCHANGE_CLAUDE_FULL_SYSTEM_BRIEF.md`** (`IOUX-CLAUDE-FULL-BRIEF-001`) — what we have done + request for `IOUX-FULL-FINISH-001`.  
Keep this file as the inventory of *what exists*.

**Related docs (do not ignore):**
- `docs/IOU_EXCHANGE_FULL_SYSTEM_GUIDE.md` — architecture & system truth  
- `docs/IOU_EXCHANGE_PRODUCTION_GOLIVE.md` — go-live checklist  
- `docs/DEMO_ACCOUNTS.md` — local seed accounts  
- `docs/UZIMA_PORTAL_CONSULTATION_BRIEF.md` — portal UX consultation  
- `docs/AFIX_SYSTEM_STATUS_AUDIT.md` — older audit (AFIX-era; still useful for gaps)  
- `docs/openapi.yaml` — API surface  

---

## 0. How Claude must behave

1. **Brand positioning (owner-critical):** IOU Exchange is a **trade receivables securitisation management service** — **not** “pharmacy trade” / “working capital for pharmacy trade.” Prefer British spelling **securitisation**. Health/pharmacy may appear as *one sector example*, never as the product definition.  
2. **Honesty:** Never claim live bank rails, real NSE listing, licensed money transmission, or production-certified AfyaX. Escrow/wallet are **simulated ledgers** when enabled.  
3. **Edit over rebuild.** Prefer extending `server/services/core.ts`, Drizzle schema, and existing pages.  
4. **Internal IDs stay:** `uzima_*` cookies, CSS `.uzima-site`, Render service name **UzimaX**, `uzima_party_id`, etc. User-facing name is **IOU Exchange**.  
5. **Ask before** seeding production, rotating secrets in git, or force-pushing.  
6. Treat this file + the system guide as **current truth**, not the older AFIX “pharmacy POC” marketing copy.

---

## 1. Executive snapshot (24 Jul 2026)

### What the product is

**IOU Exchange (IOUX)** orchestrates trade-receivable workflows for invite-only organisations:

1. Register confirmed invoices / IOUs (buyer- or supplier-originated)  
2. Counterparty confirmation (supplier **opt-in** or buyer **verification**)  
3. Assignment to an **SPV** (auto on confirmation *or* via offer + OTP consent)  
4. Tenor-based purchase **offers** and OTP-verified **assignment consents**  
5. Escrow-**style** settlement visibility (**simulated** ledger)  
6. Packaging toward an NSE listing **path** (UI + reference fields only)  
7. Admin programmes, fees, users/orgs, reconciliation, analytics  

### What it is not

| Claim | Reality |
|-------|---------|
| Bank / PSP / lender | No — settlement partners move money |
| Live escrow / wallet rails | Simulated; wallet/engine **off** in prod flags |
| Live NSE | Packaging readiness only |
| Public signup | Invite-only |

### Live deployment (temporary host)

| Surface | URL | Notes |
|---------|-----|------|
| Combined SPA + API | **https://uzimax.onrender.com** | Single Render web service **UzimaX**; Express serves `dist` + `/api/v1` |
| Redis | Render **Key Value** `uzima-redis` | Required in production |
| DB | Supabase Postgres `mllsgipchoezhaehbvew` (eu-west-1) | Pooler URL in Render `DATABASE_URL` |
| Email | Resend | Domain connected (operator confirmed); `EMAIL_FROM=IOU Exchange <no-reply@ioux.africa>` |
| Custom domains | `www` / `app` / `api.ioux.africa` | Partially set historically; **paused** — use onrender for now |

**Render start:** `npm start` → `tsx server/index.ts`  
**Render build:** `npm install --include=dev && npm run build` (or equivalent; Vite is in **dependencies** so prod `npm install` still gets it)  
**Health:** `GET /api/v1/health` must return JSON `{ status, service: uzima-api, db: up }` — **not** the React 404 page.

### Production admin

| Field | Value |
|-------|--------|
| URL | https://uzimax.onrender.com/login |
| Email | `ops@ioux.africa` |
| Password | See `scripts/.tmp-ops-secrets.json` → `NEW_ADMIN_PASSWORD` (was `IouxLive!2026Ops9`) — **rotate after go-live** |

Local demos: `docs/DEMO_ACCOUNTS.md` (`admin@` / `buyer@` / `supplier@` / `spv@ioux.africa` / `Uzima2026!`) — **Docker seed only**, not on hosted DB.

---

## 2. What was done in recent sessions (context for Claude)

Do not re-do these blindly; extend them.

### Infra / deploy
- Env packs: `.env.pack` / `.env.render` (LOCAL + RENDER sections); Render uses `https://uzimax.onrender.com` for `SITE_URL` / `PORTAL_URL` / `CORS_ORIGINS`.  
- Created Render Redis (`uzima-redis`); `REDIS_URL=redis://red-…:6379`.  
- Single-service mode: Express serves API **and** SPA (`server/index.ts`); Express 5 SPA fallback uses `/{*path}` not bare `*`.  
- Fixed Render builds: removed deprecated `tsconfig` `baseUrl`; Vite type decls; moved Vite/Tailwind/PostCSS to **dependencies**; `vite: not found` fixed.  
- Prod API base: `src/lib/apiBase.ts` — production uses **same-origin** `/api/v1` (ignores baked `localhost` `VITE_API_URL`).  
- Hosted schema drift fixed (added `programmes.buyer_sublimit`, `effective_from`, `expires_at`; `packages.weighted_avg_discount_bps`) so Analytics/Programmes stop 500ing.

### Product / brand
- Landing + OG + Auth + emails repositioned to **trade receivables securitisation management** (owner feedback on WhatsApp).  
- About page decorative green waves.  
- OG social image photo + green/orange wash (cache-bust query params in `index.html`).

### Email
- Branded Resend templates in `server/services/email.ts` + previews under `server/templates/emails/`.  
- Operator: Resend **domain connected**. Still verify E2E invite to a real inbox after each deploy.

### Admin
- Users & Orgs: create org, invite, KYC cycle, suspend via `PATCH /organisations/:id`.  
- Programmes close; fees delete; dashboard health strip.

### Still open (see §10)
- Buyer/supplier/SPV **production accounts** (invite via admin + Resend).  
- Workflow product decision: auto-assign vs offer→consent.  
- Custom domains DNS.  
- Real settlement / NSE (out of scope unless scoped).  
- Rotate exposed secrets (Resend key, DB password, admin password shared in chat).

---

## 3. Stack & repo map

| Layer | Tech |
|-------|------|
| Frontend | Vite 6 + React 18 + React Router + TanStack Query + Tailwind |
| Backend | Express 5 + `tsx` + Drizzle ORM + `postgres` |
| Auth | JWT access + httpOnly refresh cookie `uzima_rt`; `PasswordChangeGate` |
| DB | Postgres (local Docker / Supabase hosted) |
| Cache / rate limit | Redis / Valkey (required in `NODE_ENV=production`) |
| Email | Resend (`EMAIL_PROVIDER=resend`) |
| Deploy | Render Free web service + Redis |

**Important paths:**
- `src/App.tsx` — all routes  
- `src/components/layout/PortalLayout.tsx` — role nav  
- `src/lib/brand.ts` — brand + tagline  
- `src/lib/apiBase.ts` / `apiClient.ts` — API origin  
- `server/index.ts` — API + SPA  
- `server/routes/api.ts` — HTTP surface  
- `server/services/core.ts` — workflow mutations  
- `server/services/email.ts` — templates + send  
- `server/db/schema.ts` — tables  

**Run locally:**
```bash
docker compose up -d postgres redis
# .env NODE_ENV=development, VITE_API_URL=http://localhost:8787
npm run db:migrate   # drizzle-kit push
npm run db:seed      # local only
npm run dev          # :5173
npm run dev:api      # :8787
```

---

## 4. Roles overview

| Role | Route prefix | Who | Primary job |
|------|--------------|-----|-------------|
| **Admin** | `/admin` | Platform operator | Orgs, users, programmes, fees, oversight |
| **Buyer** | `/buyer` | Buying org | Post payables; verify supplier invoices; consents; payment schedule |
| **Supplier** | `/supplier` | Selling org | Opt-in; post invoices; accept/decline offers |
| **SPV** | `/spv` | Capital vehicle | Registry; offers; assignments; escrow UI; packaging |

---

## 5. Marketing / public pages

| Route | Page | Purpose |
|-------|------|---------|
| `/` | `HomePage` | Hero: securitisation management; problem; flow; roles |
| `/about` | `AboutPage` | Mission, statement, how we work (+ wave ornaments) |
| `/solutions` | `SolutionsPage` | Supplier / buyer / SPV solution sections |
| `/portals` | `PortalsPage` | Role portal entry → login |
| `/resources` | `ResourcesPage` | Docs / FAQ / security / contact (hash sections) |
| `/privacy` | `PrivacyPage` | Privacy policy |
| `/terms` | `TermsPage` | Terms |
| `/login` | `AuthPage` | Login, forgot/reset; pharmacy-warehouse hero imagery |
| `*` | `NotFound` | SPA 404 |

OG/meta in `index.html` must stay aligned with brand tagline (WhatsApp preview).

---

## 6. Admin portal — every page

**Nav** (`PortalLayout`): Dashboard · All Invoices · Programmes · Fees · Reconciliation · Users & Orgs · Workflow · Analytics · Profile  

| Route | File | What it does |
|-------|------|----------------|
| `/admin` | `AdminDashboard.tsx` | Ops home: `GET /system/health`, invoice/org stats, pipeline, recent `GET /admin/audit` |
| `/admin/invoices` | `AllInvoicesPage.tsx` | Platform invoice register; filters; CSV export from live `GET /invoices` |
| `/admin/programs` | `ProgramsPage.tsx` | Create / pause / close programmes; utilisation (`GET/POST/PATCH /programmes`) |
| `/admin/fees` | `FeesPage.tsx` | Fee config CRUD + ledger (`GET/POST/PATCH/DELETE /fees`) |
| `/admin/reconciliation` | `ReconciliationPage.tsx` | Period variance; mixes `GET /admin/reconciliation` + client math over escrow/payments |
| `/admin/users` | `UsersPage.tsx` | Tabs: Organisations, Users, Invite, Create Org; KYC; suspend; `POST /admin/users/invite` emails temp password |
| `/admin/workflow` | `WorkflowMonitorPage.tsx` | Lifecycle view from invoices + audit |
| `/admin/analytics` | `AnalyticsPage.tsx` | `GET /admin/analytics` aggregations |
| `/admin/profile` | `AdminProfilePage.tsx` | Profile editor, docs tab, system health |

**Admin email actions:** invite, org-created (where wired), KYC updates.

---

## 7. Buyer portal — every page

**Nav:** Dashboard · Post IOU · Verification · Invoice Register · Consent · Payments · Documents · (Ledger if flag) · Profile  

| Route | File | What it does |
|-------|------|----------------|
| `/buyer` | `BuyerDashboard.tsx` | Pending consents, actions, notifications, stats |
| `/buyer/post-iou` | `PostIOUPage.tsx` | **Path A:** post confirmed payable → supplier opt-in email |
| `/buyer/verification` | `BuyerVerificationInboxPage.tsx` | **Path B:** verify/reject supplier-listed invoices → may auto-assign |
| `/buyer/register` | `InvoiceRegisterPage.tsx` | Buyer’s payable register |
| `/buyer/consent` | `ConsentInboxPage.tsx` | OTP consent for **offer** track (active signatory) |
| `/buyer/payments` | `BuyerPaymentsPage.tsx` | Payment schedule / due view |
| `/buyer/documents` | `DocumentsPage.tsx` | Upload/list org documents |
| `/buyer/wallet` | `WalletPage.tsx` | **Gated** `VITE_ENABLE_WALLET` — simulated |
| `/buyer/profile` | `BuyerProfilePage.tsx` | Profile, signatories, developer/API keys (`BuyerApiPage` embedded) |

---

## 8. Supplier portal — every page

**Nav:** Dashboard · Opt-in Inbox · Post Invoice · My Invoices · Payments · Documents · (Ledger) · Profile  

| Route | File | What it does |
|-------|------|----------------|
| `/supplier` | `SupplierDashboard.tsx` | Inbox counts, recent activity |
| `/supplier/opt-in` | `OptInInboxPage.tsx` | **Path A:** accept/decline buyer-posted IOUs → accept may auto-assign |
| `/supplier/post-invoice` | `PostSupplierInvoicePage.tsx` | **Path B:** list invoice for buyer verification |
| `/supplier/invoices` | `MyInvoicesPage.tsx` | Invoice list / filters |
| `/supplier/invoices/:id` | `InvoiceDetailPage.tsx` | Detail; accept/decline SPV offers |
| `/supplier/payments` | `PaymentHistoryPage.tsx` | Payment history |
| `/supplier/documents` | `DocumentsPage.tsx` | Documents |
| `/supplier/wallet` | `WalletPage.tsx` | Gated simulated ledger |
| `/supplier/profile` | `SupplierProfilePage.tsx` | Org/profile/signatories |

---

## 9. SPV portal — every page

**Nav:** Dashboard · IOU Registry · Offers · Assignments · Escrow · Packaging & Listing · Payments · (Ledger) · (Engine) · Profile  

| Route | File | What it does |
|-------|------|----------------|
| `/spv` | `SPVDashboard.tsx` | Pipeline summary |
| `/spv/registry` | `IOURegistryPage.tsx` | Browse receivables by status |
| `/spv/registry/:id` | `IOUDetailPage.tsx` | Detail; actions toward offer/assignment |
| `/spv/offers` | `OffersPage.tsx` | Create/manage purchase offers (tenor, discount) |
| `/spv/assignments` | `AssignmentRegistryPage.tsx` | Active assignments registry |
| `/spv/escrow` | `EscrowPage.tsx` | Mark disbursement released / collection recorded — **simulated legs** + honesty copy |
| `/spv/packaging` | `PackagingPage.tsx` | Bundle assignments; package status; optional `nse_reference` — **not live NSE** |
| `/spv/payments` | `PaymentHistoryPage.tsx` | Payments view |
| `/spv/wallet` | `WalletPage.tsx` | Gated simulated |
| `/spv/engine` | `BackendEnginePage.tsx` | Gated `VITE_ENABLE_ENGINE` |
| `/spv/profile` | `SPVProfilePage.tsx` | Profile / docs / signatories |

---

## 10. Core workflows (as coded — discuss with owner)

### 10.1 Dual origination (auto-assign happy path)

```
Path A — Buyer-posted                 Path B — Supplier-listed
Buyer /post-iou                       Supplier /post-invoice
  origin=buyer_posted                   origin=supplier_listed
  status=awaiting_opt_in                status=awaiting_buyer_verification
       ↓                                     ↓
Supplier /opt-in                      Buyer /verification
  accept → assignment                   verify → assignment
  type ≈ opt_in_auto                    type ≈ supplier_originated_auto
```

**Code reality:** Accept/verify often **creates an assignment immediately** (escrow legs + optional simulated wallet). It does **not** require an SPV offer first.

### 10.2 Negotiated track (parallel)

```
SPV creates offer → Supplier accepts/declines
  → (on accept) Buyer consent OTP → assignment type ≈ offer_consent
```

### 10.3 Product decision needed for “100%”

Owner must choose:

1. **Auto-assign on confirmation** remains primary (current dual-origination), **or**  
2. **Every deal must go Offer → Buyer consent → Assign**, **or**  
3. Hybrid with clear UI labels so SPV “Available” vs “Assigned” is not confusing.

Until this is locked, finishing UX will thrash.

---

## 11. Email system (complete inventory)

**Implementation:** `server/services/email.ts`  
**Provider:** Resend when `EMAIL_PROVIDER=resend` + `RESEND_API_KEY`  
**From:** `IOU Exchange <no-reply@ioux.africa>`  
**Operator status:** Domain connected in Resend (Jul 2026).  

**Footer tagline in templates:** Trade receivables securitisation management  

| Subject helper | Typical trigger | Recipient |
|----------------|-----------------|-----------|
| `otp` | Consent / sensitive OTP | User |
| `invite` | Admin invite user | New user |
| `passwordReset` / `passwordChanged` | Auth flows | User |
| `optIn` / `optInDeclined` | Buyer posts / supplier declines | Supplier / buyer |
| `verification` / `verificationRejected` | Supplier lists / buyer rejects | Buyer / supplier |
| `offerReceived` / `offerAccepted` / `offerDeclined` | SPV offer lifecycle | Supplier / SPV |
| `consentRequired` / `consentSigned` / `consentDeclined` | Offer track consent | Buyer / SPV (+ supplier) |
| `assignment` | Assignment created | SPV + buyer + supplier |
| `escrowDisburse` / `escrowCollect` | Escrow UI actions | Parties (simulated) |
| `payment` / `settled` | Payment webhook / settle | Parties |
| `packageReady` | Package status | SPV |
| `document` | Generated PDF ready | User |
| `apiKey` | Buyer API key created | Buyer user |
| `orgCreated` / `kyc` | Admin org/KYC | Org contacts |
| `programmeBlock` | Programme limit hit | Relevant party |

**Previews:** `npm run emails:preview` → `server/templates/emails/`.  

**Gap:** Invite returns 201 even if Resend fails — harden logging + admin UI feedback for failed sends.

---

## 12. Feature flags (production posture)

Set on Render (and in `.env.render`):

```
NODE_ENV=production
COOKIE_SECURE=true
ALLOW_DEMO_OTP=false
ALLOW_BODY_REFRESH=false
ENABLE_SIMULATED_WALLET=false
VITE_SHOW_DEMO=false
VITE_ENABLE_WALLET=false
VITE_ENABLE_ENGINE=false
```

`VITE_*` are **build-time** — change ⇒ redeploy frontend build.  
`getApiBaseUrl()` in prod prefers same-origin if env missing/localhost.

---

## 13. Database

- **Schema:** `server/db/schema.ts` (~26 tables): orgs, users, invoices, opt-ins, verifications, offers, consents, assignments, escrow_legs, wallets*, fee_*, programmes, packages, payment_updates, notifications, audit_log, otp_codes, api_keys, documents, etc.  
- **Migrations:** Drizzle push + SQL under `supabase/migrations/`; RLS via `npm run db:rls`.  
- **Hosted:** After column drift incidents, always `drizzle-kit push` / explicit `ALTER` against prod when schema changes — don’t assume Render build’s `drizzle-kit push` ran (UzimaX build is frontend-oriented).  
- **Seed:** Refuses hosted/prod unless `ALLOW_PROD_SEED=1`. Use `npm run create-admin` / admin invite instead.

---

## 14. Simulated vs real (checklist)

| Capability | Status |
|------------|--------|
| Auth, JWT, refresh cookie, force password change | Real |
| Orgs, users, invites, KYC status fields | Real (KYC is admin-set, not vendor KYC) |
| Invoices, opt-in, verification, offers, consent OTP | Real |
| Assignments + PDFs (purchase note / assignment letter) | Real (document generation) |
| Escrow legs UI | **Simulated** |
| Wallet ledger | **Simulated** + flag-off in prod |
| NSE packaging | **UI only** |
| Bank / standing order execution | **Not built** (fields only) |
| AfyaX webhooks | Built stubs; signature enforced in prod |
| Resend email | Configured; verify E2E |
| MFA / SSO / ERP adapters | **Not built** |

---

## 15. Accounts & access

| Environment | Accounts |
|-------------|----------|
| Local Docker seed | `docs/DEMO_ACCOUNTS.md` |
| Production | `ops@ioux.africa` admin only (as of clean hosted DB); create buyer/supplier/SPV via **Admin → Users → Create Org + Invite** |

---

## 16. Definition of “100%” for this project

Agree with the operator. Recommended definition:

### P0 — Must work for a client demo on production
1. Stable deploy on `uzimax.onrender.com` (health JSON + login).  
2. Admin creates **Buyer, Supplier, SPV** orgs + invites; Resend delivers.  
3. End-to-end **Path A** and **Path B** with emails at each step.  
4. Offer → consent OTP → assignment path works if kept.  
5. Copy/branding consistent with securitisation positioning.  
6. Honesty labels on escrow/packaging; wallet/engine off.  
7. Secrets rotated (DB, Resend, admin password, JWT if exposed).

### P1 — Production-credible ops
1. Custom domains (`www` / `app` / `api`) or intentional permanent onrender.  
2. Schema migrate-on-deploy for API (or documented one-off).  
3. Failed email visible to admin; retry.  
4. Cross-tenant + authz smoke on prod.  
5. Backups confirmed on Supabase.  
6. Legal pages advocate-reviewed.

### P2 — Explicitly out of “100%” unless newly scoped
- Live bank rails, real NSE APIs, external KYC, MFA/SSO, per-buyer ERP connectors, multi-region HA.

---

## 17. Recommended plan for Claude to guide finishing (ordered)

### Phase A — Product lock (1 conversation with owner)
- [ ] Lock auto-assign vs offer-first workflow.  
- [ ] Lock whether wallet/escrow UIs stay visible (honesty) or hidden.  
- [ ] Confirm brand sentence for hero + WhatsApp OG (already updated; reconfirm).  

### Phase B — Production multi-role readiness
- [ ] From admin: create Buyer / Supplier / SPV orgs.  
- [ ] Invite real users; confirm Resend delivery + `PasswordChangeGate`.  
- [ ] Walk Path A and Path B on production; fix any 500s / empty states.  
- [ ] Walk offer → consent path if retained.  

### Phase C — Hardening
- [ ] Ensure Render start = `npm start`, health = `/api/v1/health`.  
- [ ] On schema change: push to Supabase (don’t rely on static-only build).  
- [ ] Rotate secrets shared in chat.  
- [ ] Add admin toast when invite email fails.  
- [ ] Re-scrape OG after deploy.  

### Phase D — Polish
- [ ] Empty/loading/error consistency on buyer/supplier/SPV.  
- [ ] Align SPV registry filters with auto-assign statuses.  
- [ ] USER_GUIDE update for production URLs + securitisation wording.  

### Phase E — Domains (when ready)
- [ ] DNS for `app` / `api` / `www`; update `PORTAL_URL`, `CORS_ORIGINS`, `VITE_API_URL`, rebuild.  

---

## 18. Known bugs / landmines for Claude

1. **`NODE_ENV=production` in a local shell** makes `assertSecurityConfig` require Redis + AFYAX secrets — set `NODE_ENV=development` for `npm run dev:api`.  
2. **Duplicate `REDIS_URL` in `.env`** — last wins; local must be `redis://localhost:6379`.  
3. **Vite bakes `VITE_*`** — Render env changes need redeploy.  
4. **Express 5** forbids `app.get('*')` — use `/{*path}`.  
5. **Hosted schema can lag Drizzle** — Analytics/Programmes 500ed until columns added.  
6. **Auto-assign vs offers** confuse SPV “available” inventory.  
7. **Do not `npm run db:seed` on hosted** without `ALLOW_PROD_SEED=1`.  
8. Free Render **spins down** — cold starts look like “API down.”  

---

## 19. Quick verification commands

```bash
# Live health (must be JSON)
curl -s https://uzimax.onrender.com/api/v1/health

# Login smoke
curl -s -X POST https://uzimax.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"ops@ioux.africa\",\"password\":\"<from secrets>\"}"
```

---

## 20. File index — primary UI pages by role

```
Marketing:  src/pages/HomePage.tsx, marketing/*
Auth:       src/pages/AuthPage.tsx
Admin:      src/pages/admin/*
Buyer:      src/pages/buyer/*
Supplier:   src/pages/supplier/*
SPV:        src/pages/spv/*
Shared:     src/pages/shared/{Wallet,Documents,PaymentHistory,Signatories}Page.tsx
```

---

## 21. Closing instruction to Claude

You are continuing an **almost-demo-ready** securitisation **management** platform on Render + Supabase + Resend.  

**Do not rebuild.**  
**Do not claim bank/NSE.**  
**Do lock the dual-origination vs offer workflow with the user first.**  
Then execute Phase B–D above, verifying each step on **https://uzimax.onrender.com** with real Resend emails.

When unsure, re-read this file + `docs/IOU_EXCHANGE_FULL_SYSTEM_GUIDE.md` before coding.
