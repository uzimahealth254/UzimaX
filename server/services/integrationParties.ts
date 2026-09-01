import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema.js';
import { generateUzimaPartyId } from '../lib/iouId.js';
import { getOrCreateWallet } from './core.js';
import { writeAudit } from '../middleware/audit.js';

export interface KycDocumentRef {
  docType: string;
  fileUrl: string;
  name?: string;
  verifiedAt?: string;
}

export interface UpsertPartyInput {
  name: string;
  orgType: 'buyer' | 'supplier';
  registrationNo?: string;
  afyaxId?: string;
  externalOrganisationId?: string;
  kraPin?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  ppbRegistration?: string;
  ppbLicence?: string;
  businessType?: string;
  county?: string;
  kycStatus?: 'pending' | 'verified' | 'rejected';
  kycVerifiedAt?: string;
  kycDocuments?: KycDocumentRef[];
  metadata?: Record<string, unknown>;
}

export async function upsertIntegrationParty(
  input: UpsertPartyInput,
  auditLabel?: string,
): Promise<{ id: string; uzimaPartyId: string; existing: boolean }> {
  const afyaxId = input.afyaxId || input.externalOrganisationId;
  if (afyaxId) {
    const [existing] = await db.select().from(s.organisations).where(eq(s.organisations.afyaxId, afyaxId)).limit(1);
    if (existing) {
      const meta = {
        ...(existing.metadata as Record<string, unknown> || {}),
        kraPin: input.kraPin ?? (existing.metadata as any)?.kraPin,
        address: input.address ?? (existing.metadata as any)?.address,
        contactEmail: input.contactEmail ?? (existing.metadata as any)?.contactEmail,
        contactPhone: input.contactPhone ?? (existing.metadata as any)?.contactPhone,
        ppbRegistration: input.ppbRegistration ?? (existing.metadata as any)?.ppbRegistration,
        ppbLicence: input.ppbLicence ?? (existing.metadata as any)?.ppbLicence,
        businessType: input.businessType ?? (existing.metadata as any)?.businessType,
        county: input.county ?? (existing.metadata as any)?.county,
        kycStatus: input.kycStatus ?? (existing.metadata as any)?.kycStatus ?? 'pending',
        kycVerifiedAt: input.kycVerifiedAt ?? (existing.metadata as any)?.kycVerifiedAt,
        kycDocuments: input.kycDocuments ?? (existing.metadata as any)?.kycDocuments,
        ...input.metadata,
      };
      await db.update(s.organisations).set({
        name: input.name || existing.name,
        registrationNo: input.registrationNo || existing.registrationNo,
        metadata: meta,
        updatedAt: new Date(),
      }).where(eq(s.organisations.id, existing.id));

      if (input.kycDocuments?.length) {
        for (const doc of input.kycDocuments) {
          await db.insert(s.orgDocuments).values({
            orgId: existing.id,
            docType: doc.docType,
            fileUrl: doc.fileUrl,
          });
        }
      }

      return { id: existing.id, uzimaPartyId: existing.uzimaPartyId, existing: true };
    }
  }

  const uzimaPartyId = generateUzimaPartyId(input.orgType);
  const [org] = await db.insert(s.organisations).values({
    name: input.name,
    registrationNo: input.registrationNo || null,
    orgType: input.orgType,
    afyaxId: afyaxId || null,
    uzimaPartyId,
    status: 'active',
    metadata: {
      kraPin: input.kraPin || null,
      address: input.address || null,
      contactEmail: input.contactEmail || null,
      contactPhone: input.contactPhone || null,
      ppbRegistration: input.ppbRegistration || null,
      ppbLicence: input.ppbLicence || null,
      businessType: input.businessType || null,
      county: input.county || null,
      kycStatus: input.kycStatus || 'pending',
      kycVerifiedAt: input.kycVerifiedAt || null,
      kycDocuments: input.kycDocuments || [],
      ...input.metadata,
    },
  }).returning();

  if (input.kycDocuments?.length) {
    for (const doc of input.kycDocuments) {
      await db.insert(s.orgDocuments).values({
        orgId: org.id,
        docType: doc.docType,
        fileUrl: doc.fileUrl,
      });
    }
  }

  await getOrCreateWallet(org.id);
  await writeAudit({
    actorEmail: auditLabel,
    action: 'party.created',
    resourceType: 'organisation',
    resourceId: org.id,
    details: { orgType: input.orgType, uzimaPartyId, afyaxId },
  });

  return { id: org.id, uzimaPartyId: org.uzimaPartyId, existing: false };
}
