# AfyaX ↔ IOUX — DvS Alignment (1 Sep 2026)

**For:** Githuku, Sule, IOUX team  
**From:** Alfred / IOUX development

---

## What Githuku confirmed

> Offer → Accept → Pay. Accept and pay run concurrently (Delivery vs Settlement).  
> **Assignment of the IOU is conditional on payment** — not before.

IOUX has been updated to follow this model.

---

## How IOUX works now

| Step | IOUX status | What happens |
|------|-------------|--------------|
| 1. Invoice / IOU registered | `awaiting_opt_in` / etc. | AfyaX pushes via API |
| 2. Supplier opts in / buyer verifies | → | Offer accepted |
| 3. Accept (no payment yet) | **`pending_settlement`** | Assignment record created; **no wallet movement**; **no AfyaX purchase webhook** |
| 4. SPV releases escrow disbursement | **`disbursed`** | Payment + assignment complete together (DvS) |
| 5. AfyaX notified | `POST /api/v1/iou/purchase` | Fires **only at step 4** with `bank_reference` / payment ref |

---

## AfyaX purchase webhook payload (at disbursement)

```json
{
  "buyer_name": "Hospital Name",
  "ioux_id": "IOU-KE-2024-00060-0",
  "payment_method": "bank",
  "amount": 475000.00,
  "bank_reference": "IOUX-ESC-abc12345"
}
```

**Sandbox URL:** `https://manager.smplystore.com/api/v1/iou/purchase`  
**Production URL:** `https://vendor.afyax.health/api/v1/iou/purchase`

---

## Still needed from AfyaX

1. **Lifecycle webhook URL** for `iou.created`, `payment_updated`, `settled` (separate from purchase)
2. **Confirm** `IOU-KE-…` registry ID format as `ioux_id`
3. **Whitelist** IOUX server IP after deploy

---

## UAT flow (joint test)

1. AfyaX → `POST /parties` + `POST /external/invoices`
2. Supplier opt-in in IOUX portal
3. Status shows **Pending settlement**
4. SPV → Escrow → **Mark disbursed**
5. AfyaX receives `/iou/purchase` webhook
6. AfyaX → `POST /webhooks/payment-update` for buyer repayments

---

*Full API doc: `docs/AFYAX_INTEGRATION_API.md`*
