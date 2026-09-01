# AfyaX ↔ IOUX Integration — IOUX Technical Review

**Response to:** *AfyaX ↔ IOUX Integration Technical Specification* (API, Identity, Receivables, IOU and Payment Synchronisation)

| Attribute | Value |
|-----------|--------|
| Prepared by | IOUX / Uzima Exchange development (Alfred) |
| Prepared for | David Sule — AfyaX |
| Copy | Uzima Exchange / AfyaX & IOUX development teams |
| Document type | Technical review, alignment, and questions |
| Status | For joint review |
| Date | 17 August 2026 |
| Related IOUX artefacts | `docs/openapi.yaml`, platform source ID, `/api/v1` |

---

## 1. Purpose of this note

Thank you for the proposed technical specification. This document is IOUX’s formal review from the **IOUX development perspective**. It:

1. Confirms **system ownership** and the recommended system-of-record model.
2. Maps the specification against **what IOUX already exposes**.
3. Proposes a **v1 API contract** that we can implement and test without redesigning either platform.
4. Lists **questions and decisions** we need from AfyaX before implementation and UAT.

Endpoint names, field names and status codes in your specification are treated as a proposed baseline. The **final API contract** should be versioned jointly before build.

---

## 2. Who owns what

| System | Owner | Role in the integration |
|--------|--------|-------------------------|
| **AfyaX** | **David Sule** | Originating B2B healthcare commerce platform. Source of buyers, suppliers, orders, credit sales, commercial invoices, and buyer repayment activity. |
| **IOUX** | **Uzima Exchange / IOUX development (Alfred)** | Receivables management and securitisation workflow. Source of truth for IOU registry, listing, confirmation, assignment, packaging, SPV acquisition, financing status, and consent/OTP evidence. |
| **PPS** | Shared (simulation: SMPLY PAY; production PPS TBD) | Source of truth for wallet balances and payment transaction references. Not owned by either application as an independent shadow ledger. |

AfyaX remains the user-facing commercial system for buyer–supplier trade. IOUX remains the financing / receivables lifecycle system. Neither should duplicate the other’s core records.

**Principle we agree with:** persistent cross-system identity. Every organisation, user, invoice, IOU, payment and (where used) wallet transaction must have an explicit mapping between AfyaX, IOUX and the PPS.

---

## 3. What we agree with (no debate needed)

- API-first, event-aware integration; HTTPS; REST/JSON; versioned paths (`/api/v1/...`).
- AfyaX is the **primary originator** of healthcare trade data.
- IOUX is the **source of truth** for the IOU financing lifecycle after an invoice/IOU is submitted.
- No duplicate organisation KYC in IOUX when AfyaX has already verified the party; IOUX stores a **verified reference / status**, not a second full KYC pack unless legally required later.
- Discount, listing, assignment, packaging and consent remain **IOUX-owned**. AfyaX should **not** set discount at listing.
- AfyaX stores IOUX identifiers (`organisation / party ID`, `invoice ID`, `iouRegistryId`) and uses them on subsequent calls.
- Payment activity originating in AfyaX must be synchronised into IOUX so the SPV/financier has an accurate collections view.
- Idempotency, request IDs, audit logs, TLS, least-privilege credentials, sandbox vs production credentials.
- SMPLY PAY is **simulation / testing only**, not the certified Kenyan production PPS.

---

## 4. Alignment: specification vs IOUX today

This is the current IOUX surface, not a promise that names will stay identical. We can add aliases if AfyaX needs the exact URIs in §20 of the specification.

| Spec requirement | IOUX today | Gap for v1 |
|------------------|------------|------------|
| Platform registration in IOUX Admin | Yes — organisation type `platform`; API keys with scopes | Confirm AfyaX as first platform org + credential issue process |
| Organisation onboarding AfyaX → IOUX | `POST /api/v1/parties` (API key, `parties:write`). Upsert by `afyaxId`. Returns `uzimaPartyId` and IOUX `id` | Spec uses `POST /organisations` and `external_organisation_id`. **Need mapping or alias** |
| Retrieve organisation | `GET /api/v1/parties/{uzimaPartyId}` | Spec `GET /organisations/{id}` — alias optional |
| User / admin onboarding via API | **Not exposed.** Users are created by IOUX Admin invite (`POST /admin/users/invite`) | **Gap.** Decide: API user create vs admin invite for v1 |
| Invoice create | `POST /api/v1/invoices` and `POST /api/v1/external/invoices` (API key). Returns `invoiceId` + `iouRegistryId`. Platform key stamps `source_platform_org_id` | Align field names (`external_invoice_id`, line items, order_id) |
| Direct IOU create `POST /ious` | IOUs are created as part of invoice origination (`origin: api_upload` / buyer-posted / supplier-listed). Lookup: `GET /api/v1/ious/{iouRegistryId}` | **Gap if AfyaX requires a separate `/ious` create.** Invoice create may be enough for v1 |
| Invoice / IOU status read | `GET /api/v1/invoices/{id}`, `GET /api/v1/invoices/{id}/status`, `GET /api/v1/ious/{iouRegistryId}` | Expand payload if AfyaX needs full financing/repayment bundle |
| Payment posting AfyaX → IOUX | `POST /api/v1/webhooks/payment-update` (API key `payments:write`, HMAC `X-AfyaX-Signature` + timestamp, idempotency key) | Spec `POST /ious/{id}/payments` — **keep webhook as v1 or add alias** |
| IOUX → AfyaX webhooks (`iou.created`, status, assigned, acquired, settled) | **Not built outbound** | **Largest product gap.** Needs AfyaX webhook URL, auth, and minimum event set |
| Shared PPS / wallets | Simulated ledger only when enabled; not production rails | Interface for SMPLY PAY then production PPS — **joint design** |
| HMAC on every API request | API key on REST; HMAC on payment webhook | Decide HMAC-for-all vs API key for pilot |
| `buyer_supplier` organisation type | Org type is `buyer` **or** `supplier` (also `spv`, `platform`) | Dual-role taxonomy not supported as a single org |

---

## 5. Proposed v1 contract (IOUX recommendation)

To start UAT quickly, we recommend **not** renaming the entire IOUX API to match the catalogue in one step. Instead:

### 5.1 AfyaX → IOUX (synchronous)

| Purpose | IOUX endpoint | Auth |
|---------|---------------|------|
| Register / upsert buyer or supplier | `POST /api/v1/parties` | API key, scope `parties:write` |
| Get party | `GET /api/v1/parties/{uzimaPartyId}` | `parties:read` |
| Submit invoice / receivable (creates IOUX invoice + registry IOU id) | `POST /api/v1/external/invoices` (or `POST /api/v1/invoices` with API key) | `invoices:write` |
| Read status | `GET /api/v1/invoices/{id}/status` | `invoices:read` |
| Lookup by registry ID | `GET /api/v1/ious/{iouRegistryId}` | JWT or agreed API-key path |
| Post buyer payment | `POST /api/v1/webhooks/payment-update` | `payments:write` + HMAC |

If AfyaX strongly prefers the specification URIs (`/organisations`, `/ious`, `/ious/{id}/payments`), IOUX can add **aliases** that wrap the same handlers. Please confirm whether aliases are required for v1 or a mapping table in AfyaX is acceptable.

### 5.2 Identifiers AfyaX must persist

| IOUX returns / uses | AfyaX should store as |
|---------------------|------------------------|
| `id` (organisation UUID) | IOUX organisation ID |
| `uzimaPartyId` | IOUX party / platform-facing org ID |
| `invoiceId` | IOUX invoice ID |
| `iouRegistryId` (e.g. `IOU-KE-YYYY-SEQ-CHK`) | IOUX IOU ID — **authoritative registry key** |
| `source_platform_org_id` | Set automatically when calling with AfyaX platform API key |

Subsequent invoices, payments and status calls should send **IOUX IDs**, plus AfyaX `external_*` references for idempotency.

### 5.3 IOUX → AfyaX (asynchronous) — to build

IOUX will implement outbound webhooks once AfyaX provides:

- Sandbox webhook URL  
- Production webhook URL  
- Shared HMAC secret (or equivalent)  
- Acknowledgement contract (`200` + `event_id` deduplication)

**Proposed minimum event set for v1** (please confirm or trim):

| Event | When |
|-------|------|
| `iou.created` | IOUX has a registry IOU for an AfyaX invoice |
| `iou.status_changed` | Material lifecycle change |
| `iou.assigned` | Assignment / consent completed |
| `iou.acquired` | SPV purchase recorded |
| `iou.payment_updated` | Collections view changed in IOUX |
| `iou.settled` | Instrument marked settled |

Until webhooks ship, AfyaX can **poll** `GET /invoices/{id}/status` as a fallback.

### 5.4 Users for v1

**Option A (faster):** IOUX Admin invites users after the organisation exists via `POST /parties`. AfyaX stores IOUX user IDs if we return them from a later API.

**Option B (spec):** IOUX adds `POST /api/v1/users` (API key) that creates the user, maps role, and sends the IOUX invitation email.

We need AfyaX’s preference. Option B is the right long-term fit; Option A unblocks organisation + invoice UAT immediately.

---

## 6. Questions for AfyaX (David Sule)

Please answer in writing or in the follow-up meeting. Numbered for tracking.

### 6.1 Onboarding and identity

1. Can AfyaX map `POST /parties` → your organisation create, storing `uzimaPartyId` + IOUX `id`, or do you require a literal `POST /organisations` alias in v1?
2. How should a party that is **both buyer and supplier** be represented? Two IOUX organisations, or a new `buyer_supplier` type?
3. For user provisioning: **Option A** (admin invite) or **Option B** (`POST /users` from AfyaX) for the first joint release?
4. What is the **minimum KYC payload** (fields + `kyc_status` / verification reference)? Will AfyaX ever push KYC **documents**, or reference-only as the spec prefers?
5. Confirm AfyaX `external_organisation_id` / `afyaxId` is stable and unique and will be sent on every party upsert.

### 6.2 Invoice and IOU

6. Will AfyaX **always** submit an invoice first (Path A), and only sometimes a direct IOU (Path B)?
7. If Path B is required in v1, is a separate `POST /ious` mandatory, or is `POST /external/invoices` returning `iouRegistryId` sufficient?
8. Confirm AfyaX will **not** send discount / listing price — IOUX/SPV owns pricing.
9. Who triggers “IOU created from invoice” in your product language: (a) immediately on invoice POST, (b) after buyer verification, or (c) after supplier opt-in? IOUX today treats the submitted instrument as an IOU in the registry with a lifecycle status; we need your UI mapping.
10. Please share AfyaX **order_id**, line-item, tax, and document fields that are **must-have** vs optional on invoice create.

### 6.3 Status and portal sync

11. Please send AfyaX’s **status enums** for organisation, invoice, IOU and payment so we can publish a mapping table (your §16 is a baseline, not final).
12. Which IOU fields must appear **read-only** on the AfyaX **supplier** portal vs **buyer** portal after sync?
13. After assignment / SPV acquisition, should AfyaX hide financing actions and/or deep-link into the IOUX portal?

### 6.4 Webhooks

14. Sandbox and production **webhook base URLs** for IOUX → AfyaX?
15. Preferred webhook auth: HMAC header (same pattern as IOUX payment webhook) or another scheme?
16. Which events from §5.3 are **must-have for first UAT** vs later?
17. Will AfyaX poll status if a webhook is missed, and at what interval?

### 6.5 Payments and PPS

18. Can v1 payments use existing `POST /webhooks/payment-update` (`amountPaid`, `outstandingBalance`, `nextDueDate`, `idempotencyKey` / `afyaxReference`, HMAC), or is `POST /ious/{id}/payments` with `pps_transaction_id` blocking?
19. Who implements the **SMPLY PAY** adapter first — AfyaX, IOUX, or a shared service?
20. What wallet / PPS IDs will AfyaX include on payment posts?
21. Rules for **partial payments**, **reversals**, and allocation to principal vs fees?

### 6.6 Security and environments

22. For the **pilot**: API key + scopes, or HMAC signing on every request from day one?
23. Confirm AfyaX will treat **Platform ID as identity, not a secret**, and will use a rotated Access Secret / API key.
24. Who operates **sandbox** credentials, test organisations, and UAT sign-off?
25. IP allowlisting required for production, or TLS + credentials sufficient for pilot?

### 6.7 Consent and audit

26. Confirm: **IOUX captures** buyer verification, supplier opt-in, offer accept, and assignment consent (including OTP). AfyaX receives **status + IDs only**, not raw OTP.
27. What assignment / SPV fields may be shown to AfyaX buyers and suppliers (vs SPV-only)?

---

## 7. Open decisions (joint — from your §26)

These remain open until the meeting. IOUX’s current lean:

| Decision | IOUX lean for v1 |
|----------|------------------|
| API authentication | API key + scopes for REST; HMAC on payment webhook and on outbound IOUX→AfyaX webhooks. HMAC-on-all-requests as a follow-on. |
| Organisation types | `buyer` and `supplier` as separate orgs until dual-role is specified. |
| IOU state machine | IOUX portal statuses remain SoR; publish a mapping table to AfyaX codes. |
| User roles | IOUX: `admin`, `buyer`, `supplier`, `spv` (+ platform org). Map AfyaX admins onto `buyer` / `supplier` by organisation type. |
| Authoritative invoice fields after sync | AfyaX: commercial invoice / order. IOUX: financing copy, listed amount, status, assignment. |
| Webhook policy | Retry with backoff; AfyaX acks by `event_id`; poll as backup. |
| PPS | SMPLY PAY behind an interface; production PPS later without changing AfyaX↔IOUX business APIs. |
| SPV visibility in AfyaX | High-level status; not full SPV commercial terms unless agreed. |

---

## 8. High-level acceptance criteria (shared)

We accept your §27 as the target. For the **first joint UAT**, IOUX proposes this subset as the gate:

1. AfyaX registers a buyer and a supplier in IOUX via API and stores returned IDs.  
2. AfyaX submits an invoice; IOUX returns `invoiceId` + `iouRegistryId`; retry with the same external/idempotency key does not duplicate.  
3. AfyaX can read IOU/invoice status from IOUX.  
4. AfyaX posts a successful (and a duplicate) payment; IOUX does not double-count.  
5. Material status is visible in IOUX SPV/buyer/supplier portals for the same registry ID.  
6. Sandbox credentials are distinct from production.

Outbound webhooks, API user create, PPS wallets, and Path B `POST /ious` can be sequenced immediately after this gate if you confirm they are in scope for the same release.

---

## 9. Proposed next steps

1. **Written answers** to §6 (this document).  
2. **Working session** to freeze: field mapping, status map, webhook URL, auth, Path A vs B.  
3. **Versioned API contract** (OpenAPI) owned jointly — IOUX can extend `docs/openapi.yaml` once names are agreed.  
4. **Sandbox**: IOUX issues AfyaX platform org + API key; AfyaX issues webhook URL + HMAC secret.  
5. **UAT script** covering onboarding, invoice, payment idempotency, and one full lifecycle.  
6. PPS / SMPLY PAY design as a **separate** workstream so it does not block identity + invoice + payment-post UAT.

---

## 10. Closing

The specification is the right architecture: **AfyaX originates trade, IOUX manages receivables financing, PPS holds money movement references.** IOUX can proceed on parties, invoices, registry IDs, platform stamping, and inbound payment updates **now**. The items that need AfyaX input before we over-build are: **user API vs invite**, **direct `/ious` vs invoice-only**, **outbound webhook contract**, **status mapping**, and **PPS ownership**.

Please review this note and reply to the numbered questions in §6. We are ready to meet to finalise the integration approach and sandbox plan.

---

*This review is based on the proposed AfyaX specification and the current IOUX `/api/v1` implementation. It is not a production certification of AfyaX, SMPLY PAY, or live payment rails.*
