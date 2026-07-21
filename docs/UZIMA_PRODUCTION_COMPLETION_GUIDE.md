# Uzima — Production Completion Guide

**Document:** `UZIMA-BUILD-002`  
**Purpose:** Definitive instruction set for taking the Uzima portal to a production-credible product. Answers UZIMA-PORTAL-CONSULT-001.  
**Companion:** `docs/UZIMA_ARCH_001.md`, `docs/UZIMA_PORTAL_CONSULTATION_BRIEF.md`  
**Date:** 21 July 2026  
**Source:** Claude consultation (UZIMA-BUILD-002)

---

## Verdict

The product is strong: four role portals, dual origination, and downstream lifecycle are built. The problem is **surface area** — overlaps and simulated capabilities presented too prominently. Path: **subtractive first, then deepening**. Guiding principle: a lean ops tool that does the real workflow well beats a sprawling demo.

---

## Part 1 — IA Decisions

### Remove / hide
- Delete `/supplier/list`, `/buyer/verification-inbox`
- Hide SPV Backend Engine behind `VITE_ENABLE_ENGINE`
- Feature-flag Wallet off (`VITE_ENABLE_WALLET=false`)
- Fix homepage non-navigating dropdowns

### Merge
- NSE Listing + Packaging → Packaging & Listing `/spv/packaging`
- Buyer Payment Schedule + History → Payments tabs
- Remove Offers "Receivables" tab → Assignments
- Supplier Trade History → My Invoices Completed filter

### Proposed nav
- **Buyer (8):** Dashboard · Post IOU · Verification · Invoice Register · Consent · Payments · Documents · Profile  
- **Supplier (7):** Dashboard · Opt-in · Post Invoice · My Invoices · Payments · Documents · Profile  
- **SPV (8):** Dashboard · IOU Registry · Offers · Assignments · Escrow · Packaging & Listing · Payments · Profile  
- **Admin (9):** keep as-is  

Wallet / Signatories / API → Profile tabs when reintroduced.

---

## Part 3 — Simulated honesty
- Wallet: off by default; when on rename "Ledger (simulated)"
- Escrow: "Mark disbursed (simulated)" / "Record collection (simulated)" + banner
- NSE: "Listing readiness" — never imply live exchange listing
- Toasts: system actions only ("Escrow leg recorded" not "Supplier paid")

---

## Part 7 — Backlog status

### P0 (this implementation pass)
1. Delete aliases / legacy routes  
2. Hide Backend Engine  
3. Wallet feature-flag OFF  
4. Merge Packaging + Listing  
5. Escrow honesty + distinct collect/release  
6. NSE readiness framing  
7. Toast copy pass (key flows)  
8. Post IOU document persistence  
9. Consent decline  
10. Supplier Post Invoice DocumentAttach  
11. Opt-in discount preview + confirm  
12. Admin invite org-picker fix  
13. Forgot-password flow  

### P1 / P2
See original Claude brief — continue after P0 land.

---

*Execute removals and merges before polish. Label every simulation.*
