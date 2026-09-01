# AfyaX ↔ IOUX — Confirmed Integration Model (Sule, 1 Sep 2026)

**Status:** Agreed — IOUX implementation aligned  
**Source:** Email from David Sule to Alfred

---

## Architecture (confirmed)

| System | Role |
|--------|------|
| **AfyaX** | Data originator — trade, users, credit sales, buyer repayments |
| **IOUX** | Independent receivables registry — listing, DvS settlement, SPV ownership, balance tracking |

**Separate databases.** Cross-reference via IDs returned in API responses.

**Only one IOUX → AfyaX webhook:** purchase/transfer after SPV disbursement to supplier.

**No IOUX → AfyaX webhooks** for `iou.created`, `payment_updated`, or `settled`.

---

## End-to-end workflow

### 1. Register supplier (AfyaX → IOUX)

```http
POST /api/v1/parties
```

**AfyaX stores:** `id` (IOUX org UUID) + `uzimaPartyId`

### 2. Register supplier admin, buyer, buyer user (AfyaX → IOUX)

```http
POST /api/v1/users
```

**AfyaX stores:** `id` / `iouxUserId`

### 3. Supplier lists IOU in IOUX (AfyaX → IOUX)

When supplier opts to sell on IOUX after credit sale in AfyaX:

```http
POST /api/v1/external/invoices
```

**Response (AfyaX stores):**

```json
{
  "invoiceId": "uuid",
  "iouRegistryId": "IOU-KE-2024-00060-0",
  "status": "awaiting_opt_in"
}
```

Any unique contextual ID format is accepted for cross-reference.

### 4. Buyer repayments (AfyaX → IOUX)

```http
POST /api/v1/webhooks/payment-update
```

IOUX independently tracks outstanding balance and installments.

**Response (AfyaX stores for reconciliation):**

```json
{
  "invoiceId": "uuid",
  "iouRegistryId": "IOU-KE-2024-00060-0",
  "iouxTransactionId": "uuid",
  "amountPaid": 250000,
  "outstandingBalance": 250000,
  "received": true,
  "settled": false
}
```

Duplicate `idempotencyKey` returns same `iouxTransactionId`.

### 5. SPV transfer / purchase (IOUX → AfyaX) — **only outbound webhook**

When SPV **successfully disburses** funds to supplier (escrow or direct — transfer complete):

```http
POST https://manager.smplystore.com/api/v1/iou/purchase
```

**IOUX sends:**

```json
{
  "buyer_name": "Hospital Name",
  "ioux_id": "IOU-KE-2024-00060-0",
  "payment_method": "bank",
  "amount": 475000.00,
  "transaction_id": "IOUX-TXN-abc123...",
  "bank_reference": "IOUX-TXN-abc123..."
}
```

AfyaX registers IOU as sold; supplier loses access; buyer repayments continue via AfyaX → IOUX (step 4).

**DvS rule (Githuku + Sule):** Purchase webhook fires **after confirmed disbursement**, not at opt-in/accept.

---

## IOUX internal lifecycle (portal)

| Step | Status | AfyaX notified? |
|------|--------|-----------------|
| IOU pushed from AfyaX | `awaiting_opt_in` | No (API response only) |
| Supplier opts in | `pending_settlement` | No |
| SPV disburses to supplier | `disbursed` | **Yes — `/iou/purchase`** |
| Buyer pays via AfyaX | — | No webhook (API response only) |
| Fully paid | `settled` | No webhook (API response only) |

---

## Live sandbox

| Item | Value |
|------|-------|
| API base URL | `https://uzimax.onrender.com/api/v1` |
| Purchase webhook (sandbox) | `https://manager.smplystore.com/api/v1/iou/purchase` |
| IP whitelist | Sule handling |

API key and payment HMAC secret — shared on secure channel.

---

## Open items

- [ ] AfyaX platform org + API key on **production** Render DB (admin setup)
- [ ] Joint UAT: full cycle steps 1–5
- [ ] Production API URL when custom domain live

---

*Technical reference: `docs/AFYAX_INTEGRATION_API.md`*
