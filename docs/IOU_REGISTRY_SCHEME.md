# IOU Registry ID scheme (draft — for Sule review)

**Status:** Draft for Week 2 consultation · implementable in code today  
**Owner:** UzimaX / AFIX · Document: AFIX-SYS-PLAN-001 Phase 1

## Format

```
IOU-KE-{YYYY}-{SEQ5}-{CHK}
```

| Part | Meaning |
|------|---------|
| `IOU` | Instrument type — trade receivable IOU |
| `KE` | Jurisdiction / registry country |
| `YYYY` | Calendar year of registration |
| `SEQ5` | Zero-padded sequence within year (00001–99999) |
| `CHK` | Luhn check digit over `YYYY` + `SEQ5` |

**Example:** `IOU-KE-2026-00042-7`

## Rules (proposed)

1. ID is allocated **at registration** (buyer post, supplier list, or API upload) — never reused.  
2. Status changes do **not** change the IOU ID.  
3. History of statuses is stored alongside the IOU (append-only).  
4. Legal wording of the IOU instrument itself is **out of build** until counsel/Sule lock text; platform stores registry metadata + references.

## Code

- Generator: `src/lib/iouId.ts`  
- API: same Luhn scheme in `server/store.js`  
- Validation: `isValidIOURegistryId()`

## Open points for Sule

- [ ] Confirm KE segment vs SPV-specific registry code  
- [ ] Whether face-value currency belongs in the ID (recommend **no**)  
- [ ] Cross-border prefix policy  
- [ ] Mapping to any existing depository / CSD convention  

*Update this file after the Sule working session.*
