# Uzima User Guide (demo)

Password for all demo users: **Uzima2026!**  
(Configurable via `DEMO_PASSWORD` when seeding.)

## Buyer (Kenya Breweries Corp)

1. Sign in as `buyer@uzima.co.ke`
2. **Post IOU** — capture an approved / confirmed payable against a supplier
3. Supplier is notified (in-app + email when configured)
4. Track status on **Invoice Register**
5. **Verification inbox** (`/buyer/verification` or `/buyer/verification-inbox`) — accept supplier-listed invoices
6. **Consent Inbox** — request OTP, then sign assignment consent when the SPV offer path requires it
7. **API Integration** — use an issued `X-API-Key` (printed once by `npm run db:seed`; never embedded in the SPA)

## Supplier (Savannah Steel)

1. Sign in as `supplier@uzima.co.ke`
2. **Opt-in Inbox** — Accept (assigns receivable to Uzima Capital SPV) or Decline with reason
3. **Post invoice** (`/supplier/post-invoice`) — supplier-originated path; buyer must verify before assignment
4. Respond to SPV offers under **My Invoices**

## SPV (Uzima Capital SPV)

1. Sign in as `spv@uzima.co.ke`
2. **IOU Registry** — search / open IOU detail & status history
3. **Assignments** — `opt_in_auto`, `offer_consent`, and `supplier_originated_auto`
4. **Offers** — tenor-based purchase engine (programme discount bands enforced)
5. **Escrow** — release disbursement / mark collection
6. **Packaging** & **NSE Listing** — capital-markets path (`nseReference` on list)

## Admin

1. Sign in as `admin@uzima.co.ke`
2. **Programmes** — hard facility, tenor, and discount-band limits
3. **Fees** — configure / deactivate fee schedules
4. **Reconciliation** — period match / variance / CSV export (`GET /admin/reconciliation`)
5. **Workflow / Analytics** — audit trail and portfolio metrics

## Local setup

```bash
docker compose up -d
cp .env.example .env
npm run db:setup
npm run dev:api   # :8787
npm run dev       # :5173
```

## API

- OpenAPI: `docs/openapi.yaml`
- Base URL: `http://localhost:8787/api/v1`
- Portal JWT: `Authorization: Bearer <accessToken>`
- Machine: `X-API-Key: <key>` (AfyaX / buyer ERP)
- Demo API keys: printed by seed only — rotate before production
