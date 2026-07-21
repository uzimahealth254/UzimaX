# IOU Exchange

Working capital for pharmacy trade — portals + API for buyers, suppliers, and SPV.  
Product site: [www.ioux.africa](https://www.ioux.africa) · Portal: [app.ioux.africa](https://app.ioux.africa) · API: [api.ioux.africa](https://api.ioux.africa)

Architecture: [`docs/IOU_EXCHANGE_FULL_SYSTEM_GUIDE.md`](docs/IOU_EXCHANGE_FULL_SYSTEM_GUIDE.md) · Go-live: [`docs/IOU_EXCHANGE_PRODUCTION_GOLIVE.md`](docs/IOU_EXCHANGE_PRODUCTION_GOLIVE.md) · API: [`docs/openapi.yaml`](docs/openapi.yaml)

## Local development

```bash
docker compose up -d
cp .env.example .env
npm install
npm run db:setup          # schema + LOCAL demo seed only
npm run dev:api           # :8787
npm run dev               # :5173
```

Local demo accounts come from `npm run db:seed` (password = `DEMO_PASSWORD` in `.env`).  
**Never run `db:seed` against production / Supabase** — it refuses unless `ALLOW_PROD_SEED=1`.

## Production (ioux.africa)

### Hosts

| Surface | URL |
|---------|-----|
| Marketing website | `https://www.ioux.africa` |
| Portal (login / roles) | `https://app.ioux.africa` |
| API | `https://api.ioux.africa` |

### Render **UzimaX** (API) Environment

| Key | Value |
|-----|--------|
| `EMAIL_PROVIDER` | `resend` |
| `RESEND_API_KEY` | from Resend |
| `EMAIL_FROM` | `IOU Exchange <no-reply@ioux.africa>` |
| `SUPPORT_EMAIL` | `hello@ioux.africa` |
| `PORTAL_URL` | `https://app.ioux.africa` |
| `CORS_ORIGINS` | `https://www.ioux.africa,https://ioux.africa,https://app.ioux.africa` |
| `ALLOW_DEMO_OTP` | `false` |
| `ENABLE_SIMULATED_WALLET` | `false` |
| `VITE_SHOW_DEMO` | `false` |
| `VITE_ENABLE_WALLET` | `false` |
| `VITE_ENABLE_ENGINE` | `false` |
| `COOKIE_SECURE` | `true` |

Portal build: `VITE_API_URL=https://api.ioux.africa`.

### First admin (no demo seed)

```bash
ADMIN_EMAIL=ops@ioux.africa ADMIN_PASSWORD='…strong…' npm run create-admin
```

If a local seed was ever applied to hosted DB:

```bash
ALLOW_PURGE_DEMO=1 DRY_RUN=1 npm run db:purge-demo   # inspect
ALLOW_PURGE_DEMO=1 npm run db:purge-demo             # delete seed users/orgs
```

### Production defaults (enforced in code)

| Setting | Value |
|---------|--------|
| `ALLOW_DEMO_OTP` | `false` |
| `ENABLE_SIMULATED_WALLET` | `false` |
| `ALLOW_BODY_REFRESH` | `false` |
| `COOKIE_SECURE` | `true` |
| `VITE_SHOW_DEMO` | `false` |

There is **no** client-side mock invoice store — portals load from the API only.
