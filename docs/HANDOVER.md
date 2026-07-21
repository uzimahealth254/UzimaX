# Uzima Handover — UzimaX

**Product:** Uzima private-sector trade receivables / securitisation  
**Architecture:** UZIMA-ARCH-001  
**IP:** UzimaX  

## Stack

| Layer | Location |
|-------|----------|
| Portal (Vite + React + react-query) | `src/` |
| API (Express + Drizzle + Postgres) | `server/` |
| OpenAPI | `docs/openapi.yaml` |
| Deploy | `render.yaml` (`uzima-api`, `uzima-portal`, `uzima-db`) |

## Critical environment variables

| Var | Service | Purpose |
|-----|---------|---------|
| `DATABASE_URL` | API | Postgres connection |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | API | Auth signing (≥32 chars) |
| `CORS_ORIGINS` | API | `https://www.ioux.africa,https://ioux.africa,https://app.ioux.africa` |
| `VITE_API_URL` | Portal **build** | `https://api.ioux.africa` |
| `PORTAL_URL` | API | `https://app.ioux.africa` (links in emails) |
| `EMAIL_PROVIDER` + `RESEND_API_KEY` | API | OTP / invite email (not stub in prod) |
| `EMAIL_FROM` | API | `IOU Exchange <no-reply@ioux.africa>` |
| `AFYAX_WEBHOOK_SECRET` | API | Payment webhook HMAC |
| `REDIS_URL` | API | Optional distributed rate limits |
| `ALLOW_DEMO_OTP` | API | Must be `false` in production |

## Production checklist

1. Deploy from `render.yaml` or equivalent  
2. Schema applied (`drizzle-kit push` in API build)  
3. Run `npm run db:seed` **once**, then rotate API keys  
4. Configure Resend (or SMTP) for OTP delivery  
5. Confirm portal login works against live API  
6. Walk buyer IOU → supplier opt-in → SPV assignment  

## Demo walk (board)

1. Buyer posts IOU → Supplier opt-in → Assignment on SPV  
2. Admin → Workflow → Export audit CSV  
3. Admin → Reconciliation → period variance  
4. SPV → Packaging → NSE listing path  

## Local vs production

- Local: Docker Postgres + `ALLOW_DEMO_OTP=true` + seed password  
- Production: managed Postgres, demo OTP off, simulated wallets off, real email  
