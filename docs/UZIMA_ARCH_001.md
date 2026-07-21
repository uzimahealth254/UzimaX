# Uzima — Full System Architecture & Implementation Guide

**Document:** `UZIMA-ARCH-001`
**Purpose:** Single engineering reference for rebuilding Uzima as a production-grade trade receivables / securitisation platform. Written for AI-assisted development (Cursor). Every section specifies what exists, what changes, and exactly what to build.
**Source authority:** UZIMA-SYS-PLAN-001 v1.3, AFIX-AUDIT-001, PRD v1.5, AfyaX integration meeting (20 Jul 2026), client requirements (CPF Githuku / UzimaX)
**Date:** 20 July 2026

---

## Table of Contents

1. [System Context & Parties](#1-system-context--parties)
2. [Target Architecture](#2-target-architecture)
3. [Database Schema (Postgres)](#3-database-schema-postgres)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [API Design (Unified Backend)](#5-api-design-unified-backend)
6. [AfyaX Integration Layer](#6-afyax-integration-layer)
7. [Core Business Modules](#7-core-business-modules)
8. [Wallet & Settlement Simulation](#8-wallet--settlement-simulation)
9. [Fees & Commissions Engine](#9-fees--commissions-engine)
10. [Signatory Governance & Documents](#10-signatory-governance--documents)
11. [Notifications](#11-notifications)
12. [Frontend Refactor](#12-frontend-refactor)
13. [Deployment & Infrastructure](#13-deployment--infrastructure)
14. [Migration Plan: Current → Target](#14-migration-plan-current--target)
15. [Implementation Sequence](#15-implementation-sequence)
16. [Appendix A: Audit Gap Closure Checklist](#appendix-a-audit-gap-closure-checklist)
17. [Appendix B: IOU Lifecycle State Machine](#appendix-b-iou-lifecycle-state-machine)
18. [Appendix C: Environment Variables](#appendix-c-environment-variables)

---

## 1. System Context & Parties

### 1.1 What Uzima is

A private-sector trade receivables platform that connects **buyers** (companies that owe on invoices), **suppliers** (sellers owed money), and an **SPV** (the single vehicle that purchases receivables). The platform registers IOUs, facilitates assignment of receivables to the SPV, manages escrow-style settlement views, and packages notes toward capital-market listing (NSE).

### 1.2 The five parties

| Party | Role in Uzima | Source of data |
|-------|---------------|----------------|
| **Buyer** | Posts approved invoices/IOUs; verifies supplier-originated invoices; pays at maturity | AfyaX trading platform (via API) or direct portal entry |
| **Supplier** | Lists invoices/receivable sale offers; opts in to sell buyer-originated IOUs; receives payment | AfyaX (via API) or direct portal entry |
| **SPV** | Purchases receivables at a discount; manages portfolio; packages notes | Uzima portal only |
| **Admin** (Platform operator) | Oversees pipeline, users, organisations, analytics, fees | Uzima portal only |
| **AfyaX** (Partner platform) | Originates credit purchases, generates IOUs, pushes registration and payment data | D. Sule's system; communicates via Uzima APIs |

### 1.3 Dual origination (v1.3 requirement)

Two entry paths coexist:

**Path A — Buyer-originated:**
Buyer posts invoice/IOU → IOU registered → Supplier notified (opt in / sell) → Supplier accepts → Assignment to SPV → Settlement

**Path B — Supplier-originated:**
Supplier posts invoice / receivable sale offer → IOU registered → Buyer notified (verify / accept) → Buyer accepts → Auto-assign to SPV → Pay supplier → Debit buyer account

Both paths converge at the IOU registry and follow the same downstream lifecycle (SPV purchase, escrow, packaging).

### 1.4 Relationship with AfyaX

AfyaX is NOT part of Uzima's codebase. It is an external trading platform that:

- Has its own buyer/supplier registration, KYC, and credit purchase flows
- Generates IOUs with interest terms and installment schedules
- Will push data TO Uzima via REST APIs
- Will receive AFIX-issued unique party IDs back
- Will push per-note payment updates (amount, balance, next due date)
- Does NOT set the listing discount — that is configured in Uzima
- Has its own (demo-only) payments processing software — production payments need a licensed processor

**What Uzima builds:** The APIs that AfyaX calls. Not AfyaX itself.

---

## 2. Target Architecture

### 2.1 Architecture diagram (target state)

```
┌──────────────────────────────────────────────────────────────────────┐
│  BROWSER (Vite React SPA)                                            │
│  ├── Supplier Portal  (/supplier/*)                                  │
│  ├── Buyer Portal     (/buyer/*)                                     │
│  ├── SPV Portal       (/spv/*)                                       │
│  └── Admin Portal     (/admin/*)                                     │
│  Auth: JWT tokens in httpOnly cookies or Authorization header        │
│  State: @tanstack/react-query against API (NO local seed state)      │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼──────────────────────────────────────────┐
│  UNIFIED API (Express 5 / Node.js)                                   │
│  ├── Auth middleware (JWT verify + role check)                       │
│  ├── /api/v1/auth/*           — login, refresh, password reset       │
│  ├── /api/v1/parties/*        — registration, KYC, unique IDs        │
│  ├── /api/v1/invoices/*       — CRUD, status transitions             │
│  ├── /api/v1/ious/*           — registry, lookup                     │
│  ├── /api/v1/opt-ins/*        — opt-in inbox, respond                │
│  ├── /api/v1/offers/*         — SPV purchase offers                  │
│  ├── /api/v1/consents/*       — assignment consent                   │
│  ├── /api/v1/assignments/*    — receivable assignments               │
│  ├── /api/v1/escrow/*         — settlement legs                      │
│  ├── /api/v1/wallets/*        — balance, transactions                │
│  ├── /api/v1/packages/*       — note packaging                       │
│  ├── /api/v1/fees/*           — commission config + splits           │
│  ├── /api/v1/documents/*      — upload, download, signatories        │
│  ├── /api/v1/notifications/*  — email, SMS, in-app                   │
│  ├── /api/v1/admin/*          — users, orgs, analytics, audit        │
│  └── /api/v1/webhooks/*       — AfyaX inbound events                 │
│  Rate limiting: express-rate-limit (Redis-backed in prod)            │
│  Validation: zod schemas on every route                              │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────┐
│  POSTGRESQL 15                                                       │
│  ├── public schema (all application tables)                          │
│  ├── Row-Level Security on multi-tenant tables                       │
│  ├── Audit trigger (every mutation → audit_log)                      │
│  └── pgcrypto for UUIDs                                              │
│  Connection: via Prisma ORM or Drizzle ORM (recommend Drizzle)       │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  EXTERNAL SERVICES                                                   │
│  ├── AfyaX Trading Platform    → calls /api/v1/parties, invoices,    │
│  │                                webhooks/payment-updates            │
│  ├── Email (Resend / SMTP)     → transactional notifications         │
│  ├── SMS (Africa's Talking)    → optional; stub until gateway ready  │
│  ├── Object Storage (S3/R2)    → documents, certificates, invoices   │
│  └── Redis (optional)          → rate limiting, session cache        │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Key architectural decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Single backend** | Express 5 (existing) | No microservices until scale demands it; AfyaX services are consumed, not rebuilt |
| **ORM** | Drizzle (recommended) or Prisma | Type-safe, migration-friendly, works with Postgres |
| **Portal state** | `@tanstack/react-query` fetching from API | Eliminates the dual-store problem (audit issue #1) |
| **Auth** | JWT (access + refresh tokens) | Simple, stateless verification; upgrade to Keycloak later if needed |
| **File storage** | S3-compatible (Cloudflare R2 or AWS S3) | Documents, certificates, invoice PDFs |
| **Wallets** | Simulation (ledger entries in DB) | Production payments out of scope; simulation-ready for demo + UAT |
| **Deploy** | Render (existing sketch) or Railway | Portal static + API service + Postgres managed |

### 2.3 What gets deleted from the current codebase

| Remove | Why |
|--------|-----|
| `src/contexts/DataContext.tsx` | Replaced by API calls via react-query |
| `src/data/seed.ts` | Replaced by database seed script |
| `server/store.js` + `server/data/store.json` | Replaced by Postgres |
| Hardcoded `demoUsers` in `AuthContext` | Replaced by DB users + JWT |
| All portal business logic mutations in DataContext | Moved to API routes |

---

## 3. Database Schema (Postgres)

### 3.1 Core tables

```sql
-- ============================================================
-- ORGANISATIONS & USERS
-- ============================================================

CREATE TABLE organisations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  registration_no TEXT,
  org_type        TEXT NOT NULL CHECK (org_type IN ('buyer', 'supplier', 'spv', 'platform')),
  afyax_id        TEXT UNIQUE,              -- ID in AfyaX system (if pushed from there)
  uzima_party_id  TEXT UNIQUE NOT NULL,      -- Uzima-issued unique party ID returned to AfyaX
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
  metadata        JSONB DEFAULT '{}',        -- flexible KYC fields, address, etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin', 'buyer', 'supplier', 'spv')),
  org_id          UUID REFERENCES organisations(id),
  is_signatory    BOOLEAN DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'active',
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SIGNATORY GOVERNANCE
-- ============================================================

CREATE TABLE signatories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  org_id          UUID NOT NULL REFERENCES organisations(id),
  role_title      TEXT,                      -- e.g. 'Director', 'CFO'
  approval_cert_url TEXT,                    -- S3 path to individual approval certificate
  specimen_sig_url  TEXT,                    -- S3 path to specimen signature image
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE org_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organisations(id),
  doc_type        TEXT NOT NULL CHECK (doc_type IN (
    'board_resolution', 'incorporation_cert', 'licence_cert',
    'specimen_signatures', 'originator_cert', 'other'
  )),
  file_url        TEXT NOT NULL,             -- S3 path
  uploaded_by     UUID REFERENCES users(id),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INVOICES & IOU REGISTRY
-- ============================================================

CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iou_registry_id TEXT UNIQUE,               -- e.g. IOU-KE-2026-00001-7
  origin          TEXT NOT NULL CHECK (origin IN ('buyer_posted', 'supplier_listed', 'api_upload')),
  originator_id   UUID NOT NULL REFERENCES organisations(id), -- who created this entry

  buyer_org_id    UUID NOT NULL REFERENCES organisations(id),
  supplier_org_id UUID NOT NULL REFERENCES organisations(id),

  invoice_number  TEXT,
  po_reference    TEXT,
  face_value      NUMERIC(15,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'KES',
  issue_date      DATE NOT NULL,
  due_date        DATE NOT NULL,
  payment_terms_days INTEGER,

  -- IOU terms (from AfyaX or manual entry)
  interest_rate   NUMERIC(6,4),              -- e.g. 0.0500 for 5%
  interest_type   TEXT,                       -- 'percentage_of_balance', 'flat', etc.
  installment_frequency TEXT,                 -- 'weekly', 'monthly', 'lump_sum'
  num_installments INTEGER,
  total_interest  NUMERIC(15,2),
  total_payable   NUMERIC(15,2),

  -- listing
  listed_amount   NUMERIC(15,2),             -- amount supplier wants to discount (can be partial)
  listing_status  TEXT DEFAULT 'unlisted' CHECK (listing_status IN ('unlisted', 'listed', 'sold', 'withdrawn')),
  discount_rate_bps INTEGER,                 -- basis points; set in Uzima, NOT AfyaX

  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'listed', 'awaiting_opt_in', 'awaiting_buyer_verification',
    'verified', 'offer_received', 'offer_accepted', 'assigned',
    'packaged', 'disbursed', 'matured', 'settled',
    'opt_in_declined', 'buyer_rejected', 'defaulted', 'cancelled'
  )),

  line_items      JSONB,
  supporting_docs JSONB DEFAULT '[]',        -- array of {doc_type, file_url}
  metadata        JSONB DEFAULT '{}',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_buyer ON invoices(buyer_org_id);
CREATE INDEX idx_invoices_supplier ON invoices(supplier_org_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_iou_registry ON invoices(iou_registry_id);

-- ============================================================
-- INSTALLMENT SCHEDULES (from AfyaX or manual)
-- ============================================================

CREATE TABLE installment_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  installment_no  INTEGER NOT NULL,
  due_date        DATE NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
  paid_amount     NUMERIC(15,2) DEFAULT 0,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- STATUS HISTORY (full audit trail per invoice)
-- ============================================================

CREATE TABLE invoice_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  from_status     TEXT,
  to_status       TEXT NOT NULL,
  changed_by      UUID REFERENCES users(id),
  reason          TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- OPT-INS (buyer-originated path: supplier decides)
-- ============================================================

CREATE TABLE opt_ins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id),
  supplier_org_id UUID NOT NULL REFERENCES organisations(id),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  decline_reason  TEXT,
  responded_by    UUID REFERENCES users(id),
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BUYER VERIFICATIONS (supplier-originated path: buyer decides)
-- ============================================================

CREATE TABLE buyer_verifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id),
  buyer_org_id    UUID NOT NULL REFERENCES organisations(id),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'disputed')),
  reject_reason   TEXT,
  verified_by     UUID REFERENCES users(id),
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SPV PURCHASE OFFERS
-- ============================================================

CREATE TABLE purchase_offers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id),
  spv_org_id      UUID NOT NULL REFERENCES organisations(id),
  discount_rate_bps INTEGER NOT NULL,
  tenor_days      INTEGER NOT NULL,
  purchase_price  NUMERIC(15,2) NOT NULL,
  face_value      NUMERIC(15,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'withdrawn')),
  expires_at      TIMESTAMPTZ,
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ASSIGNMENT CONSENTS
-- ============================================================

CREATE TABLE assignment_consents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id            UUID NOT NULL REFERENCES invoices(id),
  buyer_org_id          UUID NOT NULL REFERENCES organisations(id),
  spv_org_id            UUID NOT NULL REFERENCES organisations(id),
  signatory_id          UUID REFERENCES signatories(id),
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'rejected')),
  otp_verified          BOOLEAN DEFAULT false,
  signature_hash        TEXT,                 -- hash of the digital signature
  payment_redirect_acct TEXT,                 -- SPV escrow account
  signed_at             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RECEIVABLE ASSIGNMENTS
-- ============================================================

CREATE TABLE assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id),
  offer_id        UUID REFERENCES purchase_offers(id),
  consent_id      UUID REFERENCES assignment_consents(id),
  spv_org_id      UUID NOT NULL REFERENCES organisations(id),
  supplier_org_id UUID NOT NULL REFERENCES organisations(id),
  buyer_org_id    UUID NOT NULL REFERENCES organisations(id),
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('opt_in_auto', 'offer_consent', 'supplier_originated_auto')),
  purchase_price  NUMERIC(15,2),
  face_value      NUMERIC(15,2) NOT NULL,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'settled', 'defaulted'))
);

-- ============================================================
-- WALLETS (simulation — one per org)
-- ============================================================

CREATE TABLE wallets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID UNIQUE NOT NULL REFERENCES organisations(id),
  balance         NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'KES',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wallet_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       UUID NOT NULL REFERENCES wallets(id),
  type            TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount          NUMERIC(15,2) NOT NULL,
  reference       TEXT,                      -- e.g. 'assignment:UUID', 'fee:UUID', 'payment:UUID'
  description     TEXT,
  counterparty_wallet_id UUID REFERENCES wallets(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ESCROW LEGS
-- ============================================================

CREATE TABLE escrow_legs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   UUID NOT NULL REFERENCES assignments(id),
  leg_type        TEXT NOT NULL CHECK (leg_type IN (
    'disbursement_to_supplier', 'collection_from_buyer',
    'fee_to_platform', 'payout_to_spv'
  )),
  amount          NUMERIC(15,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'released', 'collected', 'failed')),
  reference       TEXT,
  executed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FEES & COMMISSIONS
-- ============================================================

CREATE TABLE fee_configurations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_type        TEXT NOT NULL CHECK (fee_type IN ('platform_spread', 'transaction_pct', 'flat_fee')),
  rate_bps        INTEGER,                   -- basis points for percentage-based
  flat_amount     NUMERIC(15,2),             -- for flat fees
  applies_to      TEXT NOT NULL CHECK (applies_to IN ('supplier', 'spv', 'buyer', 'all')),
  is_active       BOOLEAN DEFAULT true,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fee_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   UUID REFERENCES assignments(id),
  fee_config_id   UUID REFERENCES fee_configurations(id),
  charged_to_org  UUID REFERENCES organisations(id),
  amount          NUMERIC(15,2) NOT NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'waived')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SECURITISATION PACKAGES
-- ============================================================

CREATE TABLE packages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_ref         TEXT UNIQUE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'structured', 'listed', 'placed', 'settled')),
  risk_band           TEXT,
  weighted_avg_tenor  INTEGER,
  total_face_value    NUMERIC(15,2),
  total_purchase_price NUMERIC(15,2),
  nse_reference       TEXT,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE package_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id      UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  assignment_id   UUID NOT NULL REFERENCES assignments(id),
  added_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FINANCING PROGRAMMES
-- ============================================================

CREATE TABLE programmes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  buyer_org_id    UUID REFERENCES organisations(id),
  max_exposure    NUMERIC(15,2),
  max_tenor_days  INTEGER,
  discount_band_min_bps INTEGER,
  discount_band_max_bps INTEGER,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BUYER PAYMENT UPDATES (from AfyaX)
-- ============================================================

CREATE TABLE payment_updates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id),
  source          TEXT NOT NULL DEFAULT 'afyax',  -- 'afyax', 'manual', 'bank_feed'
  amount_paid     NUMERIC(15,2) NOT NULL,
  outstanding_balance NUMERIC(15,2) NOT NULL,
  next_due_date   DATE,
  payment_method  TEXT,
  afyax_reference TEXT,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  type            TEXT NOT NULL,              -- 'opt_in_request', 'consent_request', 'payment_received', etc.
  title           TEXT NOT NULL,
  body            TEXT,
  reference_type  TEXT,                       -- 'invoice', 'assignment', 'payment', etc.
  reference_id    UUID,
  is_read         BOOLEAN DEFAULT false,
  channel         TEXT DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'sms')),
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT LOG (immutable)
-- ============================================================

CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID REFERENCES users(id),
  actor_email     TEXT,
  action          TEXT NOT NULL,              -- 'invoice.created', 'opt_in.accepted', etc.
  resource_type   TEXT NOT NULL,              -- 'invoice', 'assignment', 'wallet', etc.
  resource_id     UUID,
  details         JSONB DEFAULT '{}',
  ip_address      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
```

### 3.2 Seed script

Create `server/db/seed.ts` that:
1. Creates platform organisation (Uzima) + admin user
2. Creates 2 buyer orgs, 3 supplier orgs, 1 SPV org with wallets
3. Creates demo users per org
4. Creates ~20 invoices across various statuses to populate all portal views
5. Creates sample opt-ins, offers, consents, assignments, escrow legs, packages
6. Creates sample fee configurations

Passwords: hash with `bcrypt`, rounds=12. Demo password: use env `DEMO_PASSWORD` or default `Uzima2026!`.

---

## 4. Authentication & Authorization

### 4.1 What exists (from audit)
- Hardcoded demo users in `AuthContext`
- Shared password `AFIX2026!`
- `localStorage` session
- Client-side `ProtectedRoute` only
- Multiple API routes unauthenticated

### 4.2 Target implementation

**Auth flow:**
```
POST /api/v1/auth/login
  Body: { email, password }
  Returns: { accessToken (15min), refreshToken (7d), user }

POST /api/v1/auth/refresh
  Body: { refreshToken }
  Returns: { accessToken }

POST /api/v1/auth/logout
  Invalidates refresh token

POST /api/v1/auth/forgot-password
  Sends reset email

POST /api/v1/auth/reset-password
  Body: { token, newPassword }
```

**Middleware chain (every protected route):**
```typescript
// server/middleware/auth.ts
import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { userId, email, role, orgId }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function authorize(...roles: string[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

**API key auth (for AfyaX and external buyers):**
```typescript
// server/middleware/apiKeyAuth.ts
export function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'];
  // Look up in DB: api_keys table with org_id, hashed key, scopes, active flag
  // Set req.apiClient = { orgId, orgType, scopes }
}
```

**API keys table:**
```sql
CREATE TABLE api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organisations(id),
  key_hash    TEXT NOT NULL,           -- bcrypt hash of the key
  label       TEXT,                     -- 'AfyaX Production', 'Buyer ABC Sandbox'
  scopes      TEXT[] DEFAULT '{}',     -- ['invoices:write', 'parties:write', 'payments:write']
  is_active   BOOLEAN DEFAULT true,
  last_used   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.3 Frontend auth refactor

Replace `AuthContext` with:
```typescript
// src/contexts/AuthContext.tsx (new)
// - Login calls POST /api/v1/auth/login
// - Stores tokens in memory (not localStorage for access token)
// - Refresh token in httpOnly cookie or secure storage
// - useAuth() hook provides { user, login, logout, isAuthenticated }
// - Axios/fetch interceptor attaches Bearer token
// - On 401, attempt refresh; on failure, redirect to login
```

---

## 5. API Design (Unified Backend)

### 5.1 Routing structure

```
server/
├── index.ts                    -- Express app setup, middleware, route mounting
├── db/
│   ├── client.ts               -- Drizzle/Prisma client
│   ├── schema.ts               -- Drizzle schema (mirrors SQL above)
│   ├── migrate.ts              -- Migration runner
│   └── seed.ts                 -- Seed script
├── middleware/
│   ├── auth.ts                 -- JWT + role middleware
│   ├── apiKeyAuth.ts           -- API key middleware for external callers
│   ├── validate.ts             -- Zod validation middleware
│   ├── rateLimit.ts            -- Rate limiting
│   └── audit.ts                -- Auto audit-log middleware
├── routes/
│   ├── auth.ts                 -- /api/v1/auth/*
│   ├── parties.ts              -- /api/v1/parties/*
│   ├── invoices.ts             -- /api/v1/invoices/*
│   ├── ious.ts                 -- /api/v1/ious/*
│   ├── optIns.ts               -- /api/v1/opt-ins/*
│   ├── buyerVerifications.ts   -- /api/v1/buyer-verifications/*
│   ├── offers.ts               -- /api/v1/offers/*
│   ├── consents.ts             -- /api/v1/consents/*
│   ├── assignments.ts          -- /api/v1/assignments/*
│   ├── escrow.ts               -- /api/v1/escrow/*
│   ├── wallets.ts              -- /api/v1/wallets/*
│   ├── packages.ts             -- /api/v1/packages/*
│   ├── fees.ts                 -- /api/v1/fees/*
│   ├── programmes.ts           -- /api/v1/programmes/*
│   ├── documents.ts            -- /api/v1/documents/*
│   ├── notifications.ts        -- /api/v1/notifications/*
│   ├── paymentUpdates.ts       -- /api/v1/payment-updates/*
│   ├── admin.ts                -- /api/v1/admin/*
│   └── webhooks.ts             -- /api/v1/webhooks/* (AfyaX inbound)
├── services/
│   ├── invoiceService.ts       -- Business logic for invoice lifecycle
│   ├── assignmentService.ts    -- Assignment creation (both paths)
│   ├── pricingService.ts       -- Tenor-based discount calculator
│   ├── feeService.ts           -- Fee calculation + ledger entries
│   ├── walletService.ts        -- Credit/debit operations
│   ├── escrowService.ts        -- Escrow leg management
│   ├── notificationService.ts  -- Multi-channel dispatch
│   ├── iouService.ts           -- IOU ID generation + registry
│   ├── documentService.ts      -- S3 upload/download
│   └── auditService.ts         -- Audit log writer
├── lib/
│   ├── iouId.ts                -- IOU-KE-YYYY-NNNNN-C scheme (existing, move here)
│   ├── pricing.ts              -- Discount calculation (existing, move here)
│   └── errors.ts               -- Custom error classes
└── types/
    └── index.ts                -- Shared TypeScript types
```

### 5.2 Critical API endpoints for AfyaX integration

These are the endpoints Sule's system will call:

```
# Party registration (AfyaX pushes supplier/buyer details)
POST   /api/v1/parties
  Auth: API key (scope: parties:write)
  Body: { name, registrationNo, orgType, kycDocuments[], afyaxId }
  Returns: { uzimaPartyId }  ← AfyaX stores this for future calls

# Invoice / IOU submission
POST   /api/v1/invoices
  Auth: API key (scope: invoices:write)
  Body: {
    buyerPartyId, supplierPartyId, invoiceNumber, poReference,
    faceValue, currency, issueDate, dueDate, paymentTermsDays,
    interestRate, interestType, installmentFrequency, numInstallments,
    totalInterest, totalPayable,
    installmentSchedule: [{ installmentNo, dueDate, amount }],
    origin: 'api_upload'
  }
  Returns: { invoiceId, iouRegistryId, status }

# Payment update push (buyer made a payment on AfyaX)
POST   /api/v1/webhooks/payment-update
  Auth: API key (scope: payments:write)
  Body: {
    invoiceId OR iouRegistryId,
    amountPaid, outstandingBalance, nextDueDate,
    paymentMethod, afyaxReference
  }
  Effect: Creates payment_updates row, updates installment_schedules,
          notifies SPV wallet, updates invoice metadata

# Get party details (AfyaX queries Uzima for a party)
GET    /api/v1/parties/:uzimaPartyId
  Auth: API key (scope: parties:read)

# Get invoice status
GET    /api/v1/invoices/:id/status
  Auth: API key (scope: invoices:read)
```

---

## 6. AfyaX Integration Layer

### 6.1 Integration summary (from the Sule meeting)

| Surface | Direction | Trigger | Endpoint |
|---------|-----------|---------|----------|
| Party registration | AfyaX → Uzima | New supplier/buyer on AfyaX | `POST /api/v1/parties` |
| IOU submission | AfyaX → Uzima | Credit purchase completed, IOU generated | `POST /api/v1/invoices` |
| Payment update | AfyaX → Uzima | Buyer makes installment or lump sum payment | `POST /api/v1/webhooks/payment-update` |
| Party ID lookup | AfyaX → Uzima | AfyaX needs full Uzima party record | `GET /api/v1/parties/:id` |
| Invoice status | AfyaX → Uzima | AfyaX wants to show listing/assignment status | `GET /api/v1/invoices/:id/status` |
| KYC documents | AfyaX → Uzima | Sent with party registration | Multipart upload via `POST /api/v1/documents` |

### 6.2 Key rules from the meeting

1. **Discount is set in Uzima, not AfyaX.** The AfyaX listing screen should NOT have a discount field. Sule will remove it from his side.
2. **Uzima issues unique party IDs.** When AfyaX pushes a new party, Uzima generates and returns a `uzimaPartyId`. AfyaX stores this. All subsequent calls reference this ID.
3. **Repeat submissions use party IDs.** After initial registration, AfyaX sends IOU details with `buyerPartyId` + `supplierPartyId` (not full name/registration each time, though name can be included for diligence).
4. **Payment data is critical.** When a buyer pays an installment, AfyaX pushes `{ amountPaid, outstandingBalance, nextDueDate }`. SPV sees this in real-time.
5. **Signatory documents travel with party records.** Board resolution, specimen signatures, approval certificates are uploaded once during registration.

### 6.3 Implementation notes

```typescript
// server/routes/webhooks.ts
router.post('/payment-update', apiKeyAuth, validate(paymentUpdateSchema), async (req, res) => {
  const { invoiceId, iouRegistryId, amountPaid, outstandingBalance, nextDueDate, paymentMethod, afyaxReference } = req.body;

  // 1. Find the invoice
  const invoice = await findInvoice(invoiceId, iouRegistryId);

  // 2. Create payment_updates record
  await db.insert(paymentUpdates).values({ ... });

  // 3. Update relevant installment_schedule row
  await updateInstallmentStatus(invoice.id, amountPaid);

  // 4. Find the assignment for this invoice
  const assignment = await findAssignment(invoice.id);

  // 5. If assignment exists, credit SPV wallet
  if (assignment) {
    await walletService.credit(assignment.spvOrgId, amountPaid, `payment:${invoice.id}`);

    // 6. Deduct platform fee if applicable
    const fee = await feeService.calculate(assignment, amountPaid);
    if (fee > 0) {
      await walletService.debit(assignment.spvOrgId, fee, `fee:${invoice.id}`);
      await walletService.credit(platformOrgId, fee, `fee:${invoice.id}`);
    }

    // 7. Notify SPV
    await notificationService.send(assignment.spvOrgId, {
      type: 'payment_received',
      title: `Payment received: KES ${amountPaid}`,
      body: `Buyer payment on ${invoice.iouRegistryId}. Balance: KES ${outstandingBalance}`,
      referenceType: 'invoice',
      referenceId: invoice.id,
    });
  }

  // 8. Check if fully settled
  if (outstandingBalance <= 0) {
    await invoiceService.transition(invoice.id, 'settled', req.apiClient.orgId);
  }

  res.json({ received: true });
});
```

---

## 7. Core Business Modules

### 7.1 Invoice lifecycle service

```typescript
// server/services/invoiceService.ts

// Dual origination: two entry points, same downstream

async function createBuyerOriginatedInvoice(data, buyerOrgId) {
  // 1. Create invoice with status 'awaiting_opt_in', origin 'buyer_posted'
  // 2. Generate IOU registry ID
  // 3. Create opt_in record for the supplier
  // 4. Notify supplier: "You have a new invoice to review — opt in or decline"
  // 5. Log to audit + status_history
}

async function createSupplierOriginatedInvoice(data, supplierOrgId) {
  // 1. Create invoice with status 'awaiting_buyer_verification', origin 'supplier_listed'
  // 2. Generate IOU registry ID
  // 3. Create buyer_verification record
  // 4. Notify buyer: "A supplier has listed an invoice against you — verify and accept"
  // 5. Log to audit + status_history
}

async function handleOptInResponse(optInId, accepted, reason, userId) {
  // If accepted:
  //   1. Update opt_in status → 'accepted'
  //   2. Transition invoice → 'assigned' (or 'listed' if going through SPV offer flow)
  //   3. Auto-create assignment to SPV
  //   4. Create escrow legs (disbursement_to_supplier)
  //   5. Credit supplier wallet, debit buyer account (simulation)
  //   6. Notify SPV: new assignment
  // If declined:
  //   1. Update opt_in status → 'declined' with reason
  //   2. Transition invoice → 'opt_in_declined'
  //   3. Notify buyer
}

async function handleBuyerVerification(verificationId, accepted, reason, userId) {
  // If verified/accepted:
  //   1. Update verification status → 'verified'
  //   2. Transition invoice → 'assigned'
  //   3. Auto-create assignment to SPV
  //   4. Create escrow legs
  //   5. Pay supplier wallet, debit buyer account (simulation)
  //   6. Notify supplier + SPV
  // If rejected:
  //   1. Update verification → 'rejected'
  //   2. Transition invoice → 'buyer_rejected'
  //   3. Notify supplier
}

// State machine transitions (see Appendix B)
async function transition(invoiceId, toStatus, actorId, reason?) {
  // Validate transition is legal
  // Update invoice.status
  // Insert into invoice_status_history
  // Insert into audit_log
}
```

### 7.2 Assignment service

Three assignment types:
1. **`opt_in_auto`** — Buyer posted, supplier accepted opt-in → auto-assign
2. **`offer_consent`** — Goes through SPV offer → supplier accepts → buyer consent → assign
3. **`supplier_originated_auto`** — Supplier posted, buyer verified → auto-assign

```typescript
async function createAssignment(invoiceId, type, opts) {
  // 1. Verify invoice is in correct state for this assignment type
  // 2. Create assignment record
  // 3. Create escrow legs:
  //    - disbursement_to_supplier (purchase price)
  //    - collection_from_buyer (face value at maturity)
  //    - fee_to_platform (calculated)
  //    - payout_to_spv (collection minus fee)
  // 4. Calculate and record fees
  // 5. Wallet operations (simulation):
  //    - Debit SPV wallet (purchase price)
  //    - Credit supplier wallet (purchase price minus supplier fee)
  //    - Credit platform wallet (fees)
  // 6. Transition invoice → 'assigned'
  // 7. Notify all parties
  // 8. Generate purchase note document for supplier
}
```

---

## 8. Wallet & Settlement Simulation

### 8.1 Design principle

Wallets are **simulation-only** — ledger entries in Postgres, no real money movement. Every org gets one wallet. The wallet balance is the sum of its transactions.

### 8.2 Wallet service

```typescript
// server/services/walletService.ts

async function getOrCreateWallet(orgId: string) {
  // Find or create wallet for org
}

async function credit(orgId, amount, reference, description?) {
  // 1. Get wallet
  // 2. Insert wallet_transaction (type: 'credit')
  // 3. Update wallet.balance += amount
  // 4. Return new balance
}

async function debit(orgId, amount, reference, description?) {
  // 1. Get wallet
  // 2. Check sufficient balance (warn but allow negative in simulation)
  // 3. Insert wallet_transaction (type: 'debit')
  // 4. Update wallet.balance -= amount
  // 5. Return new balance
}

async function getTransactions(orgId, filters?) {
  // Return paginated transaction history
}
```

### 8.3 Settlement flow (simulation)

When an assignment is created:
1. SPV wallet debited (purchase price to supplier)
2. Supplier wallet credited (purchase price minus fees)
3. Platform wallet credited (fees)

When a buyer payment comes in (via AfyaX webhook):
1. SPV wallet credited (payment amount)
2. Platform wallet credited (per-payment fee if applicable)
3. Escrow leg status updated

When all payments received (outstandingBalance = 0):
1. Invoice status → 'settled'
2. Assignment status → 'settled'
3. All escrow legs → 'collected'/'released'

---

## 9. Fees & Commissions Engine

### 9.1 Design (model TBC with UzimaX)

The fee model is configurable — the exact commercial terms are still being confirmed. The engine supports:

| Fee type | How it works |
|----------|--------------|
| **Platform spread** | Platform quotes supplier a slightly lower price than what SPV pays; keeps the delta |
| **Transaction percentage** | X basis points on each assignment value |
| **Per-payment percentage** | X basis points on each buyer repayment that flows through |
| **Flat fee** | Fixed KES amount per transaction |

### 9.2 Implementation

```typescript
// server/services/feeService.ts

async function calculateAssignmentFees(assignment) {
  // Load active fee_configurations
  // For each applicable config, calculate the fee amount
  // Return array of { feeConfigId, amount, chargedToOrg }
}

async function recordFees(assignmentId, fees) {
  // Insert into fee_ledger
  // Execute wallet transactions (debit charged org, credit platform)
}

// Admin can CRUD fee_configurations via /api/v1/fees/*
// Fee ledger is read-only (immutable record)
```

---

## 10. Signatory Governance & Documents

### 10.1 Requirements (from Sule meeting)

1. Each org uploads a **board resolution** showing approved signatories
2. Each signatory uploads an **individual approval certificate**
3. Each signatory uploads a **specimen signature**
4. On critical actions (assignment consent, listing approval), the signatory is verified via **OTP** before digital signature is applied
5. Generated documents (purchase notes, assignment letters, receipts) have the digital signature appended

### 10.2 Implementation

**Document upload:**
```typescript
// server/routes/documents.ts
router.post('/upload',
  authenticate,
  multer({ storage: s3Storage }).single('file'),
  async (req, res) => {
    // 1. Upload to S3/R2
    // 2. Create org_documents record
    // 3. If signatory document, link to signatories table
    // 4. Audit log
  }
);
```

**OTP-verified digital signature on consents:**
```typescript
// server/routes/consents.ts
router.post('/:id/sign', authenticate, async (req, res) => {
  // 1. Verify user is an active signatory for the org
  // 2. Send OTP to user's registered email/phone
  // 3. Return { otpSent: true, consentId }
});

router.post('/:id/confirm-sign', authenticate, async (req, res) => {
  const { otp } = req.body;
  // 1. Verify OTP
  // 2. Generate signature hash (hash of: consentId + userId + timestamp + documentHash)
  // 3. Update consent: status → 'signed', otp_verified → true, signature_hash, signed_at
  // 4. Trigger downstream: create assignment if all consents signed
  // 5. Generate PDF assignment letter with appended signature
  // 6. Notify all parties
  // 7. Audit log
});
```

### 10.3 Transaction documents to generate

| Document | When | Recipients |
|----------|------|------------|
| **Purchase note** | On IOU listing (submitted to Uzima) | Supplier (email + download) |
| **Assignment letter** | On assignment creation | Supplier + buyer + SPV |
| **Payment receipt** | On each buyer payment | Buyer (email + download) |
| **Package summary** | On package creation | SPV + admin |

Generate as PDFs using a library like `@react-pdf/renderer` (server-side) or `pdfkit`, store in S3, link in notifications.

---

## 11. Notifications

### 11.1 Multi-channel dispatch

```typescript
// server/services/notificationService.ts

async function send(targetOrgId, notification) {
  // 1. Find all users in the org
  // 2. Create in-app notification record
  // 3. If email configured: send via Resend/SMTP
  // 4. If SMS configured: send via Africa's Talking
}

// Notification types:
// - opt_in_request (supplier: you have an invoice to review)
// - buyer_verification_request (buyer: supplier listed against you)
// - assignment_created (SPV: new receivable assigned)
// - payment_received (SPV: buyer made a payment)
// - consent_required (buyer: sign assignment consent)
// - purchase_note (supplier: your IOU has been purchased)
// - document_ready (any: download your receipt/letter)
// - programme_limit_warning (admin: approaching exposure limit)
```

### 11.2 Email templates

Create in `server/templates/` using a simple HTML template engine (e.g., handlebars). Brand with Uzima blue/green/white.

---

## 12. Frontend Refactor

### 12.1 Replace DataContext with react-query

```typescript
// src/lib/api.ts — Axios instance with auth interceptor
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });
api.interceptors.request.use((config) => {
  const token = authStore.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// src/hooks/useInvoices.ts
export function useInvoices(filters) {
  return useQuery(['invoices', filters], () =>
    api.get('/api/v1/invoices', { params: filters }).then(r => r.data)
  );
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation(
    (data) => api.post('/api/v1/invoices', data).then(r => r.data),
    { onSuccess: () => queryClient.invalidateQueries(['invoices']) }
  );
}
```

### 12.2 Pages that need refactoring

Every page currently reading from `DataContext` needs to switch to `useQuery`/`useMutation` hooks. The pages themselves (UI components) mostly stay — only the data layer changes.

| Page | Current source | New source |
|------|---------------|------------|
| All dashboards | `useData()` from DataContext | `useQuery` against respective endpoints |
| PostIOUPage | `postBuyerIOU()` | `useMutation` → `POST /api/v1/invoices` |
| OptInInboxPage | `useData().optIns` | `useQuery` → `GET /api/v1/opt-ins` |
| ConsentInboxPage | `useData().consents` | `useQuery` → `GET /api/v1/consents` |
| EscrowPage | `useData().escrowLegs` | `useQuery` → `GET /api/v1/escrow` |
| PackagingPage | `useData().packages` | `useQuery` → `GET /api/v1/packages` |
| All profile/analytics | Computed from DataContext | `useQuery` against admin endpoints |

### 12.3 New pages to add

| Page | Portal | Purpose |
|------|--------|---------|
| **Supplier: Post Invoice / Sale Offer** | `/supplier/post-invoice` | Supplier-originated path (v1.3 requirement) |
| **Buyer: Verification Inbox** | `/buyer/verification-inbox` | Review supplier-originated invoices |
| **Wallet** | All portals (except admin) | Balance, transaction history, (simulated) deposit/withdraw |
| **Documents** | All portals | Upload/download certificates, board resolutions |
| **Signatory Management** | Admin + org admins | Manage signatories per org |
| **Fee Configuration** | Admin | CRUD fee rules |
| **Payment History** | Buyer + SPV | View payment updates from AfyaX |

---

## 13. Deployment & Infrastructure

### 13.1 Services

| Service | Platform | Notes |
|---------|----------|-------|
| **Portal** (Vite build) | Render Static Site or Vercel | `npm run build` → `dist/` |
| **API** (Express) | Render Web Service or Railway | `npm run start` |
| **Postgres** | Render Postgres or Railway or Supabase | Managed; daily backups |
| **Object Storage** | Cloudflare R2 or AWS S3 | Documents, generated PDFs |
| **Redis** (optional) | Render Redis or Upstash | Rate limiting, OTP codes |

### 13.2 Environment variables

See [Appendix C](#appendix-c-environment-variables).

### 13.3 CI/CD

```yaml
# render.yaml (updated)
services:
  - type: web
    name: uzima-api
    runtime: node
    plan: starter
    buildCommand: npm install && npm run build:api
    startCommand: npm run start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: uzima-db
          property: connectionString
      # ... see Appendix C

  - type: static
    name: uzima-portal
    buildCommand: npm run build
    staticPublishPath: dist
    envVars:
      - key: VITE_API_URL
        value: https://api.ioux.africa

databases:
  - name: uzima-db
    plan: starter
```

---

## 14. Migration Plan: Current → Target

### Phase 0 — Foundation (do first, unblocks everything)

| # | Task | Effort | Blocks |
|---|------|--------|--------|
| 0.1 | Set up Postgres locally + create all tables from §3 | 2h | Everything |
| 0.2 | Set up Drizzle ORM + schema + migration scripts | 2h | All API routes |
| 0.3 | Create seed script with demo data | 2h | Testing |
| 0.4 | Implement JWT auth (login, refresh, middleware) | 3h | All protected routes |
| 0.5 | Implement API key auth middleware | 1h | AfyaX endpoints |
| 0.6 | Create audit log middleware (auto-logs every mutation) | 1h | Compliance |
| 0.7 | Set up S3/R2 client for document uploads | 1h | Document routes |

### Phase 1 — Core flow (buyer + supplier dual origination)

| # | Task | Effort | Notes |
|---|------|--------|-------|
| 1.1 | `POST /api/v1/invoices` — buyer-originated | 2h | Existing logic, move to DB |
| 1.2 | `POST /api/v1/invoices` — supplier-originated (NEW) | 2h | New path per v1.3 |
| 1.3 | Opt-in routes (list, respond) | 2h | Move from in-memory to DB |
| 1.4 | Buyer verification routes (list, respond) — NEW | 2h | Mirror of opt-in for supplier path |
| 1.5 | Assignment service (all 3 types) | 3h | Core business logic |
| 1.6 | IOU registry (generate ID, lookup) | 1h | Existing `iouId.ts`, move to service |
| 1.7 | Status history tracking | 1h | On every transition |
| 1.8 | In-app notifications | 2h | DB-backed, per event |
| 1.9 | Frontend: replace DataContext with react-query | 4h | All existing pages |
| 1.10 | Frontend: Supplier Post Invoice page (NEW) | 2h | New page |
| 1.11 | Frontend: Buyer Verification Inbox (NEW) | 2h | New page |
| 1.12 | Frontend: auth flow (login, token refresh) | 2h | Replace hardcoded auth |

### Phase 2 — Integrations, wallets, fees

| # | Task | Effort | Notes |
|---|------|--------|-------|
| 2.1 | Party registration API (for AfyaX) | 2h | With unique ID generation |
| 2.2 | Payment update webhook | 3h | Critical path for Sule |
| 2.3 | Installment schedule tracking | 2h | Linked to invoices |
| 2.4 | Wallet service + routes | 3h | Simulation mode |
| 2.5 | Fee configuration CRUD + calculation | 3h | Admin + auto-apply |
| 2.6 | Fee ledger (immutable) | 1h | Record every fee |
| 2.7 | SPV purchase offer routes | 2h | Move from in-memory |
| 2.8 | Assignment consent + OTP | 3h | With signatory verification |
| 2.9 | Escrow leg management | 2h | Move from mock to DB |
| 2.10 | Document upload/download | 2h | S3 integration |
| 2.11 | Signatory management | 2h | CRUD + cert upload |
| 2.12 | Transaction document generation (PDFs) | 3h | Purchase notes, receipts |
| 2.13 | Email notifications (Resend/SMTP) | 2h | Templates + dispatch |
| 2.14 | Frontend: wallet pages | 2h | Balance + history |
| 2.15 | Frontend: payment history pages | 2h | From payment_updates |
| 2.16 | Frontend: document management pages | 2h | Upload/download |
| 2.17 | API documentation (OpenAPI) | 2h | Full spec |

### Phase 3 — Packaging, programmes, hardening

| # | Task | Effort | Notes |
|---|------|--------|-------|
| 3.1 | Programme CRUD + hard enforcement | 2h | Exposure limits block transactions |
| 3.2 | Buyer credit risk profile | 2h | Payment history → risk score |
| 3.3 | Package creation from assigned pool | 2h | Move from mock |
| 3.4 | NSE listing workflow | 2h | Status tracking, reference |
| 3.5 | Reconciliation reports | 2h | Period match, variance |
| 3.6 | Admin analytics dashboard (from DB) | 3h | Real aggregations |
| 3.7 | Rate limiting (Redis-backed) | 1h | Production-grade |
| 3.8 | CORS lockdown | 0.5h | Whitelist portal domain |
| 3.9 | Input sanitisation audit | 1h | XSS, SQL injection (ORM handles most) |
| 3.10 | Role-based route protection audit | 1h | Every route has authorize() |
| 3.11 | Automated tests (critical paths) | 4h | Auth, invoice lifecycle, assignment |
| 3.12 | Deploy (Render/Railway) | 2h | Portal + API + Postgres + S3 |

---

## 15. Implementation Sequence

**Recommended order for Cursor execution:**

```
Week 1:
  Day 1-2: Phase 0 (all foundation tasks)
  Day 3-4: Phase 1.1–1.8 (API routes, services, DB operations)
  Day 5:   Phase 1.9 (frontend DataContext → react-query migration)

Week 2:
  Day 1: Phase 1.10–1.12 (new pages, auth flow)
  Day 2-3: Phase 2.1–2.6 (AfyaX integration, wallets, fees)
  Day 4-5: Phase 2.7–2.13 (offers, consents, escrow, documents, email)

Week 3:
  Day 1-2: Phase 2.14–2.17 (frontend for Phase 2 features)
  Day 3-4: Phase 3.1–3.6 (packaging, programmes, analytics)
  Day 5:   Phase 3.7–3.12 (hardening, tests, deploy)
```

---

## Appendix A: Audit Gap Closure Checklist

Every item from AFIX-AUDIT-001 §6 (MOCK vs REAL) and §8 (bugs) mapped to a task:

| Audit item | Resolution | Task ref |
|------------|------------|----------|
| Dual data store (issue #1) | Postgres single source of truth | 0.1 |
| Unauthenticated routes (#2) | JWT + API key on all routes | 0.4, 0.5 |
| Portal state lost on refresh (#1) | react-query against API | 1.9 |
| Client-side role gates only (#11) | Server-side authorize() | 0.4 |
| No automated tests (#12) | Critical path test suite | 3.11 |
| OpenAPI incomplete (#3) | Full spec | 2.17 |
| ConsentSignature unused (#4) | OTP-verified digital signatures | 2.8 |
| Programmes not enforced (#5) | Hard limits server-side | 3.1 |
| Git remote wrong repo (#7) | Create new UzimaX repo | Before first push |
| Offer accept ≠ auto-assign (#6) | Three clear assignment types | 1.5 |
| Seed IDs inconsistent (#10) | All IDs from iouService | 1.6 |
| Rate limit in-memory (#13) | Redis-backed | 3.7 |

---

## Appendix B: IOU Lifecycle State Machine

```
                    ┌─────────────┐
                    │   draft     │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼                         ▼
   ┌──────────────────┐     ┌───────────────────────────┐
   │ awaiting_opt_in  │     │ awaiting_buyer_verification│
   │ (buyer posted)   │     │ (supplier posted)          │
   └────────┬─────────┘     └─────────────┬─────────────┘
            │                             │
     ┌──────┼──────┐              ┌───────┼───────┐
     ▼             ▼              ▼               ▼
  accepted    opt_in_declined  verified     buyer_rejected
     │                            │
     ▼                            ▼
   ┌──────────────────────────────────┐
   │           listed                  │  (optional: goes through
   │    (available for SPV offer)      │   SPV offer flow before
   └──────────────┬───────────────────┘   assignment)
                  │
                  ▼
          offer_received → offer_accepted
                              │
                              ▼
                         ┌──────────┐
                         │ assigned │ ← all paths converge here
                         └────┬─────┘
                              │
                              ▼
                         ┌──────────┐
                         │ packaged │ (optional: bundled into note)
                         └────┬─────┘
                              │
                              ▼
                         ┌───────────┐
                         │ disbursed │ (supplier paid)
                         └─────┬─────┘
                               │
                               ▼
                         ┌──────────┐
                         │ matured  │ (buyer payment due)
                         └────┬─────┘
                              │
                              ▼
                         ┌──────────┐
                         │ settled  │ (all payments received)
                         └──────────┘

  Side states: cancelled, defaulted
```

**Valid transitions (enforce in invoiceService.transition()):**

| From | To | Trigger |
|------|-----|---------|
| draft | awaiting_opt_in | Buyer posts invoice |
| draft | awaiting_buyer_verification | Supplier posts invoice |
| draft | listed | Direct listing (API upload) |
| awaiting_opt_in | listed | Supplier accepts opt-in |
| awaiting_opt_in | opt_in_declined | Supplier declines |
| awaiting_buyer_verification | verified | Buyer accepts |
| awaiting_buyer_verification | buyer_rejected | Buyer rejects |
| listed | offer_received | SPV makes offer |
| verified | assigned | Auto-assignment (supplier path) |
| offer_received | offer_accepted | Supplier accepts offer |
| offer_accepted | assigned | Consent signed |
| listed | assigned | Opt-in auto-assign (no offer step) |
| assigned | packaged | Added to package |
| assigned | disbursed | Supplier paid |
| packaged | disbursed | Supplier paid (package-level) |
| disbursed | matured | Maturity date reached |
| matured | settled | All payments received |
| * | cancelled | Admin cancellation |
| matured | defaulted | Payment overdue beyond threshold |

---

## Appendix C: Environment Variables

```env
# ============ API ============
NODE_ENV=production
PORT=8787
DATABASE_URL=postgresql://user:pass@host:5432/uzima
JWT_SECRET=<random-64-char>
JWT_REFRESH_SECRET=<random-64-char>

# ============ Storage ============
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<key>
S3_SECRET_ACCESS_KEY=<secret>
S3_BUCKET=uzima-documents

# ============ Email ============
EMAIL_PROVIDER=resend           # or 'smtp'
RESEND_API_KEY=<key>
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=...
# SMTP_PASS=...
EMAIL_FROM=IOU Exchange <no-reply@ioux.africa>

# ============ SMS (optional) ============
SMS_PROVIDER=africastalking     # or 'stub'
AT_API_KEY=<key>
AT_USERNAME=<username>
AT_SENDER_ID=Uzima

# ============ Redis (optional) ============
REDIS_URL=redis://localhost:6379

# ============ Portal (.env) ============
VITE_API_URL=https://api.ioux.africa
```

---

## Document Control

| Field | Value |
|-------|-------|
| Document ID | UZIMA-ARCH-001 |
| Version | 1.0 |
| Date | 20 July 2026 |
| Author | Alfred |
| Audience | Development (Cursor), Alfred, UzimaX |
| Source docs | UZIMA-SYS-PLAN-001 v1.3, AFIX-AUDIT-001, PRD v1.5, AfyaX meeting transcript (20 Jul 2026) |

---

*End of document. This file is the single engineering reference for the Uzima rebuild. All implementation should trace back to a section here.*
</user_query>