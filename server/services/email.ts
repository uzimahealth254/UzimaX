/**
 * IOU Exchange transactional email templates
 * Brand: forest #0E1F1A · lime #D3F36B · mist #F4FBE3 · slate #5A6B7D
 * Logo mark: inline SVG (email-safe). Live links use PORTAL_URL / SITE_URL.
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

const SITE_URL = () => process.env.SITE_URL || process.env.MARKETING_URL || 'https://www.ioux.africa';
const PORTAL_URL = () => {
  if (process.env.PORTAL_URL) return process.env.PORTAL_URL;
  if (process.env.VITE_APP_URL) return process.env.VITE_APP_URL;
  if (process.env.NODE_ENV === 'production') return 'https://app.ioux.africa';
  return 'http://localhost:5173';
};
const SUPPORT = () => process.env.SUPPORT_EMAIL || 'hello@ioux.africa';

/** Inline mark — works without hosted assets */
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" role="img" aria-label="IOU Exchange">
  <rect width="40" height="40" rx="10" fill="#0E1F1A"/>
  <path d="M11 10.5v11.2c0 5.05 3.7 8.8 9 8.8s9-3.75 9-8.8V10.5" stroke="#F3FAF5" stroke-width="3.25" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="29.5" cy="11" r="3.4" fill="#D3F36B"/>
</svg>`;

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/h1>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cta(label: string, href: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px">
      <tr>
        <td style="border-radius:10px;background:#0E1F1A">
          <a href="${esc(href)}" style="display:inline-block;padding:14px 22px;font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:700;color:#D3F36B;text-decoration:none;letter-spacing:0.02em">
            ${esc(label)} →
          </a>
        </td>
      </tr>
    </table>`;
}

function metaRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #E8EEE9;font-size:12px;color:#5A6B7D;width:38%;vertical-align:top;font-family:system-ui,-apple-system,Segoe UI,sans-serif">${esc(label)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #E8EEE9;font-size:13px;color:#0E1F1A;font-weight:600;font-family:ui-monospace,Consolas,monospace;word-break:break-all">${esc(value)}</td>
    </tr>`;
}

function wrapTemplate(opts: {
  preheader: string;
  eyebrow?: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
}): string {
  const portal = PORTAL_URL();
  const site = SITE_URL();
  const year = new Date().getFullYear();
  const ctaBlock = opts.ctaLabel && opts.ctaHref ? cta(opts.ctaLabel, opts.ctaHref) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <meta name="supported-color-schemes" content="light"/>
  <title>${esc(opts.title)}</title>
  <!--[if mso]><style>body,table,td{font-family:Arial,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#E8F0EA;color:#0E1F1A">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px">${esc(opts.preheader)}${'&nbsp;'.repeat(40)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E8F0EA;padding:32px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #D5E0D8;box-shadow:0 18px 40px rgba(14,31,26,0.08)">
          <tr>
            <td style="background:#0E1F1A;padding:22px 28px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;width:48px">${MARK_SVG}</td>
                  <td style="vertical-align:middle;padding-left:12px">
                    <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:800;color:#F3FAF5;letter-spacing:-0.02em">IOU Exchange</div>
                    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:11px;color:#A8C4B4;margin-top:2px;letter-spacing:0.06em;text-transform:uppercase">Working capital for pharmacy trade</div>
                  </td>
                  <td align="right" style="vertical-align:middle">
                    <span style="display:inline-block;background:#D3F36B;color:#0E1F1A;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:10px;font-weight:800;padding:5px 9px;border-radius:999px;letter-spacing:0.04em">SECURE</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:4px;background:linear-gradient(90deg,#D3F36B 0%,#C5E85A 40%,#0E1F1A 100%)"></td></tr>
          <tr>
            <td style="padding:32px 28px 12px;background:#ffffff">
              ${opts.eyebrow ? `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#5A6B7D;margin-bottom:10px">${esc(opts.eyebrow)}</div>` : ''}
              <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;font-weight:800;color:#0E1F1A;letter-spacing:-0.02em">${esc(opts.title)}</h1>
              <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.65;color:#1A3A2E">
                ${opts.bodyHtml}
              </div>
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px">
              <div style="background:#F4FBE3;border:1px solid #E0EFC8;border-radius:14px;padding:14px 16px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:12px;line-height:1.5;color:#3D4F5C">
                <strong style="color:#0E1F1A">Important:</strong> IOU Exchange records workflow and balances. Settlement cash and exchange listing are executed by partners outside this platform.
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#F7FAF6;border-top:1px solid #E8EEE9;padding:20px 28px">
              <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:12px;color:#5A6B7D;line-height:1.55">
                <strong style="color:#0E1F1A">IOU Exchange</strong> · Pharmacy &amp; health trade receivables<br/>
                <a href="${esc(site)}" style="color:#0E1F1A;font-weight:600">${esc(site.replace(/^https?:\/\//, ''))}</a>
                · <a href="${esc(portal)}" style="color:#0E1F1A;font-weight:600">Portal</a>
                · <a href="mailto:${esc(SUPPORT())}" style="color:#0E1F1A;font-weight:600">${esc(SUPPORT())}</a>
              </div>
              <div style="margin-top:12px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:11px;color:#8A9A8E">
                © ${year} IOU Exchange (ioux.africa). Confidential — intended for the named recipient only. If you received this in error, please delete it and notify ${esc(SUPPORT())}.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailsTable(rows: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;background:#F7FAF6;border:1px solid #E8EEE9;border-radius:12px;padding:4px 16px">
    ${rows.map(([k, v]) => metaRow(k, v)).join('')}
  </table>`;
}

export const templates = {
  /** Auth */
  otp: (code: string, purpose = 'verification') => wrapTemplate({
    preheader: `Your IOU Exchange code is ${code}`,
    eyebrow: 'Security',
    title: 'Your verification code',
    bodyHtml: `
      <p style="margin:0 0 12px">Use this one-time code to complete <strong>${esc(purpose)}</strong>. It expires in <strong>10 minutes</strong>.</p>
      <div style="margin:22px 0;text-align:center;background:#0E1F1A;border-radius:14px;padding:22px 16px">
        <div style="font-family:ui-monospace,Consolas,monospace;font-size:34px;letter-spacing:0.35em;font-weight:800;color:#D3F36B;padding-left:0.35em">${esc(code)}</div>
      </div>
      <p style="margin:0;font-size:13px;color:#5A6B7D">If you did not request this, you can ignore this email. Do not share the code.</p>`,
  }),

  invite: (opts: { name?: string; role: string; orgName?: string; tempPassword: string; email: string }) => wrapTemplate({
    preheader: 'You have been invited to IOU Exchange — temporary password enclosed',
    eyebrow: 'Welcome',
    title: opts.name ? `${opts.name}, you’re invited` : 'You’re invited to IOU Exchange',
    bodyHtml: `
      <p style="margin:0 0 12px">An administrator created your account. Sign in with the temporary password below, then set a new password on first login.</p>
      ${detailsTable([
        ['Email', opts.email],
        ['Role', opts.role],
        ...(opts.orgName ? [['Organisation', opts.orgName] as [string, string]] : []),
        ['Temporary password', opts.tempPassword],
      ])}
      <p style="margin:0;font-size:13px;color:#5A6B7D">This password is single-use for first access. Change it immediately after sign-in.</p>`,
    ctaLabel: 'Sign in to IOU Exchange',
    ctaHref: `${PORTAL_URL()}/login`,
  }),

  passwordReset: (code: string) => wrapTemplate({
    preheader: `Password reset code: ${code}`,
    eyebrow: 'Account security',
    title: 'Reset your password',
    bodyHtml: `
      <p style="margin:0 0 12px">We received a request to reset your IOU Exchange password. Enter this code in the portal:</p>
      <div style="margin:22px 0;text-align:center;background:#0E1F1A;border-radius:14px;padding:22px 16px">
        <div style="font-family:ui-monospace,Consolas,monospace;font-size:34px;letter-spacing:0.35em;font-weight:800;color:#D3F36B;padding-left:0.35em">${esc(code)}</div>
      </div>
      <p style="margin:0;font-size:13px;color:#5A6B7D">Expires in 10 minutes. If you did not request a reset, ignore this message — your password stays unchanged.</p>`,
    ctaLabel: 'Open reset flow',
    ctaHref: `${PORTAL_URL()}/login`,
  }),

  passwordChanged: (name?: string) => wrapTemplate({
    preheader: 'Your IOU Exchange password was changed',
    eyebrow: 'Security notice',
    title: 'Password updated',
    bodyHtml: `
      <p style="margin:0 0 12px">${name ? `Hi ${esc(name)},` : 'Hello,'} your IOU Exchange password was changed successfully.</p>
      <p style="margin:0;font-size:13px;color:#5A6B7D">If this wasn’t you, contact ${esc(SUPPORT())} immediately and request a lock on the account.</p>`,
    ctaLabel: 'Sign in',
    ctaHref: `${PORTAL_URL()}/login`,
  }),

  /** Dual origination */
  optInRequest: (iouId: string, amount: string, buyerName?: string) => wrapTemplate({
    preheader: `Opt-in required for ${iouId}`,
    eyebrow: 'Supplier action',
    title: 'A buyer posted an IOU naming you',
    bodyHtml: `
      <p style="margin:0 0 12px">Review the economics and opt in to sell — or decline. This is Path A (buyer-posted).</p>
      ${detailsTable([
        ['IOU', iouId],
        ['Face value', amount],
        ...(buyerName ? [['Buyer', buyerName] as [string, string]] : []),
      ])}`,
    ctaLabel: 'Open Opt-in Inbox',
    ctaHref: `${PORTAL_URL()}/supplier/opt-in`,
  }),

  buyerVerificationRequest: (iouId: string, amount?: string, supplierName?: string) => wrapTemplate({
    preheader: `Verify invoice ${iouId}`,
    eyebrow: 'Buyer action',
    title: 'Supplier invoice awaiting verification',
    bodyHtml: `
      <p style="margin:0 0 12px">A supplier listed an invoice against your organisation. Verify or reject before assignment. This is Path B (supplier-listed).</p>
      ${detailsTable([
        ['IOU', iouId],
        ...(amount ? [['Face value', amount] as [string, string]] : []),
        ...(supplierName ? [['Supplier', supplierName] as [string, string]] : []),
      ])}`,
    ctaLabel: 'Open Verification',
    ctaHref: `${PORTAL_URL()}/buyer/verification`,
  }),

  /** Offers & consent */
  offerReceived: (iouId: string, discount: string, purchasePrice: string) => wrapTemplate({
    preheader: `SPV offer on ${iouId}`,
    eyebrow: 'Supplier action',
    title: 'You received an SPV purchase offer',
    bodyHtml: `
      <p style="margin:0 0 12px">Review the discount and accept or decline in Offers.</p>
      ${detailsTable([
        ['IOU', iouId],
        ['Discount', discount],
        ['Purchase price', purchasePrice],
      ])}`,
    ctaLabel: 'Review offer',
    ctaHref: `${PORTAL_URL()}/supplier/invoices`,
  }),

  offerAccepted: (iouId: string) => wrapTemplate({
    preheader: `Offer accepted — ${iouId}`,
    eyebrow: 'SPV update',
    title: 'Supplier accepted your offer',
    bodyHtml: `
      <p style="margin:0 0 12px">Offer acceptance recorded for <strong>${esc(iouId)}</strong>. Request buyer consent if required, then manage the receivable under Assignments.</p>`,
    ctaLabel: 'Open Assignments',
    ctaHref: `${PORTAL_URL()}/spv/assignments`,
  }),

  offerDeclined: (iouId: string) => wrapTemplate({
    preheader: `Offer declined — ${iouId}`,
    eyebrow: 'SPV update',
    title: 'Supplier declined your offer',
    bodyHtml: `<p style="margin:0">The purchase offer for <strong>${esc(iouId)}</strong> was declined. You can make a new offer from the IOU registry.</p>`,
    ctaLabel: 'IOU Registry',
    ctaHref: `${PORTAL_URL()}/spv/registry`,
  }),

  consentRequired: (iouId: string, amount?: string) => wrapTemplate({
    preheader: `Consent required for ${iouId}`,
    eyebrow: 'Signatory action',
    title: 'Assignment consent required',
    bodyHtml: `
      <p style="margin:0 0 12px">An authorised signatory must complete OTP-verified consent before this receivable can be assigned.</p>
      ${detailsTable([
        ['IOU', iouId],
        ...(amount ? [['Amount', amount] as [string, string]] : []),
      ])}`,
    ctaLabel: 'Open Consent Inbox',
    ctaHref: `${PORTAL_URL()}/buyer/consent`,
  }),

  consentSigned: (iouId: string) => wrapTemplate({
    preheader: `Consent signed — ${iouId}`,
    eyebrow: 'Workflow',
    title: 'Assignment consent recorded',
    bodyHtml: `<p style="margin:0">OTP-verified consent for <strong>${esc(iouId)}</strong> is on file. Assignment can proceed.</p>`,
    ctaLabel: 'View portal',
    ctaHref: PORTAL_URL(),
  }),

  consentDeclined: (iouId: string, reason?: string) => wrapTemplate({
    preheader: `Consent declined — ${iouId}`,
    eyebrow: 'Workflow',
    title: 'Assignment consent declined',
    bodyHtml: `
      <p style="margin:0 0 12px">The buyer declined consent for <strong>${esc(iouId)}</strong>.</p>
      ${reason ? detailsTable([['Reason', reason]]) : ''}`,
    ctaLabel: 'Open Assignments',
    ctaHref: `${PORTAL_URL()}/spv/assignments`,
  }),

  assignmentCreated: (iouId: string, trigger?: string) => wrapTemplate({
    preheader: `Assigned to SPV — ${iouId}`,
    eyebrow: 'Assignment',
    title: 'Receivable assigned to SPV',
    bodyHtml: `
      <p style="margin:0 0 12px">Ownership of this receivable is now recorded against the SPV in IOU Exchange.</p>
      ${detailsTable([
        ['IOU', iouId],
        ...(trigger ? [['Trigger', trigger] as [string, string]] : []),
      ])}`,
    ctaLabel: 'View assignment',
    ctaHref: `${PORTAL_URL()}/spv/assignments`,
  }),

  /** Settlement-adjacent (honest copy) */
  escrowDisbursedRecorded: (iouId: string, amount: string) => wrapTemplate({
    preheader: `Escrow leg recorded — ${iouId}`,
    eyebrow: 'Escrow (simulated ledger)',
    title: 'Disbursement leg recorded',
    bodyHtml: `
      <p style="margin:0 0 12px"><strong>No funds moved through IOU Exchange.</strong> A disbursement leg was marked for workflow and reconciliation. Settlement is executed by your settlement partner.</p>
      ${detailsTable([
        ['IOU', iouId],
        ['Amount recorded', amount],
      ])}`,
    ctaLabel: 'Open Escrow',
    ctaHref: `${PORTAL_URL()}/spv/escrow`,
  }),

  escrowCollectionRecorded: (iouId: string, amount: string) => wrapTemplate({
    preheader: `Collection recorded — ${iouId}`,
    eyebrow: 'Escrow (simulated ledger)',
    title: 'Collection leg recorded',
    bodyHtml: `
      <p style="margin:0 0 12px"><strong>No funds moved through IOU Exchange.</strong> A collection leg was recorded for reconciliation.</p>
      ${detailsTable([
        ['IOU', iouId],
        ['Amount recorded', amount],
      ])}`,
    ctaLabel: 'Open Escrow',
    ctaHref: `${PORTAL_URL()}/spv/escrow`,
  }),

  paymentReceived: (amount: string, outstanding: string, iouId?: string) => wrapTemplate({
    preheader: `Payment update ${amount}`,
    eyebrow: 'AfyaX payment update',
    title: 'Payment update received',
    bodyHtml: `
      <p style="margin:0 0 12px">AfyaX reported a payment update. Outstanding balance below is as reported to IOU Exchange.</p>
      ${detailsTable([
        ...(iouId ? [['IOU', iouId] as [string, string]] : []),
        ['Amount paid', amount],
        ['Outstanding', outstanding],
      ])}`,
    ctaLabel: 'View payments',
    ctaHref: `${PORTAL_URL()}/buyer/payments`,
  }),

  /** Packaging / docs / admin */
  packageReady: (packageRef: string) => wrapTemplate({
    preheader: `Package ${packageRef} ready for submission`,
    eyebrow: 'Listing readiness',
    title: 'Package marked ready for submission',
    bodyHtml: `
      <p style="margin:0 0 12px">Internal readiness only — <strong>not</strong> an NSE listing confirmation. Exchange onboarding is performed externally.</p>
      ${detailsTable([['Package', packageRef]])}`,
    ctaLabel: 'Packaging & Listing',
    ctaHref: `${PORTAL_URL()}/spv/packaging`,
  }),

  documentReady: (docLabel: string) => wrapTemplate({
    preheader: `${docLabel} ready`,
    eyebrow: 'Documents',
    title: 'Document ready',
    bodyHtml: `<p style="margin:0">Your <strong>${esc(docLabel)}</strong> is available in the Documents area of the portal.</p>`,
    ctaLabel: 'Open documents',
    ctaHref: `${PORTAL_URL()}/buyer/documents`,
  }),

  apiKeyCreated: (prefix: string, orgName?: string) => wrapTemplate({
    preheader: 'New API key created',
    eyebrow: 'Developer',
    title: 'API key provisioned',
    bodyHtml: `
      <p style="margin:0 0 12px">A new API key was generated. The full key is shown only once in the portal — this email confirms the prefix only.</p>
      ${detailsTable([
        ['Key prefix', prefix],
        ...(orgName ? [['Organisation', orgName] as [string, string]] : []),
      ])}
      <p style="margin:0;font-size:13px;color:#5A6B7D">If you did not request this, revoke the key immediately under Profile → Developer.</p>`,
    ctaLabel: 'Manage API keys',
    ctaHref: `${PORTAL_URL()}/buyer/profile?tab=developer`,
  }),

  orgCreated: (orgName: string, orgType: string, partyId: string) => wrapTemplate({
    preheader: `Organisation registered: ${orgName}`,
    eyebrow: 'Admin',
    title: 'Organisation created',
    bodyHtml: `
      <p style="margin:0 0 12px">A new organisation was registered on IOU Exchange. Invite users next and complete KYC documents.</p>
      ${detailsTable([
        ['Name', orgName],
        ['Type', orgType],
        ['Party ID', partyId],
      ])}`,
    ctaLabel: 'Users & organisations',
    ctaHref: `${PORTAL_URL()}/admin/users`,
  }),

  kycStatusUpdated: (orgName: string, status: string) => wrapTemplate({
    preheader: `KYC ${status} — ${orgName}`,
    eyebrow: 'Compliance',
    title: 'Organisation KYC status updated',
    bodyHtml: `
      <p style="margin:0 0 12px">Admin marked KYC status for your organisation.</p>
      ${detailsTable([
        ['Organisation', orgName],
        ['Status', status],
      ])}`,
    ctaLabel: 'View profile',
    ctaHref: `${PORTAL_URL()}/buyer/profile`,
  }),

  programmeLimitBlocked: (programmeName: string, reason: string) => wrapTemplate({
    preheader: 'Programme limit blocked a transaction',
    eyebrow: 'Credit programme',
    title: 'Transaction blocked by programme limits',
    bodyHtml: `
      <p style="margin:0 0 12px">IOU Exchange hard-blocked an action that would exceed programme exposure or tenor rules.</p>
      ${detailsTable([
        ['Programme', programmeName],
        ['Reason', reason],
      ])}`,
    ctaLabel: 'View programmes',
    ctaHref: `${PORTAL_URL()}/admin/programs`,
  }),

  generic: (title: string, body: string) => wrapTemplate({
    preheader: title,
    eyebrow: 'IOU Exchange',
    title,
    bodyHtml: `<p style="margin:0;white-space:pre-wrap">${esc(body)}</p>`,
    ctaLabel: 'Open portal',
    ctaHref: PORTAL_URL(),
  }),

  optInDeclined: (iouId: string, reason?: string) => wrapTemplate({
    preheader: `Opt-in declined — ${iouId}`,
    eyebrow: 'Buyer update',
    title: 'Supplier declined to sell',
    bodyHtml: `
      <p style="margin:0 0 12px">The named supplier declined the opt-in / sell request for this IOU.</p>
      ${detailsTable([
        ['IOU', iouId],
        ...(reason ? [['Reason', reason] as [string, string]] : []),
      ])}`,
    ctaLabel: 'Invoice register',
    ctaHref: `${PORTAL_URL()}/buyer/register`,
  }),

  verificationRejected: (iouId: string, reason?: string) => wrapTemplate({
    preheader: `Verification rejected — ${iouId}`,
    eyebrow: 'Supplier update',
    title: 'Buyer rejected your invoice',
    bodyHtml: `
      <p style="margin:0 0 12px">The buyer rejected verification of your listed invoice. It will not be assigned to the SPV.</p>
      ${detailsTable([
        ['IOU', iouId],
        ...(reason ? [['Reason', reason] as [string, string]] : []),
      ])}`,
    ctaLabel: 'My invoices',
    ctaHref: `${PORTAL_URL()}/supplier/invoices`,
  }),

  invoiceSettled: (iouId: string) => wrapTemplate({
    preheader: `Settled — ${iouId}`,
    eyebrow: 'Settlement recorded',
    title: 'Invoice marked settled',
    bodyHtml: `
      <p style="margin:0 0 12px">Outstanding balance reached zero (as reported by the settlement partner / AfyaX). IOU Exchange recorded settlement — it did not move the cash.</p>
      ${detailsTable([['IOU', iouId]])}`,
    ctaLabel: 'Open portal',
    ctaHref: PORTAL_URL(),
  }),
};

/** Canonical subjects — always include brand for inbox recognition */
export const emailSubjects = {
  otp: (purpose?: string) => `IOU Exchange — verification code${purpose ? ` (${purpose})` : ''}`,
  invite: () => 'You’re invited to IOU Exchange',
  passwordReset: () => 'IOU Exchange — password reset code',
  passwordChanged: () => 'IOU Exchange — password updated',
  optIn: (iou: string) => `IOU Exchange — opt-in required: ${iou}`,
  optInDeclined: (iou: string) => `IOU Exchange — opt-in declined: ${iou}`,
  verification: (iou: string) => `IOU Exchange — verify invoice: ${iou}`,
  verificationRejected: (iou: string) => `IOU Exchange — verification rejected: ${iou}`,
  offerReceived: (iou: string) => `IOU Exchange — purchase offer: ${iou}`,
  offerAccepted: (iou: string) => `IOU Exchange — offer accepted: ${iou}`,
  offerDeclined: (iou: string) => `IOU Exchange — offer declined: ${iou}`,
  consentRequired: (iou: string) => `IOU Exchange — consent required: ${iou}`,
  consentSigned: (iou: string) => `IOU Exchange — consent signed: ${iou}`,
  consentDeclined: (iou: string) => `IOU Exchange — consent declined: ${iou}`,
  assignment: (iou: string) => `IOU Exchange — assigned: ${iou}`,
  escrowDisburse: (iou: string) => `IOU Exchange — escrow disbursement recorded: ${iou}`,
  escrowCollect: (iou: string) => `IOU Exchange — escrow collection recorded: ${iou}`,
  payment: (iou?: string) => `IOU Exchange — payment update${iou ? `: ${iou}` : ''}`,
  settled: (iou: string) => `IOU Exchange — settled: ${iou}`,
  packageReady: (ref: string) => `IOU Exchange — package ready: ${ref}`,
  document: (label: string) => `IOU Exchange — document ready: ${label}`,
  apiKey: () => 'IOU Exchange — API key created',
  orgCreated: (name: string) => `IOU Exchange — organisation created: ${name}`,
  kyc: (name: string) => `IOU Exchange — KYC update: ${name}`,
  programmeBlock: () => 'IOU Exchange — programme limit blocked',
};

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; mode: string }> {
  const provider = process.env.EMAIL_PROVIDER || 'stub';
  const from = process.env.EMAIL_FROM || 'IOU Exchange <no-reply@ioux.africa>';
  const replyTo = payload.replyTo || process.env.SUPPORT_EMAIL || 'hello@ioux.africa';
  const text = payload.text || htmlToText(payload.html);

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
          text,
          reply_to: replyTo,
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
        replyTo,
        subject: payload.subject,
        html: payload.html,
        text,
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
