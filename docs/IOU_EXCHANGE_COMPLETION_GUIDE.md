# IOU Exchange — Completion Guide to 100%

**Document:** `IOUX-COMPLETE-001`
**For:** Cursor (and any engineer finishing this build)
**Supersedes tasking in:** `IOUX-CLAUDE-FINISH-001` (state doc — still the truth on *what exists*)
**Repo:** `c:\Users\Admin\Downloads\CPF` · GitHub `uzimahealth254/UzimaX` · branch `main`
**Live:** https://uzimax.onrender.com
**Date:** 24 July 2026

---

## 0. Read this first

The system is **~86% complete against the signed contract's Phase 1 deliverable list** and **~60% complete against production-readiness**. It is *not* a rebuild candidate. Everything below is closing gaps, locking one product decision, and hardening.

**The commercial context that drives priority:** the signed agreement (`UZIMA-SYS-PLAN-001 v1.6`) ties the third instalment (KES 100,000) to **"By 10 September / Phase 1 go-live."** That is roughly seven weeks from today. Phase 1 go-live is not a vibe — it is the contractual deliverable list in §3 below, executed end-to-end with pilot clients. Work backwards from that date.

**Non-negotiable behaviours (from the state doc — do not drift):**
- Brand is **trade receivables securitisation management**. Not "pharmacy trade," not "working capital for pharmacy trade." Health/pharma is *one sector example* only. British spelling: **securitisation**.
- Never claim live bank rails, real NSE listing, licensed money transmission, or production-certified AfyaX.
- Escrow and wallet are **simulated ledgers**, labelled as such, flagged off in production.
- **Edit over rebuild.** Extend `server/services/core.ts`, the Drizzle schema, and existing pages.
- Internal identifiers stay: `uzima_*` cookies, `.uzima-site`, Render service `UzimaX`, `uzima_party_id`. User-facing name is IOU Exchange.
- **Ask the operator before** seeding production, rotating secrets in git, or force-pushing.

---

## 1. Assessment: is the approach right?

**Yes, with three corrections.** What is right:

- **Single source of truth.** Postgres via Drizzle, no dual mock store. This was the #1 technical debt in the old AFIX audit and it has been properly resolved.
- **Deployed early, iterating live.** Matches the contracted "ship as we develop" model and gives the client something to react to.
- **Honesty architecture.** Simulated labels, feature flags, no overclaiming. In a securitisation-adjacent product this is the single most important reputational protection, and it is baked in rather than bolted on.
- **Invite-only auth with forced password change.** Correct for the model; no public signup surface to defend.
- **Single-service deploy.** Express serving both SPA and API removes a whole class of CORS and origin bugs. Sensible at this scale.

What needs correcting:

**Correction 1 — The unlocked workflow is a real architectural risk, not just a UX one.** Both auto-assign and offer→consent tracks exist in code simultaneously. Until this is resolved, SPV inventory semantics are ambiguous ("Available" vs "Assigned"), and every UX fix will be re-done. §2 resolves it.

**Correction 2 — Two signed deliverables are only partially built** (commitment-to-pay / standing order, and settlement recording). These are not nice-to-haves; they are named line items in the executed agreement and they gate the go-live claim. §3 and §4 handle them.

**Correction 3 — Production posture is fragile for a client demo.** Secrets have been exposed in chat, the free Render tier spins down (cold start reads as "site is broken"), and hosted schema has drifted from Drizzle more than once. §4 P0 handles these.

---

## 2. THE BLOCKING DECISION — resolve this first

**Status (24 Jul 2026):** Operator authorised Cursor to execute this guide end-to-end. **Hybrid tracks are implemented** as recommended below. Do not re-litigate unless the operator overrides in writing.

### The question
Does every deal require `Offer → Buyer OTP consent → Assignment`, or does confirmation auto-assign?

### Recommended resolution: **Hybrid, with explicit semantics**

The reasoning matters, so implement it with this understanding:

**In both dual-origination paths, the obligor has already affirmatively acted before assignment:**
- *Path A (buyer-posted):* the buyer **originated** the instrument and recorded a commitment to pay. Their consent to the receivable being financed is inherent in the act of posting it.
- *Path B (supplier-listed):* the buyer **verified and confirmed** the invoice. That verification *is* the obligor's acknowledgement.

So auto-assignment on confirmation is legally coherent in both paths — the assignment is consented, because the obligor acted. This is the **standard track**.

**The offer→consent track is a different thing:** it exists when the SPV wants to negotiate a *specific discount* rather than take the configured default. Because the economics change, a fresh, OTP-verified buyer consent is appropriate. This is the **negotiated track**.

### What to implement

1. **Name the two tracks in code and UI.** Add an explicit `assignment_track` concept (or reuse the existing `assignment_type`) with values that read clearly: `standard_confirmation` (Path A/B auto) and `negotiated_offer` (offer → consent).

2. **Fix SPV registry semantics.** The registry must not blur the two. Recommended tabs/filters:
   - **Assigned** — already the SPV's (came via standard confirmation)
   - **Open to offer** — confirmed receivables where the SPV may propose negotiated terms
   - **Pending consent** — negotiated offers accepted by supplier, awaiting buyer OTP
   - **Declined / closed**

3. **Label it in the UI so no one is confused.** On an auto-assigned instrument, show a line such as: *"Assigned on buyer confirmation — obligor acknowledgement recorded [date]."* On the negotiated track: *"Awaiting obligor consent to negotiated terms."*

4. **Document the decision** in `docs/IOU_EXCHANGE_FULL_SYSTEM_GUIDE.md` so it stops being re-litigated.

**If the operator overrides and wants offer-first for everything:** then auto-assignment must be removed from `respondToOptIn` and `respondToBuyerVerification` in `server/services/core.ts`, those confirmations must set status to `confirmed_available` instead, and every existing auto-assigned record needs a migration path. That is a bigger change — get it in writing before starting.

---

## 3. Contractual deliverable gap map (Phase 1)

Mapped against the signed `UZIMA-SYS-PLAN-001 v1.6` Phase 1 list. **18 of 21 built; 3 partial.**

| # | Signed deliverable | State | Action |
|---|--------------------|-------|--------|
| 1 | End-to-end walkthrough build | ✅ Built | Verify on prod |
| 2 | Buyer origination | ✅ Built | Verify on prod |
| 3 | Supplier origination | ✅ Built | Verify on prod |
| 4 | IOU / invoice registry | ✅ Built | Verify unique IDs + status history |
| 5 | **Commitment to pay + bank standing order** | ⚠️ **Partial** | **P0.5 below** |
| 6 | Notify counterparty | ✅ Built | Verify Resend E2E |
| 7 | Confirm / opt in / sell | ✅ Built | Verify |
| 8 | Auto assignment to SPV | ✅ Built | Gated on §2 decision |
| 9 | Party registration & ID APIs | ✅ Built | Verify |
| 10 | Invoice / IOU submission APIs | ✅ Built | Verify with Postman |
| 11 | Payment update ingestion | ✅ Built | Verify signature enforcement |
| 12 | **Settlement recording** | ⚠️ **Partial** | **P0.6 below** |
| 13 | SPV purchase engine | ✅ Built | Verify tenor pricing |
| 14 | Buyer assignment & consent | ✅ Built | Verify OTP |
| 15 | Signatory governance | ✅ Built | Verify cert upload |
| 16 | Wallet & ledger simulation | ✅ Built | Flagged off in prod |
| 17 | Fees & commissions engine | ✅ Built | Verify splits |
| 18 | Transaction documents | ✅ Built | Verify PDF generation |
| 19 | Notifications & audit | ✅ Built | Verify audit export |
| 20 | Polished portals | ✅ Built | Empty/loading states (P1) |
| 21 | **Deploy Phase 1 + pilot execution** | ⚠️ **Partial** | Deployed; **pilot not run** — P1.1 |

**Phase 2** (packaging, programmes, credit-risk, reporting, hardening) is roughly 40% built — `ProgramsPage`, `PackagingPage`, and the credit-risk endpoint exist. Do not invest further there until Phase 1 is signed off.

---

## 4. Ordered execution plan

### P0 — Blockers (do before any client sees production)

**P0.1 — Rotate every exposed secret.**
The admin password, Resend key and DB password have been shared in chat and written into `scripts/.tmp-ops-secrets.json`.
- Rotate: `ops@ioux.africa` admin password, `RESEND_API_KEY`, Supabase DB password, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `AFYAX_WEBHOOK_SECRET`.
- Delete `scripts/.tmp-ops-secrets.json`; confirm it is gitignored; check it never entered git history (`git log --all -- scripts/.tmp-ops-secrets.json`).
- Store new values only in Render's secret store.
- **Acceptance:** old admin password fails login; new secrets live; no secret string greps out of the repo or history.

**P0.2 — Confirm production flag posture.**
On Render, assert exactly:
```
NODE_ENV=production   COOKIE_SECURE=true
ALLOW_DEMO_OTP=false  ALLOW_BODY_REFRESH=false
ENABLE_SIMULATED_WALLET=false
VITE_SHOW_DEMO=false  VITE_ENABLE_WALLET=false  VITE_ENABLE_ENGINE=false
```
Remember `VITE_*` are **build-time** — any change needs a redeploy.
- **Acceptance:** built bundle greps clean for demo emails, `Uzima2026`, and OTP hints; wallet/engine nav absent in prod.

**P0.3 — Cross-tenant isolation test on production.**
This is the core security property of a multi-tenant financial system.
- Write `scripts/smoke-tenant-isolation.ts`: with org A's token, attempt to read org B's invoices, opt-ins, verifications, consents, assignments, documents, wallets. Every attempt must 403 or return empty.
- Run `npm run db:rls` against the hosted DB and confirm policies are actually present (`SELECT * FROM pg_policies`).
- **Acceptance:** the script passes on production with zero cross-tenant reads.

**P0.4 — Authz sweep on every mutating route.**
Client-side `ProtectedRoute` does not protect the API.
- Audit `server/routes/api.ts`: every non-public route runs JWT middleware **and** a role check. Public = health, login, forgot/reset, signature-verified webhooks. External invoice/party endpoints require a valid org-scoped API key.
- **Acceptance:** a test hits each domain route with (a) no token → 401, (b) wrong-role token → 403.

**P0.5 — Complete "Commitment to pay + bank standing order" (contractual).**
Currently fields only. The signed deliverable reads: *"Obligor's acknowledgement of the debt captured on each IOU/invoice; buyer sets up a bank standing order for the due date; the standing-order reference is recorded against the instrument."*
- On buyer origination and buyer verification, require an explicit acknowledgement (checkbox + recorded actor + timestamp): *"I confirm this is an approved, undisputed payable and commit to pay on the due date."*
- Add/confirm fields on `invoices`: `commitment_ack_by`, `commitment_ack_at`, `standing_order_ref`, `standing_order_bank`, `standing_order_set_at`.
- Surface the standing-order reference on the invoice detail view for buyer, SPV and admin, and include it in the assignment letter PDF.
- **Acceptance:** an instrument cannot reach `assigned` without a recorded obligor acknowledgement; the standing-order reference renders in the UI and on the generated PDF.

**P0.6 — Complete "Settlement recording" (contractual).**
Signed deliverable: *"Settlement is executed by the settlement agent; the system receives a notification and records the completion / closure of each transaction against the instrument."*
- Add a settlement-agent notification path — either an authenticated endpoint (`POST /api/v1/settlements/notify`, API-key scoped, HMAC-signed) or an admin-recorded action, ideally both.
- On receipt: record settlement completion against the instrument, close the relevant escrow legs, transition the invoice to `settled` when fully discharged, write to `audit_log`, and notify SPV + supplier + buyer.
- Keep every label honest: the system **records** settlement; it does not execute it.
- **Acceptance:** posting a settlement notification closes the transaction, flips status, emails all parties, and appears in the audit export — with no UI implying IOU Exchange moved funds.

**P0.7 — Fix demo fragility.**
Free Render spins down; a cold start looks like an outage during a client demo.
- Either upgrade the service to a paid always-on tier, or add a documented pre-demo warm-up (hit `/api/v1/health` 5 minutes before) plus an uptime pinger.
- **Acceptance:** `GET /api/v1/health` returns JSON `{status, service, db: up}` within 2s on a cold visit, or a documented warm-up procedure exists and is in the runbook.

---

### P1 — Go-live quality (required to claim "Phase 1 go-live")

**P1.1 — Run the contracted pilot end-to-end on production.**
The signed deliverable is *"pilot clients full (beginning-to-end) execution"*, with the operating rules specifying UAT with the AfyaX B2B platform plus **at least two clients** (a corporate buyer for its suppliers, and a large supplier to its retailers).
- From admin: create real Buyer, Supplier and SPV organisations with KYC fields and documents.
- Invite real users; confirm Resend delivery and that `PasswordChangeGate` forces the reset.
- Walk **Path A** fully: buyer posts → supplier notified by email → opt-in → assignment → SPV sees it → documents generated → settlement notification → settled.
- Walk **Path B** fully: supplier posts → buyer notified → verify/confirm → assignment → same downstream.
- Walk the **negotiated track**: SPV offer → supplier accepts → buyer OTP consent → assignment.
- Log every 500, empty state, or missing email and fix.
- **Acceptance:** all three walks complete on production with emails arriving in real inboxes and no errors.

**P1.2 — Email reliability and admin visibility.**
Invite currently returns 201 even when Resend fails — silent failure is unacceptable for onboarding.
- Capture the provider response; on failure return a non-2xx or an explicit `emailSent: false`, log it, and surface a clear admin toast plus a "resend invite" action.
- Add a lightweight `email_send_log` (or extend `audit_log`) so failures are inspectable.
- **Acceptance:** with a deliberately invalid Resend key, the admin UI shows the failure and offers retry; the failure is logged.

**P1.3 — Complete the brand repositioning sweep.**
Pharmacy-era copy and imagery contradict the securitisation positioning.
- Sweep every surface: `HomePage`, `AboutPage`, `SolutionsPage`, `PortalsPage`, `ResourcesPage`, `AuthPage` (still has pharmacy-warehouse hero imagery), `src/lib/brand.ts`, email templates, `index.html` OG/meta, `USER_GUIDE`.
- Target positioning: *trade receivables securitisation management*. Health/pharma may appear only as a sector example.
- Re-scrape the OG preview after deploy (WhatsApp/LinkedIn cache).
- **Acceptance:** grep for "pharmacy", "working capital for pharmacy" returns only intentional sector-example uses; OG preview shows the new tagline.

**P1.4 — Empty, loading and error states.**
Sweep every React Query surface across buyer, supplier, SPV and admin.
- Skeleton loaders on every `useQuery`; error state with retry; designed empty states that double as onboarding (e.g. empty opt-in inbox: *"When a buyer posts an instrument naming you, it appears here."*).
- **Acceptance:** no raw spinners or blank panels anywhere; every inbox/list has a designed empty state.

**P1.5 — Schema-drift protection.**
Hosted schema has lagged Drizzle more than once (Analytics/Programmes 500s).
- Add a deploy step or documented one-off that runs `drizzle-kit push` against the hosted DB on schema change, plus `npm run verify:db` to assert expected columns exist.
- **Acceptance:** `verify:db` passes against production and fails loudly if a column is missing.

**P1.6 — Minimal automated test suite on the money paths.**
There is currently no test coverage on a system that moves financial state.
- Ten to fifteen tests is enough: login/refresh, Path A confirmation → assignment, Path B verification → assignment, offer → consent → assignment, settlement notification → settled, fee calculation, cross-tenant denial, webhook signature rejection.
- **Acceptance:** `npm test` runs green in CI or locally, and covers those paths.

**P1.7 — Backups and monitoring.**
- Confirm Supabase automated backups and point-in-time recovery are enabled; understand the restore procedure.
- Add uptime monitoring on `/api/v1/health` with alerting.
- **Acceptance:** a backup exists, restore path documented, health alert fires on downtime.

**P1.8 — Legal pages reviewed.**
`/privacy` and `/terms` are live-facing legal documents on a finance-adjacent platform.
- Confirm entity naming (Uzima Exchange Limited as operator, IOU Exchange as platform), real contact emails, the not-a-bank framing.
- **Have a Kenyan advocate review both before public launch.** Flagged, not optional.

---

### P2 — After Phase 1 sign-off (this is Phase 2 scope)

- Programme limits enforced **server-side** as hard blocks, not warnings.
- Buyer credit-risk profiles surfaced to SPV/investor views, feeding pricing bands.
- Bond/note packaging polish: package from assigned pool, weighted tenor/discount correctness, listing-readiness statuses.
- Reconciliation and settlement reports with CSV export.
- SPV analytics from real aggregates (verify nothing is seed-derived).
- Custom domains (`www` / `app` / `api.ioux.africa`) with `PORTAL_URL`, `CORS_ORIGINS`, `VITE_API_URL` updated and rebuilt — or a documented decision to stay on onrender.
- Retire orphan page files unless a product reason revives them.

---

## 5. Explicitly OUT of scope (change orders — do not build)

Per the signed agreement's out-of-scope clause:
- Live bank rails, real disbursement/collection, M-Pesa/Pesalink/RTGS
- **Execution** of bank standing orders (capturing the reference is in scope; executing the order is not)
- Real NSE / exchange integration
- External KYC verification vendors (eCitizen / KRA / PPB API checks)
- Per-buyer ERP adapters — the generic external invoice API is the boundary
- MFA / SSO / Keycloak on login (consent OTP is separate and stays)
- Tax and regulatory analysis of platform fees
- BI / data-warehouse export

If the client requests any of these, it is a new phase with its own budget. For anything touching money movement, the licensing and compliance burden sits with Uzima Exchange Ltd, not the build.

---

## 6. Landmines (from hard experience — do not rediscover)

1. `NODE_ENV=production` in a **local** shell makes `assertSecurityConfig` demand Redis + AfyaX secrets. Use `NODE_ENV=development` for `npm run dev:api`.
2. Duplicate `REDIS_URL` in `.env` — last wins. Local must be `redis://localhost:6379`.
3. `VITE_*` values are **baked at build time**. Render env change ⇒ redeploy.
4. Express 5 forbids `app.get('*')`. Use `/{*path}` for SPA fallback.
5. Hosted schema can lag Drizzle — always push on schema change (P1.5).
6. Free Render spins down; cold start resembles an outage (P0.7).
7. Never `npm run db:seed` against hosted without `ALLOW_PROD_SEED=1` — and ask the operator first.
8. `getApiBaseUrl()` in production prefers same-origin; do not "fix" it by baking a localhost `VITE_API_URL`.

---

## 7. Verification protocol (run before declaring go-live)

```bash
# 1. Health must be JSON, not the React 404 page
curl -s https://uzimax.onrender.com/api/v1/health

# 2. Auth smoke
curl -s -X POST https://uzimax.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ops@ioux.africa","password":"<rotated>"}'

# 3. Security
npm run smoke:tenant-isolation      # P0.3 — must pass
npm test                            # P1.6 — must be green

# 4. Schema
npm run verify:db                   # P1.5 — expected columns present
```

Then, manually on production:
- Path A end-to-end with real emails
- Path B end-to-end with real emails
- Negotiated track (offer → consent → assignment)
- Settlement notification → invoice settles → all parties emailed
- Click every money-adjacent screen: no claim that funds moved or a note was NSE-listed
- Confirm wallet/engine nav absent, demo helpers absent

**Only when all of the above passes is "Phase 1 go-live" a true statement.** That claim is tied to a payment milestone — do not make it early, and make sure it can be made on time.

---

## 8. Suggested sequence against the calendar

Phase 1 go-live is contractually targeted at **10 September 2026**. Working back from today (24 July):

| Window | Focus |
|--------|-------|
| Week 1 (now) | §2 workflow decision with operator · P0.1 secrets · P0.2 flags |
| Week 2 | P0.3 isolation · P0.4 authz · P0.7 demo stability |
| Weeks 3–4 | P0.5 commitment-to-pay · P0.6 settlement recording (the two contractual gaps) |
| Week 5 | P1.3 brand sweep · P1.4 states · P1.2 email reliability |
| Week 6 | P1.1 **pilot execution** with real orgs — this needs client scheduling, book it early |
| Week 7 | P1.5–P1.8 hardening, tests, backups, legal review · full §7 verification |
| 10 Sep | Phase 1 go-live claim |

**Book the pilot clients now.** P1.1 depends on the operator securing a corporate buyer and a large supplier for UAT; that is the item most likely to slip because it is not in your control.

---

## 9. Closing instruction

Do not rebuild. Do not claim bank rails or NSE. Lock §2 with the operator before touching workflow code. Then execute P0 → P1 in order, verifying each step on https://uzimax.onrender.com with real Resend emails.

Update `docs/IOU_EXCHANGE_FULL_SYSTEM_GUIDE.md` as items close, so the state doc stays true.

Also read alongside:
- `docs/IOU_EXCHANGE_CLAUDE_FINISH_GUIDE.md` (`IOUX-CLAUDE-FINISH-001`) — exhaustive inventory of what exists
- `docs/IOU_EXCHANGE_FULL_SYSTEM_GUIDE.md` — architecture & system truth
- `docs/IOU_EXCHANGE_PRODUCTION_GOLIVE.md` — earlier go-live checklist

---

*End of IOUX-COMPLETE-001.*
