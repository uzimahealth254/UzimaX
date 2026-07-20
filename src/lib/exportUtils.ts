import { Invoice } from '@/types';

export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportInvoicesToCsv(invoices: Invoice[], filename = 'uzima-invoices.csv') {
  exportToCsv(
    filename,
    ['IOU Registry ID', 'Invoice Number', 'Supplier', 'Buyer', 'Amount', 'Currency', 'Issue Date', 'Due Date', 'Status'],
    invoices.map(inv => [
      inv.iouRegistryId,
      inv.invoiceNumber,
      inv.supplierName,
      inv.buyerName,
      inv.amount,
      inv.currency,
      inv.issueDate,
      inv.dueDate,
      inv.status,
    ]),
  );
}
