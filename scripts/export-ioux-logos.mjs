/**
 * Export IOUX logo assets: JPEG + PDF (from SVG masters).
 *   node scripts/export-ioux-logos.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'logos');

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

async function svgToJpeg(svgPath, jpegPath, size, bg = '#ffffff') {
  const svg = fs.readFileSync(svgPath);
  const { r, g, b } = hexToRgb(bg);
  await sharp(svg, { density: 300 })
    .resize(size, size, { fit: 'contain', background: { r, g, b, alpha: 1 } })
    .flatten({ background: { r, g, b } })
    .jpeg({ quality: 95, mozjpeg: true })
    .toFile(jpegPath);
  console.log('wrote', path.relative(root, jpegPath));
}

async function jpegToPdf(jpegPath, pdfPath, title) {
  const img = fs.readFileSync(jpegPath);
  const meta = await sharp(img).metadata();
  const w = meta.width || 1024;
  const h = meta.height || 1024;
  const doc = new PDFDocument({
    size: [w, h],
    margin: 0,
    info: { Title: title, Author: 'IOU Exchange', Subject: 'IOUX logo' },
  });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);
  doc.image(img, 0, 0, { width: w, height: h });
  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  console.log('wrote', path.relative(root, pdfPath));
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const wordmarkSvg = path.join(outDir, 'ioux-wordmark.svg');
  const markSvg = path.join(root, 'public', 'ioux-mark.svg');
  const markFullSvg = path.join(root, 'public', 'ioux-mark-full.svg');

  const wmJpeg = path.join(outDir, 'ioux-wordmark.jpg');
  const wmPdf = path.join(outDir, 'ioux-wordmark.pdf');
  await svgToJpeg(wordmarkSvg, wmJpeg, 2048, '#ffffff');
  await jpegToPdf(wmJpeg, wmPdf, 'IOUX wordmark');

  const markJpeg = path.join(outDir, 'ioux-mark.jpg');
  const markPdf = path.join(outDir, 'ioux-mark.pdf');
  await svgToJpeg(markSvg, markJpeg, 2048, '#0E1F1A');
  await jpegToPdf(markJpeg, markPdf, 'IOUX mark');

  // Full-bleed square — green to every edge, no white margins
  const fullJpeg = path.join(outDir, 'ioux-mark-full.jpg');
  const fullPdf = path.join(outDir, 'ioux-mark-full.pdf');
  await svgToJpeg(markFullSvg, fullJpeg, 2048, '#0E1F1A');
  await jpegToPdf(fullJpeg, fullPdf, 'IOUX mark full bleed');

  console.log('Done — logos in public/logos/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
