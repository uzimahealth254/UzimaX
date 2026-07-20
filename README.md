# Uzima Platform (production architecture)

Trade receivables / securitisation platform for **UzimaX**.  
Engineering reference: `docs/UZIMA_ARCH_001.md`

## Quick start

```bash
# 1. Postgres
docker compose up -d

# 2. Env
cp .env.example .env

# 3. Schema + seed
npm install
npm run db:setup

# 4. API + portal (two terminals)
npm run dev:api
npm run dev
```

- Portal: http://localhost:5173  
- API: http://localhost:8787  

## Demo accounts

Password: **`Uzima2026!`**

| Role | Email |
|------|--------|
| Buyer | buyer@uzima.co.ke |
| Supplier | supplier@uzima.co.ke |
| SPV | spv@uzima.co.ke |
| Admin | admin@uzima.co.ke |

### API keys (seed)

- Buyer: `uzima_buyer_kbc_demo_7f3a9c2e`
- AfyaX: `uzima_afyax_demo_key_9c2e1b7f`

## Architecture

- **Postgres** single source of truth (Drizzle ORM)
- **JWT** auth + **API keys** for AfyaX
- **Dual origination:** buyer post → opt-in · supplier post → buyer verify
- **Wallets:** simulated ledger (no live bank rails)
- Portal uses **react-query** against the API (no in-memory seed business state)

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run db:migrate` | Push schema |
| `npm run db:seed` | Seed demo data |
| `npm run dev:api` | API on :8787 |
| `npm run dev` | Vite portal |
| `npm run build` | Production portal build |
| `npm run smoke` | Critical-path API smoke (`scripts/smoke-uzima.ts`) |

## Deploy

See `render.yaml` (`uzima-api` + `uzima-portal` + `uzima-db`).
