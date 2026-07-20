export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function wrapTemplate(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${title}</title></head>
<body style="font-family:Segoe UI,Arial,sans-serif;background:#f4f7f5;padding:24px;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:linear-gradient(90deg,#0d9488,#0369a1);color:#fff;padding:16px 20px;font-size:18px;font-weight:600">Uzima</div>
    <div style="padding:24px 20px">${bodyHtml}</div>
    <div style="padding:12px 20px;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0">UzimaX · Trade receivables platform</div>
  </div>
</body></html>`;
}

export const templates = {
  otp: (code: string) => wrapTemplate(
    'Verification code',
    `<p>Your Uzima verification code is:</p>
     <p style="font-size:28px;letter-spacing:4px;font-weight:700;font-family:monospace">${code}</p>
     <p style="color:#64748b;font-size:13px">Expires in 10 minutes. If you did not request this, ignore this email.</p>`,
  ),
  optInRequest: (iouId: string, amount: string) => wrapTemplate(
    'Opt-in request',
    `<p>A buyer has posted an IOU that requires your opt-in.</p>
     <p><strong>IOU:</strong> ${iouId}<br/><strong>Amount:</strong> ${amount}</p>
     <p>Sign in to Uzima to accept or decline.</p>`,
  ),
  assignmentCreated: (iouId: string) => wrapTemplate(
    'Assignment created',
    `<p>Receivable <strong>${iouId}</strong> has been assigned to the SPV.</p>`,
  ),
  paymentReceived: (amount: string, outstanding: string) => wrapTemplate(
    'Payment update',
    `<p>Payment of <strong>${amount}</strong> received.</p>
     <p>Outstanding balance: <strong>${outstanding}</strong></p>`,
  ),
};

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; mode: string }> {
  const provider = process.env.EMAIL_PROVIDER || 'stub';
  const from = process.env.EMAIL_FROM || 'Uzima Platform <no-reply@uzima.co.ke>';

  if (provider === 'resend' && process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      });
      if (!res.ok) {
        console.warn('[email] Resend error', await res.text());
        return { ok: false, mode: 'resend' };
      }
      return { ok: true, mode: 'resend' };
    } catch (e) {
      console.warn('[email] Resend failed', e);
      return { ok: false, mode: 'resend' };
    }
  }

  if (provider === 'smtp' && process.env.SMTP_HOST) {
    try {
      // Dynamic import keeps optional dep soft
      const nodemailer = await import('nodemailer').catch(() => null);
      if (!nodemailer) {
        console.info('[email:smtp] nodemailer not installed — stubbing', payload.to, payload.subject);
        return { ok: true, mode: 'stub' };
      }
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        } : undefined,
      });
      await transport.sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
      return { ok: true, mode: 'smtp' };
    } catch (e) {
      console.warn('[email] SMTP failed', e);
      return { ok: false, mode: 'smtp' };
    }
  }

  console.info('[email:stub]', { to: payload.to, subject: payload.subject });
  return { ok: true, mode: 'stub' };
}
