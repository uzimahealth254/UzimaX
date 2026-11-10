import { docsBodies } from './docsBodies.js';

export interface DocsChapter {
  id: string;
  group: string;
  title: string;
  summary: string;
  markdown: string;
}

export const DOCS_CHAPTERS: DocsChapter[] = [
  {
    id: 'overview',
    group: 'Start here',
    title: 'What IOU Exchange is',
    summary: 'Product purpose, who owns it, and what the platform does and does not do.',
    markdown: `
IOU Exchange (IOUX) is a trade receivables registry and financing workflow for **ioux.africa**. Intellectual property and the client of record are **Uzima Exchange Limited (UzimaX)**.

Partner platforms such as AfyaX keep the commercial trade (buyers, suppliers, credit sales, repayments). When a receivable should be financed, the partner pushes parties and invoices into IOUX over authenticated APIs. IOUX issues a durable registry ID (\`IOU-KE-…\`), runs opt-in or buyer verification, assigns the receivable to the SPV, and — when the SPV records disbursement — calls the partner purchase webhook.

**IOUX does not move cash.** Escrow screens record settlement. Licensed banks, M-Pesa, or the partner’s PSP move money. Wallets in the product are a simulated ledger and are off in production unless explicitly enabled.

### Systems of record
| ID | Meaning |
|----|---------|
| \`uzimaPartyId\` | Party issued by IOUX (\`UZ-BUY-…\`, \`UZ-SUP-…\`, \`UZ-PLT-…\`) |
| \`organisationId\` | Internal UUID |
| \`invoiceId\` | Invoice UUID |
| \`iouRegistryId\` | Public IOU ID, also sent as \`ioux_id\` |
| \`iouxTransactionId\` | Payment-update row id |

Separate databases. Partners store the IDs IOUX returns. There is no shared schema with AfyaX.
`,
  },
  {
    id: 'architecture',
    group: 'Start here',
    title: 'Architecture',
    summary: 'One Node service, Postgres, Redis, and how traffic flows.',
    markdown: `
### Stack
- **Frontend:** React 18, TypeScript, Vite, Tailwind, React Router, TanStack Query, Axios.
- **Backend:** Express 5, Drizzle ORM, Zod validation, JWT access tokens, httpOnly refresh cookie for the portal.
- **Database:** PostgreSQL (Supabase in production).
- **Redis:** required in production for rate limiting (\`REDIS_URL\`).
- **Email:** Resend or SMTP. SMS is stub unless Africa’s Talking keys are set.
- **Files:** local disk or S3-compatible storage.
- **Hosting today:** single Render service serving API + SPA at \`https://uzimax.onrender.com\`. Target hostnames: \`www\`, \`app\`, \`api\`, and \`docs.ioux.africa\`.

### Request path
Browser or partner → HTTPS → Express \`/api/v1\` → Postgres / Redis / outbound email or AfyaX webhook.

The SPA and API ship together. \`GET /api/v1/health\` returns \`{ status, db }\`.

### Docs site
\`docs.ioux.africa\` is the same application with a separate login. Docs accounts live in \`docs_users\`, not portal \`users\`, so a revoked docs login does not disable a supplier or SPV portal account.
`,
  },
  {
    id: 'roles',
    group: 'Portals',
    title: 'Roles',
    summary: 'Admin, supplier, buyer, SPV, and partner platform.',
    markdown: `
| Role | Job |
|------|-----|
| **Admin** | Registry oversight, users, programmes, fees, integrations, reconciliation, analytics |
| **Supplier (originator)** | Opt in to sell a buyer-posted IOU, or post their own invoice |
| **Buyer (obligor)** | Post an IOU, verify a supplier listing, sign assignment consent, see payments |
| **SPV** | Offers, assignments, escrow disbursement and collection recording, packaging |
| **Partner platform** | API only (AfyaX). No portal password required |

Portal accounts are **invite-only**. There is no public signup. An admin creates the organisation and user; the user receives a temporary password and must change it.

Docs access is a different list: a docs admin grants an email, and can revoke it at any time from **Access** inside the docs site.
`,
  },
  {
    id: 'portals',
    group: 'Portals',
    title: 'Portal map',
    summary: 'Every signed-in area and what it is for.',
    markdown: `
### Supplier
| Path | Purpose |
|------|---------|
| \`/supplier\` | Dashboard |
| \`/supplier/opt-in\` | Accept or decline buyer-posted IOUs |
| \`/supplier/post-invoice\` | List an invoice for buyer verification |
| \`/supplier/invoices\` | Own invoices and status |
| \`/supplier/payments\` | Repayment history on sold receivables |
| \`/supplier/documents\` | Document vault |
| \`/supplier/profile\` | Profile and signatories |

### Buyer
| Path | Purpose |
|------|---------|
| \`/buyer\` | Dashboard |
| \`/buyer/post-iou\` | Post a payable / IOU |
| \`/buyer/verification\` | Confirm supplier-listed invoices |
| \`/buyer/register\` | Invoice register |
| \`/buyer/consent\` | OTP consent to assign to the SPV |
| \`/buyer/payments\` | Schedules and payment updates |
| \`/buyer/documents\` | Document vault |
| \`/buyer/profile\` | Profile, signatories, API keys |

### SPV
| Path | Purpose |
|------|---------|
| \`/spv/registry\` | Full IOU registry and detail |
| \`/spv/offers\` | Make tenor-discount offers on open IOUs |
| \`/spv/assignments\` | Assignment trail |
| \`/spv/escrow\` | Release disbursement / record collection |
| \`/spv/packaging\` | Bundle receivables; NSE listing is readiness only |
| \`/spv/payments\` | Payment history |

### Admin
| Path | Purpose |
|------|---------|
| \`/admin/invoices\` | All instruments |
| \`/admin/programs\` | Facility limits and pricing bands |
| \`/admin/fees\` | Fee configuration |
| \`/admin/reconciliation\` | Period reconciliation export |
| \`/admin/escrow\` | Same escrow recording as SPV |
| \`/admin/users\` | Invite users and organisations |
| \`/admin/integrations\` | Partner webhook URLs and secrets |
| \`/admin/workflow\` | Audit export |
| \`/admin/analytics\` | Portfolio aggregates |

Wallet and “backend engine” menus appear only when \`VITE_ENABLE_WALLET\` / \`VITE_ENABLE_ENGINE\` are true. Production keeps them off.
`,
  },
  {
    id: 'lifecycle',
    group: 'How money and status work',
    title: 'Lifecycle and DvS',
    summary: 'Statuses from intake through disbursement and settlement.',
    markdown: `
### Two origination paths
1. **Buyer posts (or partner API credit sale).** Status starts at \`awaiting_opt_in\`. Supplier accepts. IOUX creates an assignment and moves to \`pending_settlement\`.
2. **Supplier lists.** Status starts at \`awaiting_buyer_verification\`. Buyer confirms (commitment to pay). Then the same assignment path.

A third path is **negotiated**: SPV makes an offer, supplier accepts, buyer signs OTP consent, then assignment.

### Delivery versus settlement
Accepting an opt-in does **not** tell AfyaX the IOU was purchased. Purchase notification fires only when the SPV releases the **disbursement to supplier** escrow leg. That transition sets status \`disbursed\` and listing \`sold\`, and posts the partner purchase webhook.

Later buyer repayments arrive as signed \`POST /webhooks/payment-update\` calls. When the outstanding balance is cleared, the instrument can reach \`settled\`. There is no second purchase webhook for settlement.

### Status meanings
| Status | Meaning |
|--------|---------|
| \`awaiting_opt_in\` | Waiting for the supplier |
| \`awaiting_buyer_verification\` | Waiting for the buyer |
| \`listed\` / \`verified\` / \`offer_received\` | Open to an SPV offer |
| \`pending_settlement\` | Accepted; cash not yet recorded as disbursed |
| \`disbursed\` | SPV disbursement recorded; purchase webhook sent |
| \`settled\` | Repayments brought the balance to closure |
| \`opt_in_declined\` / \`buyer_rejected\` / \`cancelled\` | Closed without purchase |

Standing-order bank and reference can be stored on the instrument. IOUX does not instruct the bank.
`,
  },
  {
    id: 'partner-api',
    group: 'Integrations',
    title: 'Partner API',
    summary: 'What a platform calls, and what IOUX calls back.',
    markdown: `
Base URL (current production): \`https://uzimax.onrender.com/api/v1\`.

Auth: \`X-API-Key: uzima_…\` or \`Authorization: Bearer uzima_…\`.

### Partner → IOUX
| Call | Purpose |
|------|---------|
| \`POST /parties\` | Upsert buyer or supplier; returns \`uzimaPartyId\` |
| \`GET /parties/{uzimaPartyId}\` | Read a party |
| \`POST /users\` | Create a portal user and optional invite email |
| \`POST /external/invoices\` | Create the IOU (\`buyer_credit_sale\` or \`supplier_list\`) |
| \`POST /ious\` | Alias of invoice create |
| \`GET /ious/{iouRegistryId}\` | Poll status, history, assignment |
| \`POST /webhooks/payment-update\` | Buyer repayment (HMAC + API key) |

Invoice essentials: buyer and supplier identity, \`faceValue\`, \`issueDate\`, \`dueDate\`, \`commitmentToPay\`, and \`listedAmount\` (the asking price the partner will validate on purchase).

Tenor programmes may reject dates beyond the configured maximum (often 120 days).

### Payment update signature
Headers \`X-Afyax-Timestamp\` (unix seconds or milliseconds) and \`X-Afyax-Signature\` = HMAC-SHA256 of \`{timestamp}.{rawBody}\` using \`AFYAX_WEBHOOK_SECRET\`. Send a unique \`idempotencyKey\` so retries do not double-count.

### IOUX → partner
Only the purchase webhook, on \`iou.disbursed\`:

\`\`\`json
{
  "buyer_name": "IOU Exchange Capital SPV",
  "ioux_id": "IOU-KE-2026-00001-2",
  "payment_method": "bank",
  "amount": 10000,
  "transaction_id": "IOUX-TXN-…",
  "bank_reference": "IOUX-TXN-…"
}
\`\`\`

\`buyer_name\` is the **SPV that acquired the receivable**, not the pharmacy obligor. \`amount\` is the listed / asking amount, not the discounted purchase price.

The partner should keep the listing open until this call succeeds, accept the asking price, and treat retries as idempotent. IOUX retries failed deliveries.

Configure the purchase URL under **Admin → Integrations** (sandbox vs production). Lifecycle event webhooks are optional and off unless a lifecycle URL is set.
`,
  },
  {
    id: 'security',
    group: 'Operations',
    title: 'Security and access',
    summary: 'Portal auth, docs auth, secrets, and what never belongs in git.',
    markdown: `
### Portal
- Email + password, JWT access token (about 15 minutes), refresh cookie.
- Forgot password sends a one-time code by email.
- Login lockout after repeated failures.
- Consent, opt-in, and verification can require a 6-digit OTP.
- API keys are shown once, stored hashed, and can be revoked.
- Row-level policies exist for Postgres; application checks also scope every query by organisation.

### Docs site
- Separate \`docs_users\` table.
- Roles: \`docs_admin\` (can grant and revoke) and \`docs_reader\`.
- Status \`revoked\` blocks sign-in immediately.
- Forgot password uses the same email provider as the portal.
- Docs tokens are marked for the docs audience and cannot open portal APIs.

### Secrets
Never commit \`.env\`, API keys, webhook HMAC secrets, or database URLs. Rotate anything that was pasted into chat or email. Production CORS is an explicit allow-list and must include \`https://docs.ioux.africa\` once that hostname is live.
`,
  },
  {
    id: 'data-model',
    group: 'Operations',
    title: 'Data model',
    summary: 'The tables that carry the receivable.',
    markdown: `
Core tables:

- **organisations** — buyer, supplier, spv, platform. \`uzima_party_id\` is unique.
- **users** — portal logins scoped to an organisation and role.
- **invoices** — the IOU: parties, face value, listed amount, dates, status, listing status, commitment to pay, standing-order fields, source platform.
- **opt_ins** / **buyer_verifications** — counterparty response.
- **purchase_offers** — SPV discount offers.
- **assignment_consents** — buyer OTP consent.
- **assignments** — receivable assigned to the SPV, with purchase price and face value.
- **escrow_legs** — disbursement and collection records (status pending or released).
- **payment_updates** — partner repayment feed.
- **programmes** / **fee_configurations** — limits and fees.
- **platform_integrations** / **webhook_deliveries** — outbound partner calls and HTTP results.
- **audit_log** / **email_send_log** — who did what, and whether email left the server.
- **docs_users** — documentation access only.

Pricing uses tenor days and a discount in basis points to compute purchase price. Programme checks can block a post or offer that exceeds facility, tenor, or band.
`,
  },
  {
    id: 'deploy',
    group: 'Operations',
    title: 'Deploy and docs hostname',
    summary: 'How production runs, and how to publish docs.ioux.africa.',
    markdown: `
### Application
Node 20, \`npm ci\`, \`npm run build\`, \`npx drizzle-kit push\` (or the SQL migrations), \`npm run start:api\`. Health check: \`/api/v1/health\`.

Required environment names include \`DATABASE_URL\`, \`REDIS_URL\`, \`JWT_SECRET\`, \`JWT_REFRESH_SECRET\`, \`COOKIE_SECURE=true\`, \`CORS_ORIGINS\`, email provider keys, and AfyaX webhook secrets. Do not put values in this handbook.

### docs.ioux.africa
1. Add a DNS record for \`docs.ioux.africa\` to the same host as the portal (today: the Render service).
2. Add \`https://docs.ioux.africa\` to \`CORS_ORIGINS\`.
3. Apply migration \`server/db/migrations/0003_docs_users.sql\` (or \`drizzle-kit push\`).
4. Seed the first docs admin with \`DOCS_SEED_USERS\` and \`npm run docs:seed\`.
5. Sign in at \`https://docs.ioux.africa\`. Admins use **Access** to add or revoke emails.

Format for the seed variable. Several people are separated with a semicolon:

\`email|Full Name|docs_admin|TemporaryPassword12!\`

Readers use role \`docs_reader\`. Temporary passwords should be rotated with **Forgot password** after first login.

The docs UI is also available at \`/docs\` on the main host for staging checks.
`,
  },
  {
    id: 'out-of-scope',
    group: 'Start here',
    title: 'Out of scope',
    summary: 'What the signed product deliberately does not do.',
    markdown: `
These are not missing screens. They are outside the current contract unless a change order adds them:

- Live bank or M-Pesa money movement
- Executing a standing order at the bank
- A real NSE / exchange listing API
- Keycloak, SSO, or MFA beyond email OTP
- External KYC vendor calls
- Rebuilding AfyaX or a partner’s commerce system
- Counsel-certified true-sale legal packs (PDFs are operational documents)

Packaging supports an internal readiness workflow. The exchange onboarding itself stays outside IOUX.

Note investors, note coupons, and a dedicated insurer or healthcare-provider role are not in this product. The seller is the **supplier**. The obligor is the **buyer** (an insurer is just a buyer organisation).
`,
  },
  {
    id: 'glossary',
    group: 'How money and status work',
    title: 'Glossary',
    summary: 'Words the product uses, and what they mean in the business.',
    markdown: `
| Term | Meaning |
|------|---------|
| Supplier | Originator. Sells the receivable to the SPV. |
| Buyer | Obligor. Owes the face amount. May be a pharmacy, hospital, or insurer. |
| SPV | Special purpose vehicle that acquires receivables. |
| Admin | IOUX operator on the platform organisation. |
| Partner platform | External system (AfyaX) that posts parties and invoices by API. |
| IOU / invoice | The receivable. One row, one \`iouRegistryId\`. |
| Face value | Gross amount the buyer owes. |
| Listed / asking amount | Price the partner expects on the purchase webhook. |
| Purchase price | Discounted amount the SPV records as what it paid. |
| Discount (bps) | Basis points off face. 100 bps = 1%. |
| Tenor | Calendar days from issue date to due date. |
| Opt-in | Supplier accepts a buyer-posted IOU. |
| Buyer verification | Buyer confirms a supplier-listed invoice. |
| Assignment | Legal/operational record that the SPV now holds the receivable. |
| Consent | Buyer OTP signature before a negotiated assignment. |
| Escrow leg | A recorded cash step (disbursement or collection). Not a bank payment. |
| Programme | Facility: exposure cap, tenor cap, allowed discount band. |
| Fee ledger | Platform fees accrued on assignment. Not a bank transfer. |
| Standing order | Bank reference stored on the IOU. IOUX does not send it to a bank. |

Public IOU IDs look like \`IOU-KE-2026-00006-7\` (year, sequence, check digit). Party IDs look like \`UZ-BUY-…\`, \`UZ-SUP-…\`, \`UZ-PLT-…\`.
`,
  },
  {
    id: 'pricing',
    group: 'How money and status work',
    title: 'Pricing and fees',
    summary: 'How tenor, discount, purchase price, and fees are calculated.',
    markdown: `
Currency is **KES**. Prices and fees round to whole shillings.

### Tenor
Calendar days from issue date to due date, minimum 1. There is no Actual/360 day count.

### Indicative discount
Default curve: \`4% + (tenorDays / 30) × 0.35%\`, then clamped to the programme discount band when a programme applies.

Example at 45 days: \`4 + (45/30)×0.35 = 5.525%\`, rounded to **5.53%**.

### Purchase price
\`round(face × (1 − discountPercent / 100))\`, or the same formula with basis points (\`bps / 10000\`) on assignment. If a listed amount is set, assignment pricing can use that base instead of face.

On a face of 1,200,000 at 5.53%: purchase price **1,133,640**, margin **66,360**.

The AfyaX purchase webhook does **not** send this discounted price. It sends the asking / listed amount.

### Fees
Active fee rows apply on assignment. A rate in basis points is \`round(face × bps / 10000)\`. A flat fee uses the configured shilling amount. Per-payment percentage fees are skipped at assignment time.

Supplier net on the escrow disbursement leg is the purchase price minus half of the accrued fee total. The other half is the platform fee leg. Collection from the buyer is recorded separately at face (or the repayment amount the partner posts).

Programmes can reject a post or an offer that exceeds max exposure, buyer sublimit, max tenor, or the discount band.
`,
  },
  {
    id: 'statuses',
    group: 'How money and status work',
    title: 'Status machines',
    summary: 'Exact status strings for invoices, offers, consent, escrow, and packages.',
    markdown: `
### Invoice
\`draft\`, \`listed\`, \`awaiting_opt_in\`, \`awaiting_buyer_verification\`, \`verified\`, \`offer_received\`, \`offer_accepted\`, \`pending_settlement\`, \`assigned\`, \`packaged\`, \`disbursed\`, \`matured\`, \`settled\`, \`defaulted\`, \`opt_in_declined\`, \`buyer_rejected\`, \`cancelled\`.

Typical Path A (buyer or partner posts): \`awaiting_opt_in\` → supplier accepts → \`pending_settlement\` → SPV releases disbursement → \`disbursed\` → repayments → \`settled\`.

Typical Path B (supplier lists): \`awaiting_buyer_verification\` → buyer confirms → \`verified\`, then an offer or a direct assignment.

Negotiated path: open statuses (\`listed\`, \`verified\`, \`awaiting_opt_in\`) → SPV offer (\`offer_received\`) → supplier accepts → buyer consent → assignment → \`pending_settlement\`.

### Related records
| Record | Statuses |
|--------|----------|
| Opt-in | \`pending\`, \`accepted\`, \`declined\` |
| Buyer verification | pending, then accept or reject |
| Offer | \`pending\`, \`accepted\`, \`rejected\`, \`expired\`, \`withdrawn\` |
| Consent | \`pending\`, \`signed\`, \`declined\`, \`rejected\` |
| Escrow leg | \`pending\`, \`released\`, \`collected\`, \`failed\` |
| Package | \`draft\`, \`structured\`, \`listed\`, \`placed\` |
| Programme | \`active\`, \`paused\`, \`closed\` |
| Organisation | \`active\`, \`suspended\`, \`pending\` |
| Docs user | \`active\`, \`revoked\` |

Escrow leg types include disbursement to supplier, collection from buyer, fee to platform, and payout to SPV. Releasing the **disbursement** leg is the only step that marks the IOU disbursed and calls the partner purchase webhook.

Every status change is written to invoice status history and can appear on the admin workflow export.
`,
  },
  {
    id: 'api-map',
    group: 'Integrations',
    title: 'API map',
    summary: 'Portal and partner routes under /api/v1.',
    markdown: `
Prefix \`/api/v1\`. Portal calls use a Bearer access token. Partner calls use \`X-API-Key\` or \`Authorization: Bearer uzima_…\`.

### Public
| Call | Purpose |
|------|---------|
| \`GET /health\` | Process and database liveness |
| \`POST /auth/login\` | Portal sign-in |
| \`POST /auth/forgot-password\` | Portal reset code |
| \`POST /auth/reset-password\` | Portal password reset |
| \`POST /contact\` | Marketing contact form |
| \`POST /docs-auth/login\` | Docs sign-in |
| \`POST /docs-auth/forgot-password\` | Docs reset code |
| \`POST /docs-auth/reset-password\` | Docs password reset |

### Docs (docs token only)
\`GET /docs-auth/me\`, \`GET /docs-auth/chapters\`, \`GET /docs-auth/chapters/{id}\`, \`POST /docs-auth/change-password\`. Admins also have \`GET/POST /docs-auth/users\` and \`PATCH /docs-auth/users/{id}\` with \`status\` \`active\` or \`revoked\`.

### Partner
\`POST /parties\`, \`GET /parties/{uzimaPartyId}\`, \`POST /users\`, \`POST /external/invoices\`, \`POST /ious\`, \`GET /ious/{iouRegistryId}\`, \`POST /webhooks/payment-update\`.

### Portal workflow
\`POST /invoices\`, \`GET /invoices\`, \`GET /invoices/{id}\`, opt-in list/respond/OTP, buyer verification, offers, consents (request, confirm, decline), assignments, \`POST /escrow/{id}/release\` and \`/collect\`, programmes, fees, documents, signatories, notifications, \`POST /pricing/quote\`, payment schedule and payment updates, API key create/revoke.

### Admin
Users and organisations, audit export, analytics, reconciliation, email log, integrations, webhook delivery retry, system health.

Wallet deposit and withdraw exist only when the simulated wallet flag is on. They do not move bank money.

Shapes are validated with Zod in the API routes. A machine-readable contract lives in \`docs/openapi.yaml\` in the repository.
`,
  },
];

for (const chapter of DOCS_CHAPTERS) {
  const body = docsBodies[chapter.id];
  if (body) chapter.markdown = body;
}

export function docsIndex() {
  return DOCS_CHAPTERS.map(({ id, group, title, summary }) => ({ id, group, title, summary }));
}

export function docsChapter(id: string) {
  return DOCS_CHAPTERS.find((c) => c.id === id) || null;
}
