import sharp from 'sharp';
import { copyFileSync, statSync } from 'fs';

const src =
  process.argv[2] ||
  'C:/Users/Admin/.cursor/projects/c-Users-Admin-Downloads-CPF/assets/og-bg-ai.png';
const outJpg = 'public/og-image.jpg';
const outPng = 'public/og-image-bg.png';

copyFileSync(src, outPng);

const W = 1200;
const H = 630;

const bg = await sharp(src)
  .resize(W, H, { fit: 'cover', position: 'centre' })
  .toBuffer();

const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="veil" x1="0%" y1="0%" x2="72%" y2="0%">
      <stop offset="0%" stop-color="#06140F" stop-opacity="0.94"/>
      <stop offset="50%" stop-color="#0E1F1A" stop-opacity="0.78"/>
      <stop offset="100%" stop-color="#0E1F1A" stop-opacity="0.05"/>
    </linearGradient>
    <linearGradient id="bottom" x1="0%" y1="40%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#06140F" stop-opacity="0"/>
      <stop offset="100%" stop-color="#06140F" stop-opacity="0.58"/>
    </linearGradient>
    <linearGradient id="lime" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D3F36B"/>
      <stop offset="100%" stop-color="#C5E85A"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#veil)"/>
  <rect width="${W}" height="${H}" fill="url(#bottom)"/>
  <rect y="0" width="${W}" height="5" fill="url(#lime)"/>

  <g transform="translate(72,78)">
    <rect width="52" height="52" rx="13" fill="#0A1612" stroke="#D3F36B" stroke-width="1.6"/>
    <path d="M14 13.5v14.8c0 6.6 4.9 11.5 11.8 11.5S37.6 34.9 37.6 28.3V13.5" fill="none" stroke="#F3FAF5" stroke-width="3.8" stroke-linecap="round"/>
    <circle cx="38.5" cy="14.2" r="4.2" fill="#D3F36B"/>
  </g>
  <text x="140" y="112" font-family="Georgia, 'Times New Roman', serif" font-size="36" font-weight="700" fill="#F3FAF5">IOU Exchange</text>

  <text x="72" y="220" font-family="Georgia, 'Times New Roman', serif" font-size="58" font-weight="700" fill="#F8FBF9">Working capital for</text>
  <text x="72" y="292" font-family="Georgia, 'Times New Roman', serif" font-size="58" font-weight="700" fill="#D3F36B">pharmacy trade</text>

  <rect x="72" y="324" width="64" height="4" rx="2" fill="#D3F36B"/>

  <text x="72" y="372" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="500" fill="#D6E8DC">Receivables finance for suppliers, buyers and SPVs</text>
  <text x="72" y="412" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#A8C4B4">Dual origination · Assignment · AfyaX settlement</text>

  <text x="72" y="560" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#D3F36B">www.ioux.africa</text>
</svg>`);

await sharp(bg)
  .composite([{ input: overlay, top: 0, left: 0 }])
  .jpeg({ quality: 90, progressive: false, mozjpeg: false })
  .toFile(outJpg);

const m = await sharp(outJpg).metadata();
console.log(
  `wrote ${outJpg} ${(statSync(outJpg).size / 1024).toFixed(1)}KB ${m.width}x${m.height} progressive=${m.isProgressive}`,
);
