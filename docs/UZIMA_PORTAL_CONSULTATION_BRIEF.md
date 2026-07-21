# UzimaX Portal — Role & Page Consultation Brief for Claude

**Document ID:** UZIMA-PORTAL-CONSULT-001  
**Audience:** Claude (or any senior product/architecture reviewer)  
**Purpose:** Give you a complete, honest inventory of every role and page we have built, what each does, what is real vs simulated, and ask for concrete guidance on **what to remove, add, merge, or redesign** before we continue polishing.  
**Product:** UzimaX — pharmacy / health-trade receivables & securitisation platform  
**Codebase:** `c:\Users\Admin\Downloads\CPF`  
**Date:** 21 July 2026  
**Related docs:** `docs/AFIX_Functional_System_Phased_Plan.md`, `docs/AFIX_SYSTEM_STATUS_AUDIT.md`, `docs/USER_GUIDE.md`

---

## How to use this document

1. Read **§0 Executive snapshot** and **§2 Dual origination**.
2. Skim role sections (**§4–§7**) for pages that look redundant or under-specified.
3. Answer the **consultation questions in §10** with prioritised recommendations (Must / Should / Nice).
4. We will then update the product and this doc based on your advice.

**Bias we want from you:** Prefer a **tight, production-credible ops product** over a demo with every screen imaginable. Call out pages that confuse users, duplicate work, or imply bank/NSE capabilities we do not have.

---

## 0. Executive snapshot

### What UzimaX is

UzimaX turns **confirmed pharmacy / healthcare trade receivables** into working capital via:

1. IOU / invoice registration  
2. Counterparty confirmation (supplier opt-in **or** buyer verification)  
3. Assignment of receivable to an **SPV**  
4. Discount purchase offers, OTP consents, escrow-style settlement views  
5. Packaging toward an **NSE listing path** (process UI only)

### Roles (4)

| Role | Who | Primary job in portal |
|------|-----|------------------------|
| **Buyer** | Pharmacy / distributor buyer org | Post confirmed payables (IOUs), verify supplier invoices, sign assignment consents, view payment schedule |
| **Supplier** | Wholesaler / pharma supplier | Opt in to sell buyer-posted IOUs, post invoices for buyer verification, accept/reject SPV offers |
| **SPV** | Uzima Capital SPV operator | Registry, offers, assignments, escrow release/collect, packaging, listing readiness, engine view |
| **Admin** | Platform operator | Programmes, fees, users/orgs, reconciliation, workflow/audit, analytics |

### Public surfaces

| Page | Route | Notes |
|------|-------|-------|
| Marketing home | `/` | Brand landing; redirects to portal when logged in |
| Auth | `/login` | Email/password; optional demo quick-fill (DEV / `VITE_SHOW_DEMO`) |

### UI system (recently unified)

- Shared shell: `PortalLayout` — dark forest sidebar `#0E1F1A`, lime active `#D3F36B`, gold accents `#F0C419`
- Page rhythm: `portal-page` → compact `PageHeader` → `portal-metrics` / `portal-section` / dense tables
- Solid surfaces (glassmorphism removed); white content canvas
- Logo: geometric **U** + lime node (`UzimaMark`)
- Auth: full-bleed warehouse hero + solid sign-in card

### Honesty on maturity

| Layer | Status |
|-------|--------|
| Role portals + core workflow UI | **Built** and demoable |
| Express API + persistence for portal flows | **Largely built** (not mock-only React state) |
| Live bank rails / real escrow money movement | **Not built** — wallet & escrow are **simulated / manual** |
| NSE / exchange integration | **Not built** — status workflow UI only |
| Buyer ERP adapters (SAP etc.) | **Not built** — generic external invoice API + docs page |
| Production IdP / KYC / MFA | **Not built** — password auth + demo accounts |

---

## 1. Architecture (frontend context)

```
React (Vite) + React Router
  AuthContext → JWT login
  usePlatformData / useData → React Query → /api/v1/*
  PortalLayout (role nav) → page components
```

**Shared pages** (same component, role-prefixed routes):

- `WalletPage` — buyer, supplier, SPV  
- `DocumentsPage` — buyer, supplier, SPV  
- `SignatoriesPage` — buyer, supplier, SPV  
- `PaymentHistoryPage` — buyer, SPV only  

Admin does **not** mount wallet / documents / signatories / payment-history.

---

## 2. Dual origination (core product logic)

```
Path A — Buyer-posted IOU
  Buyer Post IOU → registry → Supplier Opt-in Inbox
    Accept → assignment to SPV
    Decline → closed / buyer notified

Path B — Supplier-posted invoice
  Supplier Post Invoice → Buyer Verification Inbox
    Verify → assignment to SPV
    Reject → rejected

Path C — API / ERP
  Buyer systems → POST /api/v1/external/invoices (docs on Buyer API page)
  → same backend invoice pipeline
```

**Downstream SPV path (after assignment / offer acceptance):**  
Offers → (optional) Consent OTP → Packaging → Listing readiness → Escrow legs (disburse / collect) → AfyaX payment updates

---

## 3. Navigation inventory (as shipped)

### Buyer (12 nav items)

Dashboard · Post IOU · Verification · Invoice Register · Consent Inbox · Wallet · Documents · Signatories · API Integration · Payment Schedule · Payment History · Profile  

*(Plus duplicate route `/buyer/verification-inbox` → same Verification page.)*

### Supplier (9 nav items)

Dashboard · Opt-in Inbox · Post Invoice · My Invoices · Wallet · Documents · Signatories · Trade History · Profile  

*(Plus legacy `/supplier/list` → redirect to Post Invoice.)*

### SPV (13 nav items)

Dashboard · IOU Registry · Offers · Assignments · Escrow · Wallet · Payment History · Documents · Signatories · Packaging · NSE Listing · Backend Engine · Profile  

*(IOU Detail at `/spv/registry/:id` — not a nav item.)*

### Admin (9 nav items)

Dashboard · All Invoices · Programmes · Fees · Reconciliation · Users & Orgs · Workflow · Analytics · Profile  

---

## 4. Buyer pages — detail

### 4.1 Dashboard — `/buyer`
**File:** `src/pages/buyer/BuyerDashboard.tsx`  
**Does:** KPI strip (registered invoices, pending consents, upcoming/overdue payments); profile completion nudge; pending consents preview; notifications.  
**Implemented:** Live `useData` invoices/consents/payments + notifications; CTA to Post IOU.  
**Known risk:** Payment objects may lack reliable `buyerId` mapping — KPI accuracy needs verification.  
**Ask Claude:** Keep as home, or slim to “action queue only”?

### 4.2 Post IOU — `/buyer/post-iou`
**File:** `src/pages/buyer/PostIOUPage.tsx`  
**Does:** Form to post confirmed payable; notifies supplier to opt in.  
**Implemented:** `postBuyerIOU` → `POST /invoices`; DocumentAttach widget.  
**Gap:** Uploaded docs may not be linked on the invoice POST body.  
**Ask Claude:** Required fields / legal copy / document types for production?

### 4.3 Verification inbox — `/buyer/verification` (+ alias)
**File:** `src/pages/buyer/BuyerVerificationInboxPage.tsx`  
**Does:** Accept/reject supplier-originated invoices.  
**Implemented:** `respondToBuyerVerification`; reject ConfirmationModal; busy states.  
**Ask Claude:** Merge with Invoice Register (actions on rows) instead of separate inbox?

### 4.4 Invoice register — `/buyer/register`
**File:** `src/pages/buyer/InvoiceRegisterPage.tsx`  
**Does:** Searchable list of invoices against buyer org.  
**Implemented:** Table + refresh (cache refetch, **not** ERP sync).  
**Gap:** Label historically implied “sync”; no row detail drawer.  
**Ask Claude:** Add row detail? Rename refresh? Pull from AfyaX?

### 4.5 Consent inbox — `/buyer/consent`
**File:** `src/pages/buyer/ConsentInboxPage.tsx`  
**Does:** Master–detail OTP signing for assignment consent.  
**Implemented:** Request OTP + confirm sign; demo OTP hint gated.  
**Gap:** No decline/reject consent in UI.  
**Ask Claude:** Is decline required? Multi-signatory UI needed?

### 4.6 API Integration — `/buyer/api`
**File:** `src/pages/buyer/BuyerApiPage.tsx`  
**Does:** Docs + sample curl for external invoice upload.  
**Implemented:** UI-only docs (API exists server-side).  
**Gap:** No API key provisioning UI.  
**Ask Claude:** Keep as docs page, move to external docs site, or build key management?

### 4.7 Payment schedule — `/buyer/payments`
**File:** `src/pages/buyer/PaymentSchedulePage.tsx`  
**Does:** Maturity schedule (upcoming / overdue / paid).  
**Implemented:** `GET /payment-schedule`; read-only “Awaiting AfyaX”.  
**Ask Claude:** Necessary vs Payment History alone? Need pay-now actions later?

### 4.8 Payment history — `/buyer/payment-history`
**File:** `src/pages/shared/PaymentHistoryPage.tsx`  
**Does:** AfyaX payment-update ledger.  
**Implemented:** `GET /payment-updates`.  
**Ask Claude:** Merge schedule + history into one “Payments” hub?

### 4.9 Wallet — `/buyer/wallet`
**File:** `src/pages/shared/WalletPage.tsx`  
**Does:** Simulated org ledger deposit/withdraw.  
**Implemented:** Wallet API + explicit “no live bank rails” callout.  
**Ask Claude:** Hide until real rails? Rename to “Ledger preview”? Role-gate?

### 4.10 Documents — `/buyer/documents`
**File:** `src/pages/shared/DocumentsPage.tsx`  
**Does:** Upload/list board docs & supporting files.  
**Implemented:** Upload + open via auth’d fetch.  
**Ask Claude:** Enough doc types? Link docs to invoices/consents?

### 4.11 Signatories — `/buyer/signatories`
**File:** `src/pages/shared/SignatoriesPage.tsx`  
**Does:** Register self as OTP signatory; toggle active.  
**Implemented:** Signatories CRUD-lite.  
**Gap:** Cannot invite other org users from UI.  
**Ask Claude:** Expand to full signatory management?

### 4.12 Profile / Settings — `/buyer/profile`
**File:** `src/pages/buyer/BuyerProfilePage.tsx`  
**Does:** Edit name/email; show org + credit risk strip.  
**Implemented:** `PATCH /auth/me`; credit-risk endpoint.  
**Ask Claude:** Org editing? KYC fields? Separate Settings vs Profile?

---

## 5. Supplier pages — detail

### 5.1 Dashboard — `/supplier`
**Does:** Totals, pending opt-ins/offers, recent invoices, notifications.  
**Ask Claude:** Same “action queue” redesign as buyer?

### 5.2 Opt-in inbox — `/supplier/opt-in`
**Does:** Accept/decline buyer-posted IOUs (sell to SPV).  
**Implemented:** `respondToOptIn`; decline reason modal.  
**Ask Claude:** Confirm dialog on accept? Show discount preview before sell?

### 5.3 Post invoice — `/supplier/post-invoice`
**Does:** Supplier-originated listing → buyer verification.  
**Gap:** No DocumentAttach (buyer post has it).  
**Ask Claude:** Parity with buyer post form?

### 5.4 My invoices — `/supplier/invoices` + detail `/:id`
**Does:** List/filter; detail with lifecycle + accept/reject SPV offers.  
**Ask Claude:** Enough? Need financing status timeline on list rows?

### 5.5 Trade history — `/supplier/history`
**Does:** Completed trades (disbursed/matured/settled) + stats.  
**Ask Claude:** Keep separate vs filter on My Invoices?

### 5.6 Wallet / Documents / Signatories / Profile
Same shared patterns as buyer.  
**Ask Claude:** Should suppliers see Payment History (currently SPV+buyer only)?

### 5.7 Legacy — `/supplier/list`
Redirect stub to post-invoice. **Candidate for removal.**

---

## 6. SPV pages — detail

### 6.1 Dashboard — `/spv`
Available IOUs, active offers, packages, AUM; pipeline; notifications.

### 6.2 IOU Registry — `/spv/registry` + Detail `/:id`
Platform IOU list; deep link with lifecycle, parties, linked opt-in/assignment/escrow.  
**Ask Claude:** Is detail enough for ops, or need assignment actions from detail?

### 6.3 Offers — `/spv/offers`
Tabs (Available / Pending / Accepted / Receivables / Closed); OfferCalculator modal; `makeOffer`.  
**Ask Claude:** Tab IA clear? Need bulk offers?

### 6.4 Assignments — `/spv/assignments`
Assignments table; request consent for offer-accepted invoices; consent registry.  
**Ask Claude:** Overlap with Offers “Receivables” tab — merge?

### 6.5 Escrow — `/spv/escrow`
Manual **Release** disbursement / **Mark collected**.  
**Gap:** Collect may share release API path in hook.  
**Ask Claude:** Keep as ops tools with strong “simulation” labeling, or gate behind feature flag?

### 6.6 Packaging — `/spv/packaging`
Create packages from assigned IOUs; advance Structure / List on NSE.  
**Gaps:** Some package field mappings (e.g. invoiceIds / weighted discount) may be incomplete in client mapping.  
**Ask Claude:** Required for Phase 1 demos or Phase 2+ only?

### 6.7 NSE Listing — `/spv/listing`
Listing readiness cards; status advances. **Overlaps Packaging NSE actions.**  
**Ask Claude:** **Merge into Packaging** or keep separate for compliance narrative?

### 6.8 Backend Engine — `/spv/engine`
Read-only aggregate: wallets, escrow queue, assignments, packages, AfyaX updates.  
**Ask Claude:** Redundant with Dashboard + Escrow + Payment History? Keep as “control room”?

### 6.9 Wallet / Payment History / Documents / Signatories / Profile
As shared.  
**Ask Claude:** SPV Wallet vs Escrow — confusing dual money UIs?

---

## 7. Admin pages — detail

### 7.1 Dashboard — `/admin`
Platform KPIs, pipeline bars, recent audit activity.

### 7.2 All invoices — `/admin/invoices`
Global register + CSV export.

### 7.3 Programmes — `/admin/programs`
Create buyer programmes (limits, discount bands); toggle active/paused.  
**Ask Claude:** Enough fields for real credit programmes?

### 7.4 Fees — `/admin/fees`
Fee rules + immutable ledger (last 50).  
**Ask Claude:** Fee types missing? Accrual vs collection views?

### 7.5 Reconciliation — `/admin/reconciliation`
Date range; escrow vs payments variance; CSV export.  
**Ask Claude:** Fit for ops, or needs bank statement import later?

### 7.6 Users & Orgs — `/admin/users`
Orgs / Users / Invite tabs; invite returns temp password in toast.  
**Gap:** Invite org picker fragile (first org of role); no admin invite.  
**Ask Claude:** What invite/KYC model for production?

### 7.7 Workflow — `/admin/workflow`
Lifecycle transitions + activity log + export.

### 7.8 Analytics — `/admin/analytics`
Tabbed charts (volume, pipeline, participants, performance).  
**Ask Claude:** Keep in-app vs export to BI later?

### 7.9 Profile — `/admin/profile`
Account edit only.  
**Ask Claude:** Should admin get Documents / audit settings / system health?

---

## 8. Cross-cutting gaps (known)

| Issue | Where | Severity |
|-------|--------|----------|
| Wallet is simulated | Shared Wallet | High (product honesty) |
| NSE is status UI only | Packaging + Listing | High if marketed as live listing |
| Consent demo OTP | Consent inbox (dev) | Med (gate already exists) |
| Invoice Refresh ≠ ERP sync | Buyer register | Med |
| Docs not linked to invoice POST | Buyer Post IOU | Med |
| Duplicate verification route | Buyer | Low |
| Legacy `/supplier/list` | Supplier | Low — remove |
| Packaging vs Listing overlap | SPV | Med — candidate merge |
| Escrow collect ≈ release API | SPV Escrow | Med |
| Buyer payment KPI mapping | Buyer dashboard | Med |
| Signatory = self only | Signatories | Med |
| No MFA / forgot password | Auth | High for production |
| Home Solutions/Resources dropdowns non-navigating | HomePage | Low |

---

## 9. Page necessity matrix (starter hypothesis — please challenge)

| Page | Keep | Merge | Cut / hide | Notes |
|------|------|-------|------------|-------|
| Buyer Dashboard | ✓ | | | Slim to actions? |
| Post IOU | ✓ | | | Core Path A |
| Verification | ✓ | ↔ Register? | | Core Path B |
| Invoice Register | ✓ | ↔ Verification | | |
| Consent | ✓ | | | Core legal step |
| API page | ✓ docs | | or externalise | |
| Payment Schedule | ? | ↔ History | | Possibly one Payments hub |
| Payment History | ? | ↔ Schedule | | |
| Wallet | | | hide until rails | Or rename Ledger |
| Documents | ✓ | | | |
| Signatories | ✓ | expand | | |
| Supplier Opt-in | ✓ | | | Core |
| Post Invoice | ✓ | | | Core |
| My Invoices + Detail | ✓ | | | |
| Trade History | ? | ↔ My Invoices filter | | |
| SPV Registry + Detail | ✓ | | | |
| Offers | ✓ | | | |
| Assignments | ✓ | ↔ Offers tab? | | |
| Escrow | ✓ labeled | | or flag | |
| Packaging | ✓ | ↔ Listing | | |
| Listing | | ↔ Packaging | cut standalone | Strong merge candidate |
| Backend Engine | ? | ↔ Dashboard | | |
| Admin Programmes/Fees/Users | ✓ | | | |
| Admin Workflow vs Analytics | ✓ | review overlap | | |
| Legacy redirects | | | **cut** | `/supplier/list`, alias route |

---

## 10. Consultation questions for Claude

Please answer with **prioritised recommendations** (P0 / P1 / P2) and short rationale.

### A. Information architecture
1. Which pages are **unnecessary** for a credible Phase-1 production ops portal?  
2. Which pages should be **merged** (name the target IA)?  
3. Is **13 SPV nav items** too many? Propose a reduced nav (max ~8–9)?  
4. Is **buyer having both Payment Schedule and Payment History** justified?

### B. Dual origination clarity
5. Do Verification + Opt-in + Consent create a clear story, or do we need an in-app “How it works” / status explainer?  
6. Should supplier and buyer post forms be **field-parity** (documents, currency, etc.)?

### C. Simulated capabilities
7. For **Wallet** and **Escrow** and **NSE Listing**: hide, feature-flag, or keep with stronger labeling?  
8. What copy / UX patterns prevent users thinking money has moved on-chain/bank?

### D. Data & design gaps
9. Per critical page, list **missing data points** (columns, KPIs, audit fields, timestamps, actors).  
10. Which pages need **empty states / loading / error** upgrades most?  
11. Any pages that need a **detail drawer** or **timeline** instead of flat tables?

### E. Admin completeness
12. What’s missing for an admin to run a real programme (credit limits, onboarding, API keys, fee posting)?  
13. Should admin see Documents / Signatories / system health?

### F. Auth & trust
14. Beyond removing password text (done), what auth UX is minimum for client demos vs production?

### G. Design system
15. Given forest/lime/gold + dense portal layout: any **role-specific** visual cues needed, or keep identical chrome?  
16. Homepage vs Auth: any further brand consistency notes?

### H. Sequencing
17. Propose a **2-week cleanup backlog** ordered by impact (removals first, then merges, then data fields, then polish).

---

## 11. Desired response format from Claude

```markdown
## Verdict
[1 paragraph]

## Remove / hide
- ...

## Merge
- A + B → New name / route

## Keep & enhance (with data/design)
- Page: add fields X, Y; UX note Z

## Nav proposals
### Buyer (N items)
### Supplier
### SPV
### Admin

## P0 backlog (this week)
1.
2.

## P1 backlog
...

## Open risks
...
```

---

## 12. Appendix — file map

| Area | Paths |
|------|--------|
| Routes | `src/App.tsx` |
| Nav | `src/components/layout/PortalLayout.tsx` |
| Buyer pages | `src/pages/buyer/*` |
| Supplier pages | `src/pages/supplier/*` |
| SPV pages | `src/pages/spv/*` |
| Admin pages | `src/pages/admin/*` |
| Shared | `src/pages/shared/*` |
| Public | `src/pages/HomePage.tsx`, `AuthPage.tsx` |
| Data hook | `src/hooks/usePlatformData.ts` |
| Brand | `src/components/brand/UzimaMark.tsx`, `src/index.css` |

---

## 13. Change log

| Date | Note |
|------|------|
| 2026-07-21 | Initial consultation brief after full portal UI overhaul (buyer → supplier → SPV → admin), auth redesign, logo refresh |

---

**End of brief.**  
Please treat this as the source of truth for *what exists today*, then tell us ruthlessly what should change next.
