/**
 * Optional client-side notify outbox. Server email/SMS via notificationService is authoritative.
 */

export type NotifyChannel = 'email' | 'sms' | 'in_app';

export interface NotifyPayload {
  to: string;
  subject?: string;
  body: string;
  channel: NotifyChannel;
  meta?: Record<string, string>;
}

const OUTBOX_KEY = 'ioux-notify-outbox';

function pushOutbox(entry: NotifyPayload & { at: string; status: string }) {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    const list = raw ? JSON.parse(raw) as unknown[] : [];
    list.unshift(entry);
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {
    /* ignore */
  }
}

/** Local outbox only — no dedicated /notify/* routes on the API. */
export async function sendEmailHook(payload: Omit<NotifyPayload, 'channel'>): Promise<{ ok: boolean; mode: string }> {
  pushOutbox({ ...payload, channel: 'email', at: new Date().toISOString(), status: 'stub' });
  return { ok: true, mode: 'stub' };
}

export async function sendSmsStub(payload: { to: string; body: string }): Promise<{ ok: boolean; mode: string }> {
  pushOutbox({ ...payload, body: payload.body, channel: 'sms', at: new Date().toISOString(), status: 'stub' });
  return { ok: true, mode: 'stub' };
}

export function getNotifyOutbox(): (NotifyPayload & { at: string; status: string })[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
