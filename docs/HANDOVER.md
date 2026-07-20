# AFIX Handover Package — UzimaX

**Product:** AFIX private-sector trade receivables / securitisation  
**Plan:** AFIX-SYS-PLAN-001 · Phases 1–3 functional system  
**IP:** UzimaX upon payment for corresponding phases  

## Delivered stack

| Layer | Location |
|-------|----------|
| Portal (Vite + React) | `src/` |
| Buyer / ops API (Express) | `server/` |
| OpenAPI | `docs/openapi.yaml` |
| Postman | `docs/afix-buyer-api.postman_collection.json` |
| User notes | `docs/USER_GUIDE.md` |
| IOU scheme draft | `docs/IOU_REGISTRY_SCHEME.md` |
| Deploy | `render.yaml` (portal + `afix-api`) |

## Environments

| Var | Purpose |
|-----|---------|
| `VITE_API_BASE_URL` | Portal → API |
| `VITE_NOTIFY_EMAIL_ENABLED` | Enable live email via API |
| `PORT` | API port (default 8787) |
| `DATABASE_URL` | Future Postgres (not required for demo) |
| `SMTP_*` / `RESEND_API_KEY` | Email |
| `AFRICAS_TALKING_*` | SMS |

## Board trail demo (non-technical)

1. Buyer posts IOU → Supplier opt-in → Assignment on SPV  
2. Admin → Workflow → Export audit CSV  
3. Admin → Reconciliation → show period variance  
4. SPV → Packaging → NSE Listing path  

## Ops notes

- Demo data lives in portal seed + `server/data/store.json`  
- `GET /api/v1/sync` is **open for demo** — lock down before production  
- Portal merges API uploads on load; dual-run both `dev` and `dev:api` for ERP demos  
- Idle session timeout ~30 minutes in portal  

## Still external / optional

- Live bank rails / escrow trust accounts  
- NSE exchange onboarding  
- Keycloak / OAuth production identity  
- Formal legal opinions & trust deeds  
- Sule-final IOU legal text  

## Contacts

Prepared by Alfred · Client: CPF Githuku & team · IP: UzimaX
