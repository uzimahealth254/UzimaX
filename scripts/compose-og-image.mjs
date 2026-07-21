import sharp from 'sharp';
import { copyFileSync, statSync } from 'fs';

/** Actual photo + translucent green/orange theme cover. Minimal brand plate. */
const src =
  process.argv[2] ||
  'C:/Users/Admin/.cursor/projects/c-Users-Admin-Downloads-CPF/assets/og-photo-raw.png';
const outJpg = 'public/og-image.jpg';
const outPng = 'public/og-image-bg.png';

copyFileSync(src, outPng);

const W = 1200;
const H = 630;

const bg = await sharp(src)
  .resize(W, H, { fit: 'cover', position: 'centre' })
  .modulate({ brightness: 1.04, saturation: 1.05 })
  .toBuffer();

// Site theme: forest #0E1F1A · lime #D3F36B · gold/orange #F0C419
const cover = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="cover" x1="0%" y1="15%" x2="100%" y2="85%">
      <stop offset="0%" stop-color="#0E1F1A" stop-opacity="0.58"/>
      <stop offset="35%" stop-color="#1A3A2E" stop-opacity="0.32"/>
      <stop offset="65%" stop-color="#D3F36B" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#F0C419" stop-opacity="0.52"/>
    </linearGradient>
    <radialGradient id="goldBloom" cx="88%" cy="18%" r="45%">
      <stop offset="0%" stop-color="#F0C419" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#F0C419" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="greenBloom" cx="12%" cy="75%" r="50%">
      <stop offset="0%" stop-color="#0E1F1A" stop-opacity="0.50"/>
      <stop offset="100%" stop-color="#0E1F1A" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D3F36B"/>
      <stop offset="50%" stop-color="#F0C419"/>
      <stop offset="100%" stop-color="#E8920F"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#cover)"/>
  <rect width="${W}" height="${H}" fill="url(#goldBloom)"/>
  <rect width="${W}" height="${H}" fill="url(#greenBloom)"/>
  <rect y="0" width="${W}" height="7" fill="url(#bar)"/>

  <rect x="48" y="508" width="400" height="72" rx="14" fill="#0E1F1A" fill-opacity="0.82"/>
  <g transform="translate(66,522)">
    <rect width="42" height="42" rx="10" fill="#0A1612" stroke="#D3F36B" stroke-width="1.5"/>
    <path d="M11.5 11v12c0 5.4 4 9.4 9.6 9.4S30.7 28.4 30.7 23V11" fill="none" stroke="#F3FAF5" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="31.6" cy="11.5" r="3.4" fill="#F0C419"/>
  </g>
  <text x="124" y="548" font-family="Georgia, 'Times New Roman', serif" font-size="26" font-weight="700" fill="#F8FBF9">IOU Exchange</text>
  <text x="124" y="570" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="600" fill="#F0C419">www.ioux.africa</text>
</svg>`);

await sharp(bg)
  .composite([{ input: cover, top: 0, left: 0 }])
  .jpeg({ quality: 90, progressive: false, mozjpeg: false })
  .toFile(outJpg);

const m = await sharp(outJpg).metadata();
console.log(
  `wrote ${outJpg} ${(statSync(outJpg).size / 1024).toFixed(1)}KB ${m.width}x${m.height}`,
);
