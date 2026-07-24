# Secrets rotation checklist (IOUX-COMPLETE-001 P0.1)

**Operator action required** — this repo must not store new live secrets.

## Rotate (in order)

1. **Admin password** for `ops@ioux.africa` — change via portal or `npm run create-admin`, then update Render env if any bootstrap scripts rely on it.
2. **`JWT_SECRET` / `JWT_REFRESH_SECRET`** — generate new values; set on Render; redeploy (all sessions invalidate).
3. **`RESEND_API_KEY`** — rotate in Resend dashboard; paste only into Render secret store.
4. **Supabase DB password** — rotate in Supabase; update `DATABASE_URL` on Render.
5. **`AFYAX_WEBHOOK_SECRET`** — rotate; update Render + settlement partner config.

## Cleanup

- Delete `scripts/.tmp-ops-secrets.json` locally if present.
- Confirm it is gitignored: `git check-ignore -v scripts/.tmp-ops-secrets.json`
- Confirm never in history: `git log --all -- scripts/.tmp-ops-secrets.json` (expect empty).

## Acceptance

- Old admin password fails login.
- No secret strings grep from the working tree.
- New values exist only in Render / operator password manager.
