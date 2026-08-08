# IOU Exchange — demo accounts

Password: `DEMO_PASSWORD` (default **`Uzima2026!`**).

Demo organisations use **anonymous labels** (Insurance A/B, Pharmacy 1–5, Hospital 1–5, Wholesaler 1–2, Corporate 1–2, Supplier 1–6) — no real brand names.

| Role | Email | Org | Password |
|------|--------|-----|----------|
| Admin | `admin@ioux.africa` | IOU Exchange Platform | `Uzima2026!` |
| Buyer | `buyer@ioux.africa` | Insurance A | `Uzima2026!` |
| Buyer | `buyer2@ioux.africa` | Insurance B | `Uzima2026!` |
| Buyer | `buyer3@ioux.africa` | Corporate 1 | `Uzima2026!` |
| Supplier | `supplier@ioux.africa` | Supplier 1 | `Uzima2026!` |
| Supplier | `supplier2@ioux.africa` | Supplier 2 | `Uzima2026!` |
| Supplier | `supplier3@ioux.africa` | Supplier 3 | `Uzima2026!` |
| SPV | `spv@ioux.africa` | IOU Exchange Capital SPV | `Uzima2026!` |

## Local Docker

```bash
npm run db:seed
```

Rich seed includes pharmacies/hospitals with wholesaler + insurer relationship samples, programmes, fees, etc.

Portal: `http://localhost:5173/login` · API: `http://localhost:8787`

## Live (hosted)

Same emails/password work on **https://uzimax.onrender.com/login**.

Accounts are upserted (no wipe) with:

```bash
ALLOW_PROD_DEMO_ACCOUNTS=1 npm run db:ensure-demo
```

(Uses `.env.render` `DATABASE_URL`.) Does **not** replace `ops@ioux.africa`.

**Note:** Full wipe + reseed on hosted requires `ALLOW_PROD_SEED=1` (destructive; ask first).
