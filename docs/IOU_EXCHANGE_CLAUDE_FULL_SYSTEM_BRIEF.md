# IOU Exchange — Claude Brief: What We Have Done + Request for Full-System Finish Plan

**Document ID:** `IOUX-CLAUDE-FULL-BRIEF-001`  
**Audience:** Claude (primary) — any senior engineer continuing this codebase  
**From:** Cursor agent + operator (Uzima / IOU Exchange build)  
**Date:** 24 July 2026  
**Repo:** `c:\Users\Admin\Downloads\CPF` · GitHub `uzimahealth254/UzimaX` · branch **`main`**  
**HEAD at time of writing:** `f215fed` — *Implement IOUX-COMPLETE-001 hybrid tracks and contractual P0 gaps.*  
**Live (temporary):** https://uzimax.onrender.com (Render service **UzimaX**, single process: Express API + SPA)

---

## 0. Why this document exists / what Claude must produce

### Purpose of *this* file
This is a **handoff brief**, not another execution checklist. It tells you:

1. Exactly what has been built and decided so far (truthful, current).  
2. What is still incomplete against Phase 1 / Phase 2 / production readiness.  
3. What “the whole system fully done” must cover — **beyond** Phase 1 go-live and Phase 2 polish.

### What you (Claude) must write next
**Please produce a single, new, extremely detailed Markdown document** (suggest filename: `docs/IOU_EXCHANGE_FULL_SYSTEM_FINISH_PLAN.md`, document ID e.g. `IOUX-FULL-FINISH-001`) that is:

- **Comprehensive** — every remaining workstream for the *entire* product vision, not only the signed Phase 1 or Phase 2 slices.  
- **Actionable** — ordered tasks, acceptance criteria, file paths, dependencies, risks, and operator-only steps.  
- **Honest** — separate (A) what is in the executed contract / already partially built, (B) what is Phase 2 / roadmap, (C) what requires **new commercial / legal / licensing change orders** (live bank rails, real NSE, KYC vendors, MFA/SSO, etc.).  
- **Verifiable** — each major workstream ends with concrete “done when …” checks (curl, scripts, UI walks, emails in real inboxes).  
- **Calendar-aware** — Phase 1 contractual target remains ~**10 September 2026**; put full-system completion on a realistic multi-horizon plan after that.

Do **not** rewrite the whole app. Prefer edit-over-rebuild. Do **not** invent that live money movement or licensed PSP behaviour is already in scope unless you label it as a change order.

---

## 1. Non-negotiable product rules (do not drift)

1. **Brand:** IOU Exchange is a **trade receivables securitisation management** service. British spelling **securitisation**. Not “pharmacy trade” / “working capital for pharmacy trade.” Health/pharma = sector example only.  
2. **Honesty:** Never claim live bank rails, real NSE listing, licensed money transmission, or production-certified AfyaX integration unless truly built and licensed. Escrow/wallet are **simulated ledgers** when enabled; production flags usually turn them off.  
3. **Internal IDs stay:** `uzima_*` cookies (`uzima_rt`), CSS `.uzima-site`, Render service `UzimaX`, `uzima_party_id`, etc. User-facing name = **IOU Exchange**.  
4. **Edit over rebuild** — extend `server/services/core.ts`, Drizzle schema, existing portals.  
5. **Ask the operator before** seeding production, putting secrets in git, force-pushing, or enabling `ALLOW_PROD_SEED`.  
6. Standing-order **reference capture** is in product scope; **executing** bank standing orders is not (unless change-ordered and licensed).

---

## 2. Executive snapshot — where we are (24 Jul 2026)

| Dimension | Honest status |
|-----------|----------------|
| Signed Phase 1 feature list (`UZIMA-SYS-PLAN-001` / v1.6 lineage) | Roughly **~90% built in code**; **not** verified end-to-end on production with pilot clients |
| Production readiness | Roughly **~60%** — secrets still exposed historically, flags/pilot/tests/backups/legal incomplete |
| Phase 2 (programmes hard limits, packaging, credit-risk UI, reporting, domains) | Roughly **~40%** scaffolded |
| “Whole system fully done” (securitisation platform + ops + capital-markets path + hardening) | **Not done** — this is what we need your master plan for |

**Approach assessment (already agreed):** The architecture is right (Postgres source of truth, invite-only auth, honesty flags, single-service deploy). We are finishing and expanding — not rebuilding.

---

## 3. What we have done so far (detailed chronology)

### 3.1 Foundation & stack (earlier phases — still true)

- Vite/React SPA + Express 5 API + Drizzle/Postgres + Redis + Resend.  
- Invite-only users; JWT access + httpOnly refresh cookie; forced password change gate.  
- Four role portals: **Admin**, **Buyer**, **Supplier**, **SPV**.  
- Dual origination: buyer-posted IOUs and supplier-listed invoices.  
- Opt-in / buyer verification / offers / OTP consents / assignments / escrow legs / fees / programmes / packaging UI / notifications / audit / PDFs.  
- AfyaX-oriented party/invoice/payment webhook surfaces (integration-ready, not production-certified).  
- Marketing site: Home, About, Solutions, Portals, Resources, Privacy, Terms, Auth.

### 3.2 Deploy & infra work (recent)

- Env packs: `.env.pack` / `.env.render` (LOCAL + RENDER). Portal/CORS pointed at `https://uzimax.onrender.com`.  
- Render Redis Key Value `uzima-redis`; production requires Redis.  
- **Single Render web service** serves API + built SPA (`npm start` → `tsx server/index.ts`).  
- Express 5 SPA fallback fixed: `/{*path}` (bare `*` crashed).  
- Render build fixes: remove deprecated `tsconfig` `baseUrl`; Vite/Tailwind/PostCSS in **dependencies**; `npm install --include=dev` where needed.  
- `src/lib/apiBase.ts`: production prefers **same-origin** `/api/v1` (ignores baked localhost `VITE_API_URL`).  
- Hosted schema drift patched earlier (`programmes.buyer_sublimit|effective_from|expires_at`, `packages.weighted_avg_discount_bps`).  
- Supabase project `mllsgipchoezhaehbvew` (eu-west-1) as hosted DB.

### 3.3 Brand & marketing work (recent)

- Owner correction: product is securitisation management, not pharmacy trade.  
- Landing/hero/OG/email copy updated toward that positioning.  
- About page green wave ornaments.  
- OG social image restyled (photo + green/orange wash) + cache-bust for WhatsApp.  
- Residual pharmacy imagery/copy may still exist on Auth and other surfaces — brand sweep not closed.

### 3.4 Workflow decision — Hybrid tracks (locked + implemented)

**Decision (operator authorised via “follow COMPLETE guide and build”):**

| Track | Canonical `assignment_type` | Trigger |
|-------|----------------------------|---------|
| **Standard confirmation** | `standard_confirmation` | Path A: buyer post + commitment → supplier opt-in → auto-assign. Path B: supplier list → buyer verify (+ commitment) → auto-assign |
| **Negotiated offer** | `negotiated_offer` | SPV offer → supplier accept → buyer OTP consent → assign (fresh consent because discount economics changed) |

Legacy types (`opt_in_auto`, `supplier_originated_auto`, `offer_consent`) still map via helpers in:
- `server/lib/assignmentTracks.ts`
- `src/lib/assignmentTracks.ts`

**UI:** SPV registry tabs — Assigned / Open to offer / Pending consent / Declined·closed (`src/pages/spv/IOURegistryPage.tsx`). Detail page shows track explanation (`IOUDetailPage.tsx`). Documented in `docs/IOU_EXCHANGE_FULL_SYSTEM_GUIDE.md`.

### 3.5 Contractual gaps closed in code (commit `f215fed`)

**P0.5 — Commitment to pay + standing order (recording)**
- Schema: `commitment_ack_by`, `commitment_ack_at`, `standing_order_bank`, `standing_order_set_at` (+ existing `commitment_to_pay`, `bank_standing_order_ref`).  
- Migration applied to hosted DB: `supabase/migrations/20260724180000_commitment_ack_standing_order.sql` (with backfill of `commitment_ack_at` where already committed).  
- Buyer post requires commitment; records ack actor/time; optional standing-order ref + bank.  
- Buyer verification modal requires commitment checkbox; optional standing-order fields; then assigns.  
- `createAssignment` **refuses** assign without `commitmentToPay` + `commitmentAckAt`.  
- Negotiated consent path stamps commitment on OTP confirm.  
- Standing order shown on SPV IOU detail; included on assignment letter PDF.

**P0.6 — Settlement recording**
- `recordSettlement()` in `server/services/core.ts`.  
- `POST /api/v1/settlements/notify` (admin/SPV JWT or API key with `payments:write`).  
- Closes pending collection/payout/fee escrow legs, marks assignment/invoice settled, audit + notifies parties. Labels remain “records / partner-reported.”  
- Status machine allows `assigned`/`packaged` → `settled` (not only disbursed/matured).

**P1.2 partial — Invite email visibility**
- Invite API returns `emailSent`, `emailMode`, optional `emailWarning` (still 201 on user create).  
- Admin UsersPage toasts warning when email not sent.  
- Missing vs full ask: dedicated resend action + dedicated `email_send_log` table.

**P0.3 / P0.4 — Scripts exist (not yet proven green on production)**
- `npm run test:cross-tenant` / `smoke:tenant-isolation` → `scripts/security-cross-tenant.ts`  
- `npm run test:authz` → `scripts/security-authz-audit.ts` (includes settlements/notify unauth check)

**P0.1 / P0.7 — Docs only (operator actions remain)**
- `docs/SECRETS_ROTATION.md`  
- `docs/DEMO_WARMUP_RUNBOOK.md`

### 3.6 What was *not* completed (critical honesty)

| Item | Status |
|------|--------|
| P0.1 Rotate exposed secrets (admin password, Resend, DB, JWTs, webhook secret) | **Operator must do** — still historically exposed in chat / tmp files |
| P0.2 Confirm production env flags on Render + rebuild for `VITE_*` | **Not verified** |
| P0.3 Isolation suite **passing on production** | Script only |
| P0.4 Authz suite **passing on production** | Script only |
| P0.7 Paid always-on Render / uptime pinger | Runbook only |
| P1.1 Pilot E2E with real buyer + supplier + real Resend inboxes | **Not run** |
| P1.2 Full email reliability (resend invite UI, email send log) | Partial |
| P1.3 Full brand sweep (Auth hero, residual pharmacy copy, USER_GUIDE, OG re-scrape) | Incomplete |
| P1.4 Empty/loading/error state sweep all portals | Incomplete |
| P1.5 Schema-drift protection in deploy (`verify:db` gate) | Incomplete |
| P1.6 Automated money-path test suite + CI | Incomplete |
| P1.7 Backups/PITR confirmation + health alerting | Incomplete |
| P1.8 Kenyan advocate review of Privacy/Terms | Incomplete |
| Phase 2 hard programme limits, credit-risk UI, packaging correctness, CSV reports, custom domains | Incomplete |
| Live bank / NSE / KYC vendors / MFA / ERP per-buyer adapters | Explicitly out of current contract unless change-ordered |

---

## 4. System inventory (what exists today)

### 4.1 Live / ops

| Surface | Detail |
|---------|--------|
| App | https://uzimax.onrender.com |
| API | https://uzimax.onrender.com/api/v1 |
| Health | `GET /api/v1/health` → JSON `{ status, service: uzima-api, db: up }` |
| Admin login | `ops@ioux.africa` (password must be **rotated** — see secrets doc; do not paste secrets into new docs) |
| Local seed users | `docs/DEMO_ACCOUNTS.md` — Docker only |
| Email | Resend; `EMAIL_FROM=IOU Exchange <no-reply@ioux.africa>`; domain connected by operator |
| Redis | Render `uzima-redis` |
| DB | Supabase Postgres |

### 4.2 Portals & routes (high level)

**Public:** `/`, `/about`, `/solutions`, `/portals`, `/resources`, `/privacy`, `/terms`, `/login`  

**Supplier:** dashboard, opt-in, post-invoice, invoices, payments, wallet (flagged), documents, profile  

**Buyer:** dashboard, post-iou, verification, register, consent, payments, wallet, documents, profile  

**SPV:** dashboard, registry (+ detail), offers, packaging, assignments, escrow, engine (flagged), wallet, payments, profile  

**Admin:** dashboard, invoices, programs, fees, reconciliation, users, workflow, analytics, profile  

### 4.3 Core code map

| Path | Role |
|------|------|
| `src/App.tsx` | Routes |
| `src/lib/brand.ts` | Brand/tagline |
| `src/lib/apiBase.ts` | API origin |
| `src/lib/assignmentTracks.ts` | Client track helpers |
| `server/index.ts` | API + SPA |
| `server/routes/api.ts` | HTTP surface |
| `server/services/core.ts` | Workflow mutations (assignment, settlement, origination) |
| `server/lib/assignmentTracks.ts` | Server track helpers |
| `server/db/schema.ts` | Drizzle schema |
| `server/services/email.ts` | Templates + send |
| `server/services/pdf.ts` | Purchase note / assignment letter / receipts |
| `docs/openapi.yaml` | API surface |
| `docs/IOU_EXCHANGE_COMPLETION_GUIDE.md` | Phase 1 finish plan (`IOUX-COMPLETE-001`) — partially executed |
| `docs/IOU_EXCHANGE_CLAUDE_FINISH_GUIDE.md` | Inventory (`IOUX-CLAUDE-FINISH-001`) |
| `docs/IOU_EXCHANGE_FULL_SYSTEM_GUIDE.md` | Architecture truth |
| `docs/IOU_EXCHANGE_PRODUCTION_GOLIVE.md` | Older go-live checklist |
| `docs/AFIX_Functional_System_Phased_Plan.md` | Original phased vision (AFIX-era naming) |

### 4.4 Money / honesty flags (expected production posture)

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

`VITE_*` are **build-time** — change ⇒ redeploy.

---

## 5. Product flows that must remain coherent

### Path A — Buyer-originated (standard track)
Buyer posts confirmed payable + commitment (+ optional standing-order ref) → supplier notified → opt-in accept → **auto-assign** `standard_confirmation` → SPV registry Assigned → docs/PDFs → (later) settlement notify → settled.

### Path B — Supplier-originated (standard track)
Supplier lists invoice → buyer verification inbox → buyer commits + verifies (+ optional standing-order) → **auto-assign** `standard_confirmation` → same downstream.

### Negotiated track
SPV makes offer (discount) → supplier accepts → buyer OTP consent → stamp commitment → assign `negotiated_offer` → same downstream.

### Settlement
Settlement agent / admin / API key posts settlement notification → system **records** closure; does not move cash.

### Escrow / wallet
Simulated ledger legs for visibility/demo; must stay labelled; typically off in prod.

---

## 6. What “fully done with the whole system” means (scope Claude must cover)

When the operator says “fully done with the **whole** system,” they mean more than Phase 1 go-live. Your master plan must cover **all** of the following horizons. For each item: current state, gap, implementation plan, acceptance tests, dependencies, and whether it is **in-contract / Phase 2 / change-order**.

### Horizon A — Close Phase 1 for real (contractual go-live)
Everything remaining in `IOUX-COMPLETE-001` P0–P1 that is not yet *accepted*, including:
- Secrets rotation & Render flag verification  
- Production security scripts green  
- Pilot E2E with real orgs + Resend  
- Email reliability completion  
- Brand sweep  
- Empty/error states  
- Schema verify in deploy  
- Minimal automated tests  
- Backups + uptime monitoring  
- Legal advocate review  
- Full §7 verification protocol on production  

### Horizon B — Phase 2 product depth (already partially scaffolded)
- Programme limits as **hard server-side blocks**  
- Buyer credit-risk profiles in SPV/investor views feeding pricing bands  
- Bond/note packaging polish (weighted tenor/discount, listing-readiness)  
- Reconciliation + settlement reports with CSV export  
- SPV analytics from real aggregates (no seed-derived lies)  
- Custom domains (`www` / `app` / `api.ioux.africa`) **or** documented decision to stay on Render  
- Retire orphan pages / dead routes  

### Horizon C — Full securitisation platform vision (from original phased plan + system guides)
Plan these explicitly even if some require change orders:
- Mature IOU registry / depository (Sule scheme completeness, uniqueness, auditability, exports)  
- True-sale documentation pack completeness (purchase note, assignment letter, consent artifacts, standing-order evidence)  
- Settlement-partner operating procedures + webhook/HMAC certification checklist  
- Packaging → listing readiness workflow (still **not** live NSE unless change-ordered)  
- Multi-programme / multi-buyer capacity & utilisation reporting  
- Operator runbooks (incident, restore, invite, demo, rotation)  
- Observability (structured logs, error tracking, audit export SLAs)  
- Performance & tenancy hardening at pilot scale  

### Horizon D — Change-order / licensed expansions (must be labelled, not silently promised)
- Live bank rails / disbursement / collection / M-Pesa / Pesalink / RTGS  
- **Execution** of standing orders  
- Real NSE / exchange APIs  
- External KYC vendors (eCitizen / KRA / PPB, etc.)  
- Per-buyer ERP adapters beyond generic invoice API  
- MFA / SSO / Keycloak  
- Tax/regulatory analysis of fees  
- BI / data warehouse  

For Horizon D: specify prerequisites (entity licensing, settlement partner contracts, compliance), suggested architecture, and commercial framing — do not treat as unpaid Phase 1 work.

### Horizon E — Organisation & delivery excellence
- Definition of Done for the whole programme  
- RACI (operator vs engineer vs advocate vs settlement partner)  
- Suggested sprint/week plan after 10 Sep  
- Risk register (cold starts, schema drift, secret leakage, silent email failure, honesty slips)  
- Test matrix (unit/integration/E2E/security/UAT)  
- Documentation set that must exist at “fully done” (USER_GUIDE, admin ops, API, openapi sync, runbooks)

---

## 7. Explicit request to Claude — deliverable format

Please write **`docs/IOU_EXCHANGE_FULL_SYSTEM_FINISH_PLAN.md`** (`IOUX-FULL-FINISH-001`) with at least these sections:

1. **Executive verdict** — how far from “whole system done”; what “done” means in one paragraph.  
2. **Source-of-truth map** — which existing docs remain authoritative vs superseded.  
3. **Complete capability matrix** — every capability (Phase 1, 2, vision, change-order) with status: Done / Partial / Missing / Out-of-scope.  
4. **Remaining workstreams** — numbered, ordered, with:
   - Goal  
   - Files/modules likely touched  
   - Implementation steps  
   - Acceptance criteria  
   - Dependencies / operator actions  
   - Effort estimate (S/M/L or days)  
5. **Security & compliance checklist** for a finance-adjacent invite-only platform.  
6. **Pilot & UAT script** (Path A, Path B, negotiated, settlement) with email checkpoints.  
7. **Production operations** — deploy, migrate, verify:db, rotate secrets, warm-up, backups, monitoring.  
8. **Full-system roadmap calendar** — Horizon A to E.  
9. **Out-of-scope / change-order annex** — clear commercial boundary.  
10. **First 10 concrete tasks** Cursor (or the next engineer) should execute immediately after reading your plan.  
11. **Questions for the operator** — only decisions that truly block architecture (do not re-ask Hybrid tracks unless overriding).

Tone: senior, precise, no fluff, no false “100% complete” claims.

---

## 8. Operator priorities (context for your plan)

1. They want the **whole system** finished — not a thin MVP story.  
2. They also have a **Phase 1 go-live / payment milestone** near **10 September 2026** — your plan must sequence Horizon A first without pretending Horizons C–D are free.  
3. They asked Cursor to follow `IOUX-COMPLETE-001` and implement; Hybrid + P0.5/P0.6 code is in `main` (`f215fed`). Next critical path is **operator deploy + secrets + verification + pilot**, then Phase 2 / full vision.  
4. Brand and honesty mistakes are reputationally expensive — plan brand sweep and legal review as first-class work.

---

## 9. Immediate known next actions (before or while you write the plan)

These are already known; your plan should incorporate and expand them:

1. Manual Deploy UzimaX on Render so `f215fed` is live.  
2. Rotate all exposed secrets per `docs/SECRETS_ROTATION.md`.  
3. Confirm P0.2 flags on Render; rebuild if `VITE_*` changed.  
4. Run `smoke:tenant-isolation` and `test:authz` against production with rotated credentials.  
5. Book pilot buyer + supplier for P1.1 UAT.  
6. Do **not** run `db:seed` on hosted without explicit operator approval.

---

## 10. Closing instruction to Claude

Read this brief together with:

- `docs/IOU_EXCHANGE_COMPLETION_GUIDE.md`  
- `docs/IOU_EXCHANGE_CLAUDE_FINISH_GUIDE.md`  
- `docs/IOU_EXCHANGE_FULL_SYSTEM_GUIDE.md`  
- `docs/AFIX_Functional_System_Phased_Plan.md`  
- `docs/openapi.yaml`  

Then **write the master finish plan** described in §7. That plan becomes the new authoritative tasking document for finishing the **entire** IOU Exchange system — Phase 1 closure, Phase 2 depth, full securitisation vision, and change-order annex — without losing honesty or rebuilding what already works.

**Do not declare the project complete.** Declare what “complete” requires, in exhaustive detail, and give the next engineers a path that can actually be executed.

---

*End of `IOUX-CLAUDE-FULL-BRIEF-001`.*
