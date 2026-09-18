# IOU Exchange — Demo presentation script (by role)

Present **one portal at a time**: Buyer → Supplier → SPV → Admin. Use a fresh browser tab or incognito per role so sessions don’t mix.

**Local:** http://localhost:5173 · **Live:** https://uzimax.onrender.com/login  
**Password (all accounts):** `Uzima2026!`

| Role | Email | Org |
|------|--------|-----|
| Buyer | `buyer@ioux.africa` | Insurance A |
| Supplier | `supplier@ioux.africa` | Supplier 1 |
| SPV | `spv@ioux.africa` | Capital SPV |
| Admin | `admin@ioux.africa` | Platform |

**OTP:** On any confirm (verify, opt-in, offer accept, consent), tap **Request OTP** — locally the **Demo code** appears in the UI. Paste it.

**Orgs:** Anonymous labels only (Insurance A/B, Pharmacy 1–5, Hospital 1–5, Wholesaler 1–2, Corporate 1–2, Supplier 1–6). No real brand names.

---

## Before you start (2 min)

- [ ] App loads; login works for all four emails above  
- [ ] Have this doc open on a second screen  
- [ ] Optional: marketing home `/` + Portals page as a 30s opener  

---

# Page 1 — Buyer portal

**Login:** `buyer@ioux.africa` → `/buyer`

**One-liner:** The buyer (obligor) posts approved payables, verifies supplier-listed invoices, signs consent when needed, and tracks what they owe.

## Dashboard (`/buyer`)

- [ ] Open dashboard — summary of IOUs / pending actions  
- [ ] **Say:** Insurance A acts as obligor; seed data already has activity to show  

## Post IOU (`/buyer/post-iou`)

- [ ] Create a new IOU: pick **Supplier 1**, invoice #, face value, dates, description  
- [ ] Commitment to pay if shown → submit  
- [ ] **Say:** Buyer-originated instrument; supplier must opt in to sell to the SPV  
- [ ] **Pass:** IOU registry ID; status moves to awaiting supplier opt-in  

## Verification inbox (`/buyer/verification`)

- [ ] Open a **pending** supplier-listed invoice (seed has several)  
- [ ] Show face vs **listed amount** if different (partial sale)  
- [ ] **Accept:** commitment / standing order if shown → Request OTP → Demo code → Verify  
- [ ] **Decline (once):** pick preset (`invalid_invoice`, `not_authentic`, `amount_mismatch`, `suspected_fraud`, `other`) — reason required  
- [ ] **Say:** Bank-style checker confirm with OTP; decline notifies supplier  
- [ ] **Pass:** Accept → verified and assigned to SPV (visible later on SPV registry)  

## Consent inbox (`/buyer/consent`)

- [ ] Open pending consent (negotiated / offer track — seed has examples)  
- [ ] Request OTP → sign, or decline with reason  
- [ ] **Say:** Needed when SPV offer terms require obligor consent  

## Invoice register (`/buyer/register`)

- [ ] List of buyer’s IOUs and statuses  
- [ ] Open one row — lifecycle / detail  

## Payments (`/buyer/payments`)

- [ ] Payment schedule / history (incl. partner-reported updates where seeded)  

## Documents (`/buyer/documents`)

- [ ] KYC checklist: incorporation, CR12, KRA PIN, board resolution, specimen signature, tax clearance, etc.  
- [ ] Upload or show existing mock docs  

## Profile (`/buyer/profile`)

- [ ] Org details  
- [ ] **Signatories** tab — maker / checker / both; **Say:** checkers OTP-confirm critical actions  
- [ ] Developer / API tab if shown  

## Buyer — quick test checklist

- [ ] Post IOU succeeds  
- [ ] Verify with OTP succeeds  
- [ ] Decline requires preset + reason  
- [ ] Consent OTP works (if pending item exists)  
- [ ] Register shows your IOUs  

---

# Page 2 — Supplier portal

**Login:** `supplier@ioux.africa` → `/supplier`

**One-liner:** Supplier lists receivables, responds to buyer-posted opt-ins, accepts SPV offers, and maintains KYC docs.

## Dashboard (`/supplier`)

- [ ] Summary of invoices, opt-ins, offers  

## Opt-in / Sell inbox (`/supplier/opt-in`)

- [ ] Open pending buyer-posted IOU (from Page 1 or seed)  
- [ ] Optional **amount to sell** ≤ face value  
- [ ] **Accept:** Request OTP → Demo code → confirm sell  
- [ ] **Decline (optional):** reason → buyer notified  
- [ ] **Say:** Supplier chooses to sell receivable to SPV; partial sale supported  
- [ ] **Pass:** Opt-in accepted → assignment to SPV  

## Post invoice (`/supplier/post-invoice`)

- [ ] Buyer = **Insurance A** (or another buyer org)  
- [ ] Amounts, dates, description  
- [ ] **Attach ≥1 document** (invoice / proposal / evidence) — required  
- [ ] Optional listed amount ≤ face  
- [ ] Submit  
- [ ] **Say:** Supplier-originated path; buyer verifies in their inbox  
- [ ] **Pass:** Cannot submit without attachment; creates awaiting buyer verification  

## My invoices (`/supplier/invoices`)

- [ ] List all supplier IOUs  
- [ ] Open **Invoice detail** — lifecycle, linked offers  

## Invoice detail — accept SPV offer

- [ ] On a pending offer → Accept → OTP → confirm  
- [ ] **Say:** Same checker OTP pattern as buyer verify  

## Payment history (`/supplier/payments`)

- [ ] Disbursement / payment visibility where seeded  

## Documents (`/supplier/documents`)

- [ ] Same expanded doc types as buyer  

## Profile (`/supplier/profile`)

- [ ] Org + signatories (nominate maker/checker)  

## Supplier — quick test checklist

- [ ] Opt-in + OTP succeeds  
- [ ] Post invoice blocked without attachment  
- [ ] Post invoice succeeds with doc  
- [ ] Offer accept + OTP (if pending offer on an invoice)  

---

# Page 3 — SPV portal

**Login:** `spv@ioux.africa` → `/spv`

**One-liner:** SPV sees the full IOU registry, makes purchase offers, tracks assignments and consents, packages receivables, and monitors escrow legs (simulated).

## Dashboard (`/spv`)

- [ ] Pipeline / assignment metrics (assigned, pending consents, open to offer)  
- [ ] Links to registry and assignments  
- [ ] **Say:** Operational command centre for the capital side  

## IOU registry (`/spv/registry`)

- [ ] Search / filter IOUs  
- [ ] Columns: supplier, **buyer**, platform/source, face value  
- [ ] Open **IOU detail** — lifecycle timeline, parties, face vs listed, platform/source  
- [ ] **Say:** Single registry ID (`IOU-KE-…`) is source of truth  

## Assignments (`/spv/assignments`)

- [ ] Assigned receivables — buyer, supplier, track (standard vs negotiated)  
- [ ] Consent status where applicable  

## Offers (`/spv/offers`)

- [ ] **Available** tab — **Buyer** column visible  
- [ ] Select IOU → calculator → make offer (discount %)  
- [ ] **Say:** Supplier accepts offer in their portal (Page 2) with OTP  

## Packaging (`/spv/packaging`)

- [ ] Assignments ready to package; buyer on rows where shown  
- [ ] Create / view packages (seed has structured packages)  

## Escrow (`/spv/escrow`)

- [ ] Disbursement / collection legs — **simulated**, not live bank rails  

## Payments (`/spv/payments`)

- [ ] Payment updates / collection visibility  

## Profile (`/spv/profile`)

- [ ] SPV org, documents, signatories  

## SPV — quick test checklist

- [ ] Registry lists IOUs with buyer names  
- [ ] Assignments show buyer + supplier  
- [ ] Dashboard assignment metrics load  
- [ ] Make offer on an eligible IOU  
- [ ] Packaging / escrow pages load with seed data  

---

# Page 4 — Admin portal

**Login:** `admin@ioux.africa` → `/admin`

**One-liner:** Admin onboards organisations and users, monitors all IOUs, programmes, fees, and workflow.

## Dashboard (`/admin`)

- [ ] Platform overview  

## Users & organisations (`/admin/users`)

- [ ] **Organisations** tab — anonymous party list, KYC status, Party ID  
- [ ] **Create organisation** — buyer / supplier / SPV / **platform**; KYC fields  
- [ ] **Invite user** — role + org; temp password  
- [ ] **Say:** Onboard buyers, suppliers, aggregators (platform); platform ID stamps external API IOUs  

## All invoices (`/admin/invoices`)

- [ ] Every IOU across tenants — origin, platform column, status  
- [ ] **Say:** Same IOUs buyer/supplier/SPV see, admin sees all  

## Programs (`/admin/programs`)

- [ ] e.g. Insurance A Approved Payables, exposure limits  

## Fees (`/admin/fees`)

- [ ] Fee configurations (spread, transaction, etc.)  

## Reconciliation (`/admin/reconciliation`)

- [ ] Escrow / settlement ops view  

## Workflow monitor (`/admin/workflow`)

- [ ] Pipeline by status — good for “where is this IOU?”  

## Analytics (`/admin/analytics`)

- [ ] High-level stats (point only if time short)  

## Admin — quick test checklist

- [ ] Create buyer org + invite user  
- [ ] All invoices shows cross-portal IOUs  
- [ ] Organisation list shows anonymized names only  

---

## What to say in the wrap (1 min)

**We built:**
- Four portals with role-based access  
- Buyer post + supplier list (dual origination)  
- OTP confirms on critical actions; decline reasons on buyer reject  
- Partial sale (listed amount), auto-assignment, SPV registry/offers/packaging  
- Anonymous demo parties; platform source ID for AfyaX-style integrators  

**We do not claim:**
- Live bank rails, licensed money transmission, real NSE listing  
- Production-certified AfyaX (hooks ready; partner wires integration)  

---

## Final pre-meeting tick list

| # | Check |
|---|--------|
| 1 | Buyer page: post IOU, verify, consent, register |
| 2 | Supplier page: opt-in, post invoice + doc, offers |
| 3 | SPV page: registry, assignments, offers, dashboard |
| 4 | Admin page: create org, all invoices |
| 5 | OTP Demo code appears on local confirms |
| 6 | No real brand names in org lists |

**Extra logins (same password):** `buyer2@`, `buyer3@`, `supplier2@`, `supplier3@` — only if you need a second buyer/supplier org.

---

*Presentation order: **Buyer → Supplier → SPV → Admin**. Seed data backs every screen even if live create fails mid-demo.*
