import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema.js';
import { sendEmail, templates } from './email.js';
import { sendSms } from './sms.js';

export type NotifyPayload = {
  type: string;
  title: string;
  body?: string;
  referenceType?: string;
  referenceId?: string;
  emailHtml?: string;
  emailSubject?: string;
  smsBody?: string;
};

/**
 * Multi-channel dispatch: in-app always; email when EMAIL_PROVIDER configured;
 * SMS when SMS_PROVIDER is africastalking (else stub log).
 */
export async function notifyOrgUsers(orgId: string, n: NotifyPayload) {
  const orgUsers = await db.select().from(s.users).where(eq(s.users.orgId, orgId));
  if (!orgUsers.length) return;

  await db.insert(s.notifications).values(
    orgUsers.map((u) => ({
      userId: u.id,
      type: n.type,
      title: n.title,
      body: n.body || null,
      referenceType: n.referenceType || null,
      referenceId: n.referenceId || null,
      channel: 'in_app',
      sentAt: new Date(),
    })),
  );

  const subject = n.emailSubject || `IOU Exchange — ${n.title}`;
  const html = n.emailHtml || templates.generic(n.title, n.body || '');

  await Promise.allSettled(
    orgUsers.map(async (u) => {
      await sendEmail({ to: u.email, subject, html });
      if (n.smsBody) {
        await sendSms({ to: `user:${u.id}`, body: n.smsBody });
      }
    }),
  );
}

/** Email + in-app for a single user (invite, password, OTP already use sendEmail directly). */
export async function notifyUser(userId: string, n: NotifyPayload) {
  const [u] = await db.select().from(s.users).where(eq(s.users.id, userId)).limit(1);
  if (!u) return;

  await db.insert(s.notifications).values({
    userId: u.id,
    type: n.type,
    title: n.title,
    body: n.body || null,
    referenceType: n.referenceType || null,
    referenceId: n.referenceId || null,
    channel: 'in_app',
    sentAt: new Date(),
  });

  const subject = n.emailSubject || `IOU Exchange — ${n.title}`;
  const html = n.emailHtml || templates.generic(n.title, n.body || '');
  await sendEmail({ to: u.email, subject, html });
  if (n.smsBody) {
    await sendSms({ to: `user:${u.id}`, body: n.smsBody });
  }
}

export { templates };
