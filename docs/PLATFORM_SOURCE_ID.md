# Platform source ID (for AfyaX / aggregators)

**IOU Exchange (IOUX) is the source of truth** for registered IOUs, assignments, offers, and consents. Partner platforms (e.g. AfyaX) originate or push credit purchases; they do not replace the IOUX ledger.

## Identifying origin

- Organisations can be onboarded with `orgType = platform` (Admin → Users → Create organisation).
- Issue an API key for that platform org (`invoices:write` / `*`).
- `POST /api/v1/external/invoices` (and related API-key invoice create paths) stamps `source_platform_org_id` on the invoice from the API key’s organisation when it is a platform (or when the body explicitly passes `sourcePlatformOrgId`).
- SPV registry / IOU detail show **Platform / source** when set.

## Contract note for Sule

1. Push parties and invoices with the platform’s API key so IOUX can attribute the origin org.
2. Store returned `iouRegistryId` / `invoiceId` on AfyaX; subsequent status and payment updates reference IOUX IDs.
3. Discount, listing, assignment, and consent remain IOUX-owned — AfyaX should not set discount at listing.
4. Live AfyaX↔IOUX co-design (field mapping, UAT) remains with Sule; this repo provides the platform ID and onboarding hooks only.

See also: `docs/openapi.yaml` (`/api/v1/external/invoices`), `docs/UZIMA_ARCH_001.md` §1.4 / §6.
