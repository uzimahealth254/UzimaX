import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { assertStrongPassword, generateTempPassword } from '../lib/security.js';
import { writeAudit } from '../middleware/audit.js';
import { sendEmail, templates, emailSubjects } from './email.js';

export interface CreateIntegrationUserInput {
  email: string;
  fullName: string;
  role: 'buyer' | 'supplier';
  orgId?: string;
  uzimaPartyId?: string;
  afyaxUserId?: string;
  phone?: string;
  isSignatory?: boolean;
  capacity?: 'maker' | 'checker' | 'both';
  sendInviteEmail?: boolean;
  temporaryPassword?: string;
}

export async function createIntegrationUser(
  input: CreateIntegrationUserInput,
  auditLabel?: string,
): Promise<{ user: typeof s.users.$inferSelect; existing: boolean; emailSent: boolean }> {
  const email = input.email.toLowerCase().trim();

  if (input.afyaxUserId) {
    const [byExt] = await db.select().from(s.users).where(eq(s.users.afyaxUserId, input.afyaxUserId)).limit(1);
    if (byExt) {
      return { user: byExt, existing: true, emailSent: false };
    }
  }

  const [existing] = await db.select().from(s.users).where(eq(s.users.email, email)).limit(1);
  if (existing) {
    if (input.afyaxUserId && !existing.afyaxUserId) {
      const [updated] = await db.update(s.users).set({
        afyaxUserId: input.afyaxUserId,
        updatedAt: new Date(),
      }).where(eq(s.users.id, existing.id)).returning();
      return { user: updated, existing: true, emailSent: false };
    }
    return { user: existing, existing: true, emailSent: false };
  }

  let orgId = input.orgId;
  if (!orgId && input.uzimaPartyId) {
    const [org] = await db.select().from(s.organisations)
      .where(eq(s.organisations.uzimaPartyId, input.uzimaPartyId))
      .limit(1);
    if (!org) throw new AppError(400, 'org_not_found', 'uzimaPartyId not found');
    orgId = org.id;
  }
  if (!orgId) throw new AppError(400, 'validation_error', 'orgId or uzimaPartyId required');

  const [org] = await db.select().from(s.organisations).where(eq(s.organisations.id, orgId)).limit(1);
  if (!['buyer', 'supplier'].includes(org.orgType)) {
    throw new AppError(400, 'invalid_org', 'Users can only be created on buyer or supplier organisations');
  }
  if (org.orgType !== input.role) {
    throw new AppError(400, 'role_mismatch', `User role ${input.role} does not match organisation type ${org.orgType}`);
  }

  const tempPass = input.temporaryPassword || generateTempPassword();
  assertStrongPassword(tempPass);
  const passwordHash = await bcrypt.hash(tempPass, 12);

  const [user] = await db.insert(s.users).values({
    email,
    fullName: input.fullName,
    role: input.role,
    orgId,
    afyaxUserId: input.afyaxUserId || null,
    phone: input.phone || null,
    passwordHash,
    isSignatory: input.isSignatory ?? false,
    mustChangePassword: true,
    status: 'active',
  }).returning();

  if (input.isSignatory) {
    await db.insert(s.signatories).values({
      userId: user.id,
      orgId,
      roleTitle: input.role === 'buyer' ? 'Authorised signatory' : 'Finance signatory',
      capacity: input.capacity || 'checker',
      isActive: true,
    });
  }

  let emailSent = false;
  if (input.sendInviteEmail !== false) {
    try {
      const result = await sendEmail({
        to: email,
        subject: emailSubjects.invite(),
        html: templates.invite({
          name: input.fullName,
          role: input.role,
          orgName: org.name,
          tempPassword: tempPass,
          email,
        }),
        text: `Welcome to IOU Exchange. Temporary password: ${tempPass}. Sign in at ${process.env.PORTAL_URL || 'https://app.ioux.africa'}/login`,
        template: 'invite',
        relatedType: 'user',
        relatedId: user.id,
      });
      emailSent = result.ok;
    } catch (err) {
      console.warn('[integration] invite email failed', err);
    }
  }

  await writeAudit({
    actorEmail: auditLabel,
    action: 'user.created_via_api',
    resourceType: 'user',
    resourceId: user.id,
    details: { email, role: input.role, orgId, afyaxUserId: input.afyaxUserId },
  });

  return { user, existing: false, emailSent };
}
