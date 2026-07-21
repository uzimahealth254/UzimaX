# Uzima — UZIMA-ARCH-001 Completion Checklist

**Date:** 21 July 2026  
**Authority:** `docs/UZIMA_ARCH_001.md`

## Phase 0 — Foundation

| # | Task | Status |
|---|------|--------|
| 0.1 | Postgres tables (§3) | Done |
| 0.2 | Drizzle schema + migrate | Done |
| 0.3 | Seed script | Done |
| 0.4 | JWT auth (login/refresh/logout/forgot/reset) | Done |
| 0.5 | API key auth + scopes | Done |
| 0.6 | Audit log (app middleware + optional DB triggers) | Done |
| 0.7 | S3/R2 + local storage | Done |

## Phase 1 — Dual origination

| # | Task | Status |
|---|------|--------|
| 1.1–1.2 | Buyer + supplier invoice create | Done |
| 1.3–1.4 | Opt-in + buyer verification | Done |
| 1.5 | Three assignment types | Done |
| 1.6–1.8 | IOU IDs, status history, in-app notifications | Done |
| 1.9 | react-query (no DataContext) | Done |
| 1.10–1.12 | Supplier post, buyer verification UI, JWT auth UI | Done |

## Phase 2 — Integrations / wallets / fees

| # | Task | Status |
|---|------|--------|
| 2.1 | Party registration API | Done |
| 2.2 | Payment update webhook | Done |
| 2.3 | Installment schedules | Done |
| 2.4 | Wallet simulation | Done |
| 2.5–2.6 | Fee CRUD + ledger (assignment + per-payment) | Done |
| 2.7–2.9 | Offers, OTP consent (signatory-gated), escrow | Done |
| 2.10–2.11 | Documents + signatories | Done |
| 2.12 | PDFs (purchase note, assignment letter, receipt, package summary) | Done |
| 2.13 | Email + SMS (Resend/SMTP / Africa's Talking or stub) | Done |
| 2.14–2.16 | Wallet / payment history / documents UI | Done |
| 2.17 | OpenAPI | Done (`docs/openapi.yaml`) |

## Phase 3 — Packaging / hardening

| # | Task | Status |
|---|------|--------|
| 3.1 | Programme hard limits | Done |
| 3.2 | Buyer credit risk | Done |
| 3.3–3.4 | Packages + NSE reference workflow | Done |
| 3.5–3.6 | Reconciliation + analytics | Done |
| 3.7 | Redis rate limiting (required in production) | Done |
| 3.8–3.10 | CORS, sanitisation, authorize() | Done |
| 3.11 | Unit + integration tests | Done |
| 3.12 | Render deploy blueprint | Done |

## Appendix A audit gaps

| Item | Status |
|------|--------|
| Dual store removed | Done |
| Auth on routes | Done |
| react-query | Done |
| Server authorize | Done |
| Tests | Done |
| OpenAPI | Done |
| Consent OTP + signatory | Done |
| Programmes enforced | Done |
| Assignment types | Done |
| Redis-backed rate limit | Done (prod-required) |
| RLS SQL policies | Done (`npm run db:rls`) |

## AfyaX contract (§5.2)

| Endpoint | Status |
|----------|--------|
| `POST /api/v1/parties` | Done |
| `POST /api/v1/invoices` (API key) | Done (+ `/external/invoices` alias) |
| `POST /api/v1/webhooks/payment-update` | Done |
| `GET /api/v1/parties/:id` | Done |
| `GET /api/v1/invoices/:id/status` (API key) | Done |

## Ops

| Item | Status |
|------|--------|
| `.env.example` (Appendix C) | Done |
| `render.yaml` (API + portal + Postgres + Redis + S3/email/SMS env) | Done |
| Docker Compose Postgres 15 + Redis 7 | Done |

## Explicit out of scope (ARCH)

- Live bank rails / licensed payment processor
- Rebuilding AfyaX itself
- Keycloak (JWT is the v1 choice)
- Live NSE market integration (reference workflow only)
