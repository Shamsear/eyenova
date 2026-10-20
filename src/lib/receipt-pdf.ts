import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReceiptPayload } from './types';

/**
 * Generates an exact 80mm thermal receipt PDF matching EyeNovaBilling ReceiptDocument.cs
 */
export function generateReceiptPdf(data: ReceiptPayload): jsPDF {
  // Dynamic height calculation: base height 140mm + 12mm per item + extra for notes
  const baseHeight = 145;
  const itemHeight = Math.max(1, data.items.length) * 12;
  const totalHeightMm = Math.max(180, baseHeight + itemHeight);

  // 80mm width format (standard thermal POS roll)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, totalHeightMm],
  });

  const margin = 4;
  const pageWidth = 80;
  const printableWidth = pageWidth - margin * 2;
  let y = 8;

  // Header - Store Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(data.storeNameEn || 'EYENOVA OPTICAL', pageWidth / 2, y, { align: 'center' });
  y += 5;

  if (data.storeNameAr) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(data.storeNameAr, pageWidth / 2, y, { align: 'center' });
    y += 4.5;
  }

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  if (data.addressEn) {
    doc.text(data.addressEn, pageWidth / 2, y, { align: 'center' });
    y += 3.5;
  }
  if (data.phone) {
    doc.text(`Tel: ${data.phone}`, pageWidth / 2, y, { align: 'center' });
    y += 3.5;
  }
  if (data.crNumber || data.vatNumber) {
    const reg = [data.crNumber ? `CR: ${data.crNumber}` : '', data.vatNumber ? `VAT: ${data.vatNumber}` : '']
      .filter(Boolean)
      .join('  |  ');
    doc.text(reg, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }

  // Divider
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineDashPattern([], 0);
  y += 4;

  // Tax Invoice Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TAX INVOICE / SIMPLIFIED RECEIPT', pageWidth / 2, y, { align: 'center' });
  y += 4.5;

  // Meta Details
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');

  doc.text(`Invoice: ${data.invoiceNumber}`, margin, y);
  doc.text(`Date: ${data.date}`, pageWidth - margin, y, { align: 'right' });
  y += 3.5;

  doc.text(`Order: ${data.orderNumber}`, margin, y);
  doc.text(`Time: ${data.time}`, pageWidth - margin, y, { align: 'right' });
  y += 3.5;

  doc.text(`Cashier: ${data.cashierName || 'Cashier'}`, margin, y);
  y += 3.5;

  if (data.customerName && data.customerName !== 'Walk-in Customer') {
    doc.text(`Customer: ${data.customerName}`, margin, y);
    if (data.customerPhone) {
      doc.text(data.customerPhone, pageWidth - margin, y, { align: 'right' });
    }
    y += 3.5;
  }

  // Items Header Line
  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineDashPattern([], 0);
  y += 3.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ITEM', margin, y);
  doc.text('QTY', 48, y, { align: 'center' });
  doc.text('PRICE', 60, y, { align: 'right' });
  doc.text('TOTAL', pageWidth - margin, y, { align: 'right' });
  y += 2.5;

  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3.5;

  // Items List
  doc.setFont('helvetica', 'normal');
  for (const item of data.items) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    // Truncate title if long
    const title = item.name.length > 25 ? item.name.substring(0, 24) + '…' : item.name;
    doc.text(title, margin, y);

    doc.setFont('helvetica', 'normal');
    doc.text(`${item.quantity}`, 48, y, { align: 'center' });
    doc.text(`${item.unitPrice.toFixed(2)}`, 60, y, { align: 'right' });
    doc.text(`${item.total.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
    y += 3.2;

    if (item.specs) {
      doc.setFontSize(6.8);
      doc.setTextColor(80, 80, 80);
      doc.text(item.specs, margin + 1.5, y);
      doc.setTextColor(0, 0, 0);
      y += 3.2;
    }
    y += 1;
  }

  // Divider
  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineDashPattern([], 0);
  y += 4;

  // Totals Section
  const rightAlign = pageWidth - margin;
  const labelX = 40;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');

  doc.text('Subtotal:', labelX, y);
  doc.text(`${data.subtotal.toFixed(2)} QAR`, rightAlign, y, { align: 'right' });
  y += 3.5;

  if (data.discount > 0) {
    doc.text('Discount:', labelX, y);
    doc.text(`-${data.discount.toFixed(2)} QAR`, rightAlign, y, { align: 'right' });
    y += 3.5;
  }

  if (data.deliveryFee > 0) {
    doc.text('Delivery Fee:', labelX, y);
    doc.text(`${data.deliveryFee.toFixed(2)} QAR`, rightAlign, y, { align: 'right' });
    y += 3.5;
  }

  if (data.taxAmount > 0) {
    doc.text(`Tax (${data.taxRate}%):`, labelX, y);
    doc.text(`${data.taxAmount.toFixed(2)} QAR`, rightAlign, y, { align: 'right' });
    y += 3.5;
  }

  // Solid Grand Total Divider
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', labelX, y);
  doc.text(`${data.total.toFixed(2)} QAR`, rightAlign, y, { align: 'right' });
  y += 4.5;

  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3.5;

  // Payment Breakdown
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Paid via: ${data.paymentMethod}`, margin, y);
  if (data.paymentReference) {
    doc.text(`Ref: ${data.paymentReference}`, rightAlign, y, { align: 'right' });
  }
  y += 3.5;

  if (data.cashTendered !== undefined && data.cashTendered > 0) {
    doc.text(`Cash Tendered:`, margin, y);
    doc.text(`${data.cashTendered.toFixed(2)} QAR`, rightAlign, y, { align: 'right' });
    y += 3.2;

    doc.text(`Change Due:`, margin, y);
    doc.text(`${(data.changeDue ?? 0).toFixed(2)} QAR`, rightAlign, y, { align: 'right' });
    y += 3.5;
  }

  // Barcode representation
  y += 3;
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text(`*${data.invoiceNumber}*`, pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Footer notes
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Thank you for choosing EyeNova Optical!', pageWidth / 2, y, { align: 'center' });
  y += 3.5;
  doc.text('Please retain this receipt for warranty and exchanges.', pageWidth / 2, y, { align: 'center' });
  y += 3.2;
  doc.text('Exchange / Return within 14 days in original condition.', pageWidth / 2, y, { align: 'center' });

  return doc;
}

/**
 * Generates formal A4 Tax Invoice PDF matching EyeNovaBilling QuestPDF
 */
export function generateA4InvoicePdf(data: ReceiptPayload): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 15;
  let y = 18;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(data.storeNameEn || 'EYENOVA OPTICAL', margin, y);

  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235); // Blue 600
  doc.text('TAX INVOICE', pageWidth - margin, y, { align: 'right' });
  y += 7;

  // Company info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`${data.addressEn || 'Doha, Qatar'} | Tel: ${data.phone || '+974 4455 0202'}`, margin, y);
  doc.text(`Invoice #: ${data.invoiceNumber}`, pageWidth - margin, y, { align: 'right' });
  y += 5;

  doc.text(`CR: ${data.crNumber || '184920'} | VAT: ${data.vatNumber || 'QA-987654321'}`, margin, y);
  doc.text(`Date: ${data.date}  ${data.time}`, pageWidth - margin, y, { align: 'right' });
  y += 8;

  // Separator bar
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Customer Block & Order Block (2 columns)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('BILLED TO:', margin, y);
  doc.text('ORDER SUMMARY:', 120, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  doc.text(`Name: ${data.customerName || 'Walk-in Customer'}`, margin, y);
  doc.text(`Order Reference: ${data.orderNumber}`, 120, y);
  y += 5;

  doc.text(`Phone: ${data.customerPhone || '—'}`, margin, y);
  doc.text(`Payment Method: ${data.paymentMethod}`, 120, y);
  y += 5;

  doc.text(`Served by: ${data.cashierName || 'Cashier'}`, margin, y);
  if (data.paymentReference) {
    doc.text(`Payment Ref: ${data.paymentReference}`, 120, y);
  }
  y += 10;

  // Table of Items
  const tableData = data.items.map((item, index) => [
    (index + 1).toString(),
    item.name + (item.specs ? `\n${item.specs}` : ''),
    item.quantity.toString(),
    `${item.unitPrice.toFixed(2)} QAR`,
    `${item.total.toFixed(2)} QAR`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Item & Prescription Specs', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 100 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 27, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Totals at bottom right
  // @ts-expect-error autoTable adds lastAutoTable to doc
  const finalY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 8 : y + 60;
  let totY = finalY;
  const totXLabel = 135;
  const totXVal = pageWidth - margin;

  doc.setFontSize(9);
  doc.text('Subtotal:', totXLabel, totY);
  doc.text(`${data.subtotal.toFixed(2)} QAR`, totXVal, totY, { align: 'right' });
  totY += 5;

  if (data.discount > 0) {
    doc.text('Discount:', totXLabel, totY);
    doc.text(`-${data.discount.toFixed(2)} QAR`, totXVal, totY, { align: 'right' });
    totY += 5;
  }

  if (data.deliveryFee > 0) {
    doc.text('Delivery Fee:', totXLabel, totY);
    doc.text(`${data.deliveryFee.toFixed(2)} QAR`, totXVal, totY, { align: 'right' });
    totY += 5;
  }

  if (data.taxAmount > 0) {
    doc.text(`Tax (${data.taxRate}%):`, totXLabel, totY);
    doc.text(`${data.taxAmount.toFixed(2)} QAR`, totXVal, totY, { align: 'right' });
    totY += 5;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(totXLabel - 2, totY, totXVal, totY);
  totY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Total Amount Due:', totXLabel, totY);
  doc.text(`${data.total.toFixed(2)} QAR`, totXVal, totY, { align: 'right' });
  totY += 15;

  // Terms and conditions
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Terms & Conditions:', margin, totY);
  totY += 4;
  doc.text('1. Goods once sold can be exchanged or returned within 14 days if unopened and in original packaging.', margin, totY);
  totY += 3.5;
  doc.text('2. Custom cut prescription lenses and opened contact lenses cannot be returned or refunded.', margin, totY);
  totY += 3.5;
  doc.text('3. This is an electronically generated computer invoice and does not require a physical stamp.', margin, totY);

  return doc;
}

/**
 * Triggers instant browser download of receipt PDF
 */
export function downloadReceiptPdf(data: ReceiptPayload, filename?: string): void {
  const doc = generateReceiptPdf(data);
  doc.save(filename || `Receipt_${data.invoiceNumber}.pdf`);
}

/**
 * Triggers instant browser download of A4 Invoice PDF
 */
export function downloadA4InvoicePdf(data: ReceiptPayload, filename?: string): void {
  const doc = generateA4InvoicePdf(data);
  doc.save(filename || `Invoice_${data.invoiceNumber}.pdf`);
}
