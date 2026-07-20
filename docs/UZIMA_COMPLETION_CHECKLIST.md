# Uzima — Full Component Completion

**Date:** 20 July 2026

## Portal components (all live against API)

| Component / page | Status |
|------------------|--------|
| Auth + JWT refresh | Done |
| Dual origination (buyer/supplier) | Done |
| Opt-in + buyer verification | Done |
| Consent OTP signing | Done |
| Offers / packaging / NSE listing | Done |
| Escrow + assignment registry | Done |
| Wallet deposit/withdraw | Done |
| Documents upload | Done |
| Signatories | Done |
| Payment schedule (from DB) | Done |
| Payment history (AfyaX) | Done |
| Settlement engine (live data) | Done |
| Programmes CRUD | Done |
| Fees CRUD | Done |
| Admin analytics (DB) | Done |
| User invite | Done |
| Profile PATCH | Done |
| Credit risk on buyer profile | Done |

## Infra

| Item | Status |
|------|--------|
| Postgres 15 | docker-compose |
| Redis 7 | docker-compose |
| Local/S3 storage | Done |
| Email templates | Done |
| Tests + smoke | Pass |

## Brand

Portal chrome, meta tags, and copy use **Uzima** / **Uzima Capital SPV** (AFIX removed from `src/`).
