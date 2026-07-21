/**
 * Renders all email templates to server/templates/emails/preview.html
 * Usage: npx tsx scripts/render-email-previews.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { templates } from '../server/services/email.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../server/templates/emails');
fs.mkdirSync(outDir, { recursive: true });

const samples: { id: string; label: string; html: string }[] = [
  { id: 'otp', label: 'OTP / verification', html: templates.otp('482913', 'consent signing') },
  { id: 'invite', label: 'User invite + temp password', html: templates.invite({ name: 'Jane Wanjiku', role: 'buyer', orgName: 'Nairobi Pharma Ltd', tempPassword: 'Tmp!Uzima2026a', email: 'jane@nairohipharma.co.ke' }) },
  { id: 'password-reset', label: 'Password reset', html: templates.passwordReset('739104') },
  { id: 'password-changed', label: 'Password changed', html: templates.passwordChanged('Jane Wanjiku') },
  { id: 'opt-in', label: 'Supplier opt-in request', html: templates.optInRequest('IOU-KE-2026-0042-7', 'KES 2,500,000', 'Nairobi Pharma Ltd') },
  { id: 'verify', label: 'Buyer verification request', html: templates.buyerVerificationRequest('IOU-KE-2026-0051-3', 'KES 1,200,000', 'Savannah Med Supplies') },
  { id: 'offer-received', label: 'Offer received', html: templates.offerReceived('IOU-KE-2026-0042-7', '5.00%', 'KES 2,375,000') },
  { id: 'offer-accepted', label: 'Offer accepted', html: templates.offerAccepted('IOU-KE-2026-0042-7') },
  { id: 'offer-declined', label: 'Offer declined', html: templates.offerDeclined('IOU-KE-2026-0042-7') },
  { id: 'consent-required', label: 'Consent required', html: templates.consentRequired('IOU-KE-2026-0042-7', 'KES 2,500,000') },
  { id: 'consent-signed', label: 'Consent signed', html: templates.consentSigned('IOU-KE-2026-0042-7') },
  { id: 'consent-declined', label: 'Consent declined', html: templates.consentDeclined('IOU-KE-2026-0042-7', 'Dispute on PO reference') },
  { id: 'assignment', label: 'Assignment created', html: templates.assignmentCreated('IOU-KE-2026-0042-7', 'Supplier opt-in') },
  { id: 'escrow-disburse', label: 'Escrow disbursement recorded', html: templates.escrowDisbursedRecorded('IOU-KE-2026-0042-7', 'KES 2,375,000') },
  { id: 'escrow-collect', label: 'Escrow collection recorded', html: templates.escrowCollectionRecorded('IOU-KE-2026-0042-7', 'KES 800,000') },
  { id: 'payment', label: 'Payment update', html: templates.paymentReceived('KES 800,000', 'KES 1,700,000', 'IOU-KE-2026-0042-7') },
  { id: 'package-ready', label: 'Package ready for submission', html: templates.packageReady('PKG-USP-2026-014') },
  { id: 'document', label: 'Document ready', html: templates.documentReady('package summary') },
  { id: 'api-key', label: 'API key created', html: templates.apiKeyCreated('uzk_live_9c2e', 'Nairobi Pharma Ltd') },
  { id: 'org-created', label: 'Organisation created', html: templates.orgCreated('Coastal Health Distributors', 'supplier', 'UZ-SUP-A1B2C3') },
  { id: 'kyc', label: 'KYC status updated', html: templates.kycStatusUpdated('Coastal Health Distributors', 'verified') },
  { id: 'programme-block', label: 'Programme limit blocked', html: templates.programmeLimitBlocked('AfyaX Facility 2026', 'Buyer sublimit exceeded by KES 400,000') },
  { id: 'opt-in-declined', label: 'Opt-in declined', html: templates.optInDeclined('IOU-KE-2026-0042-7', 'Not selling this receivable') },
  { id: 'verification-rejected', label: 'Verification rejected', html: templates.verificationRejected('IOU-KE-2026-0051-3', 'PO mismatch') },
  { id: 'settled', label: 'Invoice settled', html: templates.invoiceSettled('IOU-KE-2026-0042-7') },
];

for (const s of samples) {
  fs.writeFileSync(path.join(outDir, `${s.id}.html`), s.html, 'utf8');
}

const index = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>IOU Exchange email template gallery</title>
  <style>
    :root { --forest:#0E1F1A; --lime:#D3F36B; --mist:#F4FBE3; --bg:#E8F0EA; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: system-ui, -apple-system, Segoe UI, sans-serif; background: var(--bg); color: var(--forest); }
    header { position: sticky; top:0; z-index:10; background: var(--forest); color:#F3FAF5; padding:16px 20px; display:flex; gap:16px; align-items:center; border-bottom:4px solid var(--lime); }
    header h1 { margin:0; font-family: Georgia, serif; font-size:1.25rem; }
    header p { margin:0; opacity:0.7; font-size:12px; }
    .layout { display:grid; grid-template-columns: 260px 1fr; min-height: calc(100vh - 64px); }
    nav { background:#fff; border-right:1px solid #D5E0D8; padding:12px; overflow:auto; max-height: calc(100vh - 64px); position:sticky; top:64px; }
    nav a { display:block; padding:10px 12px; border-radius:10px; text-decoration:none; color:var(--forest); font-size:13px; font-weight:600; margin-bottom:4px; }
    nav a:hover, nav a.active { background: var(--mist); }
    main { padding:20px; }
    iframe { width:100%; min-height:78vh; border:1px solid #D5E0D8; border-radius:16px; background:#fff; }
    @media (max-width: 800px) { .layout { grid-template-columns: 1fr; } nav { position:static; max-height:none; display:flex; flex-wrap:wrap; gap:4px; } }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>IOU Exchange email gallery</h1>
      <p>${samples.length} transactional templates · forest / lime brand</p>
    </div>
  </header>
  <div class="layout">
    <nav>
      ${samples.map((s, i) => `<a href="${s.id}.html" target="preview" class="${i === 0 ? 'active' : ''}" onclick="document.querySelectorAll('nav a').forEach(a=>a.classList.remove('active'));this.classList.add('active')">${s.label}</a>`).join('\n')}
    </nav>
    <main>
      <iframe name="preview" src="${samples[0].id}.html" title="Email preview"></iframe>
    </main>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'preview.html'), index, 'utf8');
console.log(`Wrote ${samples.length} templates + preview.html → ${outDir}`);
