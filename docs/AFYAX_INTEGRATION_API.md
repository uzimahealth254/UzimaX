# AfyaX ↔ IOUX Integration API — Handoff for David Sule

**Version:** 1.2 (September 2026)  
**Prepared by:** Alfred / IOUX development  
**Audience:** AfyaX engineering (David Sule)  
**Status:** IOUX configured ✅ — purchase webhook wired to your spec; hosted API deploy pending

---

## 1. Summary

IOUX is the **source of truth** for the IOU financing lifecycle (registry, assignment, SPV purchase, settlement view). AfyaX is the **originator** of trade data (buyers, suppliers, invoices, buyer payments).

Integration model:

- **Separate databases** — only shared **IDs** are stored cross-system.
- **AfyaX → IOUX:** REST API with platform API key (`X-API-Key` or `Authorization: Bearer uzima_…`).
- **IOUX → AfyaX (purchase):** `POST /api/v1/iou/purchase` when SPV assigns/acquires an IOU (your spec — wired ✅).
- **IOUX → AfyaX (lifecycle):** `iou.created`, `payment_updated`, `settled` — **need your lifecycle URL** (see `docs/SULE_CLARIFICATIONS.md`).
- **Payments:** AfyaX posts buyer repayments to IOUX; IOUX does not move real money (PPS/SimplyPay is separate).

---

## 2. Credentials & endpoints

> **Security:** Treat API keys as secrets. Rotate before production. Do not commit to git.

### 2.1 AfyaX → IOUX (you call us)

| Item | Sandbox (local dev) | Production (after deploy) |
|------|---------------------|---------------------------|
| **IOUX API base URL** | `http://localhost:8787/api/v1` | `https://<api-host>/api/v1` *(Alfred shares after Render deploy)* |
| **Platform API key** | `uzima_3965f7ccac8d0710c27d026ec1288a9e8f78d20b4175ebcd` | Same key or rotated — Alfred will confirm |
| **Platform org UUID** | `422eb159-f7a4-467d-a226-7ef3bc394780` | Same |
| **Platform party ID** | `UZ-PLT-W6F7P5` | Same |
| **Payment webhook HMAC secret** | `dev-afyax-webhook-secret-min-16-chars` | Agree in UAT |

### 2.2 IOUX → AfyaX (we call you)

| Item | Sandbox | Production |
|------|---------|------------|
| **Purchase webhook** | `https://manager.smplystore.com/api/v1/iou/purchase` | `https://vendor.afyax.health/api/v1/iou/purchase` |
| **Lifecycle webhook** | ⏳ **Pending** — please provide URL | ⏳ Pending |
| **Auth** | IP whitelist (per your doc) | IP whitelist |
| **Trigger** | `iou.assigned` / `iou.acquired` (SPV purchase) | Same |

**IOUX sends to your purchase endpoint:**

```json
{
  "buyer_name": "Savannah Hospital",
  "ioux_id": "IOU-KE-2024-00060-0",
  "payment_method": "bank",
  "amount": 475000.00,
  "bank_reference": "IOUX-ASGN-abc12345"
}
```

**Please confirm:** our `iouRegistryId` format is accepted as `ioux_id` (see clarifications doc).

### 2.3 Still needed from you

| Item | Status |
|------|--------|
| Lifecycle webhook URL (`iou.created`, `payment_updated`, `settled`) | ⏳ Pending |
| Whitelist IOUX server IP after deploy | ⏳ Pending |
| Answers to `docs/SULE_CLARIFICATIONS.md` | ⏳ Pending |

---

## 3. IOUX smoke test (already passed)

Alfred verified on 31 Aug 2026:

| Step | Result |
|------|--------|
| `POST /parties` — test supplier | ✅ `UZ-SUP-C2VOKT` |
| `POST /external/invoices` — credit sale | ✅ `IOU-KE-2024-00060-0` → `awaiting_opt_in` |

**Note:** Programme max tenor is **120 days**. Ensure `dueDate − issueDate ≤ 120` or IOUX returns `programme_tenor` error.

---

## 4. Setup checklist

| Step | Who | Action | Status |
|------|-----|--------|--------|
| 1 | Alfred | Create org type **Platform** named `AfyaX` | ✅ Done |
| 2 | Alfred | Issue API key with scopes: `parties:write`, `parties:read`, `users:write`, `users:read`, `invoices:write`, `invoices:read`, `payments:write` | ✅ Done |
| 3 | Alfred | Wire purchase webhook per Sule spec | ✅ Done |
| 4 | Sule | Whitelist IOUX IP + lifecycle webhook URL | ⏳ Pending |
| 5 | Sule | Store API key + platform org UUID in AfyaX secrets | Your task |
| 6 | Sule | Implement onboarding synergy (§5) | Your task |
| 7 | Both | Run full UAT (§11) with 1 buyer + 1 supplier | Next |

---

## 5. Authentication

### 5.1 Inbound (AfyaX → IOUX)

Either header style works:

```http
X-API-Key: uzima_<hex>
Content-Type: application/json
```

```http
Authorization: Bearer uzima_<hex>
Content-Type: application/json
```

API key is tied to the **AfyaX platform organisation**. Every invoice/IOU created with this key is stamped with `sourcePlatformOrgId: 422eb159-f7a4-467d-a226-7ef3bc394780`.

### 5.2 Payment webhook (AfyaX → IOUX)

```http
POST /api/v1/webhooks/payment-update
X-API-Key: uzima_<hex>
X-AfyaX-Signature: <hmac-sha256-hex>
X-AfyaX-Timestamp: <unix-seconds>
```

HMAC payload: `{timestamp}.{raw-json-body}` using shared secret `dev-afyax-webhook-secret-min-16-chars`.

Include `idempotencyKey` (or `afyaxReference`) on every payment post — duplicates return `{ duplicate: true }` without double-counting.

### 5.3 Outbound (IOUX → AfyaX)

IOUX POSTs to your configured webhook URL:

```http
X-IOUX-Event: iou.assigned
X-IOUX-Event-Id: evt_<hex>
X-IOUX-Timestamp: <unix-seconds>
X-IOUX-Signature: <hmac-sha256-hex>
```

Verify: `HMAC-SHA256(secret, timestamp + "." + rawBody)` using secret `e96b437f098f1cffe287802ee0e279d0734449f31a276832`.

Acknowledge with **HTTP 200** and optionally `{ "received": true, "event_id": "evt_…" }`.

---

## 6. Onboarding synergy (recommended flow)

When a user registers on AfyaX and opts in to IOUX:

```
1. AfyaX creates org locally
2. POST /api/v1/parties  → store returned id + uzimaPartyId in AfyaX DB
3. POST /api/v1/users     → store returned iouxUserId in AfyaX DB
4. Send user IOUX invite email (IOUX sends automatically unless sendInviteEmail: false)
5. User receives TWO emails: AfyaX welcome + IOUX portal credentials
```

Sub-users (maker/checker): repeat step 3 with `isSignatory: true` and `capacity: "maker"` or `"checker"`.

---

## 7. API reference

### 7.1 Create / upsert organisation

```http
POST /api/v1/parties
```

**Scopes:** `parties:write`

```json
{
  "name": "Savannah Pharma Ltd",
  "orgType": "supplier",
  "afyaxId": "AFX-SUP-001",
  "registrationNo": "CPR/123456",
  "kraPin": "A123456789Z",
  "contactEmail": "finance@savannah.ke",
  "contactPhone": "+254700000000",
  "county": "Nairobi",
  "businessType": "pharmacy",
  "kycStatus": "verified",
  "kycVerifiedAt": "2026-08-01T00:00:00Z",
  "kycDocuments": [
    { "docType": "certificate_of_incorporation", "fileUrl": "https://filebase.../cert.pdf" },
    { "docType": "kra_pin", "fileUrl": "https://filebase.../pin.pdf" }
  ]
}
```

**Response (201 or 200 if existing):**

```json
{
  "id": "uuid",
  "uzimaPartyId": "UZ-SUP-…",
  "organisationId": "uuid",
  "existing": false
}
```

**Persist in AfyaX:** `id` (IOUX org UUID) and `uzimaPartyId`.

---

### 7.2 Get organisation

```http
GET /api/v1/parties/{uzimaPartyId}
GET /api/v1/organisations/{uuid-or-uzimaPartyId}
```

**Scopes:** `parties:read`

---

### 7.3 Create user

```http
POST /api/v1/users
```

**Scopes:** `users:write`

```json
{
  "email": "director@savannah.ke",
  "fullName": "Jane Director",
  "role": "supplier",
  "orgId": "<ioux-org-uuid>",
  "afyaxUserId": "AFX-USER-42",
  "phone": "+254711111111",
  "isSignatory": true,
  "capacity": "checker",
  "sendInviteEmail": true
}
```

**Response:**

```json
{
  "id": "uuid",
  "iouxUserId": "uuid",
  "email": "director@savannah.ke",
  "role": "supplier",
  "orgId": "uuid",
  "afyaxUserId": "AFX-USER-42",
  "existing": false,
  "emailSent": true
}
```

---

### 7.4 Submit invoice / IOU (buyer credit sale — Path A)

When buyer buys on credit in AfyaX and IOU should enter IOUX for supplier to sell:

```http
POST /api/v1/external/invoices
```

**Scopes:** `invoices:write`

```json
{
  "submissionType": "buyer_credit_sale",
  "buyerOrgId": "<ioux-buyer-uuid>",
  "supplierPartyId": "UZ-SUP-…",
  "invoiceNumber": "INV-2026-0042",
  "externalInvoiceId": "AFX-INV-0042",
  "externalOrderId": "ORD-9912",
  "faceValue": 1500000,
  "currency": "KES",
  "issueDate": "2026-08-01",
  "dueDate": "2026-11-15",
  "commitmentToPay": true,
  "listedAmount": 1000000,
  "supportingDocs": [
    { "name": "invoice.pdf", "fileUrl": "https://filebase.../inv.pdf", "docType": "invoice" }
  ],
  "lineItems": [
    { "description": "Medical supplies", "quantity": 1, "amount": 1500000 }
  ]
}
```

- Use `buyerOrgId` / `supplierOrgId` **or** `buyerPartyId` / `supplierPartyId` (party IDs like `UZ-SUP-…`).
- `listedAmount` optional — partial sale (≤ `faceValue`).
- `commitmentToPay: true` required for buyer-originated path.
- **Tenor:** `dueDate − issueDate` must be ≤ **120 days** (programme limit).

**Response:**

```json
{
  "invoiceId": "uuid",
  "iouRegistryId": "IOU-KE-2024-00060-0",
  "status": "awaiting_opt_in",
  "sourcePlatformOrgId": "422eb159-f7a4-467d-a226-7ef3bc394780",
  "submissionType": "buyer_credit_sale"
}
```

**Persist in AfyaX:** `invoiceId`, `iouRegistryId` — use on all future status/payment calls.

---

### 7.5 Supplier lists receivable (Path B)

```http
POST /api/v1/external/invoices
```

```json
{
  "submissionType": "supplier_list",
  "buyerOrgId": "<uuid>",
  "supplierOrgId": "<uuid>",
  "faceValue": 2000000,
  "listedAmount": 2000000,
  "issueDate": "2026-08-01",
  "dueDate": "2026-11-29",
  "supportingDocs": [{ "fileUrl": "https://...", "docType": "invoice" }]
}
```

Status starts at `awaiting_buyer_verification` → buyer verifies in IOUX portal → **auto-assignment** to SPV.

---

### 7.6 Direct IOU alias

```http
POST /api/v1/ious
```

Same body as buyer credit sale; returns `invoiceId` + `iouRegistryId`.

---

### 7.7 Read status

```http
GET /api/v1/invoices/{invoiceId}/status
GET /api/v1/ious/{iouRegistryId}
```

**Scopes:** `invoices:read`

Poll as fallback if webhook missed.

---

### 7.8 Post buyer payment

```http
POST /api/v1/webhooks/payment-update
```

```json
{
  "iouRegistryId": "IOU-KE-2024-00060-0",
  "amountPaid": 250000,
  "outstandingBalance": 1250000,
  "nextDueDate": "2026-09-15",
  "paymentMethod": "mpesa",
  "idempotencyKey": "AFX-PAY-unique-id"
}
```

When `outstandingBalance` reaches 0, IOUX marks IOU **settled** and fires `iou.settled` webhook.

---

## 8. Outbound webhook events

| Event | When |
|-------|------|
| `iou.created` | Invoice/IOU registered in IOUX |
| `iou.status_changed` | Any material status transition |
| `iou.assigned` | SPV assignment created (buyer verified / opt-in accepted) |
| `iou.acquired` | Negotiated offer path (offer-linked assignment) |
| `iou.payment_updated` | Payment posted, balance > 0 |
| `iou.settled` | Fully paid / closed |

**Payload `data` includes:** `invoiceId`, `iouRegistryId`, `status`, `faceValue`, `listedAmount`, buyer/supplier IDs, assignment block.

Delivery log visible in IOUX **Admin → Integrations** (retry failed deliveries from there).

---

## 9. Status mapping (IOUX → AfyaX display)

| IOUX status | Meaning for AfyaX UI |
|-------------|-------------------|
| `awaiting_opt_in` | Supplier must opt in to sell |
| `awaiting_buyer_verification` | Buyer must verify supplier-posted invoice |
| `verified` / `listed` | Available on exchange |
| `offer_received` | SPV made an offer |
| `assigned` | SPV owns receivable — notify supplier |
| `disbursed` | Escrow disbursement recorded (simulated) |
| `settled` | Buyer paid off |
| `opt_in_declined` / `buyer_rejected` | Terminal — show reason |

---

## 10. What AfyaX should NOT do

- Do **not** set discount or SPV purchase price — IOUX/SPV owns pricing.
- Do **not** duplicate full KYC in IOUX if already verified — send `kycStatus: verified` + document URLs.
- Do **not** expect IOUX to pull from AfyaX DB — push via API.
- Cash-only buyers: decide with Githuku whether to sync to IOUX at all.

---

## 11. UAT script (minimum gate)

1. `POST /parties` — buyer + supplier; store IDs.
2. `POST /users` — one checker per org.
3. `POST /external/invoices` — credit sale; get `iouRegistryId`.
4. Supplier logs into IOUX → opt-in → assignment.
5. `POST /webhooks/payment-update` — partial payment.
6. Duplicate same `idempotencyKey` — no double count.
7. Confirm IOUX fires `iou.assigned` and `iou.payment_updated` to your webhook URL.
8. Confirm same IOU visible in IOUX SPV registry.

**Quick curl-style test (PowerShell):**

```powershell
$apiKey = "uzima_3965f7ccac8d0710c27d026ec1288a9e8f78d20b4175ebcd"
$h = @{ "X-API-Key" = $apiKey; "Content-Type" = "application/json" }

Invoke-RestMethod -Uri "http://localhost:8787/api/v1/parties" -Method POST -Headers $h -Body (@{
  name = "Test Supplier"; orgType = "supplier"; afyaxId = "AFX-TEST-001"; kycStatus = "verified"
} | ConvertTo-Json)
```

---

## 12. Support contacts

| Topic | Contact |
|-------|---------|
| IOUX API / endpoints | Alfred |
| AfyaX onboarding + FileBase | David Sule |
| Business / pilot companies | Githuku |
| Legal (face value, assignments) | IKM |

---

*Architecture review: `docs/AFYAX_IOUX_INTEGRATION_REVIEW.md`*
