/**
 * Optional client-side notify hooks (outbox). Server email is authoritative via Resend/SMTP.
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
const apiBase = () => import.meta.env.VITE_API_URL || 'http://localhost:8787';

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

export async function sendEmailHook(payload: Omit<NotifyPayload, 'channel'>): Promise<{ ok: boolean; mode: string }> {
  const enabled = import.meta.env.VITE_NOTIFY_EMAIL_ENABLED === 'true';
  if (enabled) {
    try {
      const res = await fetch(`${apiBase()}/api/v1/notify/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        pushOutbox({ ...payload, channel: 'email', at: new Date().toISOString(), status: 'sent' });
        return { ok: true, mode: 'provider' };
      }
    } catch {
      /* fall through */
    }
  }
  pushOutbox({ ...payload, channel: 'email', at: new Date().toISOString(), status: 'stub' });
  return { ok: true, mode: 'stub' };
}

export async function sendSmsStub(payload: { to: string; body: string }): Promise<{ ok: boolean; mode: string }> {
  try {
    const res = await fetch(`${apiBase()}/api/v1/notify/sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      pushOutbox({ ...payload, channel: 'sms', at: new Date().toISOString(), status: 'sent' });
      return { ok: true, mode: 'provider' };
    }
  } catch {
    /* stub */
  }
  pushOutbox({ ...payload, channel: 'sms', at: new Date().toISOString(), status: 'stub' });
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
