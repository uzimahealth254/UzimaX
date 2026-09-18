/**
 * Export branded PDF from a markdown handbook-style doc.
 * Usage:
 *   npx tsx scripts/export-md-pdf.ts docs/IOUX_DEPLOYMENT_GUIDE_SULE.md docs/exports/IOUX-Deployment-Guide-Sule
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const mdRel = process.argv[2];
const outBaseRel = process.argv[3];
if (!mdRel || !outBaseRel) {
  console.error('Usage: npx tsx scripts/export-md-pdf.ts <md> <outBaseWithoutExt>');
  process.exit(1);
}

const mdPath = path.resolve(root, mdRel);
const outBase = path.resolve(root, outBaseRel);
const htmlPath = `${outBase}.html`;
const pdfPath = `${outBase}.pdf`;

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function mdToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  let inCode = false;
  let codeLang = '';
  let codeBuf: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      closeLists();
      if (!inCode) {
        inCode = true;
        codeLang = line.slice(3).trim();
        codeBuf = [];
      } else {
        out.push(`<pre class="code"><code class="${escapeHtml(codeLang)}">${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
        inCode = false;
        codeBuf = [];
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }

    if (line.trim() === '---') {
      closeLists();
      out.push('<hr />');
      i++;
      continue;
    }

    if (line.includes('|') && line.trim().startsWith('|') && i + 1 < lines.length && /^\|[\s-:|]+\|$/.test(lines[i + 1].trim())) {
      closeLists();
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim().startsWith('|')) {
        const raw = lines[i].trim();
        if (/^\|[\s-:|]+\|$/.test(raw)) { i++; continue; }
        rows.push(raw.split('|').slice(1, -1).map((c) => c.trim()));
        i++;
      }
      if (rows.length) {
        out.push('<table>');
        out.push('<thead><tr>' + rows[0].map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>');
        for (const r of rows.slice(1)) out.push('<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>');
        out.push('</tbody></table>');
      }
      continue;
    }

    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    if (h) {
      closeLists();
      const level = h[1].length;
      out.push(`<h${level}${level === 1 ? ' class="doc-title"' : ''}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      closeLists();
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${quote.map(inline).join('<br />')}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+\[ \]\s+/.test(line) || /^[-*]\s+\[[xX]\]\s+/.test(line)) {
      if (!inUl) { closeLists(); out.push('<ul class="checks">'); inUl = true; }
      const checked = /\[[xX]\]/.test(line);
      const text = line.replace(/^[-*]\s+\[[ xX]\]\s+/, '');
      out.push(`<li class="${checked ? 'done' : 'todo'}">${inline(text)}</li>`);
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!inUl) { closeLists(); out.push('<ul>'); inUl = true; }
      out.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`);
      i++;
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      if (!inOl) { closeLists(); out.push('<ol>'); inOl = true; }
      out.push(`<li>${inline(line.replace(/^\d+\.\s+/, ''))}</li>`);
      i++;
      continue;
    }

    if (!line.trim()) {
      closeLists();
      i++;
      continue;
    }

    closeLists();
    out.push(`<p>${inline(line)}</p>`);
    i++;
  }
  closeLists();
  return out.join('\n');
}

const css = `
  :root { --ink:#14222a; --teal:#0b3d4a; --teal-deep:#072c36; --sand:#c4a574; --paper:#f7f4ef; --line:#d5cdc0; --muted:#5c6b73; --white:#fffcf7; }
  * { box-sizing: border-box; }
  @page { size: A4; margin: 14mm 12mm 16mm; }
  body { margin:0; background:var(--paper); color:var(--ink); font-family:"Source Sans 3",system-ui,sans-serif; font-size:9.5pt; line-height:1.45; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .sheet { max-width:190mm; margin:0 auto; padding:0 2mm 8mm; }
  .cover { background:linear-gradient(125deg,var(--teal-deep),var(--teal) 55%,#145566); color:var(--paper); padding:22px 20px 18px; margin-bottom:16px; }
  .cover .brand { font-family:Fraunces,Georgia,serif; font-size:20pt; font-weight:650; line-height:1.1; }
  .cover .brand small { display:block; margin-top:6px; font-family:"Source Sans 3",sans-serif; font-size:8pt; letter-spacing:.1em; text-transform:uppercase; opacity:.85; font-weight:600; }
  .cover .meta { margin-top:14px; font-size:8.5pt; opacity:.92; display:grid; grid-template-columns:1fr 1fr; gap:4px 16px; }
  h1.doc-title { display:none; }
  h2 { font-family:Fraunces,Georgia,serif; font-size:12pt; color:var(--teal); margin:16px 0 8px; padding-bottom:3px; border-bottom:1px solid var(--sand); page-break-after:avoid; }
  h3 { font-family:Fraunces,Georgia,serif; font-size:10.5pt; color:var(--teal-deep); margin:12px 0 6px; page-break-after:avoid; }
  p { margin:0 0 7px; }
  ul, ol { margin:0 0 8px; padding-left:18px; }
  li { margin-bottom:3px; }
  ul.checks { list-style:none; padding-left:0; }
  ul.checks li.todo::before { content:"☐ "; color:var(--teal); }
  ul.checks li.done::before { content:"☑ "; color:var(--teal); }
  table { width:100%; border-collapse:collapse; margin:0 0 10px; font-size:8.2pt; }
  tr { page-break-inside:avoid; }
  th, td { text-align:left; padding:5px 6px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { background:#ebe4d8; color:var(--teal-deep); font-size:7pt; text-transform:uppercase; letter-spacing:.03em; font-weight:700; }
  tr:nth-child(even) td { background:rgba(255,255,255,.4); }
  code { font-family:ui-monospace,Consolas,monospace; font-size:8pt; background:#ebe4d8; padding:1px 4px; }
  pre.code { background:#12262e; color:#e8f0f2; padding:10px 12px; overflow-x:auto; font-size:7.5pt; line-height:1.35; margin:0 0 10px; page-break-inside:avoid; }
  pre.code code { background:transparent; color:inherit; padding:0; }
  blockquote { margin:0 0 12px; padding:10px 12px; border-left:3px solid var(--sand); background:var(--white); font-size:9pt; color:var(--muted); }
  hr { border:none; border-top:1px solid var(--line); margin:14px 0; }
  .footer-note { margin-top:18px; padding-top:8px; border-top:1px solid var(--line); font-size:7.5pt; color:var(--muted); display:flex; justify-content:space-between; }
`;

const md = fs.readFileSync(mdPath, 'utf8');
const titleMatch = /^#\s+(.+)$/m.exec(md);
const title = titleMatch?.[1] || 'IOUX Document';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,650&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>${css}</style>
</head>
<body>
  <div class="sheet">
    <div class="cover">
      <div class="brand">IOU Exchange<small>${escapeHtml(title)}</small></div>
      <div class="meta">
        <div><strong>For</strong> David Sule — infrastructure deploy</div>
        <div><strong>From</strong> Alfred Mulinge — IOUX application</div>
        <div><strong>Date</strong> 15 September 2026</div>
        <div><strong>Note</strong> No production secrets in this PDF</div>
      </div>
    </div>
    ${mdToHtml(md)}
    <div class="footer-note">
      <span>IOUX-DEPLOY-SULE-001 · Shareable deploy guide</span>
      <span>ioux.africa</span>
    </div>
  </div>
</body>
</html>`;

fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('Wrote', htmlPath);

const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const chrome = chromeCandidates.find((p) => fs.existsSync(p));
if (!chrome) {
  console.error('Chrome/Edge not found');
  process.exit(1);
}

const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
spawnSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdfPath}`, fileUrl], { encoding: 'utf8' });
if (!fs.existsSync(pdfPath)) {
  console.error('PDF not created');
  process.exit(1);
}
console.log('Wrote', pdfPath);
