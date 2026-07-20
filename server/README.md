# Uzima API (Express + Postgres)

Primary entry: `server/index.ts` (`npm run dev:api` / `npm run start:api`)

Legacy mock store (`store.js`, `index.js`, JSON dual-store) has been removed.

## Endpoints (prefix `/api/v1`)

- Auth: `/auth/login`, `/refresh`, `/logout`, `/me`, `/forgot-password`, `/reset-password`
- Invoices dual origination, opt-ins, buyer-verifications, assignments
- AfyaX: `/parties`, `/external/invoices`, `/webhooks/payment-update`
- Wallets, escrow, fees, programmes, packages, documents, signatories, consents (+OTP)
- Admin: `/admin/analytics`, `/admin/users`, `/admin/audit`

See `docs/openapi.yaml` and `docs/UZIMA_ARCH_001.md`.
