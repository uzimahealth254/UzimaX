# Operator go-live checklist (IOUX-FULL-FINISH-001 Horizon A)

Engineer-owned code for Horizons A–B is shipping in `main`. **These items only the operator can finish.**

## Critical path (do this week)

- [ ] **WS-01** Manual Deploy UzimaX on Render from latest `main`
- [ ] **WS-02** Rotate all exposed secrets (`docs/SECRETS_ROTATION.md`); delete `scripts/.tmp-ops-secrets.json`
- [ ] **WS-03** Confirm production flags on Render; redeploy if any `VITE_*` changed
- [ ] **WS-06** Paid always-on Render **or** uptime pinger + warm-up runbook
- [ ] **WS-12** Book pilot corporate buyer + large supplier (longest lead time)
- [ ] **WS-13** Confirm Supabase backups/PITR; commission Kenyan advocate for Privacy/Terms

## After secrets + deploy

```bash
curl -s https://uzimax.onrender.com/api/v1/health
API_URL=https://uzimax.onrender.com/api/v1 DEMO_PASSWORD=<rotated> npm run smoke:tenant-isolation
API_URL=https://uzimax.onrender.com/api/v1 DEMO_PASSWORD=<rotated> npm run test:authz
DATABASE_URL=<hosted> npm run verify:db
```

## Answers still needed (from plan §11)

1. Always-on hosting vs warm-up only?
2. Custom domains now or defer?
3. Which pilot orgs / dates?
4. Named settlement agent + notify path?
5. Fee model rules?
6. Scope Phase 3 (Horizon C) commercially?
7. Advocate availability?

## Explicitly not unpaid engineering

Horizons **C** and **D** (live bank rails, real NSE, KYC vendors, MFA, full true-sale counsel packs) require change orders — see `docs/IOU_EXCHANGE_FULL_SYSTEM_FINISH_PLAN.md`.
