import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReceiptPayload } from './types';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function qar(amount: number): string {
  return `${amount.toFixed(2)} QAR`;
}

function drawDashedLine(
  doc: jsPDF,
  x1: number,
  y: number,
  x2: number,
  lw = 0.25,
): void {
  doc.setLineWidth(lw);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(x1, y, x2, y);
  doc.setLineDashPattern([], 0);
}

function drawSolidLine(
  doc: jsPDF,
  x1: number,
  y: number,
  x2: number,
  lw = 0.4,
): void {
  doc.setLineWidth(lw);
  doc.setLineDashPattern([], 0);
  doc.line(x1, y, x2, y);
}

// ─────────────────────────────────────────────
// 80 mm Thermal Receipt
// ─────────────────────────────────────────────

/**
 * Generates an 80 mm thermal receipt PDF.
 * Column layout (from left, all in mm):
 *   ITEM  [4 – 42]   QTY centre 47   PRICE right 61   TOTAL right 76
 * Totals block:
 *   label right-aligned at 61   value right-aligned at 76
 */
export function generateReceiptPdf(data: ReceiptPayload): jsPDF {
  const PAGE_W = 80;
  const MARGIN = 4;

  // Dynamic height based on item count
  const baseH = 148;
  const itemH = Math.max(1, data.items.length) * 14;
  const totalH = Math.max(180, baseH + itemH);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_W, totalH],
  });

  let y = 8;
  const RIGHT = PAGE_W - MARGIN; // 76

  // ── Store Name (EN only – built-in fonts cannot render Arabic) ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text(data.storeNameEn || 'EYENOVA OPTICAL', PAGE_W / 2, y, {
    align: 'center',
  });
  y += 5.5;

  // Sub-header: address, phone, CR/VAT
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);

  if (data.addressEn) {
    doc.text(data.addressEn, PAGE_W / 2, y, { align: 'center' });
    y += 3.5;
  }
  if (data.phone) {
    doc.text(`Tel: ${data.phone}`, PAGE_W / 2, y, { align: 'center' });
    y += 3.5;
  }
  const regParts: string[] = [];
  if (data.crNumber) regParts.push(`CR: ${data.crNumber}`);
  if (data.vatNumber) regParts.push(`VAT: ${data.vatNumber}`);
  if (regParts.length) {
    doc.text(regParts.join('  |  '), PAGE_W / 2, y, { align: 'center' });
    y += 4;
  }

  // ── Section divider ──
  drawDashedLine(doc, MARGIN, y, RIGHT);
  y += 4;

  // ── Title ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('TAX INVOICE / SIMPLIFIED RECEIPT', PAGE_W / 2, y, {
    align: 'center',
  });
  y += 5;

  // ── Meta rows ──
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);

  doc.text(`Invoice: ${data.invoiceNumber}`, MARGIN, y);
  doc.text(`Date: ${data.date}`, RIGHT, y, { align: 'right' });
  y += 3.8;

  doc.text(`Order: ${data.orderNumber}`, MARGIN, y);
  doc.text(`Time: ${data.time}`, RIGHT, y, { align: 'right' });
  y += 3.8;

  doc.text(`Cashier: ${data.cashierName || 'Cashier'}`, MARGIN, y);
  y += 3.8;

  const isWalkIn =
    !data.customerName ||
    data.customerName.toLowerCase().includes('walk') ||
    data.customerName.toLowerCase().includes('counter');

  if (!isWalkIn) {
    doc.text(`Customer: ${data.customerName}`, MARGIN, y);
    if (data.customerPhone) {
      doc.text(data.customerPhone, RIGHT, y, { align: 'right' });
    }
    y += 3.8;
  }

  // ── Items table header ──
  drawDashedLine(doc, MARGIN, y, RIGHT);
  y += 3.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ITEM', MARGIN, y);
  doc.text('QTY', 47, y, { align: 'center' });
  doc.text('PRICE', 61, y, { align: 'right' });
  doc.text('TOTAL', RIGHT, y, { align: 'right' });
  y += 2.5;

  drawSolidLine(doc, MARGIN, y, RIGHT, 0.2);
  y += 3.5;

  // ── Items ──
  for (const item of data.items) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);

    const nameFirst =
      item.name.length > 28 ? item.name.substring(0, 27) + '\u2026' : item.name;
    doc.text(nameFirst, MARGIN, y);

    doc.setFont('helvetica', 'normal');
    doc.text(`${item.quantity}`, 47, y, { align: 'center' });
    doc.text(`${item.unitPrice.toFixed(2)}`, 61, y, { align: 'right' });
    doc.text(`${item.total.toFixed(2)}`, RIGHT, y, { align: 'right' });
    y += 3.5;

    if (item.specs) {
      doc.setFontSize(6.5);
      doc.setTextColor(90, 90, 90);
      doc.text(item.specs, MARGIN + 1.5, y);
      doc.setTextColor(0, 0, 0);
      y += 3.2;
    }
    y += 0.8;
  }

  // ── Divider before totals ──
  drawDashedLine(doc, MARGIN, y, RIGHT);
  y += 4;

  // ── Totals: labels right-aligned at 61, values right-aligned at 76 ──
  const TOT_LABEL = 61;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);

  doc.text('Subtotal:', TOT_LABEL, y, { align: 'right' });
  doc.text(qar(data.subtotal), RIGHT, y, { align: 'right' });
  y += 3.8;

  if (data.discount > 0) {
    doc.setTextColor(30, 120, 80);
    doc.text('Discount:', TOT_LABEL, y, { align: 'right' });
    doc.text(`-${qar(data.discount)}`, RIGHT, y, { align: 'right' });
    doc.setTextColor(30, 30, 30);
    y += 3.8;
  }

  if (data.deliveryFee > 0) {
    doc.text('Delivery:', TOT_LABEL, y, { align: 'right' });
    doc.text(qar(data.deliveryFee), RIGHT, y, { align: 'right' });
    y += 3.8;
  }

  if (data.taxAmount > 0) {
    const taxLabel = data.taxRate > 0 ? `Tax (${data.taxRate}%):` : 'Tax:';
    doc.text(taxLabel, TOT_LABEL, y, { align: 'right' });
    doc.text(qar(data.taxAmount), RIGHT, y, { align: 'right' });
    y += 3.8;
  }

  // Grand total
  drawSolidLine(doc, MARGIN, y, RIGHT, 0.45);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL:', TOT_LABEL, y, { align: 'right' });
  doc.text(qar(data.total), RIGHT, y, { align: 'right' });
  y += 4.5;

  drawSolidLine(doc, MARGIN, y, RIGHT, 0.45);
  y += 3.5;

  // ── Payment info ──
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(`Paid via: ${data.paymentMethod}`, MARGIN, y);
  if (data.paymentReference) {
    doc.text(`Ref: ${data.paymentReference}`, RIGHT, y, { align: 'right' });
  }
  y += 3.8;

  if (data.cashTendered !== undefined && data.cashTendered > 0) {
    doc.text('Cash Tendered:', MARGIN, y);
    doc.text(qar(data.cashTendered), RIGHT, y, { align: 'right' });
    y += 3.5;
    doc.text('Change Due:', MARGIN, y);
    doc.text(qar(data.changeDue ?? 0), RIGHT, y, { align: 'right' });
    y += 3.8;
  }

  // ── Invoice reference line ──
  y += 2;
  drawSolidLine(doc, MARGIN, y, RIGHT, 0.2);
  y += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(data.invoiceNumber, PAGE_W / 2, y, { align: 'center' });
  y += 5;

  // ── Footer ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(80, 80, 80);
  doc.text('Thank you for choosing EyeNova Optical!', PAGE_W / 2, y, {
    align: 'center',
  });
  y += 3.5;
  doc.text(
    'Please retain this receipt for warranty and exchanges.',
    PAGE_W / 2,
    y,
    { align: 'center' },
  );
  y += 3.2;
  doc.text(
    'Exchange / Return within 14 days in original condition.',
    PAGE_W / 2,
    y,
    { align: 'center' },
  );

  return doc;
}

// ─────────────────────────────────────────────
// A4 Formal Tax Invoice
// ─────────────────────────────────────────────

/**
 * Generates a professional A4 Tax Invoice PDF.
 *
 * Fixes vs. original:
 *  - Right column starts at midpoint (109 mm) instead of hardcoded 120 mm
 *  - "Served by" moved to ORDER DETAILS column (was wrongly in BILLED TO)
 *  - Email row added to BILLED TO column
 *  - Totals block uses a shaded rounded rect for visual hierarchy
 *  - Typography harmonised throughout
 *  - Professional page footer with invoice number and page indicator
 */
export function generateA4InvoicePdf(data: ReceiptPayload): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 15;
  const RIGHT = PAGE_W - MARGIN; // 195
  const MID = 105;
  const COL_R = MID + 4; // right column x-start

  let y = 20;

  // ── Header: store name left, TAX INVOICE pill right ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(data.storeNameEn || 'EYENOVA OPTICAL', MARGIN, y);

  // Dark pill badge
  const badgeW = 38;
  const badgeH = 7;
  const badgeX = RIGHT - badgeW;
  const badgeY = y - 6;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, 'F');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('TAX INVOICE', badgeX + badgeW / 2, badgeY + 4.8, {
    align: 'center',
  });

  y += 6;

  // Company sub-info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const addressLine = [
    data.addressEn || '',
    data.phone ? `Tel: ${data.phone}` : '',
  ]
    .filter(Boolean)
    .join('  \u00b7  ');
  doc.text(addressLine, MARGIN, y);
  y += 4.5;

  const regLine = [
    data.crNumber ? `CR: ${data.crNumber}` : '',
    data.vatNumber ? `VAT: ${data.vatNumber}` : '',
  ]
    .filter(Boolean)
    .join('  \u00b7  ');
  if (regLine) {
    doc.text(regLine, MARGIN, y);
  }

  // Invoice # and Date — right-aligned at the same y as company sub-info
  const metaY = y - 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Invoice #:', RIGHT - 42, metaY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(data.invoiceNumber, RIGHT, metaY, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Date:', RIGHT - 42, metaY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`${data.date}  ${data.time}`, RIGHT, metaY + 4.5, {
    align: 'right',
  });

  y += 9;

  // ── Separator ──
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, RIGHT, y);
  y += 8;

  // ── Two-column info block ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED TO', MARGIN, y);
  doc.text('ORDER DETAILS', COL_R, y);
  y += 4.5;

  // [leftLabel, leftValue, rightLabel, rightValue]
  type InfoRow = [string, string, string, string];
  const infoRows: InfoRow[] = [
    ['Name:', data.customerName || 'Walk-in Customer', 'Reference:', data.orderNumber],
    ['Phone:', data.customerPhone || '\u2014', 'Payment:', data.paymentMethod],
    ['Email:', data.customerEmail || '\u2014', 'Served by:', data.cashierName || 'Cashier'],
  ];
  if (data.paymentReference) {
    infoRows.push(['', '', 'Ref:', data.paymentReference]);
  }

  doc.setFontSize(8.5);
  for (const [lLabel, lVal, rLabel, rVal] of infoRows) {
    if (lLabel) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(lLabel, MARGIN, y);
      doc.setFont('helvetica', 'normal');
      doc.text(lVal, MARGIN + 15, y);
    }
    if (rLabel) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(rLabel, COL_R, y);
      doc.setFont('helvetica', 'normal');
      const displayVal = rVal.length > 32 ? rVal.substring(0, 31) + '\u2026' : rVal;
      doc.text(displayVal, COL_R + 24, y);
    }
    y += 5;
  }

  y += 5;

  // ── Items table ──
  // Total column widths: 8 + 97 + 15 + 30 + 30 = 180 mm = 210 - 2*15
  const tableData = data.items.map((item, i) => [
    (i + 1).toString(),
    item.name + (item.specs ? `\n${item.specs}` : ''),
    item.quantity.toString(),
    qar(item.unitPrice),
    qar(item.total),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Item & Prescription Specs', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 97 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // ── Totals block ──
  // @ts-expect-error autoTable extends jsPDF instance at runtime
  const tableEndY: number = doc.lastAutoTable?.finalY ?? y + 40;
  let totY = tableEndY + 8;

  const BOX_X = MID + 10;
  const BOX_W = RIGHT - BOX_X;

  const lineCount =
    1 +
    (data.discount > 0 ? 1 : 0) +
    (data.deliveryFee > 0 ? 1 : 0) +
    (data.taxAmount > 0 ? 1 : 0);
  const BOX_H = lineCount * 7 + 20;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(BOX_X - 3, totY - 4, BOX_W + 3, BOX_H, 2, 2, 'FD');

  const VAL_X = RIGHT - 2;
  const LBL_X = BOX_X + 2;

  doc.setFontSize(8.5);

  const writeRow = (
    label: string,
    val: string,
    r = 51,
    g = 65,
    b = 85,
  ): void => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(r, g, b);
    doc.text(label, LBL_X, totY);
    doc.text(val, VAL_X, totY, { align: 'right' });
    totY += 7;
  };

  writeRow('Subtotal:', qar(data.subtotal));
  if (data.discount > 0) writeRow('Discount:', `-${qar(data.discount)}`, 22, 163, 74);
  if (data.deliveryFee > 0) writeRow('Delivery Fee:', qar(data.deliveryFee));
  if (data.taxAmount > 0) {
    const taxLabel = data.taxRate > 0 ? `Tax (${data.taxRate}%):` : 'Tax:';
    writeRow(taxLabel, qar(data.taxAmount));
  }

  // Divider inside box
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(BOX_X - 1, totY, RIGHT, totY);
  totY += 5;

  // Grand total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Total Due:', LBL_X, totY);
  doc.text(qar(data.total), VAL_X, totY, { align: 'right' });
  totY += 14;

  // ── Terms & Conditions ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Terms & Conditions', MARGIN, totY);
  totY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const terms = [
    '1. Goods may be exchanged or returned within 14 days if unopened and in original packaging.',
    '2. Custom-cut prescription lenses and opened contact lenses cannot be returned or refunded.',
    '3. This invoice is electronically generated and is valid without a physical stamp or signature.',
  ];
  for (const term of terms) {
    doc.text(term, MARGIN, totY);
    totY += 4;
  }

  // ── Page footer ──
  const FOOTER_Y = PAGE_H - 10;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, FOOTER_Y - 3, RIGHT, FOOTER_Y - 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(data.storeNameEn || 'EyeNova Optical', MARGIN, FOOTER_Y);
  doc.text('Page 1 of 1', PAGE_W / 2, FOOTER_Y, { align: 'center' });
  doc.text(`Invoice ${data.invoiceNumber}`, RIGHT, FOOTER_Y, {
    align: 'right',
  });

  return doc;
}

// ─────────────────────────────────────────────
// Download helpers
// ─────────────────────────────────────────────

/** Triggers browser download of the 80 mm thermal receipt PDF. */
export function downloadReceiptPdf(
  data: ReceiptPayload,
  filename?: string,
): void {
  const doc = generateReceiptPdf(data);
  doc.save(filename || `Receipt_${data.invoiceNumber}.pdf`);
}

/** Triggers browser download of the A4 formal invoice PDF. */
export function downloadA4InvoicePdf(
  data: ReceiptPayload,
  filename?: string,
): void {
  const doc = generateA4InvoicePdf(data);
  doc.save(filename || `Invoice_${data.invoiceNumber}.pdf`);
}
