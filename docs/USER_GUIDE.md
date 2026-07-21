# IOU Exchange — local / demo environments only

**Do not use these credentials on production.** Production is invite-only via Admin → Invite / `npm run create-admin`.

Password for **local** seeded users (`npm run db:seed`, from `DEMO_PASSWORD`): see your local `.env`.

## Buyer

1. Sign in as `buyer@ioux.africa` (local seed only)
2. **Post IOU** — capture an approved / confirmed payable against a supplier
3. Supplier is notified (in-app + email when configured)
4. Track status on **Invoice Register**
5. **Verification inbox** — accept supplier-listed invoices
6. **Consent Inbox** — request OTP, then sign assignment consent when required
7. **API Integration** — use an issued `X-API-Key` (printed once by local seed; never embed in the SPA)

## Supplier

1. Sign in as `supplier@ioux.africa` (local seed only)
2. **Opt-in Inbox** — Accept or Decline
3. **Post invoice** — supplier-originated path; buyer must verify before assignment
4. Respond to SPV offers under **My Invoices**

## SPV

1. Sign in as `spv@ioux.africa` (local seed only)
2. **IOU Registry** — search / open IOU detail & status history
3. **Assignments** — `opt_in_auto`, `offer_consent`, and `supplier_originated_auto`
4. **Offers** — tenor-based purchase engine (programme discount bands enforced)
5. **Escrow** — mark disbursement / collection **recorded** (simulated ledger; partner settles cash)
6. **Packaging** — listing readiness (not an NSE listing confirmation)

## Admin

1. Sign in as `admin@ioux.africa` (local seed) or your production `create-admin` user
2. **Programmes** — hard facility, tenor, and discount-band limits
3. **Fees** — configure / deactivate fee schedules
4. **Reconciliation** — period match / variance / CSV export
5. **Workflow / Analytics** — audit trail and portfolio metrics

## Local setup

```bash
docker compose up -d
cp .env.example .env
npm install
npm run db:setup
npm run dev:api
npm run dev
```

Production: see `docs/IOU_EXCHANGE_PRODUCTION_GOLIVE.md`. Never `db:seed` on hosted DB.
