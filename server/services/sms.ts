/**
 * SMS provider — Africa's Talking when configured; otherwise stub (ARCH §11).
 */
export async function sendSms(opts: { to: string; body: string }): Promise<{ ok: boolean; mode: string }> {
  const provider = process.env.SMS_PROVIDER || 'stub';

  if (provider === 'africastalking' && process.env.AT_API_KEY && process.env.AT_USERNAME) {
    try {
      const params = new URLSearchParams({
        username: process.env.AT_USERNAME,
        to: opts.to,
        message: opts.body,
        from: process.env.AT_SENDER_ID || 'IOUX',
      });
      const res = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          apiKey: process.env.AT_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params.toString(),
      });
      if (!res.ok) {
        console.warn('[sms] Africa\'s Talking error', await res.text());
        return { ok: false, mode: 'africastalking' };
      }
      return { ok: true, mode: 'africastalking' };
    } catch (e) {
      console.warn('[sms] Africa\'s Talking failed', e);
      return { ok: false, mode: 'africastalking' };
    }
  }

  console.info('[sms:stub]', { to: opts.to, body: opts.body.slice(0, 120) });
  return { ok: true, mode: 'stub' };
}
