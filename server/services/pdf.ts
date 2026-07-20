import PDFDocument from 'pdfkit';
import { storeFile } from './storage.js';

function bufferFromDoc(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

export async function generatePurchaseNote(opts: {
  orgId: string;
  iouRegistryId: string;
  supplierName: string;
  buyerName: string;
  faceValue: number;
  purchasePrice: number;
  assignmentId: string;
}): Promise<{ url: string; key: string }> {
  const doc = new PDFDocument({ margin: 50 });
  const done = bufferFromDoc(doc);

  doc.fontSize(18).text('Uzima — Purchase Note', { underline: true });
  doc.moveDown();
  doc.fontSize(11).fillColor('#333');
  doc.text(`IOU Registry ID: ${opts.iouRegistryId}`);
  doc.text(`Assignment ID: ${opts.assignmentId}`);
  doc.text(`Supplier: ${opts.supplierName}`);
  doc.text(`Buyer: ${opts.buyerName}`);
  doc.text(`Face value: KES ${opts.faceValue.toLocaleString()}`);
  doc.text(`Purchase price: KES ${opts.purchasePrice.toLocaleString()}`);
  doc.moveDown();
  doc.text(`Generated: ${new Date().toISOString()}`);
  doc.text('This is a simulated transaction document for the Uzima platform.');
  doc.end();

  const buffer = await done;
  return storeFile({
    orgId: opts.orgId,
    originalName: `purchase-note-${opts.iouRegistryId}.pdf`,
    buffer,
    mimeType: 'application/pdf',
  });
}

export async function generateAssignmentLetter(opts: {
  orgId: string;
  iouRegistryId: string;
  parties: string;
  assignmentId: string;
  signatureHash?: string;
}): Promise<{ url: string; key: string }> {
  const doc = new PDFDocument({ margin: 50 });
  const done = bufferFromDoc(doc);

  doc.fontSize(18).text('Uzima — Assignment Letter', { underline: true });
  doc.moveDown();
  doc.fontSize(11);
  doc.text(`IOU: ${opts.iouRegistryId}`);
  doc.text(`Assignment: ${opts.assignmentId}`);
  doc.text(`Parties: ${opts.parties}`);
  if (opts.signatureHash) doc.text(`Signature hash: ${opts.signatureHash}`);
  doc.moveDown();
  doc.text(`Issued: ${new Date().toISOString()}`);
  doc.end();

  const buffer = await done;
  return storeFile({
    orgId: opts.orgId,
    originalName: `assignment-letter-${opts.iouRegistryId}.pdf`,
    buffer,
    mimeType: 'application/pdf',
  });
}

export async function generatePaymentReceipt(opts: {
  orgId: string;
  iouRegistryId: string;
  amountPaid: number;
  outstandingBalance: number;
  reference?: string;
}): Promise<{ url: string; key: string }> {
  const doc = new PDFDocument({ margin: 50 });
  const done = bufferFromDoc(doc);

  doc.fontSize(18).text('Uzima — Payment Receipt', { underline: true });
  doc.moveDown();
  doc.fontSize(11);
  doc.text(`IOU: ${opts.iouRegistryId}`);
  doc.text(`Amount paid: KES ${opts.amountPaid.toLocaleString()}`);
  doc.text(`Outstanding: KES ${opts.outstandingBalance.toLocaleString()}`);
  if (opts.reference) doc.text(`Reference: ${opts.reference}`);
  doc.moveDown();
  doc.text(`Issued: ${new Date().toISOString()}`);
  doc.end();

  const buffer = await done;
  return storeFile({
    orgId: opts.orgId,
    originalName: `payment-receipt-${opts.iouRegistryId}.pdf`,
    buffer,
    mimeType: 'application/pdf',
  });
}
