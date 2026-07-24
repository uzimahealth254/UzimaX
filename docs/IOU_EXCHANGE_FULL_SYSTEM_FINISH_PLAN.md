# IOU Exchange — Full System Finish Plan

**Document ID:** `IOUX-FULL-FINISH-001`
**Status:** Authoritative tasking document for finishing the entire IOU Exchange system
**Supersedes tasking in:** `IOUX-COMPLETE-001` (Phase 1 slice — now partially executed)
**Repo:** `c:\Users\Admin\Downloads\CPF` · GitHub `uzimahealth254/UzimaX` · branch `main`
**Live:** https://uzimax.onrender.com
**Date:** 24 July 2026
**Implementation:** Cursor executing engineer-owned Horizons A–B workstreams; operator items remain operator-owned.

> Full Claude specification for WS-01 through WS-29, Horizons A–E, UAT script (§6), calendar (§8), and change-order annex (§9) is retained in this repo as the authoritative tasking source. Progress is marked in the Implementation Progress section below and in git commits referencing WS-IDs.

## Implementation Progress (updated by Cursor)

| WS | Item | Status |
|----|------|--------|
| WS-01 | Deploy f215fed | Operator — Manual Deploy Render |
| WS-02 | Rotate secrets | Operator — see SECRETS_ROTATION.md |
| WS-03 | Prod flags | Operator — verify on Render |
| WS-04 | Tenant isolation on prod | Script ready — run against prod after WS-02 |
| WS-05 | Authz on prod | Script ready — run against prod after WS-02 |
| WS-06 | Cold-start / always-on | Operator |
| WS-07 | Email reliability | In progress / shipping |
| WS-08 | Brand sweep | In progress / shipping |
| WS-09 | Empty/loading states | In progress / shipping |
| WS-10 | verify:db gate | In progress / shipping |
| WS-11 | Money-path tests | In progress / shipping |
| WS-12 | Pilot E2E | Operator — book clients |
| WS-13 | Backups / legal | Operator |
| WS-14 | Programme hard limits | Already hard-blocks in programme.ts — verify + tests |
| WS-15 | Credit-risk SPV UI | Shipping |
| WS-16 | Packaging correctness | Shipping / tests |
| WS-17 | Reconciliation CSV/server | Shipping |
| WS-18 | Analytics real aggregates | Audit / harden |
| WS-19 | Custom domains | Operator decision |
| WS-20 | Orphan pages | Shipping |
| WS-21–26 | Horizon C | Scoped — not unpaid build (docs + lite exports only) |
| WS-27–29 | Horizon E | Docs shipping |

## First ten tasks (from Claude)

1. Deploy f215fed (operator)
2. Rotate secrets (operator)
3. Book pilot orgs (operator)
4. Verify prod flags (operator)
5. smoke:tenant-isolation on prod
6. test:authz on prod
7. verify:db gate
8. Cold starts (operator)
9. Email reliability (engineer)
10. Money-path tests (engineer)

## Operator questions (unchanged)

Hosting tier · Domains · Pilot clients · Settlement agent · Fee model · Horizon C intent · Counsel availability

## Closing

Do not rebuild. Do not claim bank rails / NSE / money transmission. Do not start Horizon C/D without change order. Declare nothing complete without §7 verification.

*See also:* `docs/IOU_EXCHANGE_CLAUDE_FULL_SYSTEM_BRIEF.md`, `docs/IOU_EXCHANGE_COMPLETION_GUIDE.md`
