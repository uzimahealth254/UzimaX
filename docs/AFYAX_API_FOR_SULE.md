# AfyaX ↔ IOUX Integration API

**Document version:** 2.0 — Production UAT  
**Date:** 1 September 2026  
**Prepared for:** David Sule (AfyaX engineering)  
**Prepared by:** Alfred / IOU Exchange (IOUX)

This document is **self-contained**. You do not need access to the IOUX codebase. Implement against the live API using the credentials and examples below.

---

## 1. What each system does

| System | Role |
|--------|------|
| **AfyaX** | Originates trade data: buyers, suppliers, users, credit sales, buyer repayments |
| **IOUX** | Independent receivables registry: IOU lifecycle, supplier opt-in, SPV purchase, balance tracking |
| **SPV** (IOU Exchange Capital) | Buys IOUs and disburses to suppliers (portal workflow) |

**Separate databases.** Cross-reference using IDs returned in API responses (`id`, `uzimaPartyId`, `iouRegistryId`, `iouxTransactionId`).

**IOUX does not move real money.** AfyaX (or your PSP) settles cash; IOUX records balances and status.

---

## 2. Production credentials

> Store in AfyaX secrets manager. Rotate before go-live if this document was emailed in plain text.

| Item | Value |
|------|-------|
| **API base URL** | `https://uzimax.onrender.com/api/v1` |
| **Platform API key** | `uzima_<see Render AFYAX_PLATFORM_API_KEY or secure handoff email>` |
| **Platform org UUID** | `785d0f19-b81f-425f-bcb9-ad994d4c885f` |
| **Platform party ID** | `UZ-PLT-9DDFSM` |
| **Payment HMAC secret** (AfyaX → IOUX) | `<see Render AFYAX_WEBHOOK_SECRET or secure handoff email>` |

### Your endpoints (IOUX calls you)

| Environment | Purchase webhook URL |
|-------------|-------------------|
| **Sandbox** | `https://manager.smplystore.com/api/v1/iou/purchase` |
| **Production** | `https://vendor.afyax.health/api/v1/iou/purchase` |

**Auth:** IP whitelist on AfyaX side (you confirmed you will handle this).

**Health check (no auth):**

```http
GET https://uzimax.onrender.com/api/v1/health
```

```json
{ "status": "ok", "service": "uzima-api", "version": "2.0.0", "db": "up" }
```

---

## 3. Integration model (agreed 1 Sep 2026)

### AfyaX → IOUX (REST API)

| # | Endpoint | Purpose |
|---|----------|---------|
| 1 | `POST /parties` | Register or update buyer/supplier org |
| 2 | `POST /users` | Create portal user for an org |
| 3 | `POST /external/invoices` | Push credit sale / IOU into IOUX |
| 4 | `POST /webhooks/payment-update` | Report buyer repayment |
| 5 | `GET /ious/{iouRegistryId}` | Poll IOU status (optional) |
| 6 | `GET /invoices/{id}/status` | Poll by invoice UUID (optional) |

### IOUX → AfyaX (one webhook only)

| Event | When | Your URL |
|-------|------|----------|
| **Purchase / transfer** | SPV **disburses** funds to supplier (Delivery vs Settlement complete) | `POST /api/v1/iou/purchase` |

**There are no IOUX → AfyaX webhooks** for `iou.created`, `payment_updated`, or `settled`. Use API responses and optional `GET` polling instead.

---

## 4. End-to-end workflow

```
AfyaX                          IOUX                           AfyaX
─────                          ────                           ─────
1. POST /parties (buyer + supplier)
   store id + uzimaPartyId
2. POST /users (checker per org)
   store iouxUserId
3. POST /external/invoices
   store invoiceId + iouRegistryId
                               → awaiting_opt_in
                               Supplier opts in (IOUX portal)
                               → pending_settlement
                               SPV disburses (IOUX portal)
                               → disbursed
                               POST /iou/purchase  ──────────→  mark IOU sold
4. Buyer pays on AfyaX
   POST /webhooks/payment-update
   store iouxTransactionId
5. Repeat payments until outstandingBalance = 0
                               → settled (no webhook to AfyaX)
```

### DvS rule (Githuku + Sule)

**Purchase webhook fires only after confirmed disbursement**, not at supplier opt-in/accept. Opt-in moves IOU to `pending_settlement`; disbursement moves to `disbursed` and triggers your webhook.

---

## 5. Authentication

### 5.1 API key (all AfyaX → IOUX calls)

Use either header style:

```http
X-API-Key: uzima_<your-platform-api-key>
Content-Type: application/json
```

```http
Authorization: Bearer uzima_<your-platform-api-key>
Content-Type: application/json
```

**API key scopes** (already provisioned):  
`parties:read`, `parties:write`, `users:read`, `users:write`, `invoices:read`, `invoices:write`, `payments:write`

Invoices created with this key are stamped with `sourcePlatformOrgId: 785d0f19-b81f-425f-bcb9-ad994d4c885f`.

### 5.2 Payment webhook HMAC (`POST /webhooks/payment-update`)

Required headers:

```http
X-API-Key: uzima_…
X-AfyaX-Signature: <hex-hmac-sha256>
X-AfyaX-Timestamp: <unix-seconds>
```

**Sign the raw JSON body:**

```
payload_to_sign = timestamp + "." + raw_json_body
signature = HMAC_SHA256(secret=AFYAX_WEBHOOK_SECRET, payload_to_sign)
header_value = signature_as_lowercase_hex   // or prefix "sha256=" + hex
```

**Node.js example:**

```javascript
const crypto = require('crypto');

function signPaymentWebhook(bodyObject, secret) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const rawBody = JSON.stringify(bodyObject);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  return { timestamp, signature, rawBody };
}

// Usage
const secret = process.env.AFYAX_WEBHOOK_SECRET; // from secure handoff
const body = {
  iouRegistryId: 'IOU-KE-2026-00001-0',
  amountPaid: 250000,
  outstandingBalance: 1250000,
  idempotencyKey: 'AFX-PAY-unique-id-001',
};
const { timestamp, signature, rawBody } = signPaymentWebhook(body, secret);
// POST with headers X-AfyaX-Timestamp, X-AfyaX-Signature, body = rawBody
```

**Rules:**

- Timestamp must be within **±5 minutes** of server time.
- Always send the **exact** raw bytes you signed (do not re-serialize on the server).
- Include `idempotencyKey` (min 8 chars) on every payment — duplicates return `{ duplicate: true }` with the same `iouxTransactionId`.

---

## 6. API reference

### 6.1 Create or update organisation

```http
POST /api/v1/parties
```

**Upsert:** If `afyaxId` already exists, returns **200** and updates metadata. Otherwise **201**.

**Request:**

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
  "ppbRegistration": "PPB-123",
  "ppbLicence": "LIC-456",
  "kycDocuments": [
    {
      "docType": "certificate_of_incorporation",
      "fileUrl": "https://your-cdn.example/cert.pdf"
    }
  ]
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Legal / trading name |
| `orgType` | Yes | `buyer` or `supplier` |
| `afyaxId` | Recommended | Your stable org ID — used for upsert |
| `kycStatus` | No | `pending` \| `verified` \| `rejected` — send `verified` if KYC done on AfyaX |

**Response (201 / 200):**

```json
{
  "id": "1fdf3a13-6d04-4119-97c0-4a7c844fa55e",
  "uzimaPartyId": "UZ-SUP-FC4OKR",
  "organisationId": "1fdf3a13-6d04-4119-97c0-4a7c844fa55e",
  "existing": false
}
```

**Store in AfyaX DB:** `id` (IOUX org UUID), `uzimaPartyId` (human-readable party code).

---

### 6.2 Get organisation

```http
GET /api/v1/parties/{uzimaPartyId}
GET /api/v1/organisations/{uuid-or-uzimaPartyId}
```

---

### 6.3 Create user

```http
POST /api/v1/users
```

**Upsert:** By `afyaxUserId` or email. Returns **201** or **200**.

**Request:**

```json
{
  "email": "director@savannah.ke",
  "fullName": "Jane Director",
  "role": "supplier",
  "orgId": "1fdf3a13-6d04-4119-97c0-4a7c844fa55e",
  "afyaxUserId": "AFX-USER-42",
  "phone": "+254711111111",
  "isSignatory": true,
  "capacity": "checker",
  "sendInviteEmail": true
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `orgId` or `uzimaPartyId` | Yes (one of) | Links user to org from step 6.1 |
| `role` | Yes | Must match org type: `buyer` or `supplier` |
| `capacity` | If signatory | `maker` \| `checker` \| `both` |
| `sendInviteEmail` | No | Default true — IOUX emails temp password |

**Response:**

```json
{
  "id": "uuid",
  "iouxUserId": "uuid",
  "email": "director@savannah.ke",
  "fullName": "Jane Director",
  "role": "supplier",
  "orgId": "uuid",
  "afyaxUserId": "AFX-USER-42",
  "existing": false,
  "emailSent": true
}
```

---

### 6.4 Submit invoice / IOU (buyer credit sale)

When a buyer purchases on credit in AfyaX and the supplier may sell the receivable on IOUX:

```http
POST /api/v1/external/invoices
```

**Request:**

```json
{
  "submissionType": "buyer_credit_sale",
  "buyerOrgId": "uuid-from-parties",
  "supplierPartyId": "UZ-SUP-FC4OKR",
  "invoiceNumber": "INV-2026-0042",
  "externalInvoiceId": "AFX-INV-0042",
  "externalOrderId": "ORD-9912",
  "faceValue": 1500000,
  "currency": "KES",
  "issueDate": "2026-08-01",
  "dueDate": "2026-11-15",
  "commitmentToPay": true,
  "listedAmount": 1500000,
  "supportingDocs": [
    {
      "name": "invoice.pdf",
      "fileUrl": "https://your-cdn.example/inv.pdf",
      "docType": "invoice"
    }
  ],
  "lineItems": [
    { "description": "Medical supplies", "quantity": 1, "amount": 1500000 }
  ]
}
```

| Field | Required | Notes |
|-------|----------|-------|
| Buyer / supplier | Yes | Use `buyerOrgId` + `supplierPartyId`, or any mix of UUID / party ID |
| `faceValue` | Yes | Invoice face value (KES) |
| `issueDate`, `dueDate` | Yes | ISO date `YYYY-MM-DD` |
| `dueDate − issueDate` | — | **Max 120 days** (programme limit) |
| `commitmentToPay` | Yes for credit sale | Should be `true` |
| `listedAmount` | No | Partial sale amount; default = `faceValue` |
| `externalInvoiceId` | Recommended | Your ID for reconciliation |

**Response (201):**

```json
{
  "invoiceId": "uuid",
  "id": "uuid",
  "iouRegistryId": "IOU-KE-2026-00001-0",
  "status": "awaiting_opt_in",
  "sourcePlatformOrgId": "785d0f19-b81f-425f-bcb9-ad994d4c885f",
  "submissionType": "buyer_credit_sale"
}
```

**Store in AfyaX:** `invoiceId`, `iouRegistryId`. The `iouRegistryId` format (`IOU-KE-…`) is accepted as `ioux_id` everywhere.

**Alias:** `POST /api/v1/ious` — same body, same response.

---

### 6.5 Supplier-listed path (optional)

```json
{
  "submissionType": "supplier_list",
  "buyerOrgId": "uuid",
  "supplierOrgId": "uuid",
  "faceValue": 2000000,
  "listedAmount": 2000000,
  "issueDate": "2026-08-01",
  "dueDate": "2026-11-29",
  "supportingDocs": [{ "name": "invoice.pdf", "fileUrl": "https://...", "docType": "invoice" }]
}
```

Starts at `awaiting_buyer_verification` → buyer verifies in IOUX portal.

---

### 6.6 Read IOU status

```http
GET /api/v1/ious/{iouRegistryId}
GET /api/v1/invoices/{invoiceId}/status
```

**Example:**

```http
GET /api/v1/ious/IOU-KE-2026-00001-0
X-API-Key: uzima_…
```

Returns invoice fields, `statusHistory`, and `assignment` if present.

---

### 6.7 Post buyer payment

```http
POST /api/v1/webhooks/payment-update
```

**Request (signed — see §5.2):**

```json
{
  "iouRegistryId": "IOU-KE-2026-00001-0",
  "amountPaid": 250000,
  "outstandingBalance": 1250000,
  "nextDueDate": "2026-09-15",
  "paymentMethod": "mpesa",
  "idempotencyKey": "AFX-PAY-unique-id-001"
}
```

Use `invoiceId` (UUID) instead of `iouRegistryId` if you prefer — one is required.

**Response (success):**

```json
{
  "invoiceId": "uuid",
  "iouRegistryId": "IOU-KE-2026-00001-0",
  "iouxTransactionId": "uuid",
  "amountPaid": 250000,
  "outstandingBalance": 1250000,
  "received": true,
  "settled": false
}
```

**Duplicate idempotency key:**

```json
{
  "ok": true,
  "duplicate": true,
  "invoiceId": "uuid",
  "iouxTransactionId": "same-uuid-as-first-call",
  "update": { }
}
```

When `outstandingBalance` is `0`, IOUX sets status `settled` and returns `"settled": true`. **No webhook** is sent to AfyaX — use the API response.

---

## 7. Inbound webhook — implement on AfyaX

IOUX calls **your** endpoint when SPV disbursement completes.

```http
POST https://manager.smplystore.com/api/v1/iou/purchase
Content-Type: application/json
```

**Body IOUX sends:**

```json
{
  "buyer_name": "Savannah Hospital",
  "ioux_id": "IOU-KE-2026-00001-0",
  "payment_method": "bank",
  "amount": 475000.00,
  "transaction_id": "IOUX-TXN-abc123def456",
  "bank_reference": "IOUX-TXN-abc123def456"
}
```

| Field | Description |
|-------|-------------|
| `buyer_name` | Buyer org name at time of disbursement |
| `ioux_id` | IOU registry ID — same as `iouRegistryId` from API |
| `payment_method` | `bank` \| `mpesa` \| `wallet` |
| `amount` | SPV purchase / disbursement amount (KES) |
| `transaction_id` | IOUX settlement reference — **store for reconciliation** |
| `bank_reference` | Same as `transaction_id` when `payment_method` is `bank` |

**Your handler should:**

1. Return **HTTP 200** on success.
2. Mark the IOU as sold / transferred in AfyaX.
3. Restrict supplier actions on that IOU per your product rules.
4. Continue accepting buyer payments via `POST /webhooks/payment-update` (step 6.7).

---

## 8. Status reference

| IOUX `status` | Meaning for AfyaX UI |
|---------------|----------------------|
| `awaiting_opt_in` | Waiting for supplier to opt in on IOUX |
| `awaiting_buyer_verification` | Supplier-listed; buyer must verify |
| `pending_settlement` | Accepted; waiting for SPV disbursement (DvS) |
| `disbursed` | SPV paid supplier — purchase webhook should have fired |
| `assigned` | Legacy / in-flight assignments |
| `settled` | Buyer fully repaid (per your payment posts) |
| `opt_in_declined` | Supplier declined — terminal |
| `buyer_rejected` | Buyer rejected — terminal |

Poll `GET /ious/{iouRegistryId}` if you need to refresh UI after portal actions.

---

## 9. Error responses

All errors return JSON:

```json
{
  "error": "error_code",
  "message": "Human-readable description"
}
```

| HTTP | `error` code | Typical cause |
|------|--------------|---------------|
| 400 | `validation_error` | Missing buyer/supplier, invalid dates |
| 400 | `programme_tenor` | Due date more than 120 days from issue |
| 400 | `buyer_not_found` | Unknown `buyerPartyId` / `buyerOrgId` |
| 400 | `supplier_not_found` | Unknown supplier ID |
| 401 | `unauthorized` | Missing or invalid API key |
| 401 | `invalid_signature` | Payment webhook HMAC failed |
| 403 | `forbidden` | API key missing required scope |
| 404 | `not_found` | Invoice / party / user not found |
| 409 | various | Business rule conflict |
| 429 | `rate_limited` | Too many requests — back off and retry |
| 500 | `internal_error` | Server error — retry with backoff |

---

## 10. What AfyaX should NOT do

- **Do not** set SPV discount or purchase price — IOUX/SPV owns pricing.
- **Do not** expect IOUX to pull from AfyaX — always **push** via API.
- **Do not** implement listeners for `iou.created` / `payment_updated` / `settled` from IOUX — they are not sent.
- **Do not** duplicate full KYC if already verified — send `kycStatus: "verified"` and document URLs.

---

## 11. UAT checklist (minimum)

| Step | Action | Pass criteria |
|------|--------|---------------|
| 1 | `GET /health` | `status: ok` |
| 2 | `POST /parties` buyer + supplier | Receive `uzimaPartyId` for each |
| 3 | `POST /users` one checker per org | `emailSent: true` |
| 4 | `POST /external/invoices` | `status: awaiting_opt_in`, valid `iouRegistryId` |
| 5 | Supplier opts in (IOUX portal — Alfred assists) | Status → `pending_settlement` |
| 6 | SPV disburses (IOUX portal) | AfyaX receives `POST /iou/purchase` |
| 7 | `POST /webhooks/payment-update` partial payment | `iouxTransactionId` returned |
| 8 | Repeat same `idempotencyKey` | `duplicate: true`, same `iouxTransactionId` |
| 9 | Payment with `outstandingBalance: 0` | `settled: true` |

---

## 12. Quick test commands

**PowerShell (parties):**

```powershell
$apiKey = "<your-platform-api-key>"
$h = @{ "X-API-Key" = $apiKey; "Content-Type" = "application/json" }

Invoke-RestMethod -Uri "https://uzimax.onrender.com/api/v1/parties" -Method POST -Headers $h -Body (@{
  name = "UAT Test Supplier"
  orgType = "supplier"
  afyaxId = "AFX-UAT-SUP-001"
  kycStatus = "verified"
  contactEmail = "uat@example.com"
} | ConvertTo-Json)
```

**cURL (health):**

```bash
curl -s https://uzimax.onrender.com/api/v1/health
```

---

## 13. Support

| Topic | Contact |
|-------|---------|
| IOUX API / UAT scheduling | Alfred |
| AfyaX product / FileBase | David Sule |
| Business / pilot companies | Githuku |
| Legal | IKM |

---

## 14. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 1 Sep 2026 | Production URLs + credentials; DvS model; single purchase webhook; `iouxTransactionId` on payments |
| 1.2 | 31 Aug 2026 | Initial sandbox handoff |
