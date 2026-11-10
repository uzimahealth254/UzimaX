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
  spvName?: string;
  faceValue: number;
  purchasePrice: number;
  discountAmount?: number;
  feeTotal?: number;
  supplierFeeShare?: number;
  netProceeds?: number;
  currency?: string;
  issueDate?: string;
  dueDate?: string;
  invoiceNumber?: string | null;
  assignmentId: string;
}): Promise<{ url: string; key: string }> {
  const doc = new PDFDocument({ margin: 50 });
  const done = bufferFromDoc(doc);
  const ccy = opts.currency || 'KES';
  const money = (n: number) => `${ccy} ${n.toLocaleString()}`;

  doc.fontSize(18).text('IOU Exchange — Purchase Note', { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor('#555').text('Registry record of a receivable sale to the SPV. IOU Exchange does not move cash.');
  doc.moveDown();
  doc.fontSize(11).fillColor('#222');
  doc.text(`IOU registry ID: ${opts.iouRegistryId}`);
  if (opts.invoiceNumber) doc.text(`Invoice number: ${opts.invoiceNumber}`);
  doc.text(`Assignment ID: ${opts.assignmentId}`);
  doc.text(`Supplier (seller): ${opts.supplierName}`);
  doc.text(`Buyer (obligor): ${opts.buyerName}`);
  if (opts.spvName) doc.text(`SPV (purchaser): ${opts.spvName}`);
  if (opts.issueDate) doc.text(`Issue date: ${opts.issueDate}`);
  if (opts.dueDate) doc.text(`Due date: ${opts.dueDate}`);
  doc.moveDown();
  doc.text(`Face value: ${money(opts.faceValue)}`);
  if (opts.discountAmount != null) doc.text(`Discount amount: ${money(opts.discountAmount)}`);
  doc.text(`Purchase price: ${money(opts.purchasePrice)}`);
  if (opts.feeTotal != null) doc.text(`Assignment fees (total): ${money(opts.feeTotal)}`);
  if (opts.supplierFeeShare != null) doc.text(`Fee share deducted from supplier: ${money(opts.supplierFeeShare)}`);
  if (opts.netProceeds != null) doc.text(`Indicative net proceeds to supplier: ${money(opts.netProceeds)}`);
  doc.moveDown();
  doc.text(`Generated: ${new Date().toISOString()}`);
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
  standingOrderRef?: string | null;
  standingOrderBank?: string | null;
  commitmentAckAt?: string | Date | null;
}): Promise<{ url: string; key: string }> {
  const doc = new PDFDocument({ margin: 50 });
  const done = bufferFromDoc(doc);

  doc.fontSize(18).text('IOU Exchange — Assignment Letter', { underline: true });
  doc.moveDown();
  doc.fontSize(11);
  doc.text(`IOU: ${opts.iouRegistryId}`);
  doc.text(`Assignment: ${opts.assignmentId}`);
  doc.text(`Parties: ${opts.parties}`);
  if (opts.signatureHash) doc.text(`Signature hash: ${opts.signatureHash}`);
  if (opts.commitmentAckAt) {
    const when = typeof opts.commitmentAckAt === 'string'
      ? opts.commitmentAckAt
      : opts.commitmentAckAt.toISOString();
    doc.text(`Obligor commitment acknowledgement: ${when}`);
  }
  if (opts.standingOrderRef) {
    doc.text(`Bank standing-order reference: ${opts.standingOrderRef}`);
  }
  if (opts.standingOrderBank) {
    doc.text(`Standing-order bank: ${opts.standingOrderBank}`);
  }
  doc.moveDown();
  doc.text('IOU Exchange records references only; it does not execute bank standing orders or move cash.');
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
  invoiceNumber?: string | null;
  buyerName?: string;
  supplierName?: string;
  currency?: string;
  amountPaid: number;
  outstandingBalance: number;
  reference?: string;
  paymentMethod?: string;
  issueDate?: string;
  dueDate?: string;
}): Promise<{ url: string; key: string }> {
  const doc = new PDFDocument({ margin: 50 });
  const done = bufferFromDoc(doc);
  const ccy = opts.currency || 'KES';
  const money = (n: number) => `${ccy} ${n.toLocaleString()}`;

  doc.fontSize(18).text('IOU Exchange — Payment Receipt', { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor('#555').text('Record of a repayment reported to the registry. IOU Exchange does not collect the cash.');
  doc.moveDown();
  doc.fontSize(11).fillColor('#222');
  doc.text(`IOU registry ID: ${opts.iouRegistryId}`);
  if (opts.invoiceNumber) doc.text(`Invoice number: ${opts.invoiceNumber}`);
  if (opts.buyerName) doc.text(`Buyer: ${opts.buyerName}`);
  if (opts.supplierName) doc.text(`Supplier: ${opts.supplierName}`);
  if (opts.issueDate) doc.text(`Issue date: ${opts.issueDate}`);
  if (opts.dueDate) doc.text(`Due date: ${opts.dueDate}`);
  doc.moveDown();
  doc.text(`Amount recorded: ${money(opts.amountPaid)}`);
  doc.text(`Outstanding after this record: ${money(opts.outstandingBalance)}`);
  if (opts.paymentMethod) doc.text(`Method label: ${opts.paymentMethod}`);
  if (opts.reference) doc.text(`Partner reference: ${opts.reference}`);
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

export async function generatePackageSummary(opts: {
  orgId: string;
  packageRef: string;
  packageId: string;
  status: string;
  totalFaceValue: number;
  totalPurchasePrice: number;
  itemCount: number;
  nseReference?: string | null;
}): Promise<{ url: string; key: string }> {
  const doc = new PDFDocument({ margin: 50 });
  const done = bufferFromDoc(doc);

  doc.fontSize(18).text('IOU Exchange — Package Summary', { underline: true });
  doc.moveDown();
  doc.fontSize(11);
  doc.text(`Package ref: ${opts.packageRef}`);
  doc.text(`Package ID: ${opts.packageId}`);
  doc.text(`Status: ${opts.status}`);
  doc.text(`Receivables: ${opts.itemCount}`);
  doc.text(`Total face value: KES ${opts.totalFaceValue.toLocaleString()}`);
  doc.text(`Total purchase price: KES ${opts.totalPurchasePrice.toLocaleString()}`);
  if (opts.nseReference) doc.text(`NSE reference: ${opts.nseReference}`);
  doc.moveDown();
  doc.text(`Generated: ${new Date().toISOString()}`);
  doc.end();

  const buffer = await done;
  return storeFile({
    orgId: opts.orgId,
    originalName: `package-summary-${opts.packageRef}.pdf`,
    buffer,
    mimeType: 'application/pdf',
  });
}
