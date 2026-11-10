/** Long-form handbook chapters. No secrets, keys, or passwords. */

export const docsBodies: Record<string, string> = {
  overview: `
IOU Exchange (IOUX) is the trade-receivables registry and financing workflow for **ioux.africa**. The company behind it is **Uzima Exchange Limited (UzimaX)**. The product does one job: take a confirmed payable that already exists in someone else's commercial system, give it a durable public identity, run the human confirmations required before an SPV can acquire it, and record that acquisition so the partner can mark the listing sold.

A partner such as AfyaX keeps the shop. Pharmacies, suppliers, credit sales, listings, and the money that actually moves stay on the partner side or with a licensed bank or M-Pesa provider. IOUX is the book of record for the financing decision. When a receivable should be financed, the partner pushes the buyer, the supplier, and the invoice into IOUX. IOUX issues \`IOU-KE-…\`. A person accepts (supplier opt-in, or buyer verification, or a negotiated offer plus consent). The SPV records that it has paid the supplier. Only then does IOUX call the partner and say: this receivable was purchased, here is the SPV name, here is the asking amount.

### What a finished trade looks like
1. The partner already has a credit sale: a buyer who owes, a supplier who delivered, a due date, and an asking price on their listing.
2. The partner registers both parties and posts the invoice. IOUX stores its own copy. It does not read the partner database.
3. The supplier signs in to the IOUX portal and accepts the opt-in, or the buyer confirms a supplier-listed invoice.
4. IOUX creates an assignment to the SPV and an escrow record. Status becomes \`pending_settlement\`. Nothing has been told to the partner as a purchase yet.
5. An SPV operator opens Escrow and releases the disbursement-to-supplier leg. Status becomes \`disbursed\`. The listing flag becomes \`sold\`.
6. IOUX POSTs the purchase payload to the partner. \`buyer_name\` is the SPV. \`amount\` is the listed asking price, not the discounted amount the SPV recorded internally.
7. Later, the partner reports repayments with a signed payment-update call. When the balance is cleared, the instrument can reach \`settled\`. There is no second purchase webhook for settlement.

### Who uses it
- **Admin** runs the platform: organisations, users, programmes, fees, integrations, reconciliation, the full invoice book.
- **Supplier** is the originator. They opt in to sell a buyer-posted IOU, or they list their own invoice for the buyer to verify.
- **Buyer** is the obligor. They post a payable, verify a supplier listing, and sign assignment consent when a negotiated offer needs it. An insurer in this product is a buyer organisation, not a separate role.
- **SPV** acquires the receivable: offers, assignments, escrow recording, packaging toward listing readiness.
- **Partner platform** has an API key and no portal password. AfyaX is the live example.

Portal accounts are invite-only. There is no public signup. Docs access, the thing you used to open this handbook, is a separate list and does not create a portal user.

### Systems of record
| ID | What you store it as |
|----|----------------------|
| \`uzimaPartyId\` | Party issued by IOUX (\`UZ-BUY-…\`, \`UZ-SUP-…\`, \`UZ-PLT-…\`) |
| \`organisationId\` | Internal UUID of that party |
| \`invoiceId\` | Invoice UUID |
| \`iouRegistryId\` | Public IOU ID. The purchase webhook sends this as \`ioux_id\` |
| \`iouxTransactionId\` | Id of one payment-update row |

The two databases never merge. If the partner loses the IDs IOUX returned, they poll by the IOU id they stored, or they look the party up by \`uzimaPartyId\`. They do not query IOUX tables.

### What IOUX deliberately does not do
IOUX does not move cash. The escrow screen records that a disbursement or a collection happened. A bank, M-Pesa, or the partner's PSP moves the money. Wallets in the product are a simulated ledger and are off in production unless a flag is turned on. IOUX does not list a note on the NSE, does not run Keycloak, and does not call an external KYC vendor. Those boundaries are described in **Out of scope**.

### How to explain it in a room
Start in Admin → All Invoices and show the instrument the partner just posted, including the public IOU id and \`awaiting_opt_in\`. Switch to the supplier and accept the opt-in. Switch to the SPV, open Escrow, and release the disbursement. Then show that the partner received one purchase call, with the SPV as buyer and the asking price as amount. That is the whole product. Everything else is the bookkeeping around that path.
`,

  architecture: `
IOUX is one Node process. The React application and the API are built and served together. A browser and a partner both hit the same host. There is no separate frontend server in production.

### Stack
- **Frontend:** React 18, TypeScript, Vite, Tailwind, React Router, TanStack Query, Axios. The marketing site, the four portals, and this docs site are one bundle.
- **Backend:** Express 5, Drizzle ORM, Zod on every write, JWT access tokens. The portal also uses an httpOnly refresh cookie. The docs site uses a separate token and does not use that cookie.
- **Database:** PostgreSQL. Production is Supabase. Local development is a Postgres on the machine in \`.env\`.
- **Redis:** required in production. Rate limits and login lockout live there. If Redis is missing in production the API refuses to start.
- **Email:** Resend or SMTP. Password resets, invites, and workflow notices go out through the same sender. If no provider is configured, sends are logged as a stub and nothing leaves the server.
- **SMS:** stub unless Africa's Talking keys are set. OTP for consent and opt-in falls back to email.
- **Files:** local disk or S3-compatible storage for the document vault.
- **Hosting today:** one Render service at \`https://uzimax.onrender.com\`. Planned hostnames are \`www\`, \`app\`, \`api\`, and \`docs.ioux.africa\`. Until DNS is cut, the docs UI is also at \`/docs\` on the main host.

### Request path
A browser loads the SPA. API calls go to \`/api/v1\` on the same origin in production, so the bundle does not bake in a localhost URL. A partner calls the same prefix with an API key. Express validates the body, checks the caller, writes Postgres, and sometimes calls Redis, email, or the partner's purchase URL.

\`GET /api/v1/health\` returns status and whether the database answered. Use it before blaming a partner integration.

### Two logins, one codebase
Portal users live in \`users\`, scoped to an organisation and a role (\`admin\`, \`supplier\`, \`buyer\`, \`spv\`). Docs readers live in \`docs_users\`. A docs token carries audience \`docs\`. The portal auth middleware reloads the portal user table, so a docs token cannot open portal APIs. A portal token has no docs audience, so it cannot open this handbook. Revoking a docs email does not suspend a supplier. Revoking a supplier does not close this handbook.

### What leaves the server
- Email (invites, OTP, reset codes, workflow notices).
- The purchase webhook, only when an invoice becomes \`disbursed\`, and only if Admin → Integrations has a purchase URL for the active environment.
- Optional lifecycle webhooks (\`iou.created\`, \`iou.status_changed\`, \`iou.payment_updated\`, \`iou.settled\`) if a lifecycle URL is configured. They are off when that URL is empty. Do not treat them as the purchase signal. AfyaX purchase acceptance is the disbursement call only.

### Trust boundaries
The partner is authenticated by a hashed API key and, for repayments, an HMAC over the raw body. Portal users are authenticated by email and password. Docs users are a third list. Row-level policies exist on Postgres; the application also filters every query by organisation, so a supplier does not read another supplier's book even if a policy is mis-set. Admins and the SPV see across organisations because that is their job.

### Environments
Sandbox and production are selected on the integration row (\`activeEnvironment\`). Purchase URL resolution prefers the URL stored for that environment, then a base URL plus \`/api/v1/iou/purchase\`, then the matching environment variable. AfyaX sandbox and production purchase hosts are different. Pointing the active environment at the wrong one is the usual reason a successful IOUX disbursement "never arrived".
`,

  roles: `
There are four portal roles and one partner integration. The role is exact. A supplier token cannot open SPV routes, and the UI sends each person to their own home after login.

### Admin
The operator of UzimaX. The admin organisation type is \`platform\`. They see every invoice, invite organisations and users, set programmes (facility, tenor cap, discount band), set fees, export reconciliation, read the audit log, and configure the partner purchase URL and secrets. They can also release escrow, same as the SPV, which matters when an operator is walking a test and the SPV user is not in the room.

Admin does not originate invoices in normal operation. If an invoice is missing, the partner did not post it, or it was posted against another environment.

### Supplier (originator)
The seller of the receivable. In a healthcare trade this is the pharmacy, wholesaler, or clinic. There is no separate "provider" login.

They can:
- Accept or decline a buyer-posted IOU in the opt-in inbox. Accept creates the assignment.
- Post their own invoice and wait for the buyer to verify it.
- See their invoices, status history, and repayments recorded against sold receivables.
- Keep documents and signatories on the organisation.
- Respond to an SPV offer when the path is negotiated.

They cannot see other suppliers, edit programmes, or release escrow.

### Buyer (obligor)
The party who owes the face amount. A hospital, a corporate, or an insurer is modelled as \`orgType = buyer\`. The UI label is Buyer.

They can:
- Post an IOU against a supplier, with a commitment to pay and optional standing-order reference.
- Verify or reject a supplier-listed invoice.
- Sign or decline assignment consent with an email OTP when an offer needs obligor consent.
- Read their register, payment schedule, and documents.
- Create and revoke API keys for their organisation, and manage signatories (maker, checker, or both).

They cannot opt in as the supplier, and they cannot disburse.

### SPV
The vehicle that acquires receivables. In the operating setup this is IOU Exchange Capital SPV, a distinct organisation, not the platform admin org.

They can:
- Search the registry and open any instrument they are allowed to finance.
- Make a tenor-discount offer on an open IOU.
- Read the assignment trail.
- Record disbursement and collection on escrow legs.
- Bundle receivables into a package for listing readiness.

They cannot invite arbitrary portal users (that is admin) and they do not configure the partner HMAC secret.

### Partner platform
API only. The platform organisation holds the API key. Typical calls are parties, users, external invoices, status polls, and signed payment updates. The partner does not get a password for the admin portal as part of the API key. If a named person at the partner must click opt-in, admin invites them as a supplier or buyer user under the right organisation.

### Docs access
Separate again. \`docs_admin\` can grant and revoke handbook emails. \`docs_reader\` can read. Neither role appears in the portal user list.

### Invites
An admin creates the organisation (or the partner upserts it via \`POST /parties\`) and the user. The user receives a temporary password and must change it before the portal will let them work. There is no self-service registration on the marketing site. The marketing contact form only emails support.
`,

  portals: `
Each portal is a set of screens under one role prefix. Buttons that look like navigation are real routes. The descriptions below are what those screens do when the data is present.

### Supplier
**Dashboard** (\`/supplier\`). Counts and recent instruments for this organisation only: open opt-ins, invoices in flight, completed ones.

**Opt-in inbox** (\`/supplier/opt-in\`). Rows in \`awaiting_opt_in\` where this organisation is the supplier. Accept asks for an OTP when the flow requires it, then creates the assignment and moves the invoice to \`pending_settlement\`. Decline sets \`opt_in_declined\` and closes the instrument without a purchase webhook. A second accept is not offered once a pending or signed consent already exists for that invoice.

**Post invoice** (\`/supplier/post-invoice\`). Supplier-originated listing. The buyer must verify before anyone can treat it as confirmed. Status starts at \`awaiting_buyer_verification\`.

**My invoices** (\`/supplier/invoices\`). Filterable list. Open a row for status history, parties, amounts, and documents. Offer responses for the negotiated path are available from the invoice, not from a separate marketplace.

**Payments** (\`/supplier/payments\`). Repayment history recorded against receivables this supplier sold. This is the partner's payment-update feed and escrow collection records, not a bank statement.

**Documents** (\`/supplier/documents\`). Vault for files attached to the organisation or an instrument.

**Profile** (\`/supplier/profile\`). Organisation details and signatories. Signatory capacity is maker, checker, or both. The people list comes from the same organisation, not from the global admin user directory.

The ledger item appears only when \`VITE_ENABLE_WALLET\` is on. Production leaves it off.

### Buyer
**Dashboard** (\`/buyer\`). Exposure, open items, and overdue count. Overdue means unpaid and due date already passed.

**Post IOU** (\`/buyer/post-iou\`). Capture a confirmed payable: supplier, face value, issue and due dates, commitment-to-pay acknowledgement, optional bank standing-order reference. Currency on this form is KES. Posting creates \`awaiting_opt_in\` and an opt-in row for the supplier. It does not notify AfyaX of a purchase.

**Verification** (\`/buyer/verification\`). Supplier-listed invoices waiting for this buyer. Accept moves them forward. Reject sets \`buyer_rejected\`.

**Invoice register** (\`/buyer/register\`). Everything this buyer owes or has confirmed. Refresh reloads from the API.

**Consent** (\`/buyer/consent\`). OTP consent inbox for negotiated assignments. Request a code, then sign, or decline. Declined consent stays visible as declined so the SPV does not keep requesting a duplicate.

**Payments** (\`/buyer/payments\`). Schedule and posted repayments.

**Profile** (\`/buyer/profile\`). Organisation, signatories, and the developer tab where API keys are created. A new key is shown once.

### SPV
**Dashboard** (\`/spv\`). Book overview for the vehicle.

**IOU registry** (\`/spv/registry\` and \`/spv/registry/:id\`). Search and open any instrument, with status history. This is where an operator confirms the public id the partner quoted.

**Offers** (\`/spv/offers\`). Open IOUs the SPV can bid on. Available includes \`listed\`, \`verified\`, \`awaiting_opt_in\`, \`awaiting_buyer_verification\`, and \`offer_received\`. A Path A credit sale is often still \`listed\` or \`awaiting_opt_in\`; it must still appear here or the SPV cannot see partner-posted paper. Closed includes declined. Making an offer records discount in basis points, tenor, and a purchase price. Programme bands can reject an offer outside the allowed discount or tenor.

**Assignments** (\`/spv/assignments\`). The trail after acceptance: standard confirmation (opt-in or buyer verification) versus negotiated offer (needs buyer OTP). Request consent only when no pending or signed consent exists.

**Escrow** (\`/spv/escrow\`). Legs per assignment. The disbursement-to-supplier leg is the one that matters for the partner. Releasing it sets the invoice to \`disbursed\`, marks the listing sold, and sends the purchase webhook. Collection-from-buyer records repayment on the IOUX side. Fee-to-platform and payout-to-SPV are ledger legs. Releasing a leg does not send money to a bank. The button records the event. Say that out loud in a demo so nobody thinks the click was an M-Pesa transfer.

**Packaging** (\`/spv/packaging\`). Bundle assigned receivables. Status moves draft → structured → listed → placed. \`placed\` means the package is internally ready. It is not an NSE acknowledgement. Errors from the status update are shown; the screen does not pretend success if the write failed.

**Payments** (\`/spv/payments\`). History across the book.

**Backend engine** appears only when \`VITE_ENABLE_ENGINE\` is on. It is an operator view of package readiness, not a second product.

### Admin
**Dashboard** (\`/admin\`). Portfolio counts.

**All invoices** (\`/admin/invoices\`). The operator view of every instrument, with the full status filter. This is the first screen to open when a partner says they posted an invoice. Search by IOU id, invoice number, or party.

**Programmes** (\`/admin/programs\`). A programme is a facility: max exposure, buyer sublimit, max tenor in days, and a discount band in basis points. Posts and offers that break the band are rejected. Pausing a programme stops new use; it does not unwind assignments already made.

**Fees** (\`/admin/fees\`). Fee rows: basis points on face, flat shilling amounts, what they apply to, active or not. Fees accrue on assignment into the fee ledger. They are not collected by bank transfer inside IOUX.

**Reconciliation** (\`/admin/reconciliation\`). Period view and export for matching IOUX records to what the partner and the SPV believe happened.

**Escrow** (\`/admin/escrow\`). Same recording screen as the SPV, for operators.

**Users and organisations** (\`/admin/users\`). Invite a person into an organisation with a role. They get a temporary password. Suspend an organisation and its users stop being able to act.

**Integrations** (\`/admin/integrations\`). The partner row: sandbox versus production, purchase URL, optional lifecycle URL, webhook format, enabled events, and the secrets used to sign or verify calls. Webhook delivery history shows HTTP status, attempts, and the last error. A 400 from the partner is visible here. Retry is for deliveries that failed, not for rewriting history.

**Workflow** (\`/admin/workflow\`). Audit export: who called what, on which resource, from which IP.

**Analytics** (\`/admin/analytics\`). Aggregates over the book. It is not a general ledger.

**Profile** (\`/admin/profile\`). The operator's own account.

### Shared behaviour
Notifications are in-app. The bell shows unread items for the signed-in user. Email is sent in parallel when a provider is configured; the UI does not call a public \`/notify\` endpoint. Signatories are always loaded from the caller's own organisation. Idle time warns and then signs the portal user out. Docs sessions are separate and use their own token in session storage.
`,

  lifecycle: `
There are three ways an invoice becomes an assignment. All three end at the same door: SPV disbursement is what tells the partner the receivable was purchased.

### Path A — buyer or partner posts a credit sale
This is the AfyaX path. The partner (or a buyer in the portal) creates the invoice with the buyer as obligor and the supplier as originator. \`commitmentToPay\` is true. Status starts at \`awaiting_opt_in\`. An opt-in row is pending for the supplier.

The supplier opens Opt-in, requests a code if required, and accepts. IOUX then:
- marks the opt-in accepted
- creates an assignment of type standard confirmation (older rows may say \`opt_in_auto\`)
- creates escrow legs (disbursement, collection, fees)
- accrues fees
- writes status history
- moves the invoice to \`pending_settlement\`
- notifies the organisations
- may generate a purchase-note PDF
- emits \`iou.status_changed\` only if a lifecycle URL exists

It does **not** call \`/iou/purchase\`.

The SPV (or admin) opens Escrow and releases the disbursement-to-supplier leg. That transition is the only one that sets \`disbursed\`, sets listing status to sold, and emits \`iou.disbursed\`. The AfyaX adapter turns that event into the purchase POST.

### Path B — supplier lists, buyer verifies
The supplier posts the invoice. Status starts at \`awaiting_buyer_verification\`. The buyer confirms, which is their commitment to pay, or rejects. On accept, IOUX continues into the same assignment and \`pending_settlement\` path as Path A. The purchase webhook still waits for disbursement.

### Path C — negotiated offer
The invoice is open (\`listed\`, \`verified\`, \`awaiting_opt_in\`, or \`awaiting_buyer_verification\`). The SPV submits an offer: tenor, discount in basis points, purchase price. The supplier accepts or rejects. If the track is negotiated, the buyer must OTP-sign consent before assignment. Consent declined or rejected stops that offer path without a purchase. After consent, assignment and escrow look like the other paths, and disbursement is again the purchase signal.

Standard confirmation (opt-in or buyer verification already on file) does not ask for a second consent ritual. Negotiated offer does.

### After disbursement
The partner should keep their listing open until the purchase call returns success, accept the asking amount, and treat a repeat delivery of the same \`ioux_id\` as the same sale. IOUX retries failed HTTP calls. A listing the partner already marked sold will answer 400 on a later test that reuses it. The fix is a new IOU, not a second click on the old one.

Repayments are \`POST /webhooks/payment-update\`. Each call carries amount paid, and IOUX stores outstanding balance and the next due date. When the outstanding balance is cleared, the instrument can move to \`settled\`. Settlement emits \`iou.settled\` on the lifecycle URL if one is set. It does not send another purchase payload.

### Demo script
Use a brand-new invoice. Confirm the purchase URL and environment in Admin → Integrations before anyone clicks.

1. Partner \`POST /external/invoices\` (or show the row already in Admin → All Invoices). Note \`iouRegistryId\` and \`awaiting_opt_in\`.
2. Supplier accepts opt-in. Show \`pending_settlement\` and the assignment. Tell the room the partner has not been told about a purchase yet.
3. SPV releases disbursement. Show \`disbursed\` and the webhook delivery row: HTTP status, payload with SPV \`buyer_name\` and asking \`amount\`.
4. Optional: partner posts one repayment and the balance moves. Stop there unless the test is specifically about settlement.

If the delivery row is 400 "amount less than asking price", the amount sent was the discount net. The adapter now prefers listed amount, then face value. If the delivery row is 400 "listing already sold", that listing cannot be used again.

### Standing orders
Bank name, account, and standing-order reference can be stored on the invoice when the buyer posts. IOUX never sends those fields to a bank. They are a note for the settlement agent.
`,

  'partner-api': `
Current production base is \`https://uzimax.onrender.com/api/v1\`. Health, with no key, is \`GET /health\`.

Authenticate with \`X-API-Key: uzima_…\` or \`Authorization: Bearer uzima_…\`. Keys are shown once at creation, stored hashed, and can be revoked. Scopes are typically \`parties:write\`, \`parties:read\`, \`invoices:write\`, and \`payments:write\`. A portal JWT is a different credential and is not how AfyaX posts invoices.

### Models
**Model A — partner originates the credit sale.** The usual AfyaX model. Partner pushes parties and the invoice. Supplier opts in on IOUX. SPV disburses. IOUX calls the partner purchase URL. Partner later pushes repayments.

**Model B — supplier lists.** Same invoice API with \`submissionType: supplier_list\`. Status starts at \`awaiting_buyer_verification\`.

**Model C — portal only.** A few people get logins and type invoices. No API. Use this for a thin trial, then move to Model A when volume justifies it. Do not mix models on the same invoice.

### Parties and users
\`POST /parties\` upserts a buyer or supplier and returns \`uzimaPartyId\` plus \`organisationId\`. Send the legal name, registration number, organisation type, and the partner's own external id so a repeat call updates rather than duplicates. \`GET /parties/{uzimaPartyId}\` reads it back.

\`POST /users\` creates a portal user under an organisation and can send the invite email. Use it for the supplier checker who must click opt-in. It does not create a docs login.

### Invoice create
\`POST /external/invoices\` or the alias \`POST /ious\`.

| Field | Required | Notes |
|-------|----------|-------|
| Buyer | Yes | \`buyerOrgId\` or \`buyerPartyId\` |
| Supplier | Yes | \`supplierOrgId\` or \`supplierPartyId\` |
| \`faceValue\` | Yes | Positive. Gross amount owed |
| \`issueDate\`, \`dueDate\` | Yes | \`YYYY-MM-DD\`. Tenor is calendar days. Programmes may cap it, often 120 |
| \`commitmentToPay\` | Yes on a credit sale | \`true\` when the buyer owes |
| \`listedAmount\` | Strongly recommended | Asking price. This is what the purchase webhook sends |
| \`externalInvoiceId\` | Recommended | Partner's id for reconciliation |
| \`submissionType\` | Optional | \`buyer_credit_sale\` (default) or \`supplier_list\` |
| Supporting docs | Recommended | \`name\`, \`fileUrl\`, \`docType\` |

Store \`invoiceId\`, \`iouRegistryId\`, and the initial \`status\` from the response. Poll with \`GET /ious/{iouRegistryId}\` or \`GET /invoices/{id}/status\`.

### Payment updates
\`POST /webhooks/payment-update\` needs the API key and two headers:

| Header | Value |
|--------|--------|
| \`X-Afyax-Timestamp\` | Unix seconds or milliseconds. Both are accepted |
| \`X-Afyax-Signature\` | HMAC-SHA256 of \`{timestamp}.{rawBody}\` using the webhook secret, hex or \`sha256=\` hex |

Sign the exact raw body bytes. Skew beyond the allowed window is 401. Send a unique \`idempotencyKey\` so a retry does not double-count. The response includes \`iouxTransactionId\`.

### Purchase webhook (IOUX calls the partner)
Fires only on \`iou.disbursed\`.

\`\`\`json
{
  "buyer_name": "IOU Exchange Capital SPV",
  "ioux_id": "IOU-KE-2026-00006-7",
  "payment_method": "bank",
  "amount": 5830,
  "transaction_id": "IOUX-TXN-…",
  "bank_reference": "IOUX-TXN-…"
}
\`\`\`

| Field | Meaning |
|-------|---------|
| \`buyer_name\` | SPV that acquired the receivable. Not the pharmacy or other obligor |
| \`ioux_id\` | Same as \`iouRegistryId\` |
| \`payment_method\` | \`bank\`, \`mpesa\`, or \`wallet\` as configured. This is a label, not a rail instruction |
| \`amount\` | Listed asking amount, then face value if no listed amount was stored. Not the discounted purchase price |
| \`transaction_id\`, \`bank_reference\` | IOUX settlement reference for reconciliation |

The partner should find the listing by \`ioux_id\`, confirm it is still open, check \`amount\` against the asking price, mark it sold once, and return 2xx. Return 4xx with a clear JSON body on a business rejection. Be idempotent. IOUX retries non-success and logs every attempt under Admin → Integrations.

| Partner response | Usual cause |
|------------------|-------------|
| 400 amount below asking price | A discounted net was sent, or \`listedAmount\` was never stored |
| 400 listing already sold | The listing was closed before this call, or a previous attempt already succeeded |
| Timeout or 5xx | Endpoint down, or IOUX egress not allow-listed |

Configure the URL in Admin → Integrations for the active environment. Sandbox and production hosts differ. Lifecycle event webhooks are optional and are not a substitute for this call.

### Joint UAT
One new IOU, never a listing that is already sold.

1. \`GET /health\` and a call without a key (expect 401).
2. \`POST /parties\` for buyer and supplier. Store both party ids.
3. \`POST /users\` for the supplier checker if they must use the portal.
4. \`POST /external/invoices\` with \`listedAmount\` equal to the asking price. Expect \`awaiting_opt_in\`.
5. Supplier opts in. Expect \`pending_settlement\`.
6. SPV releases disbursement. Expect \`disbursed\` and a 2xx from the partner purchase URL.
7. One signed payment-update. Expect \`iouxTransactionId\`.

Credentials, the platform org id, and the HMAC secret are handed over outside this handbook.
`,

  security: `
### Portal
Email and password. Access token about 15 minutes, signed HS256. Refresh cookie is httpOnly, scoped to the auth path, and rotated. Forgot-password emails a one-time code; the reset requires that code and a new password of at least 12 characters with upper, lower, a number, and a symbol. Repeated failures lock the account for a window. The lockout counter is in Redis in production.

Opt-in, buyer verification, and consent can require a 6-digit OTP. Codes are hashed, expire in about 10 minutes, and are single use. In local development a fixed demo code may be allowed. Production must not enable that.

API keys are prefixed \`uzima_\`, shown once, stored as a hash, and revocable. A revoked key fails the next call.

Every mutating request can be written to the audit log with actor, path, status, and IP. Admins export that from Workflow.

Postgres row-level policies are applied on the hosted database. The API still scopes queries by organisation. Do not rely on only one of those two.

### Docs
\`docs_users\` and \`docs_otp_codes\` are not the portal tables. Roles are \`docs_admin\` and \`docs_reader\`. Status \`revoked\` is checked on every request, so a still-valid token stops working immediately. Forgot-password uses the same email provider. Docs tokens last longer than portal access tokens (12 hours) and carry audience \`docs\`. They are kept in session storage in the browser, not in the portal refresh cookie.

A docs admin cannot revoke their own row from the Access screen, so the handbook cannot be locked with nobody left to reopen it. Granting an email emails a temporary password. First login forces a change.

### Partner HMAC
Payment updates are rejected when the timestamp is outside the skew window or the signature does not match the raw body. Changing whitespace after signing breaks the signature. The secret is the integration webhook secret, not the API key.

### Secrets
Never commit \`.env\`, API keys, HMAC secrets, JWT secrets, or database URLs. Rotate anything that was pasted into chat, email, or a ticket. Production CORS is an explicit allow-list. \`https://docs.ioux.africa\` must be on that list once the hostname is served from the same API, even though same-origin browser calls do not need CORS; a mismatched \`VITE_API_URL\` would.

Cookies in production are \`Secure\` and \`SameSite=None\` so the portal refresh cookie works across the app host and the API host if those are ever split. Today they are the same host.
`,

  'data-model': `
Postgres is the book. Drizzle models in the API match these tables. Amounts are numeric. Currency defaults to KES. Times are timestamptz.

### Parties and access
- **organisations** — \`buyer\`, \`supplier\`, \`spv\`, or \`platform\`. Unique \`uzima_party_id\`. Optional partner external id. Status \`active\`, \`suspended\`, or \`pending\`.
- **users** — email, password hash, role, organisation, phone, signatory flag, must-change-password, status. Unique email.
- **api_keys** — organisation, hash, prefix, scopes, active flag.
- **refresh_tokens** — portal refresh hashes and expiry.
- **signatories** — user, organisation, title, capacity (maker, checker, both), active flag.
- **org_documents** — files hung on the organisation.
- **docs_users** / **docs_otp_codes** — handbook only. No foreign key into portal users.

### The receivable
- **invoices** — the IOU. Public \`iou_registry_id\`. Origin (portal or API). Originator, buyer, supplier, and source platform organisation. Invoice number, PO reference, face value, listed amount, currency, issue and due dates, listing status, discount in basis points, workflow status, commitment to pay and the acknowledgement, standing-order fields, metadata JSON.
- **installment_schedules** — due date and amount per installment when the payable is split.
- **invoice_status_history** — from status, to status, actor, reason. This is the audit of the state machine.
- **opt_ins** — supplier response: pending, accepted, declined.
- **buyer_verifications** — buyer response and optional reject reason.
- **purchase_offers** — SPV, discount bps, tenor days, purchase price, face, status.
- **assignment_consents** — buyer, SPV, signatory, OTP verified, signature hash, status.
- **assignments** — invoice, optional offer, optional consent, the three organisations, assignment type, purchase price, face value, status. Type is standard confirmation or negotiated offer. Older rows may still say \`opt_in_auto\`, \`supplier_originated_auto\`, or \`offer_consent\`; reads treat those as the two tracks.
- **escrow_legs** — assignment, leg type, amount, status. Leg types include disbursement to supplier, collection from buyer, fee to platform, payout to SPV.
- **payment_updates** — source, amount paid, outstanding balance, next due date, partner reference, idempotency.

### Commercial configuration
- **programmes** — name, optional buyer, max exposure, sublimit, max tenor days, discount band minimum and maximum in basis points, status.
- **fee_configurations** — type, rate in bps, flat amount, what it applies to, active flag.
- **fee_ledger** — amount accrued on an assignment and whether it is still open.
- **packages** / **package_items** — package reference, status, totals, optional NSE reference string. The reference is a label for readiness, not a confirmation from an exchange.

### Operations
- **platform_integrations** — URLs per environment, which environment is active, webhook format, enabled events, secrets.
- **webhook_deliveries** — event, target URL, status, attempt count, response.
- **notifications** — in-app title, body, read flag, user.
- **audit_log** — actor, action, resource, JSON details, IP.
- **email_send_log** — recipient, template, provider status. Use this when someone says the reset email never came.
- **otp_codes** — portal OTP hashes. Docs OTPs are in the other table.
- **wallets** / **wallet_transactions** — simulated ledger, one wallet per organisation. Off in the production UI unless enabled.

An invoice points at organisations, not at free-text party names. If a name is wrong on a webhook, fix the organisation name (the SPV name is what \`buyer_name\` uses) rather than patching the outbound JSON by hand.
`,

  deploy: `
### Run the application
Node 20 or newer. Install with \`npm ci\`. Build the SPA with \`npm run build\`. Apply schema with \`npx drizzle-kit push\` or the SQL files under \`server/db/migrations\`. Start with \`npm run start:api\` (tsx serves the API and, in production, the built SPA). Health check path: \`/api/v1/health\`.

Locally, run the API (\`npm run dev:api\`, port 8787) and Vite (\`npm run dev\`, port 5173) in two terminals. Vite calls the API at localhost:8787.

### Environment names
Required in production: \`DATABASE_URL\`, \`REDIS_URL\`, \`JWT_SECRET\`, \`JWT_REFRESH_SECRET\`, \`COOKIE_SECURE=true\`, \`CORS_ORIGINS\`, and an email provider (\`RESEND_API_KEY\` or SMTP host, user, and password). AfyaX webhook secret and purchase URL settings are required before a partner test, either in the environment or on the integration row. Do not put the values in this handbook or in git.

\`CORS_ORIGINS\` is an exact allow-list. Include \`https://www.ioux.africa\`, \`https://ioux.africa\`, \`https://app.ioux.africa\`, and \`https://docs.ioux.africa\`. The process will not boot in production if the list is empty.

Leave \`ENABLE_SIMULATED_WALLET\` unset or false in production. Leave demo OTP disabled.

### docs.ioux.africa
The docs site is the same deployment. The browser chooses it when the hostname is \`docs.ioux.africa\` (routes at \`/\`) or when the path is \`/docs\` on any other host.

1. DNS for \`docs.ioux.africa\` points at the same Render service as the portal.
2. Add \`https://docs.ioux.africa\` to \`CORS_ORIGINS\` and redeploy.
3. Against the **production** \`DATABASE_URL\`, run \`npm run docs:seed\`. That applies \`server/db/migrations/0003_docs_users.sql\` (creates \`docs_users\` and \`docs_otp_codes\` if they are missing) and, when \`DOCS_SEED_USERS\` is set, upserts accounts.
4. Sign in. Admins open **Access** to add or revoke emails after that.

Seed format, several people separated by a semicolon:

\`email|Full Name|docs_admin|TemporaryPassword12!\`

Readers use \`docs_reader\`. Re-running the seed resets that person's password and sets them back to active, so do not re-run it against people who already chose a password unless you mean to replace it. The local \`.env\` database is not the Render database. Seeding localhost does not create accounts on the live site.

### Cutover habits
Keep the current production host up while a new partner trial runs. Stand up staging on its own database and its own purchase URL before changing production DNS. Do not point a live partner purchase URL at a half-migrated database. Webhook delivery rows are the evidence a call was attempted; take a note of the last successful delivery before a deploy that touches the adapter.
`,

  'out-of-scope': `
These are not unfinished screens. They are outside the current product. Building them is a change of scope, not a bug fix.

- **Live bank or M-Pesa movement.** Escrow release records a decision. It does not instruct a bank, Stanbic, or Safaricom. A settlement agent or the partner's PSP moves cash, then the result is recorded here or arrives as a payment update.
- **Executing a standing order.** The reference is stored on the invoice for humans. IOUX does not submit it.
- **A real NSE or other exchange listing.** Packaging can be marked structured, listed, or placed, and can store an NSE reference string. No exchange API is called. \`placed\` is internal readiness.
- **Note investors, coupons, and series.** There is no investor portal, no subscription, and no coupon schedule. The SPV is funded outside this system.
- **Keycloak, SSO, or authenticator MFA.** Sign-in is email and password. Step-up is email OTP. SMS OTP needs Africa's Talking and is not assumed.
- **External KYC vendors.** Organisations hold documents the operator uploaded or the partner linked. IOUX does not call a KYC API.
- **Replacing the partner's commerce system.** AfyaX (or the next partner) remains the system of trade. IOUX does not rebuild listings, catalogues, or underwriting.
- **Counsel-certified true-sale packs.** PDFs generated in the product are operational notes. They are not a legal opinion.

A dedicated insurer role and a dedicated healthcare-provider role do not exist. The seller is the supplier. The obligor is the buyer. An insurer is a buyer organisation with an appropriate programme.

Credit pricing in offers uses tenor and the programme band. It does not pull a separate credit-risk score. If a deal needs a different discount, the SPV enters that discount inside the band, or an admin changes the programme.
`,

  glossary: `
| Term | Meaning |
|------|---------|
| Supplier | Originator. Sells the receivable to the SPV. Portal role \`supplier\`. |
| Buyer | Obligor. Owes the face amount. May be a pharmacy customer, a hospital, a corporate, or an insurer. Portal role \`buyer\`. |
| SPV | Special purpose vehicle that acquires receivables. Operating name in the purchase payload is the SPV organisation's name. |
| Admin | IOUX operator. Organisation type \`platform\`. |
| Partner platform | External system that posts parties and invoices by API and receives the purchase webhook. AfyaX is the current one. |
| IOU / invoice | One receivable. One row. One public id. |
| Face value | Gross amount the buyer owes. |
| Listed / asking amount | Price stored as \`listedAmount\`. The purchase webhook sends this in preference to the discounted price. |
| Purchase price | Discounted amount the SPV records as what it paid the supplier. Internal. Not the webhook \`amount\` when a listed amount exists. |
| Discount | Percent or basis points off face. 100 bps = 1%. |
| Tenor | Calendar days from issue date to due date, minimum 1. |
| Opt-in | Supplier accepts a buyer-posted or partner-posted IOU. |
| Buyer verification | Buyer confirms a supplier-listed invoice. |
| Assignment | Record that the SPV now holds the receivable, with price and track. |
| Standard confirmation | Assignment after opt-in or buyer verification, without a fresh negotiated consent. |
| Negotiated offer | SPV offer, supplier acceptance, buyer OTP consent, then assignment. |
| Consent | Buyer OTP signature. Status pending, signed, declined, or rejected. |
| Escrow leg | A recorded cash step. Not a bank payment. |
| Disbursement | The leg whose release marks \`disbursed\` and calls the partner. |
| Collection | The leg that records money coming back from the buyer. |
| Programme | Facility: exposure cap, tenor cap, allowed discount band. |
| Fee ledger | Platform fees accrued on assignment. Not a bank transfer. |
| Listing status \`sold\` | IOUX has acquired the receivable. The partner should have accepted the purchase webhook. |
| Standing order | Bank reference stored on the IOU. Not executed here. |
| Commitment to pay | Obligor acknowledgement stored on the invoice. Required for a credit-sale post. |
| Package | A bundle of receivables toward listing readiness. |
| Docs admin / reader | Handbook access only. |

Public IOU ids look like \`IOU-KE-2026-00006-7\`: prefix, country, year, five-digit sequence, check digit. Party ids look like \`UZ-BUY-…\`, \`UZ-SUP-…\`, and \`UZ-PLT-…\`.
`,

  pricing: `
Currency is **KES**. Prices and fees round to whole shillings with \`Math.round\`. There is no Actual/360 day count. Multi-currency can be stored, but the post-IOU form submits KES.

### Tenor
\`max(1, round((dueDate − issueDate) / 86400000))\` in calendar days. A programme \`maxTenorDays\` rejects longer paper. Seeded insurance-style programmes sit around 90–120 days; the cap is data, not a hard-coded constant, so read the programme before promising a tenor to a partner.

### Indicative discount
Default curve, used when someone asks the pricing quote endpoint or the offer screen for a recommendation:

\`4% + (tenorDays / 30) × 0.35%\`

rounded to two decimal places, then clamped into the programme band when a programme is attached.

45 days: \`4 + (45/30)×0.35 = 5.525\`, which rounds to **5.53%**. If the band is 3.50% to 6.50%, 5.53% is inside it and is not clamped. A result outside the band is pulled to the nearest edge and flagged as clamped. Tenor above the programme maximum is not "within band" even if the percent fits.

### Purchase price and margin
\`offerPrice = round(face × (1 − discountPercent / 100))\`. Margin is face minus that price.

Worked example, face 1,200,000 at 5.53%: purchase price **1,133,640**, margin **66,360**. In basis points that discount is 553 bps.

On assignment the same idea is applied as \`round(base × (1 − bps/10000))\`. The base prefers the listed amount when one is set, otherwise face. The bps are the agreed discount, not a second hidden haircut.

### What the partner sees
The AfyaX purchase webhook does **not** send 1,133,640 in the example above. It sends \`listedAmount\` if present, otherwise face. The discount lives in the assignment and in the escrow disbursement leg. Partners that compare \`amount\` to their listing asking price will reject the discounted net. That was an observed UAT failure and is why the adapter order is listed, then face, then any explicit override, and only then the settlement or purchase price.

### Fees
On assignment, active fee configuration rows are applied. A rate in basis points is \`round(face × bps / 10000)\`. A flat fee uses the shilling amount. Per-payment percentage fees are skipped at assignment time so they are not charged twice on day one. An extra flat amount on a rate row is added if configured.

Example shape from the seed data: 50 bps plus 25 bps plus KES 500. On a face of 1,200,000 that is 6,000 + 3,000 + 500 = **9,500**. Real production fees are whatever Admin → Fees has active. Do not assume the seed numbers are the contract.

Supplier net on the disbursement leg is the purchase price minus half of the accrued fee total. The other half is the platform fee leg. Collection from the buyer is a different leg and follows the repayment amounts the partner posts, up to the amount owed.

### Programme gates
Before a post or an offer is accepted, the programme can block it for max exposure, buyer sublimit, max tenor, or discount outside the band. A clear 400 is better than a silent clamp. If a legitimate deal sits outside the band, change the programme or the offer. Do not bypass the check in the database during a demo.

There is no separate yield, coupon, or penalty engine. Investor return is not calculated here.
`,

  statuses: `
Transitions are enforced. If a call asks for a status that is not in the allowed list, the API returns 400 \`invalid_transition\` and the row does not change. Every successful change is inserted into invoice status history with the previous status, the new status, the actor, and a reason.

### Invoice statuses
\`draft\`, \`listed\`, \`awaiting_opt_in\`, \`awaiting_buyer_verification\`, \`verified\`, \`offer_received\`, \`offer_accepted\`, \`pending_settlement\`, \`assigned\`, \`packaged\`, \`disbursed\`, \`matured\`, \`settled\`, \`defaulted\`, \`opt_in_declined\`, \`buyer_rejected\`, \`cancelled\`.

### Allowed next statuses
| From | Can become |
|------|------------|
| \`draft\` | \`awaiting_opt_in\`, \`awaiting_buyer_verification\`, \`listed\`, \`cancelled\` |
| \`awaiting_opt_in\` | \`listed\`, \`pending_settlement\`, \`opt_in_declined\`, \`cancelled\` |
| \`awaiting_buyer_verification\` | \`verified\`, \`pending_settlement\`, \`buyer_rejected\`, \`cancelled\` |
| \`listed\` | \`offer_received\`, \`pending_settlement\`, \`assigned\`, \`cancelled\` |
| \`verified\` | \`pending_settlement\`, \`assigned\`, \`listed\`, \`cancelled\` |
| \`offer_received\` | \`offer_accepted\`, \`listed\`, \`cancelled\` |
| \`offer_accepted\` | \`pending_settlement\`, \`assigned\`, \`cancelled\` |
| \`pending_settlement\` | \`disbursed\`, \`cancelled\` |
| \`assigned\` | \`packaged\`, \`disbursed\`, \`settled\`, \`cancelled\` |
| \`packaged\` | \`disbursed\`, \`settled\`, \`cancelled\` |
| \`disbursed\` | \`matured\`, \`settled\`, \`cancelled\` |
| \`matured\` | \`settled\`, \`defaulted\`, \`cancelled\` |
| \`settled\`, \`opt_in_declined\`, \`buyer_rejected\`, \`defaulted\`, \`cancelled\` | none |

Path A in practice: \`awaiting_opt_in\` → \`pending_settlement\` on supplier accept → \`disbursed\` on escrow release → \`settled\` when repayments clear the balance. \`matured\` is the time-passed branch from disbursed before collection completes. \`defaulted\` is only reached from \`matured\`.

\`disbursed\` is the only transition that sends the AfyaX purchase webhook. \`settled\` can send a lifecycle event. Terminal statuses do not reopen. A cancelled or declined IOU needs a new post, not an edit back to awaiting opt-in.

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
| Webhook delivery | recorded per attempt with HTTP status |

Listing status on the invoice (\`sold\` once acquired) is separate from workflow status. An operator can see \`disbursed\` and \`sold\` together. \`sold\` without a 2xx delivery means IOUX recorded the acquisition and the partner has not accepted it yet. Read the delivery row before reposting.

Escrow leg types include disbursement to supplier, collection from buyer, fee to platform, and payout to SPV. Only releasing **disbursement to supplier** performs the disbursed transition. Collecting a buyer leg does not re-fire purchase.
`,

  'api-map': `
Prefix \`/api/v1\`. Portal calls send \`Authorization: Bearer\` with the portal access token. Partner calls send \`X-API-Key\` or \`Authorization: Bearer uzima_…\`. Docs calls send \`Authorization: Bearer\` with the docs token to \`/docs-auth/…\`. Mixing those tokens returns 401.

### Public
| Call | Purpose |
|------|---------|
| \`GET /health\` | Process up, and whether Postgres answered |
| \`POST /auth/login\` | Portal sign-in. Returns an access token and sets the refresh cookie |
| \`POST /auth/refresh\` | New access token from the cookie |
| \`POST /auth/logout\` | Revoke the refresh token |
| \`POST /auth/forgot-password\` | Always a generic success message |
| \`POST /auth/reset-password\` | Email, OTP, new password |
| \`POST /contact\` | Marketing contact form. Emails support |
| \`POST /docs-auth/login\` | Docs sign-in |
| \`POST /docs-auth/forgot-password\` | Docs reset code |
| \`POST /docs-auth/reset-password\` | Docs password reset |

Login and the docs login routes are rate-limited more tightly than the rest of the API.

### Signed-in portal
| Call | Purpose |
|------|---------|
| \`GET /auth/me\` | Current portal user |
| \`POST /auth/change-password\` | Replace password, clears must-change |
| \`POST /invoices\` | Buyer or supplier creates an invoice in the portal |
| \`GET /invoices\` | List scoped to the caller |
| \`GET /invoices/{id}\` | Detail plus status history |
| \`GET /opt-ins\` and \`POST /opt-ins/{id}/respond\` | Supplier inbox. \`request-otp\` sends the code |
| \`GET /buyer-verifications\` and respond | Buyer confirms or rejects |
| \`GET /offers\` and \`POST /offers\` | SPV creates an offer. Supplier responds |
| \`GET /consents\`, request OTP, confirm, decline | Buyer consent |
| \`GET /assignments\` | Assignment trail |
| \`GET /escrow\`, \`POST /escrow/{id}/release\`, \`POST /escrow/{id}/collect\` | Record disbursement or collection. SPV or admin |
| \`GET/POST /packages\` | Packaging |
| \`GET/POST /programmes\` | Read for SPV, write for admin |
| \`GET/POST /fees\` | Admin fee configuration |
| \`GET/POST /documents\` | Upload and download |
| \`GET/POST /signatories\` and \`GET /org/users\` | Signatories in the caller's organisation |
| \`GET /notifications\` | In-app notices |
| \`GET /organisations\` | Directory the caller is allowed to see |
| \`POST /pricing/quote\` | Tenor discount quote |
| \`GET /payment-updates\`, \`GET /payment-schedule\` | What has been repaid and what is due |
| \`GET/POST /api-keys\`, revoke | Buyer or admin |

Wallet deposit and withdraw exist only when the simulated wallet flag is on.

### Admin
\`GET /admin/users\`, invite, \`GET /admin/audit\`, \`GET /admin/analytics\`, \`GET /admin/reconciliation\`, \`GET /admin/email-log\`, integration CRUD, webhook deliveries and retry, system health. These reject non-admin tokens with 403.

### Partner
| Call | Purpose |
|------|---------|
| \`POST /parties\` | Upsert buyer or supplier |
| \`GET /parties/{uzimaPartyId}\` | Read a party |
| \`POST /users\` | Portal user under an organisation |
| \`POST /external/invoices\` | Create the IOU |
| \`POST /ious\` | Alias of create |
| \`GET /ious/{iouRegistryId}\` | Status, history, assignment |
| \`GET /invoices/{id}/status\` | Status by UUID |
| \`POST /webhooks/payment-update\` | Signed repayment |
| \`POST /settlements/notify\` | Settlement ping where that route is enabled |

### Docs
\`GET /docs-auth/me\`, \`GET /docs-auth/chapters\`, \`GET /docs-auth/chapters/{id}\`, \`POST /docs-auth/change-password\`. Admins also have \`GET /docs-auth/users\`, \`POST /docs-auth/users\`, and \`PATCH /docs-auth/users/{id}\` with \`status\` of \`active\` or \`revoked\` and an optional role change.

Request bodies are validated with Zod. A machine-readable contract is in \`docs/openapi.yaml\` in the repository. Field-level AfyaX examples are issued with credentials, not pasted into this site.
`,
};
