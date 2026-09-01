# Questions for David Sule — AfyaX ↔ IOUX (1 Sep 2026)

**From:** Alfred / IOUX  
**Re:** Your IOU Purchase Webhook doc + our API handoff  
**Action:** Please reply on WhatsApp or email so we can complete joint UAT.

---

## 1. Webhook scope — important

You sent **`POST /api/v1/iou/purchase`** — we have wired IOUX to call this when an IOU is **assigned to SPV** (`iou.assigned` / `iou.acquired`).

We originally also planned to notify AfyaX for:

| Event | When | Your endpoint? |
|-------|------|----------------|
| `iou.created` | Invoice/IOU registered in IOUX | ❓ Not in your doc |
| `iou.status_changed` | Status updates (opt-in, verified, etc.) | ❓ |
| `iou.payment_updated` | Buyer repayment synced in IOUX | ❓ |
| `iou.settled` | IOU fully paid | ❓ |
| `iou.assigned` / purchase | SPV acquires receivable | ✅ `/api/v1/iou/purchase` |

**Q1:** Do you have a **separate lifecycle webhook URL** for `iou.created`, status changes, and settlement — or is purchase the only outbound webhook for now?

**Q2:** Should we call `/iou/purchase` at **assignment** (SPV owns receivable) or only after **escrow disbursement** (supplier paid)?

---

## 2. Field mapping

| IOUX field | AfyaX field | Our mapping today |
|------------|-------------|-------------------|
| `iouRegistryId` e.g. `IOU-KE-2024-00060-0` | `ioux_id` | Sent as-is |
| Buyer org name | `buyer_name` | From IOUX buyer record |
| SPV purchase price | `amount` | From assignment `purchasePrice` |
| — | `payment_method` | Default **`bank`** (configurable) |
| Assignment ID | `bank_reference` | `IOUX-ASGN-{id}` |

**Q3:** Does AfyaX accept our registry ID format (`IOU-KE-YYYY-SEQ-CHK`) as `ioux_id`, or do you expect `IOUX-2024-001` style?

**Q4:** For `payment_method`: when SPV pays supplier, will it always be **bank transfer** in sandbox, or should we send `mpesa` / `wallet` with real transaction refs?

**Q5:** What `bank_name` should we send (if any)?

---

## 3. Security & connectivity

Your doc says **IP address restriction** (no API key / HMAC on purchase endpoint).

**Q6:** Please whitelist IOUX server IP(s) once we deploy:
- Sandbox: _(Render outbound IP — Alfred will share after deploy)_
- Production: _(same)_

**Q7:** Is rate limit **10 req/min per IP** sufficient for pilot volume?

---

## 4. Inbound (AfyaX → IOUX) — confirm you have our doc

We are sending **`docs/AFYAX_INTEGRATION_API.md`** with:

- API base URL (sandbox + production after deploy)
- Platform API key
- `POST /parties`, `POST /users`, `POST /external/invoices`
- `POST /webhooks/payment-update` for buyer repayments (HMAC)

**Q8:** Confirm AfyaX will use **`POST /parties`** (not `/organisations`) and store `uzimaPartyId` + IOUX org UUID.

**Q9:** Confirm buyer repayments use **`POST /api/v1/webhooks/payment-update`** with `idempotencyKey`.

---

## 5. Open items from Aug review (still need answers)

| # | Topic |
|---|--------|
| 10 | Dual-role org (buyer + supplier) — one AfyaX account, two IOUX orgs? |
| 11 | Cash-only buyers — sync to IOUX or skip? |
| 12 | Minimum KYC fields you will push on `POST /parties` |
| 13 | UAT pilot company names (buyer + supplier) |

---

## What IOUX has done (no action needed from you for these)

- ✅ AfyaX platform org + API key
- ✅ Purchase webhook adapter → `https://manager.smplystore.com/api/v1/iou/purchase`
- ✅ Smoke test: party + IOU via API
- ✅ Admin → Integrations UI updated
- ⏳ Deploy hosted sandbox API (next)
- ⏳ Joint UAT after your IP whitelist + lifecycle URL answers

---

*Reply with numbered answers — even partial is fine. We can UAT purchase flow first while lifecycle URL is pending.*
