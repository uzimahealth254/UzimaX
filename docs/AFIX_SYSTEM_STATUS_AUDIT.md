# AFIX System Status Audit — Comprehensive Review Brief

**Document ID:** AFIX-AUDIT-001  
**Purpose:** Give an external reviewer (e.g. Claude) a complete, honest picture of what has been built, what works, what is mock, what is missing for a production “actual system,” and where judgment is needed.  
**Product:** AFIX — Private-Sector Trade Receivables / Securitisation Platform  
**IP owner (contractual):** UzimaX  
**Client stakeholders:** CPF Githuku & team  
**Prepared for review:** 20 July 2026  
**Codebase path:** `c:\Users\Admin\Downloads\CPF`  
**Commercial plan reference:** `docs/AFIX_Functional_System_Phased_Plan.md` (AFIX-SYS-PLAN-001)  
**Package name:** `afix-platform` v1.0.0  

---

## 0. Executive verdict (read this first)

### Short answer to “Is the actual system built?”

**Partially — as a functional product shell / operations demo, not as a production financial system.**

| Layer | Status |
|-------|--------|
| **Product UX & workflow (Buyer → Supplier opt-in → SPV assignment → escrow UI → packaging → NSE path UI)** | **Built** and demoable end-to-end in the React portal |
| **Buyer upload API (Express)** | **Built** (demo API key, JSON file store, OpenAPI/Postman) |
| **Persistent database (Postgres etc.) for portal + API as single source of truth** | **Not built** |
| **Real buyer ERP / procurement system integrations** (SAP, Oracle, custom APIs “from where buyers are buying”) | **Not built** — only a generic REST upload API buyers *could* call |
| **Real banking / escrow / disbursement / collection rails** | **Not built** — UI + mock ledger legs only |
| **Production identity (OAuth/Keycloak), KYC, audit-grade security** | **Not built** — demo password auth |
| **Live email/SMS** | **Hooks ready**; default is stub/console unless provider keys are configured |
| **NSE / capital markets listing** | **Process UI only** — no exchange integration |

**Honest positioning vs AFIX-SYS-PLAN-001:**  
The phased plan asked for a *functional system* shipped as we develop — portals, flows, APIs, IOUs, notifications, escrow *views*, packaging/NSE *path*. That product layer is largely present.  

What the user is now correctly asking for (“APIs from where buyers are buying,” “bank stuff”) sits mostly in:

- **Out of scope** in the plan for live bank rails (explicitly called out), and/or  
- **Phase 2+ integrations** that need real credentials, ERP field maps, and a real database — **not yet done**.

**Recommendation for the reviewer:** Treat this as **~70–80% of the planned UX/product layer**, **~40–50% of a production operations platform**, and **~10–20% of a regulated/production finance stack** (banks, identity, true persistence, ERP adapters).

---

## 1. What “done” was supposed to mean (from the plan)

### 1.1 Business flow (must-have)

```
Buyer posts approved invoice / IOU
        ↓
IOU registered in central registry
        ↓
Supplier notified: Opt in / Sell
        ↓
Supplier accepts  → Assignment of receivable to SPV
Supplier declines → Closed / returned to buyer queue
        ↓
SPV purchase / discount terms applied
        ↓
Escrow-style settlement views: pay supplier · collect from buyer at maturity
        ↓
(Later) Package notes · investor / NSE listing path
```

### 1.2 Securitisation capabilities (from analysis)

| Capability | Plan intent | Current status |
|------------|-------------|----------------|
| IOU Registry / Depository | System of record | **UI + IDs + history model**; not a durable DB depository |
| SPV purchase engine | One vehicle buys receivables; tenor discount | **Calculator + offer flow** in portal |
| Buyer assignment & consent | Digital sign-off | **Consent inbox + trail**; no legal e-sign / PDF artifact |
| Escrow settlement | Neutral cash legs | **UI + mock legs**; no bank |
| Negotiated discount pricing | Tenor-based | **`src/lib/pricing.ts` + OfferCalculator** |
| Buyer ERP / API ingestion | Confirmed invoices from buyer systems | **Generic REST API only**; no ERP-specific adapters |
| Note packaging & NSE listing | Bundle for investors | **Packaging + listing workflow UI** |

### 1.3 Explicitly out of scope (unless added) — from plan §9

- Licensing / listing fees with NSE or investors  
- Formal legal opinions and executed trust deeds  
- **Core banking / live bank rails** (platform shows escrow UX; bank integration is its own project)  
- Rebuilding third-party microservices the client does not control  

**Implication:** Asking for “bank stuff” to make it an “actual system” is a **scope expansion beyond AFIX-SYS-PLAN-001**, unless reframed as a new phase / add-on.

---

## 2. Repository & stack facts

### 2.1 Stack

| Item | Detail |
|------|--------|
| Frontend | Vite 6 + React 18 + TypeScript (strict) + Tailwind + React Router 6 |
| Charts | Recharts |
| Forms | react-hook-form + zod (deps present; not all pages use them) |
| Backend | Express 5 (ESM) in `server/` |
| Persistence (API) | Optional JSON file `server/data/store.json` |
| Persistence (portal) | In-memory React state from seed; **lost on refresh** (except auth session in localStorage) |
| Auth | Demo users + shared password in `AuthContext` |
| Deploy sketch | `render.yaml` — two services: portal (`afix`) + API (`afix-api`) |
| Package scripts | `dev`, `dev:api`, `build`, `preview`, `start`, `optimize:og` |

### 2.2 Git remote (important)

```
origin → https://github.com/uzimahealth254/UzimaX.git
(Previously pointed at an unrelated Kenya-Farmers-Training repo; corrected.)
```

This remote name suggests the workspace may be attached to an **unrelated** GitHub repo historically. Reviewer should flag IP/repo hygiene for UzimaX delivery.

### 2.3 Approximate size

- ~33 page components under `src/pages/`  
- ~16 layout/shared components  
- 3 contexts, 4 hooks, 6 lib modules  
- ~12 Express API endpoints  
- 15 TypeScript interfaces + 10 status/type enums  
- Docs under `docs/` + root `README.md`

---

## 3. Architecture (as implemented)

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER (Vite React SPA)                                   │
│  AuthContext (localStorage session)                         │
│  DataContext (seed + mutations — PRIMARY demo state)          │
│  NotificationContext                                        │
│  Partial sync: GET /api/v1/sync on mount                     │
│  Optional: POST invoices / opt-in respond to API             │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP (optional)
┌───────────────────────────▼─────────────────────────────────┐
│  EXPRESS API (:8787)                                        │
│  API-key auth (demo buyer key)                              │
│  In-memory + store.json                                     │
│  Opt-in respond → assignment + escrow stubs                 │
│  Email/SMS stubs or providers                               │
└─────────────────────────────────────────────────────────────┘
                            │
                    NO PostgreSQL / NO bank / NO ERP adapters
```

### Critical architectural issue

**Dual data stores:**

1. Portal `DataContext` + `seed.ts` ≈ 100+ invoices for rich demos  
2. API `server/store.js` + `store.json` for ERP-style uploads  

They are **bridged loosely** (`sync` on load, push on some actions) but are **not one system of record**. Refreshing the browser resets portal business state to seed (auth session survives). API-created invoices can appear after sync if API is running — but portal and API can diverge.

**This is the #1 technical debt item for becoming an “actual system.”**

---

## 4. What has been achieved (feature inventory)

### 4.1 Roles & portals

| Role | Portal base | Pages built |
|------|-------------|-------------|
| Supplier | `/supplier` | Dashboard, Opt-in inbox, My invoices, Invoice detail, List invoice, Trade history, Profile |
| Buyer | `/buyer` | Dashboard, Post IOU, Invoice register, Consent inbox, API integration page, Payment schedule, Profile |
| SPV | `/spv` | Dashboard, IOU registry, IOU detail, Offers, Assignments, Escrow, Packaging, NSE listing, Backend engine, Profile |
| Admin | `/admin` | Dashboard, All invoices, Programmes, Reconciliation, Users, Workflow/audit, Analytics |

UI theme: blue/green/white, glassmorphism, mobile-friendly layout (`PortalLayout`), fonts Playfair / DM Sans / IBM Plex Mono.

### 4.2 Phase 1 — Buyer → Supplier → SPV core

| Deliverable | Implemented? | Where / notes |
|-------------|--------------|---------------|
| Buyer post invoices / IOUs | **Yes** | `PostIOUPage.tsx` → `postBuyerIOU()` |
| IOU Registry v1 | **Yes (UI)** | `IOURegistryPage`, `IOUDetailPage`, search/filter |
| Unique IOU IDs | **Yes** | Scheme `IOU-KE-{YYYY}-{SEQ5}-{CHK}` in `src/lib/iouId.ts` + server; draft doc `docs/IOU_REGISTRY_SCHEME.md` (Sule review pending) |
| Status history | **Partial** | `statusHistory[]` on invoice when mutations run; seed invoices often lack full history |
| Notify supplier (in-app) | **Yes** | `NotificationContext` + toasts |
| Notify supplier (email hook) | **Yes (stub/provider)** | `src/lib/notify.ts` → `/api/v1/notify/email` |
| SMS stub | **Yes (stub/provider)** | `/api/v1/notify/sms` |
| Supplier opt-in / sell | **Yes** | `OptInInboxPage` — accept / decline + reason |
| Auto assignment to SPV | **Yes** | `respondToOptIn` → `ReceivableAssignment` + escrow legs |
| Polished portals | **Yes** | Four role portals |
| Demo accounts | **Yes** | See §5 |
| Hosted deploy + user notes | **Partial** | `render.yaml` + `docs/USER_GUIDE.md`; live URL depends on deploy |

**Phase 1 exit criteria (plan):** *Buyer posts → Supplier notified → Accept → Assignment visible to SPV*  
→ **Met in demo** (portal state). Not met as durable multi-user production system.

### 4.3 Phase 2 — APIs, notifications, purchase & escrow

| Deliverable | Implemented? | Where / notes |
|-------------|--------------|---------------|
| Buyer upload APIs | **Yes** | `POST/GET /api/v1/invoices`, status, IOU lookup |
| API auth | **Demo only** | Bearer / `X-API-Key` with single demo key |
| OpenAPI | **Partial** | `docs/openapi.yaml` — buyer paths; missing sync/opt-ins/notify in spec |
| Postman | **Yes** | `docs/afix-buyer-api.postman_collection.json` |
| Sample client | **Yes** | `scripts/sample-upload.mjs` + Buyer API page curl |
| Notifications pack | **Partial** | In-app solid; email/SMS need keys |
| SPV purchase engine v1 | **Yes (UI)** | `pricing.ts` tenor formula + `OfferCalculator` + `OffersPage` |
| Offer → accept → assignment linkage | **Partial** | Accept offer → **requests buyer consent**; assignment still via consent sign or opt-in path |
| Buyer consent inbox | **Yes** | `ConsentInboxPage` |
| Escrow settlement views | **Yes (mock)** | `EscrowPage` — release / collect buttons |
| Audit log exportable | **Yes** | Admin Workflow → CSV |
| Production API base URL | **Not until deploy** | Local `:8787` |

**Phase 2 exit criteria:** *Postman/ERP can POST invoice; supplier notified; assignment + escrow in portal*  
→ **Met if API + portal both running and sync works**; fragile due to dual store.

### 4.4 Phase 3 — Packaging, programmes, capital-market readiness

| Deliverable | Implemented? | Where / notes |
|-------------|--------------|---------------|
| Programs & limits | **Partial** | Display + soft capacity/tenor warnings on post; **no hard enforce / CRUD** |
| Note packaging | **Yes (UI)** | `PackagingPage` from assigned pool |
| NSE / USP listing views | **Yes (process UI)** | `ListingReadinessPage` — draft→structured→listed→placed; fake `nseReference` |
| Reconciliation & settlement reports | **Yes (from mock escrow/payments)** | `ReconciliationPage` — period, variance flags, CSV |
| Hardening (roles, multi-tenant, security) | **Weak** | Client `ProtectedRoute` only; several API routes **unauthenticated** (`/sync`, `/opt-ins`, `/notify/*`); rate limit 60/min |
| Handover package | **Yes (docs)** | `docs/HANDOVER.md` |

### 4.5 Data model (types)

**Enums / unions:**  
`UserRole`, `InvoiceStatus` (13 values including `awaiting_opt_in`, `opt_in_declined`), `InvoiceOrigin`, `OfferStatus`, `ConsentStatus`, `PackageStatus`, `OptInStatus`, `EscrowLegType`, `EscrowStatus`, `ProgramStatus`

**Interfaces:**  
`User`, `Organisation`, `Invoice`, `StatusHistoryEntry`, `ConsentSignature` (**defined but unused in UI**), `SupplierOptIn`, `ReceivableAssignment`, `PurchaseOffer`, `AssignmentConsent`, `SecuritisationPackage`, `FinancingProgram`, `EscrowLeg`, `Payment`, `Notification`, `ActivityLog`

### 4.6 DataContext mutations (portal business logic)

`listInvoice`, `postBuyerIOU`, `respondToOptIn`, `updateInvoiceStatus`, `makeOffer`, `respondToOffer`, `requestConsent`, `signConsent`, `createPackage`, `updatePackageStatus`, `confirmPayment`, `releaseEscrow`, `collectEscrow`, `addActivityLog`

### 4.7 Express API surface

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/health` | No |
| GET | `/api/v1/sync` | **No (demo — security risk in prod)** |
| POST | `/api/v1/invoices` | API key |
| GET | `/api/v1/invoices` | API key |
| GET | `/api/v1/invoices/:id` | API key |
| GET | `/api/v1/invoices/:id/status` | API key |
| POST | `/api/v1/invoices/:id/status-query` | API key |
| GET | `/api/v1/ious/:iouRegistryId` | API key |
| GET | `/api/v1/opt-ins` | **No** |
| POST | `/api/v1/opt-ins/:id/respond` | **No** |
| POST | `/api/v1/notify/email` | **No** |
| POST | `/api/v1/notify/sms` | **No** |

### 4.8 Documentation delivered

| Doc | Purpose |
|-----|---------|
| `docs/AFIX_Functional_System_Phased_Plan.md` | Commercial phased plan |
| `docs/AFIX_Quotation.md` | Quotation / proposal |
| `docs/USER_GUIDE.md` | Demo walkthrough |
| `docs/HANDOVER.md` | Ops handover |
| `docs/IOU_REGISTRY_SCHEME.md` | ID scheme for Sule |
| `docs/openapi.yaml` | Buyer API OpenAPI |
| `docs/afix-buyer-api.postman_collection.json` | Postman |
| `README.md` | Quick start |
| `server/README.md` | API curl notes |
| **This file** | Full audit for external review |

---

## 5. Demo credentials & seed

| Role | Email | Password (docs) |
|------|-------|-----------------|
| Supplier | supplier@afix.co.ke | `AFIX2026!` |
| Supplier 2 | supplier2@afix.co.ke | same |
| Buyer | buyer@afix.co.ke | same |
| SPV | spv@afix.co.ke | same |
| Admin | admin@afix.co.ke | same |

**Buyer demo API key:** `afix_demo_kbc_7f3a9c2e1b`

**Seed scale (approx.):** ~106 invoices, offers/consents/payments/packages derived, 2 pending opt-ins, 12 assignments, 3 programmes, ~30 escrow legs, 5 notifications, 5 activity logs.

**Reviewer note:** Confirm password string in `AuthContext` matches docs (`AFIX2026!` vs any typo variants).

---

## 6. MOCK vs REAL matrix (critical for Claude)

| Capability | Classification | Evidence |
|------------|----------------|----------|
| Login / roles | **MOCK** | Hardcoded `demoUsers`, shared password |
| Session | **Browser-only** | `localStorage` key `afix-session` |
| Portal invoices/offers/etc. | **MOCK / ephemeral** | React state from seed; refresh resets |
| API invoices | **Semi-persistent** | `store.json` if disk writable |
| Buyer REST upload | **REAL code path** | Express validation + create |
| ERP adapters (SAP, etc.) | **MISSING** | No connector layer |
| Email | **STUB default / REAL if keyed** | Resend or SMTP env |
| SMS | **STUB default / REAL if keyed** | Africa’s Talking env |
| Escrow disbursement | **MOCK** | Status flip in UI; no bank API |
| Escrow collection | **MOCK** | Same |
| Payments schedule | **MOCK** | Seeded payment objects |
| Document upload | **MOCK UI** | No object storage / virus scan |
| Consent signature | **MOCK clickwrap** | No PKI / DocuSign / hash chain UI |
| Programme limits | **SOFT** | Warnings, not hard blocks |
| NSE listing | **MOCK process** | String references |
| Analytics charts | **Derived from seed** | Recharts on in-memory data |
| Multi-tenant isolation | **UI filter only** | Not server-enforced for portal |
| Database | **MISSING** | No `DATABASE_URL` implementation |
| Bank APIs (M-Pesa, Pesalink, SWIFT, escrow bank) | **MISSING** | — |
| Webhooks to buyer ERPs | **MISSING** | — |
| Production secrets management | **MISSING** | `.env.example` may be incomplete/gitignored |

---

## 7. What is remaining for an “actual system”

Grouped for planning. Items marked **(plan out of scope)** were never in the 600k phased fee as live integrations.

### 7.1 Must-have to graduate from demo → real ops platform

1. **Single source of truth DB** (Postgres recommended) for users, orgs, invoices, opt-ins, assignments, offers, consents, packages, escrow, audit  
2. **API as primary backend**; portal becomes thin client (no seed as production truth)  
3. **Real auth** (sessions/JWT/OAuth) + password hashing + invite flows  
4. **Lock down public endpoints** (`/sync`, `/opt-ins`, `/notify`)  
5. **Email delivery** with production templates (opt-in, consent, assignment)  
6. **File storage** for invoice PDFs / support docs  
7. **Program hard limits** enforced server-side  
8. **Idempotent buyer API** + webhook events (invoice received, opted-in, assigned, disbursed)  
9. **Deploy** portal + API with HTTPS, CORS lockdown, secrets  

### 7.2 Buyer “APIs from where they are buying” (ERP / procurement)

This is what the user is pointing at. Today we only have:

> “Here is a REST endpoint; push us your confirmed invoice JSON.”

Still needed per buyer:

| Work item | Description |
|-----------|-------------|
| Field mapping workshop | Their invoice JSON/XML → AFIX invoice schema |
| Adapter per system | SAP, Oracle, Microsoft Dynamics, custom AP, CSV SFTP |
| Auth model | Per-buyer API keys / OAuth client credentials / mTLS |
| Confirmation rules | What “approved/confirmed” means in their system |
| Pull vs push | Webhooks from ERP **or** AFIX polling **or** SFTP batch |
| Sandbox + UAT | Test tenants per buyer |
| Error / duplicate handling | Same invoiceNumber twice, amendments, cancellations |

**Without at least one live buyer connector + DB, it is not yet an “integrated buying system.”**

### 7.3 Bank / escrow / settlement (“bank stuff”) — largely new scope

| Work item | Description |
|-----------|-------------|
| Escrow / trust account design | With bank counsel + SPV structure |
| Disbursement API | Pay supplier (Pesalink / RTGS / EFT / M-Pesa B2C) |
| Collection / virtual accounts | Buyer pays into escrow at maturity |
| Reconciliation feed | Bank statements → match escrow legs |
| Controls | Maker-checker, dual approval, limits |
| Compliance | AML/KYC hooks, audit for regulators |

Plan §9 already said live bank rails are **out of scope** unless added. Building this makes AFIX a **payments/settlement product**, not only a receivables workflow UI.

### 7.4 Capital markets / NSE

- Exchange onboarding remains external  
- Need investor data rooms, note term sheets, legal docs — mostly process + docs, not just UI  
- Listing UI exists as workflow mock only  

### 7.5 Legal / domain (Sule)

- Final IOU instrument wording  
- Assignment / true sale language  
- Confirm IOU ID scheme (`docs/IOU_REGISTRY_SCHEME.md` open checklist)  

### 7.6 Optional add-ons (from plan)

- Live SMS gateway  
- Keycloak / OAuth  
- Next.js migration  
- Support retainer  

---

## 8. Known bugs / inconsistencies / risks (for reviewer)

1. **Dual store / refresh loss** — portal state not durable  
2. **Unauthenticated sensitive API routes** — `/sync`, opt-in respond, notify  
3. **OpenAPI incomplete** vs implemented routes  
4. **`ConsentSignature` type unused** — consent not audit-grade  
5. **Programmes not hard-enforced**  
6. **Offer accept does not auto-assign** — goes to consent; opt-in path assigns immediately (two models coexist — intentional but confusing)  
7. **Git remote** may not be UzimaX-owned AFIX repo  
8. **`.env.example`** referenced but may be missing from tree (gitignored patterns)  
9. **nodemailer** dynamically imported for SMTP but may not be in `package.json`  
10. **Seed IDs** mix legacy `IOU-KE-2025#####` style with new Luhn scheme  
11. **Security**: client-side role gates only; trivial to bypass without server auth  
12. **No automated tests** (unit/e2e) observed in inventory  
13. **Rate limit** is in-memory only (resets per process; not distributed)  

---

## 9. How to run (for reviewer reproduction)

```bash
cd c:\Users\Admin\Downloads\CPF
npm install
npm run dev        # portal (typically http://localhost:5173)
npm run dev:api    # API http://localhost:8787
# optional:
node scripts/sample-upload.mjs
npm run build      # tsc + vite production build
```

**Primary demo walk:**

1. Buyer `buyer@afix.co.ke` → Post IOU  
2. Supplier `supplier@afix.co.ke` → Opt-in Inbox → Opt in & sell  
3. SPV `spv@afix.co.ke` → Assignments / Escrow / Registry detail  
4. Admin → Reconciliation + Workflow audit CSV  

---

## 10. Mapping to commercial phases (achievement %)

| Phase | Fee (KES) | Rough delivery vs plan | Confidence |
|-------|-----------|------------------------|------------|
| 1 — Core flow + portals | 180,000 | **~85%** of planned UX (minus durable deploy/email live) | High for demo |
| 2 — APIs + ops | 220,000 | **~55–65%** (API exists; not production-hardened; dual store) | Medium |
| 3 — Packaging / programmes / NSE path | 200,000 | **~50–60%** (UI yes; enforcement/hardening weak) | Medium |
| **Full “actual finance system” (ERP+bank+DB)** | Beyond plan | **~15–25%** | N/A — new scope |

---

## 11. Suggested questions for Claude (reviewer checklist)

Please answer explicitly:

1. Given AFIX-SYS-PLAN-001, is calling this a “functional system” **fair**, or was it oversold relative to mock persistence?  
2. What is the **minimum viable production architecture** (DB schema sketch + service boundaries) to eliminate dual store?  
3. How should we sequence: (A) Postgres + unify API, (B) one buyer ERP adapter, (C) bank/escrow partner — for maximum stakeholder value?  
4. Are the **two assignment paths** (opt-in auto-assign vs offer→consent→assign) coherent for true sale, or should one be primary?  
5. Security: prioritize which of the unauthenticated routes / client-only auth is unacceptable for a private demo vs UAT?  
6. What should **not** be built next (avoid gold-plating) until Sule + bank partner + one real buyer are confirmed?  
7. Gap list: top 10 remaining items ranked by **business risk** vs **engineering effort**.  
8. Does the IOU ID scheme draft look acceptable pending Sule, or should format change now?  
9. Is Express+JSON adequate for UAT, or must Postgres land before any client pilot?  
10. Recommend a **honest status sentence** Alfred can tell CPF Githuku / UzimaX without overclaiming.

---

## 12. Suggested honest status sentence for the client

> “We have built the AFIX **product layer**: four portals, the buyer→supplier opt-in→SPV assignment flow, IOU registry UI, buyer upload API, purchase pricing, escrow and packaging screens, and demo data so stakeholders can walk the process. What is **not** yet an actual production finance system is: a shared database, live ERP connectors for each buyer’s purchasing systems, real bank disbursement/collection, and production-grade identity/security. Those are the next build tracks — some were called out as out of scope (live bank rails) in the phased plan and need separate scope/budget.”

---

## 13. File index (high-value paths)

| Area | Paths |
|------|-------|
| Plan | `docs/AFIX_Functional_System_Phased_Plan.md` |
| Types | `src/types/index.ts` |
| Portal state | `src/contexts/DataContext.tsx`, `src/data/seed.ts` |
| Auth | `src/contexts/AuthContext.tsx` |
| Pricing | `src/lib/pricing.ts`, `src/components/shared/OfferCalculator.tsx` |
| IOU IDs | `src/lib/iouId.ts`, `docs/IOU_REGISTRY_SCHEME.md` |
| API client | `src/lib/api.ts`, `src/lib/notify.ts` |
| Express | `server/index.js`, `server/store.js`, `server/notifications.js` |
| OpenAPI / Postman | `docs/openapi.yaml`, `docs/afix-buyer-api.postman_collection.json` |
| Deploy | `render.yaml` |
| Routes | `src/App.tsx` |

---

## 14. Appendix — Invoice lifecycle statuses in code

`draft` → `listed` | `awaiting_opt_in` → `verified` → `offer_received` → `offer_accepted` → `assigned` → `packaged` → `disbursed` → `matured` → `settled`  

Also: `opt_in_declined`, `defaulted`

Origins: `supplier_listed` | `buyer_posted` | `api_upload`

---

## 15. Document control

| Field | Value |
|-------|-------|
| Title | AFIX System Status Audit — Comprehensive Review Brief |
| ID | AFIX-AUDIT-001 |
| Audience | External AI/human reviewer (Claude), Alfred, UzimaX |
| Honesty standard | Prefer under-claim; separate plan scope vs production finance stack |
| Next action after review | Prioritised remaining backlog + optional scope change order for ERP + bank |

---

*End of audit. Feed this entire file to Claude with the question: “Review AFIX-AUDIT-001 — what did we get right, what is wrong or misleading, and what remains to become a real system including buyer source APIs and banking?”*
