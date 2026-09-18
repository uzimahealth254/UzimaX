# AfyaX UAT Report (with payment details)

| | |
|--|--|
| **Document** | IOUX-AfyaX-UAT-Report |
| **Date** | 15 September 2026 |
| **To** | Uzima Exchange Limited / Jugo Limited (Githuku) |
| **From** | Alfred Mulinge |
| **Contract** | UZIMA-SYS-PLAN-001 v1.6 · Annex A |
| **Live** | https://uzimax.onrender.com · API `https://uzimax.onrender.com/api/v1` |
| **Partner platform** | AfyaX |
| **AfyaX engineering** | David Sule (technical counterpart) |

---

## 1. Purpose

Confirm that Phase 1 partner integration between **IOUX** and the **AfyaX** platform was exercised on **production** — live API calls and portal workflows. AfyaX-side engineering was coordinated with David Sule.

## 2. Environment

| Item | Value |
|------|--------|
| Portal | https://uzimax.onrender.com |
| API base | https://uzimax.onrender.com/api/v1 |
| Database | Production Postgres |
| AfyaX purchase URL (UAT) | `https://manager.smplystore.com/api/v1/iou/purchase` |
| Auth | Platform API key (AfyaX) + portal JWT (operator roles) |

## 3. What was built and passed

| # | Area | Detail | Result |
|---|------|--------|--------|
| 1 | Health | `GET /api/v1/health` | Pass |
| 2 | Parties | `POST /parties` — buyer & supplier; unique `uzimaPartyId` issued | Pass |
| 3 | Users | `POST /users` — portal users linked to orgs | Pass |
| 4 | Invoice / IOU intake | `POST /external/invoices` → `invoiceId` + `iouRegistryId` (`IOU-KE-…`) | Pass |
| 5 | Status read | `GET /ious/{iouRegistryId}` | Pass |
| 6 | Supplier opt-in | Portal opt-in → assignment to SPV / `pending_settlement` | Pass |
| 7 | Disbursement | Escrow release → status `disbursed`, listing `sold` | Pass |
| 8 | Purchase webhook | IOUX → AfyaX `POST …/iou/purchase` on `iou.disbursed` only (DvS) | Pass (delivered) |
| 9 | Payment updates | `POST /webhooks/payment-update` HMAC path | Configured |
| 10 | Portals | Admin All Invoices, SPV Registry, Supplier Opt-in show live IOUs | Pass |

## 4. Instruments exercised (production)

| IOU registry ID | IOUX outcome | Notes |
|-----------------|--------------|--------|
| `IOU-KE-2026-00003-0` | Opt-in → disbursed | Integration URLs corrected mid-UAT |
| `IOU-KE-2026-00004-9` | Lifecycle + webhook attempted | Partner listing-state follow-up |
| `IOU-KE-2026-00005-8` | Disbursed / sold; webhook delivered | Asking-price alignment follow-up |
| `IOU-KE-2026-00006-7` | Disbursed / sold; webhook with asking/face amount | Fresh open listing needed for clean partner accept |

**Read-out:** IOUX registry, assignment, disbursement, and outbound webhook delivery work end-to-end on production.

## 5. Verdict

Phase 1 partner APIs are **built and live**. AfyaX technical UAT covering intake → opt-in → assignment → disbursement → purchase webhook **passed** on production.

---

## Payment details

| | |
|--|--|
| **Payee** | ALFRED MULINGE |
| **M-Pesa** | +254 708 758 500 |
| **Email** | binfred.ke@gmail.com |
| **Reference** | IOUX-INV-2026-09-001 |
