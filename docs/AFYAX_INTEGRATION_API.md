# AfyaX ↔ IOUX Integration API (index)

**For David Sule (AfyaX engineering):** use the standalone handoff document — no IOUX codebase required:

→ **[`docs/AFYAX_API_FOR_SULE.md`](./AFYAX_API_FOR_SULE.md)** (v2.0, production UAT)

Related:

- [`docs/AFYAX_CONFIRMED_MODEL.md`](./AFYAX_CONFIRMED_MODEL.md) — agreed workflow summary
- [`docs/AFYAX_DVS_ALIGNMENT.md`](./AFYAX_DVS_ALIGNMENT.md) — Delivery vs Settlement (purchase webhook timing)

---

## Production quick reference

| Item | Value |
|------|-------|
| API base | `https://uzimax.onrender.com/api/v1` |
| Health | `GET /api/v1/health` |
| Platform party ID | `UZ-PLT-9DDFSM` |
| Purchase webhook (sandbox) | `https://manager.smplystore.com/api/v1/iou/purchase` |

Full credentials, request/response schemas, HMAC signing, and UAT checklist are in **`AFYAX_API_FOR_SULE.md`**.
