# IOU Exchange — Production Go-Live Guide

**Document:** `IOUX-GOLIVE-001`
**For:** Cursor (and any engineer taking IOU Exchange from "built" to "live in production")
**Grounded in:** `IOUX-SYS-GUIDE-001` (current system state) + the agreed workplan `UZIMA-SYS-PLAN-001 v1.6`
**Codebase:** `c:\Users\Admin\Downloads\CPF`
**Date:** 21 July 2026

---

## How to use this document

The system is **already built** — marketing site, four portals, dual origination, Express + Postgres (Drizzle), JWT auth, AfyaX webhook stubs, 26 tables, full `/api/v1` surface. This guide is **not** a build-from-scratch plan. It is the **ordered checklist to close the gap between "works on localhost" and "safe in production."**

Work top to bottom. Each task says exactly what to do, which file(s), and the acceptance test. Do **P0 (Blockers)** before any real user touches the system. Do **P1 (Launch-quality)** before the client demo / go-live. **P2 (Post-launch)** can follow the first deploy.

**Ground rules (from the system guide — do not violate):**
- User-facing brand is **IOU Exchange** (use `BRAND` from `src/lib/brand.ts`). Internal `uzima_*` infra IDs (cookie `uzima_rt`, `.uzima-site`, Render service names, `uzima_party_id`) **stay** — renaming them is a migration, not a find-replace.
- **Never** claim bank rails, live NSE listing, or licensed money movement in any copy. Wallets/escrow are simulated; NSE is a UI path only.
- Prefer **edit over rebuild**. Extend `server/services/core.ts` + schema migrations, not parallel stores.
- Wallet/engine stay behind `VITE_ENABLE_WALLET` / `VITE_ENABLE_ENGINE`; demo OTP off in prod; cookies secure over HTTPS.

---

## Status tracker

| ID | Item | Status |
|----|------|--------|
| P0.1 | Lock production env file | Done — `.env.production.example` + hardened `assertSecurityConfig` |
| P0.2 | Rotate / secure secrets | Ops — secrets gitignored; rotate in Render before go-live |
| P0.3 | No demo data in prod + create-admin | Done — seed refuses prod/hosted; `npm run create-admin` |
| P0.4 | CORS + cookie scope | Done — CORS allow-list required in prod; cookie HttpOnly/Secure/path scoped |
| P0.5 | RLS + cross-tenant test | Done — `npm run test:cross-tenant` (run `db:rls` on prod) |
| P0.6 | Webhook signature enforced | Done — required secret in prod; rejects + logs bad/missing sig |
| P0.7 | Mutating routes authz | Done — `npm run test:authz` |
| P1.1 | Honesty pass (escrow/NSE/wallet) | Done — simulated labels + toasts; packaging ref labelled |
| P1.2 | Live email E2E | Ops — needs Resend/SMTP keys + verified domain |
| P1.3 | Real admin onboarding | Ready — invite + `PasswordChangeGate`; create-admin for day 0 |
| P1.4 | Dual origination smoke | Ready — `smoke:dual` + commitment/standing-order fields |
| P1.5 | Settlement-agent recording | Done — webhook → installments + settled + SPV notify |
| P1.6 | Programme hard limits | Already enforced via `assertProgrammeAllows` on post |
| P1.7 | Empty/loading/error states | Partial — opt-in/verification/escrow have designed empties |
| P1.8 | Backups + monitoring | Ops — Supabase backups + `/health` + `/system/health` |
| P1.9 | Custom domain + HTTPS | Ops — DNS + Render custom domains |
| P1.10 | Legal pages final | In progress — UzimaX operator + dated 21 Jul 2026; **advocate review still required** |

---

## P0 — Blockers (must be done before production data exists)

### P0.1 — Lock the production environment file
**Why:** The single biggest go-live risk is a prod deploy running with dev flags on.
**Do:** Create `.env.production` (never committed) with the honesty/security posture forced:
```
NODE_ENV=production
COOKIE_SECURE=true
ALLOW_DEMO_OTP=false
ALLOW_BODY_REFRESH=false
VITE_SHOW_DEMO=false
VITE_ENABLE_WALLET=false
VITE_ENABLE_ENGINE=false
ENABLE_SIMULATED_WALLET=false
ALLOW_PROD_SEED       # leave UNSET — never 1 in prod
```
Plus real values for `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, `VITE_API_URL`, `PORTAL_URL`, `AFYAX_WEBHOOK_SECRET`.
**Acceptance:** `NODE_ENV=production npm run build` succeeds; grep the built bundle for `Uzima2026`, demo emails, and OTP hints → **zero** hits.

### P0.2 — Rotate and secure all secrets
**Why:** `JWT_SECRET`, `JWT_REFRESH_SECRET`, `AFYAX_WEBHOOK_SECRET`, `DEMO_PASSWORD` may exist in `.env.example` or git history.
**Do:** Generate fresh 64-char secrets for prod; store in Render's secret manager (not in `render.yaml`). Confirm `.env*` (except `.env.example`) is git-ignored. If any real secret ever hit git history, rotate it.
**Acceptance:** `git log -p | grep -iE "secret|password|key ="` shows no live secrets; Render dashboard holds them as secret env vars.

### P0.3 — No demo data / demo auth in production
**Why:** `db:seed` creates `admin@ioux.africa` etc. with `DEMO_PASSWORD`. Those are public knowledge.
**Do:** Confirm `db:seed` refuses hosted Supabase without `ALLOW_PROD_SEED=1` (guide says it does — verify). Create the **real** first admin via a one-off secure script or a guarded `create-admin` command that reads a strong password from env, not the seed. Remove/disable all `*@ioux.africa` demo accounts on the prod DB.
**Acceptance:** Prod DB `users` table contains only real, intended accounts; none use `DEMO_PASSWORD`.

### P0.4 — CORS + cookie scope locked to real origins
**Why:** Wide-open CORS or a loosely-scoped refresh cookie is an account-takeover vector.
**Do:** Set `CORS_ORIGINS` to exactly the marketing + portal origins (e.g. `https://www.ioux.africa`, `https://app.ioux.africa`). Confirm refresh cookie `uzima_rt` is `HttpOnly`, `Secure`, `SameSite=Strict|Lax`, path `/api/v1/auth`. Verify `ALLOW_BODY_REFRESH=false` in prod so refresh only works via the cookie.
**Files:** `server/index.ts` (CORS), `server/middleware/auth.ts`, `server/lib/security.ts`.
**Acceptance:** A cross-origin `fetch` from a non-listed origin is blocked; refresh works only with the cookie.

### P0.5 — RLS actually applied and enforced on the prod DB
**Why:** Multi-tenant isolation is the core security property — one org must never read another's invoices.
**Do:** Run `npm run db:rls` against prod. Then **test it**: as buyer org A's token, attempt to `GET /api/v1/invoices/:id` for an invoice belonging to org B → must 403/empty. Repeat for opt-ins, consents, assignments, wallets, documents.
**Files:** `server/db/sql/rls.sql`, `apply-rls.ts`.
**Acceptance:** A written cross-tenant read test (add to `scripts/`) passes: every tenant table denies cross-org reads.

### P0.6 — Webhook signature verification is enforced, not optional
**Why:** `POST /webhooks/payment-update` moves money-state (marks things paid/settled). An unsigned or forgeable webhook corrupts the ledger.
**Do:** Confirm the AfyaX webhook rejects any request whose HMAC (using `AFYAX_WEBHOOK_SECRET`) doesn't match. Reject on missing/invalid signature with 401. Log rejections.
**Files:** webhook handler in `server/routes/api.ts`, `AFYAX_WEBHOOK_SECRET` usage.
**Acceptance:** A payment-update POST with a bad/absent signature is rejected; a correctly-signed one succeeds and updates `payment_updates`.

### P0.7 — Every mutating route is authenticated + authorised
**Why:** Client-side route guards (`ProtectedRoute`) don't protect the API.
**Do:** Audit `server/routes/api.ts`: every non-public route runs the JWT middleware AND a role check. Public routes are only: health, login, forgot/reset, and signature-verified webhooks. External invoice/party endpoints require a valid **API key** (org-scoped, hashed).
**Acceptance:** A written test hits each domain route without a token → 401; with a wrong-role token → 403.

---

## P1 — Launch-quality (before the client demo / public go-live)

### P1.1 — Honesty pass on all simulated capabilities
**Why:** The one reputational risk that matters in a finance product is a user believing money moved.
**Do:** Across Escrow, Wallet (if ever shown), and Packaging/NSE:
- Escrow action buttons read "Mark disbursed (simulated)" / "Record collection (simulated)"; persistent banner: *"No funds move through IOU Exchange; disbursement and collection are executed by the settlement partner."*
- NSE/packaging shows "Listing readiness" statuses; `nse_reference` labelled "internal reference — not an exchange listing."
- Success toasts state the **system** action ("Escrow leg recorded"), never the real-world one ("Supplier paid").
- Marketing + FAQ + footer keep the "not a bank / no money transmission" lines.
**Acceptance:** A reviewer clicking through every money-adjacent screen cannot find a claim that real money moved or a note was listed on NSE.

### P1.2 — Live email, verified end-to-end
**Why:** Invite, forgot-password, and OTP all depend on email. Stub email = users can't onboard or sign.
**Do:**
1. In [Resend](https://resend.com): add + verify domain `ioux.africa` (SPF/DKIM/DMARC). Create an API key.
2. On Render → **uzima-api** → Environment, set:
   - `EMAIL_PROVIDER` = `resend`
   - `RESEND_API_KEY` = your key
   - `EMAIL_FROM` = `IOU Exchange <no-reply@ioux.africa>`
   - `PORTAL_URL` = `https://app.ioux.africa` (or current portal URL)
   - `SUPPORT_EMAIL` = `hello@ioux.africa`
3. Redeploy the API. Send yourself: invite, password reset, consent OTP. Confirm links use `PORTAL_URL`.
**Files:** `server/services/email.ts`, `render.yaml`, `server/templates/emails/` (preview: `npm run emails:preview`).
**Acceptance:** Invite / reset / OTP arrive in a real inbox with working links and IOU Exchange branding.

### P1.3 — Real admin onboarding flow works
**Why:** Day one, an admin must create the first orgs and users.
**Do:** As the real admin: create a buyer org, a supplier org, an SPV org (with KYC fields + document upload), then invite a user into each. Confirm the invite email sends a temp password and first login forces a password change (`PasswordChangeGate`).
**Files:** `AdminProfilePage`/`UsersPage`, `POST /admin/users/invite`.
**Acceptance:** A freshly invited user logs in, is forced to reset, and lands on their role home.

### P1.4 — Both origination paths pass the smoke test on prod-like data
**Why:** This is the core product; it must work end-to-end on the real DB, not just seed.
**Do:** Run `npm run smoke:dual`. Then manually: (A) buyer posts IOU → supplier opt-in → assignment visible to SPV; (B) supplier posts invoice → buyer verification → assignment. Confirm commitment-to-pay capture and the bank-standing-order reference field are recorded on the instrument (per workplan v1.6).
**Files:** `server/services/core.ts` (`createBuyerOriginatedInvoice`, `createSupplierOriginatedInvoice`), `scripts/smoke-dual-origination.ts`.
**Acceptance:** Both paths complete; `invoice_status_history` shows the full trail; SPV sees the assignment.

### P1.5 — Settlement-agent recording flow is correct
**Why:** Per the agreed workplan, settlement is executed by a settlement agent; the system **records completion**, it doesn't move money.
**Do:** Confirm the payment-update webhook path updates installment status, refreshes SPV position, and on zero balance transitions the invoice → `settled` and records transaction closure. The escrow legs are the visibility layer, correctly labelled simulated.
**Acceptance:** Posting a full-repayment webhook flips the invoice to settled and notifies the SPV; no UI implies IOU Exchange moved the cash.

### P1.6 — Programme limits enforced server-side
**Why:** The audit flagged programmes as soft warnings; a real credit platform must hard-block over-limit posts.
**Do:** In the invoice-post path, check the relevant programme's exposure/tenor/discount-band limits server-side and **reject** an over-limit submission (not just warn).
**Files:** `server/services/core.ts`, `ProgramsPage`, `programmes` table.
**Acceptance:** Posting an invoice that exceeds a programme's exposure is rejected with a clear error.

### P1.7 — Empty, loading, and error states everywhere
**Why:** Perceived quality. Every React Query surface needs skeletons, error+retry, and a designed empty state that doubles as onboarding.
**Do:** Sweep the portal pages (inboxes, registries, lists). Empty Opt-in Inbox → "When a buyer posts an invoice naming you, it appears here to sell." Empty Buyer Verification → the mirror. Add skeleton loaders and error-retry to every `useQuery`.
**Acceptance:** Every list/inbox shows a designed empty state; no raw spinner-only or blank screens.

### P1.8 — Backups + monitoring on the prod DB
**Why:** A finance ledger with no backup is a liability.
**Do:** Confirm the hosted Postgres (Supabase/Render) has automated daily backups + point-in-time recovery on. Add basic uptime monitoring on `GET /health` and error alerting on the API. Confirm `GET /system/health` (admin) reports DB reachable, last webhook received.
**Acceptance:** A backup exists and a test restore is understood; health endpoint monitored with alerting.

### P1.9 — Custom domain + HTTPS end-to-end
**Why:** `ioux.africa` must serve the marketing site and route the portal + API over HTTPS with valid certs.
**Do:** Point DNS: marketing at `www.ioux.africa`, portal at `app.ioux.africa` (or chosen), API at `api.ioux.africa`. Set `VITE_API_URL`, `PORTAL_URL`, `CORS_ORIGINS` accordingly. Verify certs and that cookies are `Secure`.
**Acceptance:** All three surfaces load over HTTPS on the real domain; login → refresh → protected route works cross-subdomain.

### P1.10 — Legal pages final and dated
**Why:** Privacy + Terms are live-facing legal documents.
**Do:** Confirm `/privacy` and `/terms` render, carry the correct entity name (UzimaX as operator, IOU Exchange as the platform), real contact emails, and the not-a-bank framing. **Have a Kenyan advocate review both before public launch** (flagged, not optional).
**Acceptance:** Both pages final, dated, reviewed; footer links resolve.

---

## P2 — Post-launch (after first production deploy)

- **P2.1 — API docs published.** Ensure `docs/openapi.yaml` is current and a Postman collection / sample client exists for AfyaX and external buyers.
- **P2.2 — Buyer credit-risk profiles** (`GET /buyers/:orgId/credit-risk`) surfaced in SPV/investor views; feeds pricing bands. (Workplan Phase 2.)
- **P2.3 — Packaging → listing readiness** polish: package from assigned pool, reconciliation reports, "ready for submission" status. (Phase 2.)
- **P2.4 — Reconciliation reports** (escrow vs payments variance) exportable to CSV.
- **P2.5 — Admin analytics** computed from real DB aggregates (verify no seed-derived figures remain).
- **P2.6 — Retire orphan page files** (`ListingReadinessPage`, `BuyerApiPage`, `PaymentSchedulePage`, `ListInvoicePage`, `TradeHistoryPage`, standalone `Faq/Docs/Contact/Security`) unless a product reason revives them.
- **P2.7 — Rate-limit tuning** on auth and webhook endpoints (Redis-backed) once real traffic patterns are known.

---

## Explicitly NOT in scope (hold the line — these are change orders)

Per the agreed workplan and the system guide, do **not** build these without separate scope + funding:
- Live bank rails / real disbursement / M-Pesa / Pesalink / RTGS
- Real NSE / exchange integration
- External KYC verification vendors (eCitizen / KRA / PPB API checks)
- Per-buyer ERP adapters (the generic external invoice API is the boundary)
- MFA / SSO / Keycloak on login (consent OTP stays; that's different)
- BI / data-warehouse export

If the client asks for any of these, it is a new phase with its own budget and — for money movement — its own licensing and compliance burden on UzimaX, not on the build.

---

## Go-live runbook (the actual sequence on deploy day)

1. **Provision infra:** hosted Postgres + Redis; confirm backups on.
2. **Set all prod secrets** in Render's secret store (P0.2).
3. **Deploy API** (`uzima-api`) with `.env.production` values; run `db:migrate` then `db:rls`.
4. **Create the real admin** via the guarded script (P0.3) — not seed.
5. **Deploy portal + marketing** (`uzima-portal`) with prod `VITE_*` values.
6. **Point DNS + verify HTTPS** on all three surfaces (P1.9).
7. **Verify email** (send invite/reset/OTP to a real inbox) (P1.2).
8. **Run the go-live smoke:** login → post IOU → opt-in → assignment (both paths); one signed webhook → settled.
9. **Run the cross-tenant security test** (P0.5) and the auth test (P0.7).
10. **Confirm honesty pass** — click every money-adjacent screen (P1.1).
11. **Turn off** demo/wallet/engine flags; confirm `VITE_SHOW_DEMO=false`.
12. **Admin onboards the first real orgs + users.** You're live.

---

## The single most important pre-launch check

Before anyone real logs in, one person should sit down and, in the production environment, try to: (a) read another org's data with a valid token, (b) hit a mutating API route with no token, (c) post a forged payment webhook, and (d) find any screen that claims money moved or a note was NSE-listed. If all four fail to get through, the system is safe to open. If any succeed, that's a P0 stop-ship.

---

*End of IOUX-GOLIVE-001. This is the go-live checklist for the system described in IOUX-SYS-GUIDE-001. The codebase is the source of truth; if a task here is already done, tick it and move on. Update the system guide as you close items.*
