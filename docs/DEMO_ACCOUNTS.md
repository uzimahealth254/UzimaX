# IOU Exchange — local demo accounts

**Local Docker only** (`npm run db:seed`). Password from `DEMO_PASSWORD` in `.env`.

| Role | Email | Password |
|------|--------|----------|
| Admin | `admin@ioux.africa` | `Uzima2026!` |
| Buyer | `buyer@ioux.africa` | `Uzima2026!` |
| Supplier | `supplier@ioux.africa` | `Uzima2026!` |
| SPV | `spv@ioux.africa` | `Uzima2026!` |

Also seeded: `supplier2@ioux.africa` · mock orgs (KBC, Safaricom, Savannah Steel…) · sample IOUs / opt-ins / wallets.

**Production admin** (hosted): `ops@ioux.africa` — not these demo accounts.

## Flows to try

1. **Buyer** — Post IOU → supplier opt-in  
2. **Supplier** — Opt-in inbox / post invoice  
3. **SPV** — Registry, offers, escrow (simulated legs)  
4. **Admin** — Users, programmes, analytics  

Portal: `http://localhost:5173/login` · API: `http://localhost:8787`
