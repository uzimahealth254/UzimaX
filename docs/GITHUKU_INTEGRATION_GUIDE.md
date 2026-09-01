# IOUX ↔ AfyaX Go-Live Guide — For Githuku (Non-Technical)

**Date:** 31 August 2026  
**Purpose:** What is built, what happens next, and what you need to decide — without API detail.

---

## 1. What we are connecting

| System | Role | Simple explanation |
|--------|------|------------------|
| **AfyaX** | Where hospitals/pharmacies **buy and sell** on credit | Your trading platform (Sule’s team) |
| **IOUX** | Where suppliers **sell their IOUs** to get cash early | The receivables exchange (Alfred’s team) |
| **SPV** | The fund that **buys** the IOUs | IOUX Capital — already in the portal |
| **SimplyPay / future PSP** | Where **money** actually moves | Sule is choosing a licensed partner for production |

**Key principle agreed in your meetings:** AfyaX starts the trade. IOUX owns the IOU registry and financing steps. The two systems talk through APIs — they do not share one database.

---

## 2. What is built now (IOUX side) — ✅ Complete

### Portal (all roles live)

- Supplier, Buyer, SPV, Admin portals with login
- Opt-in / decline (supplier), buyer verification, consent with **OTP**
- **Maker-checker** (accountant initiates, director confirms)
- **Partial sale** — supplier can sell part of an IOU
- **Auto-assignment** when buyer verifies
- Assignment registry, offers, escrow (simulated), packages (for later)
- Email notifications on key steps

### AfyaX connection — configured and tested

| Capability | Status |
|------------|--------|
| AfyaX registered as **Platform** org in IOUX | ✅ Done |
| API key issued for AfyaX | ✅ Done |
| Register buyers & suppliers from AfyaX | ✅ API ready |
| Create portal users from AfyaX | ✅ API ready |
| Push invoices / IOUs into IOUX | ✅ **Tested** — `IOU-KE-2024-00060-0` created |
| AfyaX sends buyer payment updates | ✅ Webhook ready |
| IOUX notifies AfyaX when IOU is assigned / paid / settled | ✅ Outbound webhooks ready |
| Admin **Integrations** page (webhook URLs + secrets) | ✅ Ready |
| Platform ID on every AfyaX-originated IOU | ✅ Ready |

### What we are waiting on

| Item | Who | Status |
|------|-----|--------|
| AfyaX **sandbox webhook URL** | Sule | ⏳ Requested via WhatsApp |
| Sule wires AfyaX to IOUX APIs | Sule | Next development step |
| Joint UAT with pilot company | Both teams | After Sule connects |

---

## 3. What Sule must do on AfyaX

IOUX is ready to receive his calls. His development checklist:

1. **Onboarding checkbox** — “Register on IOUX” when a business signs up on AfyaX  
2. **Call IOUX** in the background to create the same org + user  
3. **Store IOUX IDs** in AfyaX (so future calls match the right company)  
4. **When supplier wants to sell an IOU** — push it to IOUX  
5. **When buyer pays on AfyaX** — tell IOUX the payment amount  
6. **Receive webhooks** from IOUX so AfyaX can show updated status to users  
7. **Send Alfred the sandbox webhook URL** so IOUX knows where to post status updates  

**Technical handoff for Sule:** `docs/AFYAX_INTEGRATION_API.md` (includes sandbox API key and secrets)

---

## 4. What you (Githuku) need to decide

These block **real money** and **pilot selection** — not the API build:

| # | Decision | Why it matters |
|---|----------|----------------|
| 1 | **Pilot companies** — which 1–2 buyers + suppliers first? | UAT needs real names to test end-to-end |
| 2 | **Licensed PSP** for production wallets | SimplyPay is simulation only; CBK-approved partner needed for live settlements |
| 3 | **Face value definition** | IKM legal review — before insurance (Ken Bright) integration |
| 4 | **Cash-only buyers** | Should they appear in IOUX at all, or only credit buyers? |
| 5 | **Dual-role companies** (same firm is buyer and supplier) | One IOUX account or two? |
| 6 | **SPV trustee sign-off** | MTC Trust review — parallel track |
| 7 | **UAT sign-off criteria** | Who says “we are live”? (suggested checklist in Sule’s doc §11) |

---

## 5. End-to-end journey (what users will experience)

```
AfyaX: Buyer buys on credit from Supplier
         ↓
AfyaX → IOUX: Invoice/IOU registered (IOU number created)
         ↓
IOUX: Supplier opts in to sell (or partial sell)
         ↓
IOUX: Buyer verifies (if needed) → auto-assigned to SPV
         ↓
IOUX → AfyaX webhook: "IOU assigned — SPV now owns receivable"
         ↓
SPV pays supplier (via escrow / PSP when live)
         ↓
AfyaX: Buyer makes payments on normal AfyaX flow
         ↓
AfyaX → IOUX: Payment update posted
         ↓
IOUX → AfyaX: Status + settlement when fully paid
```

Users may get **two emails** at signup (AfyaX + IOUX portal) — this is intentional so they can log into both systems.

---

## 6. What is explicitly NOT in this release

| Item | Notes |
|------|-------|
| Blockchain ledger | Discussed as future verification layer only |
| Native mobile app | Web-first; can explore later |
| Sector packaging (“healthcare package”) | Deferred — Githuku said packaging is last |
| Insurance bridge (Ken Bright) | Separate workstream after legal |
| IOUX as licensed payment provider | Using external PSP instead |

---

## 7. Timeline (updated 31 Aug 2026)

| Phase | Duration | Outcome | Status |
|-------|----------|---------|--------|
| **IOUX build + config** | Done | APIs, Integrations admin, AfyaX platform org | ✅ Complete |
| **IOUX smoke test** | Done | Party + IOU created via API | ✅ Complete |
| **Week 1** | Now | Sule wires AfyaX + sends webhook URL | ⏳ In progress |
| **Week 2** | After wiring | Joint UAT with pilot company | Pending |
| **Week 3+** | PSP + legal sign-off | Production credentials | Pending |
| **Go-live** | After UAT + your sign-off | Limited pilot (1–2 companies) | Pending |

---

## 8. How to monitor progress (without reading code)

1. **Admin portal → Integrations** — webhook delivery log (green = AfyaX received event)  
2. **Admin → Workflow** — see IOUs moving through stages  
3. **Weekly tech call** — Alfred + Sule (Mon/Wed/Fri 10:30 as agreed)  
4. **Ask Sule:** “Did UAT step X pass?” using checklist in his API doc  

---

## 9. Your action list this week

- [ ] Confirm **pilot buyer + supplier** names for UAT  
- [ ] Confirm **IKM legal session** outcomes on face value / assignment wording  
- [ ] Chase Sule for **sandbox webhook URL** (if not yet received)  
- [ ] Decide **PSP shortlist** (Sule meeting with licensed providers)  
- [ ] Schedule a **demo walkthrough** of the test IOU (`IOU-KE-2024-00060-0`) in the IOUX portal  

---

## 10. One-sentence summary for stakeholders

**AfyaX handles trade; IOUX handles financing the IOU; the APIs between them are built and tested on IOUX — Sule connects AfyaX and shares his webhook URL, you pick the pilot companies and PSP, then we test one real cycle before wider rollout.**

---

*Technical detail for Sule: `docs/AFYAX_INTEGRATION_API.md`*  
*Architecture alignment: `docs/AFYAX_IOUX_INTEGRATION_REVIEW.md`*
