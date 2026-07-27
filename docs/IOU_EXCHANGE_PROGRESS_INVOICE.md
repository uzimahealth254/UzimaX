# IOU Exchange — Build Progress Report

**For:** Invoice / client progress share  
**Product:** IOU Exchange (IOUX) — trade receivables securitisation management  
**Repo:** `uzimahealth254/UzimaX` · branch `main` · HEAD `d3fbe5a`  
**Live:** https://uzimax.onrender.com  
**Date:** 27 July 2026  

---

## 1. Snapshot

| Measure | Status |
|---------|--------|
| Phase 1 features (signed list) | **~90% built in code** |
| Production readiness | **~60%** (operator steps + pilot still open) |
| Phase 2 depth | **~40–70%** (scaffolded; several items advanced in code) |
| Live bank / NSE / KYC vendors | **Out of contract** (change order) |

**Bottom line:** Core platform is built and deployed. Contractual code gaps (hybrid tracks, commitment-to-pay, settlement recording) are closed. Remaining Phase 1 go-live work is mostly **operator actions + pilot UAT**, not greenfield build.

---

## 2. What exists (by area)

### Platform & ops
- Single-service deploy (Express API + SPA) on Render  
- Postgres (Supabase) + Redis + Resend email  
- Health: `GET /api/v1/health`  
- Same-origin API in production  
- Invite-only auth · JWT + refresh cookie · forced password change · forgot/reset OTP  
- Org-scoped API keys · audit log · RLS policies (scripts ready; prod proof pending)  

### Portals
| Role | Built |
|------|--------|
| **Marketing** | Home, About, Solutions, Portals, Resources, Privacy, Terms, Auth |
| **Buyer** | Post IOU, verification inbox, register, consent (OTP), payments, docs, profile |
| **Supplier** | Opt-in inbox, post invoice, invoices, payments, docs, profile |
| **SPV** | Registry (hybrid tabs), IOU detail, offers, assignments, escrow, packaging, payments, profile |
| **Admin** | Orgs/users/invite, programmes, fees, reconciliation, workflow, analytics, email log |

### Workflows (built)
1. **Path A** — Buyer posts payable → supplier opt-in → auto-assign  
2. **Path B** — Supplier lists → buyer verify → auto-assign  
3. **Negotiated** — SPV offer → supplier accept → buyer OTP consent → assign  
4. **Settlement recording** — partner/admin notify → close legs → `settled` (records only; no cash movement)  

### Hybrid tracks (locked)
| Track | Type | When |
|-------|------|------|
| Standard confirmation | `standard_confirmation` | Path A / Path B auto-assign |
| Negotiated offer | `negotiated_offer` | Offer + OTP consent |

SPV registry tabs: Assigned · Open to offer · Pending consent · Declined/closed.

### Contractual deliverables closed in code
- Commitment-to-pay (actor + timestamp); assignment blocked without it  
- Standing-order ref + bank (capture only; not bank execution)  
- Settlement notify endpoint + notifications + audit  
- Purchase note / assignment letter / receipts (PDFs)  
- Fees engine · simulated escrow/wallet (flagged off in prod) · programmes · packaging UI  

### APIs / integrations
- Party / invoice / payment-update (AfyaX-oriented) surfaces  
- Webhook HMAC verification  
- Pricing quote · programmes · credit-risk endpoint  
- Evidence-bundle manifest per instrument  

### Brand
- Positioned as **trade receivables securitisation management**  
- OG/social preview + marketing copy updated (residual polish may remain)  

---

## 3. Recent engineering closed (Jul 2026)

| Item | Done |
|------|------|
| Hybrid assignment tracks + SPV registry UX | Yes |
| Commitment / standing-order fields + enforcement | Yes |
| Settlement recording API | Yes |
| Email send log + resend invite + admin visibility | Yes |
| `verify:db` column gate (hosted) | Yes |
| Unit tests (IDs, pricing, tracks, package metrics) | Yes |
| SPV buyer risk band on IOU detail | Yes |
| Package weighted tenor/discount helpers | Yes |
| Operator checklists / finish plan docs | Yes |

---

## 4. Still open (honest)

### Operator-owned (blocks “Phase 1 go-live” claim)
- [ ] Manual deploy of latest `main` on Render  
- [ ] Rotate exposed secrets (admin, JWT, Resend, DB, webhook)  
- [ ] Confirm prod flags (`VITE_*` need rebuild if changed)  
- [ ] Always-on hosting or warm-up/uptime  
- [ ] Book & run pilot (buyer + supplier) end-to-end with real email  
- [ ] Backups/PITR confirm · advocate review of Privacy/Terms  

### Engineering polish / Phase 2 remaining
- Full empty-state sweep across every portal page  
- Isolation + authz suites **proven green on production** (scripts exist)  
- Custom domains (`ioux.africa`) or written deferral  
- Packaging / reconciliation / analytics depth as per Oct Phase 2 target  

### Explicitly not included (change order)
Live bank rails · standing-order **execution** · real NSE · external KYC APIs · MFA/SSO · per-buyer ERP adapters  

---

## 5. How to demo / verify

| Check | How |
|-------|-----|
| Site up | https://uzimax.onrender.com |
| API | `GET /api/v1/health` → JSON, `db: up` |
| Admin | Invite users · Email log · Programmes |
| Walk Path A/B + negotiated | Per role portals above |
| Settlement | `POST /api/v1/settlements/notify` (admin/SPV or API key) |

---

## 6. Invoice framing (suggested)

**Delivered this period:** Phase 1 feature build substantially complete in code — dual origination, hybrid assignment, commitment/standing-order capture, settlement recording, portals, APIs, deployable production stack, email ops, security scripts, and Phase 2 scaffolding advances.

**Not yet billable as “go-live complete”:** production secret rotation, pilot UAT sign-off, and operator hosting/legal steps. Target for Phase 1 go-live claim remains ~**10 September 2026** per plan.

**Out of scope unless change-ordered:** licensed money movement, exchange listing integration, vendor KYC, MFA/SSO.

---

*Internal refs:* `docs/IOU_EXCHANGE_FULL_SYSTEM_FINISH_PLAN.md` · `docs/OPERATOR_GO_LIVE_CHECKLIST.md` · `docs/IOU_EXCHANGE_CLAUDE_FINISH_GUIDE.md`
