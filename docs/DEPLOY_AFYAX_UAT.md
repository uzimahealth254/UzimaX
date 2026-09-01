# Deploy IOUX sandbox for AfyaX UAT

**Date:** 1 September 2026

---

## Pre-deploy checklist

- [ ] Supabase / Postgres `DATABASE_URL` on Render
- [ ] `REDIS_URL` connected
- [ ] `RESEND_API_KEY` for invite emails
- [ ] `JWT_SECRET` + `JWT_REFRESH_SECRET` generated
- [ ] `AFYAX_WEBHOOK_SECRET` set (inbound payments from AfyaX)
- [ ] `IOUX_WEBHOOK_SECRET` set (if using lifecycle envelope mode)
- [ ] AfyaX env vars on API service (see below)

---

## Render services (from `render.yaml`)

| Service | URL (update after deploy) |
|---------|---------------------------|
| API | `https://uzima-api.onrender.com` or custom `https://api.ioux.africa` |
| Portal | `https://app.ioux.africa` |

---

## AfyaX env vars (API service)

```env
AFYAX_PLATFORM_NAME=AfyaX
AFYAX_PLATFORM_ORG_ID=422eb159-f7a4-467d-a226-7ef3bc394780
AFYAX_PLATFORM_PARTY_ID=UZ-PLT-W6F7P5
AFYAX_PLATFORM_API_KEY=<same key issued in admin>
AFYAX_SANDBOX_BASE_URL=https://manager.smplystore.com
AFYAX_PRODUCTION_BASE_URL=https://vendor.afyax.health
AFYAX_DEFAULT_PAYMENT_METHOD=bank
IOUX_WEBHOOK_SECRET=<from Integrations page>
AFYAX_WEBHOOK_SECRET=<share with Sule for payment-update>
```

After deploy, run on API (or locally against prod DB):

```bash
npm run configure:afyax
```

---

## Post-deploy steps

1. **Health:** `GET https://<api-host>/api/v1/health` → `status: ok`
2. **Admin login** → Integrations → verify AfyaX URLs saved
3. **Share with Sule:**
   - `IOUX_API_BASE_URL=https://<api-host>/api/v1`
   - API key (secure channel)
   - `docs/AFYAX_INTEGRATION_API.md`
4. **Ask Sule to whitelist** Render outbound IP for `manager.smplystore.com`
5. **Joint UAT:** AfyaX pushes org + IOU → supplier opt-in → assignment → verify AfyaX receives purchase webhook

---

## Send Sule after deploy (WhatsApp template)

> Hi Sule — IOUX sandbox API is live.
>
> **Base URL:** `https://<api-host>/api/v1`  
> **API key:** _(secure channel)_  
> **Payment webhook secret (AfyaX→IOUX):** _(secure channel)_
>
> Full doc attached: `AFYAX_INTEGRATION_API.md`
>
> We've configured your purchase webhook: `https://manager.smplystore.com/api/v1/iou/purchase`  
> Please whitelist our server IP: `<Render IP>`  
>
> A few clarifications in `SULE_CLARIFICATIONS.md` — especially lifecycle webhook URL for `iou.created` / `payment_updated`.

---

## Local → production note

Local `.env` uses `http://localhost:8787`. Sule cannot call localhost — **deploy is required** before his AfyaX staging can connect.
