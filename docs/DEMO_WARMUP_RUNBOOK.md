# Demo warm-up runbook (IOUX-COMPLETE-001 P0.7)

Live URL: https://uzimax.onrender.com

## Before any client demo

1. **Paid Render instance** preferred — free tier cold starts look like an outage.
2. Hit the site once ~2 minutes early to wake the service.
3. Confirm `GET /api/v1/health` returns 200.
4. Confirm production flags on Render (P0.2):
   - `NODE_ENV=production`
   - `COOKIE_SECURE=true`
   - `ALLOW_DEMO_OTP=false`
   - `ALLOW_BODY_REFRESH=false`
   - `ENABLE_SIMULATED_WALLET=false`
   - `VITE_SHOW_DEMO=false` (requires rebuild if changed)
5. Log in as `ops@ioux.africa` (rotated password).
6. Walk one **standard confirmation** path (buyer post → supplier opt-in → assigned).
7. Walk one **negotiated offer** path (offer → supplier accept → buyer OTP → assigned).
8. Confirm invite email: create a throwaway invite and check `emailSent` in the API response.

## If cold start fails

- Manual Deploy on the UzimaX service.
- Check Render logs for DB / Redis connection errors.
- Re-apply schema SQL if columns are missing (`npm run db:apply:sql -- supabase/migrations/20260724180000_commitment_ack_standing_order.sql` against hosted `DATABASE_URL`).
