import sharp from 'sharp';
import { readFileSync, statSync } from 'fs';

const input = process.argv[2] || 'social-preview.png';
const outputJpg = 'public/og-image.jpg';
const outputPng = 'public/og-image-optimized.png';

// Baseline (non-progressive) JPEG — WhatsApp previews are more reliable with this
await sharp(input)
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .flatten({ background: '#0b1f33' })
  .jpeg({ quality: 88, progressive: false, mozjpeg: false })
  .toFile(outputJpg);

await sharp(input)
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .png({ compressionLevel: 9, palette: true })
  .toFile(outputPng);

const jpgSize = statSync(outputJpg).size;
const pngSize = statSync(outputPng).size;
console.log(`og-image.jpg: ${(jpgSize / 1024).toFixed(1)} KB`);
console.log(`og-image-optimized.png: ${(pngSize / 1024).toFixed(1)} KB`);
