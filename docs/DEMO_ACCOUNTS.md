# IOU Exchange — demo accounts

Password: `DEMO_PASSWORD` (default **`Uzima2026!`**).

| Role | Email | Password |
|------|--------|----------|
| Admin | `admin@ioux.africa` | `Uzima2026!` |
| Buyer (KBC) | `buyer@ioux.africa` | `Uzima2026!` |
| Buyer (Safaricom) | `buyer2@ioux.africa` | `Uzima2026!` |
| Buyer (Twiga) | `buyer3@ioux.africa` | `Uzima2026!` |
| Supplier (Savannah) | `supplier@ioux.africa` | `Uzima2026!` |
| Supplier (Highland) | `supplier2@ioux.africa` | `Uzima2026!` |
| Supplier (Nairobi Tech) | `supplier3@ioux.africa` | `Uzima2026!` |
| SPV | `spv@ioux.africa` | `Uzima2026!` |

## Local Docker

```bash
npm run db:seed
```

Rich seed includes ~45 IOUs across statuses, programmes, fees, etc.

Portal: `http://localhost:5173/login` · API: `http://localhost:8787`

## Live (hosted)

Same emails/password work on **https://uzimax.onrender.com/login**.

Accounts are upserted (no wipe) with:

```bash
ALLOW_PROD_DEMO_ACCOUNTS=1 npm run db:ensure-demo
```

(Uses `.env.render` `DATABASE_URL`.) Does **not** replace `ops@ioux.africa`.

**Note:** Live may have little sample invoice data until you create IOUs or run a fuller seed intentionally (`ALLOW_PROD_SEED=1` — destructive; ask first).
