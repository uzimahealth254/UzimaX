> **Implementation status (Cursor, 24 Jul 2026):** Engineer-owned Horizon A–B workstreams shipped in main @ 25e0888. Operator-only items (WS-01–03, WS-06, WS-12, WS-13) and Horizon C/D remain — see docs/OPERATOR_GO_LIVE_CHECKLIST.md.

# IOU Exchange — Full System Finish Plan

**Document ID:** `IOUX-FULL-FINISH-001`
**Status:** Authoritative tasking document for finishing the entire IOU Exchange system
**Supersedes tasking in:** `IOUX-COMPLETE-001` (Phase 1 slice — now partially executed)
**Repo:** `c:\Users\Admin\Downloads\CPF` · GitHub `uzimahealth254/UzimaX` · branch `main` · HEAD `f215fed`
**Live:** https://uzimax.onrender.com (Render service **UzimaX**, single process: Express API + SPA)
**Date:** 24 July 2026

---

## 1. Executive verdict

**Where we are.** The codebase is materially complete against the executed contract. The hybrid assignment tracks are locked and implemented, and both contractual gaps I previously flagged — commitment-to-pay with standing-order capture, and settlement recording — are closed in code at `f215fed`. Against the signed Phase 1 feature list, roughly **90% is built in code**. Against **production readiness, roughly 60%**. Against Phase 2 depth, roughly **40% scaffolded**. Against the *full securitisation platform vision*, considerably less — and much of that vision sits outside what has been contracted and paid for.

**The critical distinction this plan enforces.** "Finishing the whole system" spans four different kinds of work, and conflating them is the single biggest commercial risk to this engagement:

- **Horizon A** — closing Phase 1 for real. Contracted, paid, due ~10 September. Mostly *verification and operator action*, not new code.
- **Horizon B** — Phase 2 depth. Contracted, paid, due ~10 October. Genuine build work, partially scaffolded.
- **Horizon C** — the full securitisation platform vision. **Largely beyond the executed contract.** Buildable, valuable, and the natural next engagement — but it is not free, and this plan does not pretend it is.
- **Horizon D** — licensed expansions (bank rails, real NSE, KYC vendors, MFA, ERP adapters). Explicitly excluded by the signed agreement. Requires commercial *and* regulatory prerequisites that sit with Uzima Exchange Ltd, not with the build.

**What "done" means, in one paragraph.** The whole system is done when an invited organisation can be onboarded by an administrator, transact a receivable end-to-end through either origination path or the negotiated track, receive every notification in a real inbox, generate a complete true-sale document pack, have settlement recorded from a partner notification, and appear correctly in registry, programme, packaging, reconciliation and analytics views — all on a monitored, backed-up, secret-rotated production deployment that passes cross-tenant isolation and authorisation tests, whose copy claims nothing the platform cannot do, and whose legal pages have been reviewed by a Kenyan advocate. Everything beyond that line is Horizon C or D and should be scoped and priced as such.

**The nearest risk is not technical.** It is that Horizon A's remaining items are dominated by *operator actions* — secret rotation, Render configuration, and securing two pilot clients — none of which the engineer can complete alone. Those must be scheduled now.

---

## 2. Source-of-truth map

| Document | Standing |
|----------|----------|
| **This file** (`IOUX-FULL-FINISH-001`) | **Authoritative tasking** for the whole programme |
| `docs/IOU_EXCHANGE_FULL_SYSTEM_GUIDE.md` | **Authoritative architecture truth** — keep updated as items close |
| `docs/IOU_EXCHANGE_CLAUDE_FINISH_GUIDE.md` (`IOUX-CLAUDE-FINISH-001`) | Authoritative **inventory** of what exists |
| `docs/IOU_EXCHANGE_COMPLETION_GUIDE.md` (`IOUX-COMPLETE-001`) | **Superseded for tasking**; retain for the hybrid-track rationale |
| `docs/openapi.yaml` | Authoritative **API surface** — must be regenerated as routes change |
| `docs/SECRETS_ROTATION.md` · `docs/DEMO_WARMUP_RUNBOOK.md` | Authoritative **operator runbooks** |
| `docs/DEMO_ACCOUNTS.md` | Local Docker seed only — **never** hosted |
| `UZIMA-SYS-PLAN-001 v1.6` (signed) | **Authoritative commercial scope** — the contract boundary |
| `docs/AFIX_Functional_System_Phased_Plan.md` | Historical vision; **AFIX-era naming is obsolete** |
| `docs/IOU_EXCHANGE_PRODUCTION_GOLIVE.md` | Largely absorbed here; retain for deploy detail |

**Rule:** if this file and the architecture guide disagree, the **codebase** wins, then update both.

---

## 3. Complete capability matrix

Status: **Done** (built and verified) · **Built** (in code, unverified on production) · **Partial** · **Missing** · **Change order**

### 3.1 Identity, access & tenancy

| Capability | Status | Horizon |
|---|---|---|
| Invite-only org & user creation | Built | A |
| JWT access + httpOnly refresh cookie (`uzima_rt`) | Built | A |
| Forced password change gate | Built | A |
| Forgot / reset password with OTP | Built | A |
| Role-based portals (Admin/Buyer/Supplier/SPV) | Built | A |
| Org-scoped API keys (hashed) | Built | A |
| Signatory register + approval certificates | Built | A |
| OTP-verified digital signature on consent | Built | A |
| Row-level security policies | Built | A |
| **Cross-tenant isolation proven on production** | **Missing** | **A** |
| **Authorisation sweep proven on production** | **Missing** | **A** |
| MFA / SSO / Keycloak | Change order | D |
| External KYC vendor verification | Change order | D |

### 3.2 Origination & confirmation

| Capability | Status | Horizon |
|---|---|---|
| Path A — buyer-posted IOU/invoice | Built | A |
| Path B — supplier-listed invoice | Built | A |
| API upload origination (`api_upload`) | Built | A |
| Commitment-to-pay acknowledgement (actor + timestamp) | Built | A |
| Standing-order reference + bank capture | Built | A |
| Assignment blocked without commitment | Built | A |
| IOU/invoice registry with unique IDs + status history | Built | A |
| Registry scheme completeness & auditability (Sule scheme) | Partial | C |
| Dematerialisation compliance to accounting standards | Partial | C |

### 3.3 Assignment & true sale

| Capability | Status | Horizon |
|---|---|---|
| Hybrid tracks: `standard_confirmation` / `negotiated_offer` | Built | A |
| Legacy type mapping helpers | Built | A |
| SPV registry tabs (Assigned / Open to offer / Pending consent / Closed) | Built | A |
| Track explanation on detail view | Built | A |
| SPV purchase offers (tenor-based discount) | Built | A |
| Buyer OTP consent for negotiated track | Built | A |
| Assignment record + timeline | Built | A |
| Purchase note PDF | Built | A |
| Assignment letter PDF (incl. standing-order ref) | Built | A |
| **Complete true-sale document pack + evidence bundle export** | **Partial** | **C** |

### 3.4 Settlement & money

| Capability | Status | Horizon |
|---|---|---|
| Settlement recording endpoint (`POST /settlements/notify`) | Built | A |
| Escrow leg closure on settlement | Built | A |
| Invoice/assignment → `settled` transition | Built | A |
| Payment update ingestion (AfyaX webhook, HMAC) | Built | A |
| Simulated wallet ledger (flagged off in prod) | Built | A |
| Fees & commissions engine + ledger | Built | A |
| Settlement-partner operating procedure + certification checklist | Missing | C |
| **Live bank rails / disbursement / collection** | **Change order** | **D** |
| **Execution of bank standing orders** | **Change order** | **D** |

### 3.5 Programmes, packaging & capital markets

| Capability | Status | Horizon |
|---|---|---|
| Programme CRUD + utilisation display | Built | B |
| **Programme limits as hard server-side blocks** | **Missing** | **B** |
| Buyer credit-risk endpoint | Built | B |
| **Credit-risk profiles surfaced to SPV/investor views** | **Missing** | **B** |
| Packaging (bundle assignments) | Built | B |
| **Weighted tenor / discount correctness** | **Partial** | **B** |
| Listing-readiness status workflow | Built (UI only) | B |
| **Reconciliation + settlement reports with CSV export** | **Partial** | **B** |
| SPV analytics from real aggregates | Partial | B |
| Multi-programme capacity & utilisation reporting | Missing | C |
| **Real NSE / exchange integration** | **Change order** | **D** |

### 3.6 Notifications, documents & audit

| Capability | Status | Horizon |
|---|---|---|
| Resend email templates (full lifecycle inventory) | Built | A |
| In-app notifications | Built | A |
| Invite email status surfaced (`emailSent`/`emailWarning`) | Built | A |
| **Resend-invite action + `email_send_log` table** | **Missing** | **A** |
| Audit log + export | Built | A |
| PDF generation (purchase note, assignment letter, receipts) | Built | A |
| Document upload / org document vault | Built | A |
| Audit export SLAs + structured logging | Missing | C |

### 3.7 Platform, brand & operations

| Capability | Status | Horizon |
|---|---|---|
| Single-service deploy (Express serves API + SPA) | Built | A |
| Same-origin API base in production | Built | A |
| Production feature-flag posture | **Unverified** | **A** |
| **Secrets rotated** | **Missing (operator)** | **A** |
| **Always-on hosting / cold-start mitigation** | **Missing (operator)** | **A** |
| Schema-drift protection in deploy | Missing | A |
| Automated money-path test suite + CI | Missing | A |
| Backups / PITR confirmed + health alerting | Missing (operator) | A |
| **Brand sweep to securitisation positioning** | **Partial** | **A** |
| Empty / loading / error state consistency | Partial | A |
| Legal pages advocate-reviewed | Missing (operator) | A |
| Custom domains (`www`/`app`/`api.ioux.africa`) | Missing | B |
| Operator runbooks (incident, restore, invite, rotation) | Partial | C |
| Observability / error tracking | Missing | C |
| Performance & tenancy hardening at pilot scale | Missing | C |

---

## 4. Remaining workstreams

Ordered by horizon, then by critical path. Each: **Goal · Files · Steps · Acceptance · Dependencies · Effort** (S ≤ 1 day, M 2–3 days, L 4+ days).

---

### HORIZON A — Close Phase 1 for real (contractual, due ~10 Sep)

---

#### WS-01 · Deploy `f215fed` and verify the live surface — **S**
**Goal.** Get the committed hybrid-track and P0.5/P0.6 work actually running in production.
**Files.** None (Render operation).
**Steps.**
1. Manual Deploy the **UzimaX** service on Render from `main` @ `f215fed`.
2. Confirm build ran with dev dependencies available (Vite present).
3. Confirm start command `npm start` → `tsx server/index.ts`.
4. Hit `GET /api/v1/health`.
**Acceptance.** Health returns JSON `{status, service: uzima-api, db: up}` — not the React 404 page. Login page renders. SPV registry shows the four hybrid tabs.
**Dependencies.** Operator (Render access).

---

#### WS-02 · Rotate every exposed secret — **S (operator-led)**
**Goal.** Remove credentials that have been exposed in chat and temporary files from the live system.
**Files.** `docs/SECRETS_ROTATION.md`; delete `scripts/.tmp-ops-secrets.json`.
**Steps.**
1. Rotate: `ops@ioux.africa` admin password, `RESEND_API_KEY`, Supabase DB password, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `AFYAX_WEBHOOK_SECRET`.
2. Store new values **only** in Render's secret store.
3. Delete the temp secrets file; confirm `.gitignore` covers it; check history: `git log --all --full-history -- scripts/.tmp-ops-secrets.json`.
4. If any secret ever entered git history, treat it as permanently compromised and rotate regardless.
5. Note: rotating JWT secrets invalidates all sessions — expected, communicate it.
**Acceptance.** Old admin password fails login; new secrets live; no secret string greps out of the working tree or history.
**Dependencies.** Operator only. **Do this before any pilot client touches the system.**

---

#### WS-03 · Verify production flag posture — **S**
**Goal.** Guarantee the honesty and security posture is actually live, not just intended.
**Files.** Render env; `.env.render`.
**Steps.**
1. Assert on Render: `NODE_ENV=production`, `COOKIE_SECURE=true`, `ALLOW_DEMO_OTP=false`, `ALLOW_BODY_REFRESH=false`, `ENABLE_SIMULATED_WALLET=false`, `VITE_SHOW_DEMO=false`, `VITE_ENABLE_WALLET=false`, `VITE_ENABLE_ENGINE=false`.
2. Any `VITE_*` change requires a **rebuild** — trigger redeploy.
3. Grep the built bundle for `Uzima2026`, demo emails, OTP hint strings.
**Acceptance.** Bundle greps clean; wallet and engine nav absent in production; no demo helpers on the auth page.
**Dependencies.** WS-01.

---

#### WS-04 · Prove cross-tenant isolation on production — **S**
**Goal.** Demonstrate the core security property of a multi-tenant financial system.
**Files.** `scripts/security-cross-tenant.ts`.
**Steps.**
1. Create two throwaway orgs (or use pilot orgs) with users in each.
2. Run `npm run smoke:tenant-isolation` against production with rotated credentials.
3. Assert coverage includes: invoices, opt-ins, buyer verifications, offers, consents, assignments, escrow legs, documents, wallets, payment updates, notifications.
4. Confirm RLS policies exist on the hosted DB: `SELECT tablename, policyname FROM pg_policies;`
**Acceptance.** Zero cross-tenant reads. Script exits green against production.
**Dependencies.** WS-01, WS-02.

---

#### WS-05 · Prove authorisation on every mutating route — **S**
**Goal.** Client-side route guards do not protect the API; prove the server does.
**Files.** `scripts/security-authz-audit.ts`, `server/routes/api.ts`.
**Steps.**
1. Run `npm run test:authz` against production.
2. Assert every non-public route returns 401 without a token and 403 with a wrong-role token.
3. Public surface must be exactly: health, login, forgot/reset, signature-verified webhooks.
4. Confirm `POST /settlements/notify` rejects unauthenticated calls and enforces `payments:write` scope for API-key callers.
5. Confirm the AfyaX webhook rejects absent/invalid HMAC signatures.
**Acceptance.** Suite green on production; no route reachable without correct auth.
**Dependencies.** WS-01, WS-02.

---

#### WS-06 · Eliminate cold-start fragility — **S (operator-led)**
**Goal.** A client demo must not open on a spun-down service that reads as an outage.
**Files.** `docs/DEMO_WARMUP_RUNBOOK.md`.
**Steps.**
1. Preferred: upgrade the Render service to a paid always-on tier.
2. Otherwise: add an external uptime pinger hitting `/api/v1/health` every 5–10 minutes, plus a documented pre-demo warm-up.
**Acceptance.** Cold visit to health returns within 2s, or the runbook is followed and verified before each demo.
**Dependencies.** Operator (billing decision).

---

#### WS-07 · Complete email reliability — **M**
**Goal.** Onboarding depends entirely on email; silent failure is unacceptable.
**Files.** `server/services/email.ts`, `server/routes/api.ts`, `server/db/schema.ts`, `src/pages/admin/UsersPage.tsx`.
**Steps.**
1. Add an `email_send_log` table: `id, to_email, template, status, provider_message_id, error, created_at, related_type, related_id`.
2. Write a log row on every send attempt across the full template inventory.
3. Add `POST /admin/users/:id/resend-invite` and a **Resend invite** action in the admin UI.
4. Surface send status per user in the admin Users tab (sent / failed / pending).
5. Add an admin view or filter over recent failures.
**Acceptance.** With a deliberately invalid Resend key, the admin UI shows failure, offers retry, and the failure is recorded in `email_send_log`. With a valid key, a resend delivers to a real inbox.
**Dependencies.** WS-02 (rotated Resend key).

---

#### WS-08 · Close the brand sweep — **M**
**Goal.** Every surface reflects *trade receivables securitisation management*; residual pharmacy positioning is removed.
**Files.** `src/lib/brand.ts`, `src/pages/HomePage.tsx`, `src/pages/marketing/*`, `src/pages/AuthPage.tsx`, `index.html`, `server/templates/emails/*`, `docs/USER_GUIDE.md`.
**Steps.**
1. Replace the Auth page pharmacy-warehouse hero with sector-neutral imagery.
2. Grep for `pharmacy`, `working capital for pharmacy`, `health trade` across `src/`, `server/templates/`, `docs/`, `index.html`; retain only deliberate sector-example uses.
3. Verify British spelling **securitisation** everywhere (no `securitization`).
4. Align `index.html` OG/meta with the brand sentence; bump cache-bust params.
5. Update `USER_GUIDE` for production URLs and securitisation wording.
6. Re-scrape OG in WhatsApp and LinkedIn after deploy.
**Acceptance.** Grep is clean apart from intentional sector examples; OG preview shows the securitisation tagline in a fresh WhatsApp share.
**Dependencies.** WS-01.

---

#### WS-09 · Empty, loading and error state sweep — **M**
**Goal.** Perceived quality and first-run comprehension across all four portals.
**Files.** All portal pages under `src/pages/{buyer,supplier,spv,admin}/`, shared pages.
**Steps.**
1. Every `useQuery` surface: skeleton loader, error state with retry, designed empty state.
2. Empty states double as onboarding copy — e.g. opt-in inbox: *"When a buyer posts an instrument naming you, it appears here."*; buyer verification: the mirror; SPV registry tabs: track-specific guidance.
3. Ensure the four hybrid registry tabs each have a distinct, accurate empty state.
**Acceptance.** No raw spinner or blank panel anywhere; a brand-new org sees guidance rather than emptiness on every inbox and list.
**Dependencies.** None.

---

#### WS-10 · Schema-drift protection — **S**
**Goal.** Hosted schema has lagged Drizzle more than once, causing 500s in Analytics and Programmes.
**Files.** `package.json` scripts, `scripts/verify-db.ts`, deploy configuration.
**Steps.**
1. Ensure `npm run verify:db` asserts every expected column, including the P0.5 additions (`commitment_ack_by`, `commitment_ack_at`, `standing_order_bank`, `standing_order_set_at`) and the earlier programme/package columns.
2. Add it as a post-deploy gate or a documented mandatory step on schema change.
3. Document the `drizzle-kit push` procedure against Supabase; never assume the frontend-oriented Render build ran it.
**Acceptance.** `verify:db` passes against production and fails loudly with a named column when one is missing.
**Dependencies.** WS-01.

---

#### WS-11 · Automated money-path test suite + CI — **M**
**Goal.** A system that mutates financial state needs regression protection before pilot clients rely on it.
**Files.** `tests/` (new), CI configuration.
**Steps.** Cover at minimum:
1. Login → refresh → protected route.
2. Path A: buyer post (with commitment) → supplier opt-in accept → assignment `standard_confirmation`.
3. Path B: supplier list → buyer verify (with commitment) → assignment `standard_confirmation`.
4. Negotiated: SPV offer → supplier accept → buyer OTP consent → assignment `negotiated_offer`.
5. `createAssignment` **refuses** without commitment acknowledgement.
6. Settlement notify → escrow legs closed → invoice `settled`.
7. Fee calculation and ledger split correctness.
8. Cross-tenant denial (unit-level).
9. Webhook signature rejection.
10. Programme limit block (once WS-13 lands).
**Acceptance.** `npm test` green locally and in CI; the suite fails if any money path regresses.
**Dependencies.** None (can run in parallel).

---

#### WS-12 · Run the contracted pilot end-to-end — **L (operator-dependent)**
**Goal.** The signed deliverable is *"pilot clients full (beginning-to-end) execution"* with UAT against AfyaX plus at least two clients (a corporate buyer for its suppliers, and a large supplier to its retailers).
**Files.** None — this is execution and defect-fixing.
**Steps.**
1. Operator secures the two pilot organisations. **Book now — this is the longest lead time in Horizon A.**
2. Admin creates Buyer, Supplier and SPV orgs with KYC fields and documents.
3. Invite real users; verify Resend delivery and forced password change.
4. Execute the full UAT script in §6 below.
5. Log and fix every 500, missing email, confusing empty state or copy error.
6. Capture sign-off from the pilot participants.
**Acceptance.** All three walks (Path A, Path B, negotiated) complete on production with emails in real inboxes, documents generated, settlement recorded, and no errors. Written pilot sign-off obtained.
**Dependencies.** WS-01 through WS-10; **operator securing pilot clients**.

---

#### WS-13 · Backups, monitoring and legal review — **S (operator-led)**
**Goal.** Operational and legal safety net before go-live.
**Steps.**
1. Confirm Supabase automated backups and point-in-time recovery are enabled; document and rehearse the restore procedure.
2. Add uptime monitoring on `/api/v1/health` with alerting to the operator.
3. Commission a **Kenyan advocate review** of `/privacy` and `/terms`, confirming entity naming (Uzima Exchange Limited as operator, IOU Exchange as platform), the not-a-bank framing, and Kenya Data Protection Act alignment.
**Acceptance.** Backup verified and restore path documented; health alert fires on a test outage; advocate sign-off received.
**Dependencies.** Operator (Supabase plan, advocate engagement).

---

**Horizon A exit criterion.** The full §7 verification protocol passes on production, and the pilot has written sign-off. **Only then is "Phase 1 go-live" a true statement** — and it is tied to the 10 September instalment, so it must be neither claimed early nor missed.

---

### HORIZON B — Phase 2 depth (contractual, due ~10 Oct)

---

#### WS-14 · Programme limits as hard server-side blocks — **M**
**Goal.** A credit platform must enforce exposure, not warn about it.
**Files.** `server/services/core.ts`, `server/routes/api.ts`, `src/pages/admin/ProgramsPage.tsx`.
**Steps.**
1. On origination and on assignment, evaluate the applicable programme: total exposure, per-buyer sublimit, max tenor, discount band, effective/expiry dates.
2. **Reject** over-limit operations with a specific, actionable error naming the breached constraint.
3. Emit the `programmeBlock` notification to the relevant party.
4. Surface live utilisation against each limit in the admin UI.
**Acceptance.** An invoice exceeding programme exposure is rejected server-side with a named reason; utilisation reflects it; a test covers it.

---

#### WS-15 · Buyer credit-risk profiles in SPV and investor views — **M**
**Goal.** Risk information must reach the party pricing the risk.
**Files.** `server/routes/api.ts` (credit-risk endpoint), `src/pages/spv/IOUDetailPage.tsx`, `IOURegistryPage.tsx`, packaging views.
**Steps.**
1. Compute risk indicators from real payment history: settled-on-time ratio, average days-late, outstanding exposure, default count.
2. Surface a risk band on the buyer profile, IOU detail and registry rows.
3. Feed the band into pricing band suggestions in the offer calculator.
4. Label the methodology plainly; this is behavioural history, **not** a credit rating.
**Acceptance.** SPV sees a risk band traceable to real payment data; offer pricing reflects the band; copy does not imply a licensed credit rating.

---

#### WS-16 · Packaging correctness and listing readiness — **M**
**Goal.** Packages must be arithmetically correct before anyone presents them to investors.
**Files.** `src/pages/spv/PackagingPage.tsx`, `server/services/core.ts`, `server/db/schema.ts`.
**Steps.**
1. Fix weighted average tenor and weighted average discount computation; verify against hand-calculated fixtures.
2. Ensure `package_items` correctly links assignments and that totals (face value, purchase price) reconcile to constituents.
3. Complete the listing-readiness status workflow: draft → structured → ready for submission. **Never** a status reading "listed on NSE."
4. Label `nse_reference` explicitly as an internal reference.
5. Generate a package summary document.
**Acceptance.** A package built from a known pool matches hand-calculated weighted tenor, weighted discount and totals; no UI implies an exchange listing.

---

#### WS-17 · Reconciliation and settlement reporting — **M**
**Goal.** Operators need exportable, defensible period reporting.
**Files.** `src/pages/admin/ReconciliationPage.tsx`, `server/routes/api.ts`.
**Steps.**
1. Move reconciliation math server-side (currently mixed client/server) so the export and the view agree.
2. Period selection; variance between recorded escrow legs and payment updates; flag unmatched items.
3. CSV export for reconciliation, settlements, assignments and the fee ledger.
4. Ensure exports carry the audit fields an auditor expects: actor, timestamp, instrument ID, track.
**Acceptance.** A period export reconciles to the on-screen figures and to the underlying tables; unmatched items are visibly flagged.

---

#### WS-18 · Analytics from real aggregates — **S**
**Goal.** Remove any seed-derived or client-computed figure from operator-facing dashboards.
**Files.** `src/pages/admin/AnalyticsPage.tsx`, `server/routes/api.ts`.
**Steps.** Audit every KPI to a server aggregate over live tables; remove anything not traceable; add empty states for genuinely empty periods.
**Acceptance.** Every dashboard number traces to a query a reviewer can run.

---

#### WS-19 · Custom domains or a documented decision — **S (operator-dependent)**
**Goal.** `uzimax.onrender.com` is not a credible production address for a financial platform.
**Files.** `.env.render`, Render domain config, `src/lib/apiBase.ts`.
**Steps.**
1. DNS for `www.ioux.africa` (marketing), `app.ioux.africa` (portal), `api.ioux.africa` (API) — or a single apex if staying single-service.
2. Update `SITE_URL`, `PORTAL_URL`, `CORS_ORIGINS`, `VITE_API_URL`; **rebuild** for `VITE_*`.
3. Verify HTTPS certificates and that the refresh cookie still functions across the chosen topology.
4. If deferring, record an explicit dated decision to remain on Render.
**Acceptance.** All surfaces load over HTTPS on the real domain and login → refresh → protected route works; or a written deferral exists.

---

#### WS-20 · Retire orphan pages and dead routes — **S**
**Files.** `src/pages/**`, `src/App.tsx`.
**Steps.** Remove or archive unmounted page files and redundant redirects; confirm nothing imports them.
**Acceptance.** No unreferenced page components; route table matches the documented inventory.

---

**Horizon B exit criterion.** Phase 2 deliverables in the signed agreement are demonstrable, and the 10 October instalment can be invoiced honestly.

---

### HORIZON C — Full securitisation platform vision (beyond current contract)

**Commercial note.** These items are the natural continuation of the product but sit **outside** `UZIMA-SYS-PLAN-001 v1.6`. They should be scoped and priced as a Phase 3 engagement. Plan them; do not build them unpaid.

---

#### WS-21 · IOU registry / depository maturity — **L**
**Goal.** A registry credible as a system of record for a securitisation programme.
**Scope.** Completion of the identifier scheme (uniqueness guarantees, check digits, collision handling); immutable registration events; full instrument provenance from origination to settlement; registry export in a format acceptable to counsel and auditors; reconciliation of registry against ledger; retention policy.
**Acceptance.** An auditor can be handed a registry export and trace any instrument's complete life without engineer assistance.

---

#### WS-22 · True-sale documentation pack completeness — **L**
**Goal.** The document set that evidences a legally effective assignment.
**Scope.** Purchase note, assignment letter, obligor consent artifact, commitment-to-pay evidence, standing-order evidence, signatory authority chain (board resolution, specimen signature, approval certificate), and a single **evidence bundle export** per instrument. Counsel review of each template's wording against the ABS Regulations 2007 and the 2019 Policy Guidance Note.
**Acceptance.** For any assigned instrument, one action produces a complete, counsel-approved evidence bundle.
**Dependencies.** UzimaX legal counsel.

---

#### WS-23 · Settlement-partner operating procedure and certification — **M**
**Goal.** Move AfyaX and settlement-agent integration from "stubs built" to "operationally certified."
**Scope.** Signed interface specification; HMAC key exchange and rotation procedure; idempotency and replay protection on all inbound notifications; reconciliation cadence; failure and dispute handling; a certification checklist both parties sign off.
**Acceptance.** A documented certification test pack passes end-to-end with the partner in a sandbox, then production.
**Dependencies.** Settlement partner and AfyaX counterpart availability.

---

#### WS-24 · Multi-programme capacity and utilisation reporting — **M**
**Scope.** Portfolio-level exposure across programmes, buyers and sectors; concentration limits and alerts; forward maturity ladder; capacity forecasting for the SPV.
**Acceptance.** The SPV can answer "what is our exposure to this obligor across all programmes, and what matures when" from the UI.

---

#### WS-25 · Observability and operational runbooks — **M**
**Scope.** Structured logging with correlation IDs; error tracking (e.g. Sentry); audit export SLAs; runbooks for incident response, database restore, user invitation, demo preparation, secret rotation and deploy rollback.
**Acceptance.** An operator who is not the original engineer can diagnose a failed transaction and restore service using documentation alone.

---

#### WS-26 · Performance and tenancy hardening at pilot scale — **M**
**Scope.** Load profile from expected pilot volumes; index review on hot query paths; pagination on every list endpoint; N+1 elimination; connection-pool tuning for Supabase; rate-limit calibration on auth and webhooks.
**Acceptance.** Defined target volumes sustained with acceptable latency, evidenced by a load test.

---

### HORIZON D — Licensed expansions (change orders only)

Each item below requires **commercial scoping and, in most cases, regulatory prerequisites that sit with Uzima Exchange Ltd, not with the build**. Do not begin any of these without a signed change order.

| Expansion | Prerequisites (operator/entity) | Suggested architecture |
|---|---|---|
| **Live bank rails** — disbursement, collection, M-Pesa, Pesalink, RTGS | Licensed PSP or bank partnership; money-transmission position; AML/CFT programme; settlement account structure | Replace simulated wallet with a partner adapter behind the existing ledger interface; keep escrow legs as the reconciliation layer |
| **Execution of standing orders** | Bank mandate infrastructure; obligor bank authorisation | Bank API adapter; mandate lifecycle state machine; reference already captured in P0.5 |
| **Real NSE / exchange integration** | CMA positioning; exchange onboarding; trustee and note structuring | Listing submission adapter behind the existing packaging workflow; the readiness statuses become real submission states |
| **External KYC vendors** (eCitizen, KRA, PPB) | Vendor contracts; data-processing agreements | Verification service behind existing KYC fields; status transitions from admin-set to vendor-verified |
| **Per-buyer ERP adapters** (SAP, Oracle, Dynamics) | Per-buyer field mapping workshops; sandbox credentials | Adapter layer normalising to the existing generic invoice API |
| **MFA / SSO / Keycloak** | Identity provider decision | Sits alongside existing JWT; consent OTP is unaffected |
| **BI / data warehouse export** | Warehouse decision | Read replica or scheduled export; no impact on transactional schema |
| **Tax and regulatory analysis of fees** | Tax counsel | Not an engineering deliverable |

**Framing for the operator:** each of these converts IOU Exchange from a *management and record* platform into a *regulated financial operator*. That is a strategic and licensing decision before it is an engineering one.

---

### HORIZON E — Delivery excellence

#### WS-27 · Programme definition of done, RACI and risk register — **S**
**Definition of Done (whole programme).** Every Horizon A and B item accepted; Horizon C scoped and either contracted or explicitly deferred in writing; Horizon D untouched without change orders; documentation set complete; pilot signed off; production monitored, backed up and secret-rotated.

**RACI.**

| Workstream area | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Build & verification | Engineer | Engineer | Operator | Client |
| Secrets, hosting, billing | Operator | Operator | Engineer | — |
| Pilot client recruitment | Operator | Operator | Engineer | Client |
| Legal templates & pages | Advocate | Operator | Engineer | — |
| Settlement/AfyaX interface | Engineer | Operator | Partner (D. Sule) | Client |
| Regulatory positioning | Operator | Uzima Exchange Ltd | Advocate/CMA | Engineer |

**Risk register.**

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Pilot clients not secured in time | High | Blocks go-live claim | Book now (WS-12); escalate weekly |
| Exposed secrets abused | Medium | Severe | WS-02 immediately |
| Cold start reads as outage in demo | High | Reputational | WS-06 |
| Schema drift causes production 500s | Medium | High | WS-10 gate |
| Silent email failure blocks onboarding | Medium | High | WS-07 |
| Honesty slip in copy (bank/NSE claim) | Medium | Severe | WS-08 + review gate on all copy |
| Scope creep into Horizon C/D unpaid | **High** | **Severe (commercial)** | This document's horizon boundary; change orders |
| Single-engineer key-person risk | High | High | WS-25 runbooks; documentation discipline |

#### WS-28 · Test matrix — **S**
| Layer | Coverage target |
|---|---|
| Unit | Pricing, fee splits, track resolution, status machine |
| Integration | Both origination paths, negotiated track, settlement recording |
| Security | Cross-tenant isolation, authz sweep, webhook signature, rate limits |
| E2E | Full UAT script (§6) on production |
| UAT | Pilot participants, written sign-off |

#### WS-29 · Documentation set at "fully done" — **S**
`IOU_EXCHANGE_FULL_SYSTEM_GUIDE.md` (current) · this plan (progress-tracked) · `USER_GUIDE.md` (production URLs, securitisation wording, per-role walkthroughs) · admin operations guide · `openapi.yaml` in sync with routes · runbooks (incident, restore, invite, demo, rotation, deploy/rollback) · `SECRETS_ROTATION.md` · pilot sign-off record · advocate review record.

---

## 5. Security & compliance checklist

Run before go-live and re-run quarterly.

**Authentication & session.** Password hashing (bcrypt ≥ 12) · JWT expiry sane (access ≤ 15 min) · refresh cookie HttpOnly + Secure + SameSite + scoped path · refresh rotation and revocation on logout · forced password change on first login · lockout and rate limiting Redis-backed · no demo OTP in production.

**Authorisation & tenancy.** Every mutating route authenticated and role-checked · RLS policies present and proven (WS-04) · API keys hashed, scoped, revocable · no client-only gating relied upon.

**Data protection (Kenya DPA 2019).** Privacy policy accurate and advocate-reviewed · lawful basis documented · data-subject request procedure · retention policy on instruments and audit records · encryption in transit · access limited to those who need it · sub-processors identified (Supabase, Render, Resend).

**Financial-system integrity.** Immutable audit log · commitment acknowledgement required before assignment · settlement recorded only from authenticated notification · idempotency on webhooks · replay protection · fee ledger immutable · no UI implying funds moved.

**Secrets & supply chain.** All secrets in Render secret store · none in git or history · rotation procedure documented and rehearsed · dependency audit (`npm audit`) reviewed.

**Operational.** Backups + PITR verified · restore rehearsed · uptime alerting · error tracking · documented rollback.

---

## 6. Pilot & UAT script

Run on **production** with real inboxes. Record pass/fail per step.

**Setup.** Admin creates Buyer Org, Supplier Org, SPV Org with KYC fields and documents. Invites one user each. **Checkpoint:** three invite emails arrive; each user is forced to change password on first login.

**Walk 1 — Path A (buyer-originated, standard track).**
1. Buyer posts an IOU/invoice naming the supplier, ticks commitment-to-pay, enters a standing-order reference and bank.
2. **Email checkpoint:** supplier receives opt-in notification.
3. Supplier opens opt-in inbox, accepts.
4. Assignment created with type `standard_confirmation`.
5. **Email checkpoint:** assignment notification to SPV, buyer and supplier.
6. SPV registry shows the instrument under **Assigned**; detail explains the track; standing-order reference visible.
7. Purchase note and assignment letter PDFs generate and download; standing-order reference appears on the letter.
8. Settlement agent (or admin) posts settlement notification.
9. Escrow legs close; invoice transitions to `settled`.
10. **Email checkpoint:** settlement notification to all parties. Audit export contains every step with actor and timestamp.

**Walk 2 — Path B (supplier-originated, standard track).**
1. Supplier lists an invoice against the buyer.
2. **Email checkpoint:** buyer receives verification request.
3. Buyer opens verification inbox, ticks commitment, optionally enters standing-order details, verifies.
4. Assignment created `standard_confirmation`; downstream identical to Walk 1 steps 5–10.
5. Also test **rejection**: buyer rejects with reason → supplier notified → instrument closed correctly.

**Walk 3 — Negotiated track.**
1. On a confirmed instrument under **Open to offer**, SPV creates an offer with a negotiated discount and tenor.
2. **Email checkpoint:** supplier receives offer.
3. Supplier accepts.
4. **Email checkpoint:** buyer receives consent request; instrument appears under **Pending consent**.
5. Buyer signatory requests OTP, receives it by email, confirms signature.
6. Assignment created `negotiated_offer`; commitment stamped; downstream as above.
7. Also test **decline** at both the supplier and buyer stages.

**Walk 4 — Negative and guard tests.**
1. Attempt assignment on an instrument lacking commitment acknowledgement → must be refused.
2. Post a settlement notification with an invalid signature/scope → must be rejected.
3. Attempt to read another org's instrument → must be denied.
4. Post an invoice exceeding a programme limit (after WS-14) → must be blocked with a named reason.

**Walk 5 — Administrative.**
Programmes create/pause/close · fees configure and verify ledger split · reconciliation for the period · audit export · analytics reflect the pilot's real activity.

**Sign-off.** Written confirmation from pilot participants that Walks 1–3 completed successfully.

---

## 7. Production operations

**Deploy.** Push to `main` → Manual Deploy on Render service **UzimaX** → build (`npm install --include=dev && npm run build`) → start (`npm start` → `tsx server/index.ts`) → verify health.

**Schema change.** Update `server/db/schema.ts` → generate/apply migration under `supabase/migrations/` → `drizzle-kit push` against Supabase → `npm run verify:db` → deploy. **Never** assume the Render build migrated.

**Verification protocol** (run before declaring go-live, and after any significant deploy):
```bash
curl -s https://uzimax.onrender.com/api/v1/health          # JSON, db: up
curl -s -X POST .../api/v1/auth/login -d '{...}'           # auth smoke
npm run smoke:tenant-isolation                             # must be green
npm run test:authz                                         # must be green
npm test                                                   # money paths green
npm run verify:db                                          # schema aligned
```
Then manually: Walk 1, Walk 2, Walk 3, Walk 4 from §6; confirm wallet/engine nav absent; confirm no screen claims funds moved or an NSE listing exists.

**Secret rotation.** Follow `docs/SECRETS_ROTATION.md`. Rotating JWT secrets invalidates sessions — announce it.

**Warm-up.** Per `docs/DEMO_WARMUP_RUNBOOK.md` until WS-06 removes the need.

**Backups.** Supabase automated + PITR; rehearse restore at least once.

**Never** run `db:seed` against hosted without explicit operator approval and `ALLOW_PROD_SEED=1`.

---

## 8. Roadmap calendar

Today: **24 July 2026**. Phase 1 contractual target: **~10 September**. Phase 2: **~10 October**.

| Window | Horizon | Focus |
|---|---|---|
| **Wk 1** (24–31 Jul) | A | WS-01 deploy · **WS-02 secrets (operator)** · WS-03 flags · **WS-12 book pilot clients** |
| **Wk 2** (1–7 Aug) | A | WS-04 isolation · WS-05 authz · WS-06 always-on · WS-10 schema gate |
| **Wk 3** (8–14 Aug) | A | WS-07 email reliability · WS-11 test suite begins |
| **Wk 4** (15–21 Aug) | A | WS-08 brand sweep · WS-09 states sweep |
| **Wk 5** (22–28 Aug) | A | WS-11 tests complete · WS-13 backups/monitoring/legal commissioned |
| **Wk 6** (29 Aug–4 Sep) | A | **WS-12 pilot execution** · defect fixing |
| **Wk 7** (5–10 Sep) | A | Full §7 verification · pilot sign-off · **Phase 1 go-live claim** |
| **Wk 8–9** (11–24 Sep) | B | WS-14 programme limits · WS-15 credit risk |
| **Wk 10–11** (25 Sep–8 Oct) | B | WS-16 packaging · WS-17 reporting · WS-18 analytics · WS-19 domains · WS-20 cleanup |
| **~10 Oct** | B | **Phase 2 go-live claim** |
| **Post-contract** | C | WS-21 to WS-26 — **scope and price as Phase 3 before starting** |
| **On demand** | D | Change orders only, with licensing prerequisites met |
| **Continuous** | E | WS-27 to WS-29 |

**The critical path runs through operator actions**, not code: secrets (Wk 1), always-on hosting (Wk 2), pilot clients (Wk 6, booked Wk 1), advocate review (commissioned Wk 5). Chase these weekly.

---

## 9. Change-order annex

**Boundary statement.** `UZIMA-SYS-PLAN-001 v1.6` contracts Phase 1 and Phase 2 for KES 450,000. Horizons A and B are inside that. **Horizons C and D are not.**

Excluded by the signed agreement: licensing/listing fees with NSE or investors · formal legal opinions and executed trust deeds · production payment processing, wallet licensing and money-movement compliance · core banking and live bank rails · execution of standing orders · tax and regulatory analysis of fees · rebuilding third-party microservices outside the client's control.

**How to handle a Horizon C or D request.** Acknowledge it, locate it in this document, state plainly that it sits outside the current agreement, and offer to scope it as a Phase 3 change order with its own timeline and fee. Note where the prerequisite is not engineering at all — licensing, partner contracts, counsel — because those gate delivery regardless of budget.

**Why this matters here.** Scope has expanded at every revision of this engagement. The horizon boundary is the mechanism that keeps the remaining work deliverable and the engagement profitable. Enforce it politely and consistently.

---

## 10. First ten tasks

Execute in this order.

1. **Deploy `f215fed`** to Render; confirm health returns JSON and the four SPV registry tabs render. *(WS-01)*
2. **Operator: rotate all secrets** per `docs/SECRETS_ROTATION.md`; delete `scripts/.tmp-ops-secrets.json`; verify git history is clean. *(WS-02)*
3. **Operator: book the two pilot organisations** — longest lead time in the plan; everything else can proceed in parallel. *(WS-12)*
4. **Verify production flags** on Render; rebuild if any `VITE_*` changed; grep the bundle for demo strings. *(WS-03)*
5. **Run `smoke:tenant-isolation` against production** with rotated credentials; fix anything that leaks. *(WS-04)*
6. **Run `test:authz` against production**; confirm `/settlements/notify` and the AfyaX webhook reject unauthenticated and unsigned calls. *(WS-05)*
7. **Add `verify:db` as a deploy gate**; confirm the P0.5 columns exist on the hosted database. *(WS-10)*
8. **Operator: resolve cold starts** — upgrade the Render tier or install an uptime pinger. *(WS-06)*
9. **Complete email reliability** — `email_send_log`, resend-invite action, admin visibility. *(WS-07)*
10. **Start the money-path test suite**, beginning with both origination paths and the commitment-refusal guard. *(WS-11)*

---

## 11. Questions for the operator

Only decisions that genuinely block architecture or commercials. The hybrid-track decision is **locked** and is not reopened here.

1. **Hosting tier.** Paid always-on Render, or accept cold starts with a warm-up runbook? Blocks WS-06 and affects every demo.
2. **Domains.** Move to `www`/`app`/`api.ioux.africa` during Phase 2, or formally defer and stay on `uzimax.onrender.com`? Blocks WS-19 and affects email links and OG previews.
3. **Pilot clients.** Which corporate buyer and which large supplier, and by when can they be onboarded? This is the critical path to the 10 September milestone.
4. **Settlement agent.** Who is the named settlement partner, and is the settlement notification arriving via API key, admin entry, or both? Determines WS-23 scoping.
5. **Fee model.** The commercial model was recorded as "to be confirmed with UzimaX." What are the actual fee rules to configure? Blocks accurate fee-ledger verification.
6. **Horizon C intent.** Is Phase 3 (registry maturity, true-sale evidence bundle, settlement certification, portfolio reporting) to be scoped now, so it can follow Phase 2 without a gap? Needed for commercial planning.
7. **Counsel availability.** When can the advocate review the legal pages and the true-sale template wording? Gates WS-13 and WS-22.

---

## 12. Closing instruction

Do not rebuild. Do not claim bank rails, real NSE listing, licensed money transmission, or certified AfyaX integration. Do not begin Horizon C or D work without a signed change order.

Execute Horizon A in the order given, verifying each item on production with real Resend emails. Treat the operator-dependent items as the critical path and chase them weekly. Update `docs/IOU_EXCHANGE_FULL_SYSTEM_GUIDE.md` as items close so the architecture truth stays true, and mark progress against the workstream numbers in this file.

Declare nothing complete that has not passed §7 verification.

---

*End of `IOUX-FULL-FINISH-001`.*
