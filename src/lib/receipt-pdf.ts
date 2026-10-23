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
  lw = 0.35,
): void {
  doc.setLineWidth(lw);
  doc.setLineDashPattern([], 0);
  doc.line(x1, y, x2, y);
}

function formatPaymentMethod(m: string): string {
  const up = (m || '').toUpperCase();
  if (up === 'CASH') return 'نقداً / Cash';
  if (up === 'CARD' || up === 'CREDIT_CARD' || up === 'DEBIT_CARD') return 'بطاقة / Card';
  if (up === 'SPLIT') return 'دفع مجزأ / Split';
  if (up === 'TRANSFER' || up === 'BANK_TRANSFER') return 'تحويل / Transfer';
  return m;
}

// ─────────────────────────────────────────────
// Canvas-based Bilingual 80mm Receipt Generator
// Produces 100% authentic Arabic/English bill matching EyeNovaBilling ReceiptDocument
// ─────────────────────────────────────────────
function renderReceiptToCanvas(data: ReceiptPayload): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  const W = 580; // High-res width for 80mm roll (~7.25 px/mm)
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Estimate total height needed
  const itemCount = Math.max(1, data.items.length);
  const estH =
    290 + // Header & title
    120 + // Metadata
    itemCount * 65 + // Items
    110 + // Totals
    60 + // Payment
    130 + // Footer
    50; // Safety margin

  canvas.width = W;
  canvas.height = Math.max(750, estH);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, canvas.height);

  const L = 24;
  const R = W - 24; // 556
  const MID = W / 2;
  let y = 30;

  ctx.fillStyle = '#111827';
  ctx.textBaseline = 'top';

  // 1. Store Header (Bilingual)
  ctx.textAlign = 'center';
  ctx.font = 'bold 24px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(data.storeNameAr || 'عين نوفا للبصريات', MID, y);
  y += 32;

  ctx.font = 'bold 20px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(data.storeNameEn || 'EyeNova Optical - 02 Mall, Al Kheesa', MID, y);
  y += 28;

  ctx.fillStyle = '#4b5563';
  ctx.font = '15px "Segoe UI", Tahoma, Arial, sans-serif';
  if (data.addressAr) {
    ctx.fillText(data.addressAr, MID, y);
    y += 21;
  }
  if (data.addressEn) {
    ctx.fillText(data.addressEn, MID, y);
    y += 21;
  }
  if (data.phone) {
    ctx.fillText(`Tel / هاتف: ${data.phone}`, MID, y);
    y += 21;
  }
  const regParts: string[] = [];
  if (data.crNumber) regParts.push(`CR / س.ت: ${data.crNumber}`);
  if (data.vatNumber) regParts.push(`VAT: ${data.vatNumber}`);
  if (regParts.length) {
    ctx.fillText(regParts.join('  |  '), MID, y);
    y += 23;
  }

  // Solid Divider
  ctx.fillStyle = '#111827';
  ctx.fillRect(L, y, R - L, 1.8);
  y += 10;

  // 2. Bill Title
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('فاتورة', MID, y);
  y += 26;

  ctx.font = 'bold 18px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('INVOICE', MID, y);
  y += 26;

  // Solid Divider
  ctx.fillRect(L, y, R - L, 1.8);
  y += 14;

  // 3. Metadata Rows
  ctx.font = '16px "Segoe UI", Tahoma, Arial, sans-serif';
  const metaRows: [string, string, boolean][] = [
    ['رقم الفاتورة / Inv #:', data.invoiceNumber, true],
    ['التاريخ / Date:', `${data.date} ${data.time}`, false],
  ];
  if (data.orderNumber) {
    metaRows.push(['الطلب / Order #:', data.orderNumber, false]);
  }
  metaRows.push(['الكاشير / Cashier:', data.cashierName || 'Cashier', false]);
  metaRows.push(['العميل / Customer:', data.customerName || 'Walk-in Client', true]);
  if (data.customerPhone) {
    metaRows.push(['الهاتف / Phone:', data.customerPhone, false]);
  }

  for (const [lbl, val, bold] of metaRows) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4b5563';
    ctx.font = '15px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(lbl, L, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#111827';
    ctx.font = bold
      ? 'bold 16px "Segoe UI", Tahoma, Arial, sans-serif'
      : '15px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(val, R, y);
    y += 24;
  }

  if (data.notes) {
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillStyle = '#1f2937';
    ctx.fillText(`ملاحظات: ${data.notes}`, L, y);
    y += 22;
  }

  y += 4;
  // Solid Divider
  ctx.fillRect(L, y, R - L, 1.8);
  y += 12;

  // 4. Items Table Header
  ctx.font = 'bold 16px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'left';
  ctx.fillText('الصنف / ITEM', L, y);
  ctx.textAlign = 'right';
  ctx.fillText('الإجمالي / TOTAL', R, y);
  y += 24;

  // Dashed Divider
  ctx.strokeStyle = '#6b7280';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(L, y);
  ctx.lineTo(R, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += 12;

  // 5. Line Items
  for (const it of data.items) {
    if (it.nameAr) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 16px "Segoe UI", Tahoma, Arial, sans-serif';
      ctx.fillText(it.nameAr, L, y);
      y += 22;
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 16px "Segoe UI", Tahoma, Arial, sans-serif';
    const maxTitleW = R - L - 20;
    ctx.fillText(it.name, L, y, maxTitleW);
    y += 21;

    if (it.specs) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px "Segoe UI", Tahoma, Arial, sans-serif';
      ctx.fillText(it.specs, L, y);
      y += 19;
    }

    // Qty x Price <-> Total
    ctx.fillStyle = '#374151';
    ctx.font = '15px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${it.quantity} × ${it.unitPrice.toFixed(2)} QAR`, L, y);

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 16px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${it.total.toFixed(2)} QAR`, R, y);
    y += 27;
  }

  // Solid Divider
  ctx.fillRect(L, y, R - L, 1.8);
  y += 12;

  // 6. Totals Block
  const totalItems: [string, string, boolean][] = [
    ['المجموع الفرعي / Subtotal:', `${data.subtotal.toFixed(2)} QAR`, false],
  ];
  if (data.discount > 0) {
    totalItems.push(['الخصم / Discount:', `-${data.discount.toFixed(2)} QAR`, false]);
  }
  if (data.deliveryFee > 0) {
    totalItems.push(['رسوم التوصيل / Delivery:', `+${data.deliveryFee.toFixed(2)} QAR`, false]);
  }
  if (data.taxAmount > 0) {
    totalItems.push(['ضريبة القيمة المضافة / VAT:', `+${data.taxAmount.toFixed(2)} QAR`, false]);
  }

  for (const [tLbl, tVal] of totalItems) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4b5563';
    ctx.font = '15px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(tLbl, L, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#111827';
    ctx.font = '16px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(tVal, R, y);
    y += 23;
  }

  // Double Divider
  y += 2;
  ctx.fillRect(L, y, R - L, 1.5);
  ctx.fillRect(L, y + 3.5, R - L, 1.5);
  y += 14;

  // 7. NET TOTAL (Large Bold font, Wide separation to prevent collisions)
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 20px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('الإجمالي / TOTAL:', L, y);

  ctx.font = 'bold 24px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${data.total.toFixed(2)} QAR`, R, y);
  y += 32;

  // Double Divider
  ctx.fillRect(L, y, R - L, 1.5);
  ctx.fillRect(L, y + 3.5, R - L, 1.5);
  y += 14;

  // 8. Payment
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4b5563';
  ctx.font = '15px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('طريقة الدفع / Payment:', L, y);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 15px "Segoe UI", Tahoma, Arial, sans-serif';
  const payVal =
    formatPaymentMethod(data.paymentMethod) +
    (data.paymentReference ? ` (Ref: ${data.paymentReference})` : '');
  ctx.fillText(payVal, R, y);
  y += 24;

  if (data.cashTendered !== undefined && data.cashTendered > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4b5563';
    ctx.font = '15px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText('المستلم / Cash Received:', L, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#111827';
    ctx.fillText(`${data.cashTendered.toFixed(2)} QAR`, R, y);
    y += 22;

    if (data.changeDue !== undefined) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 15px "Segoe UI", Tahoma, Arial, sans-serif';
      ctx.fillText('المتبقي / Balance Amount:', L, y);

      ctx.textAlign = 'right';
      ctx.fillText(`${data.changeDue.toFixed(2)} QAR`, R, y);
      y += 24;
    }
  }

  // Solid Divider
  ctx.fillRect(L, y, R - L, 1.8);
  y += 18;

  // 9. Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 18px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('شكراً لزيارتكم', MID, y);
  y += 25;

  ctx.fillStyle = '#374151';
  ctx.font = '15px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('Thank you for your visit!', MID, y);
  y += 23;

  ctx.fillStyle = '#4b5563';
  ctx.font = '13.5px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('البضاعة المباعة ترد وتستبدل خلال 14 يوماً بالفاتورة', MID, y);
  y += 20;

  ctx.fillStyle = '#6b7280';
  ctx.font = '12.5px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('Exchange & return within 14 days with original receipt', MID, y);
  y += 28;

  // Trim canvas height to actual content
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = W;
  finalCanvas.height = y;
  const fCtx = finalCanvas.getContext('2d');
  if (fCtx) {
    fCtx.drawImage(canvas, 0, 0);
    return finalCanvas;
  }

  return canvas;
}

// ─────────────────────────────────────────────
// Direct Vector 80mm jsPDF Generator (Fallback)
// ─────────────────────────────────────────────
export function generateReceiptPdf(data: ReceiptPayload): jsPDF {
  const PAGE_W = 80;
  const MARGIN = 4;
  const RIGHT = PAGE_W - MARGIN; // 76

  const baseH = 150;
  const itemH = Math.max(1, data.items.length) * 13;
  const totalH = Math.max(180, baseH + itemH);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_W, totalH],
  });

  let y = 8;

  // Store Name
  doc.setFont('helvetica', 'bold');
  const storeName = data.storeNameEn || 'EYENOVA OPTICAL';
  doc.setFontSize(storeName.length > 25 ? 10.5 : 12);
  doc.setTextColor(0, 0, 0);
  doc.text(storeName, PAGE_W / 2, y, { align: 'center' });
  y += 5;

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

  drawSolidLine(doc, MARGIN, y, RIGHT, 0.35);
  y += 4;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('INVOICE / TAX RECEIPT', PAGE_W / 2, y, { align: 'center' });
  y += 4.5;

  drawSolidLine(doc, MARGIN, y, RIGHT, 0.35);
  y += 4;

  // Metadata
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);

  doc.text(`Invoice: ${data.invoiceNumber}`, MARGIN, y);
  doc.text(`Date: ${data.date}`, RIGHT, y, { align: 'right' });
  y += 3.8;

  if (data.orderNumber) {
    doc.text(`Order: ${data.orderNumber}`, MARGIN, y);
    doc.text(`Time: ${data.time}`, RIGHT, y, { align: 'right' });
    y += 3.8;
  }

  doc.text(`Cashier: ${data.cashierName || 'Cashier'}`, MARGIN, y);
  y += 3.8;

  doc.text(`Customer: ${data.customerName || 'Walk-in'}`, MARGIN, y);
  if (data.customerPhone) {
    doc.text(data.customerPhone, RIGHT, y, { align: 'right' });
  }
  y += 4;

  drawSolidLine(doc, MARGIN, y, RIGHT, 0.35);
  y += 3.5;

  // Items Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ITEM', MARGIN, y);
  doc.text('QTY', 47, y, { align: 'center' });
  doc.text('PRICE', 61, y, { align: 'right' });
  doc.text('TOTAL', RIGHT, y, { align: 'right' });
  y += 2.5;

  drawDashedLine(doc, MARGIN, y, RIGHT);
  y += 3.5;

  // Items
  for (const item of data.items) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);

    const nameFirst = item.name.length > 28 ? item.name.substring(0, 27) + '…' : item.name;
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

  drawSolidLine(doc, MARGIN, y, RIGHT, 0.35);
  y += 4;

  // Totals
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);

  doc.text('Subtotal:', MARGIN, y);
  doc.text(qar(data.subtotal), RIGHT, y, { align: 'right' });
  y += 3.8;

  if (data.discount > 0) {
    doc.setTextColor(30, 120, 80);
    doc.text('Discount:', MARGIN, y);
    doc.text(`-${qar(data.discount)}`, RIGHT, y, { align: 'right' });
    doc.setTextColor(30, 30, 30);
    y += 3.8;
  }

  if (data.deliveryFee > 0) {
    doc.text('Delivery:', MARGIN, y);
    doc.text(qar(data.deliveryFee), RIGHT, y, { align: 'right' });
    y += 3.8;
  }

  if (data.taxAmount > 0) {
    doc.text('Tax / VAT:', MARGIN, y);
    doc.text(qar(data.taxAmount), RIGHT, y, { align: 'right' });
    y += 3.8;
  }

  // Double line
  drawSolidLine(doc, MARGIN, y, RIGHT, 0.35);
  drawSolidLine(doc, MARGIN, y + 0.8, RIGHT, 0.35);
  y += 4.5;

  // NET TOTAL - Explicitly positioned at left margin and right margin so they NEVER collide!
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL:', MARGIN, y);
  doc.text(qar(data.total), RIGHT, y, { align: 'right' });
  y += 4.5;

  // Double line
  drawSolidLine(doc, MARGIN, y, RIGHT, 0.35);
  drawSolidLine(doc, MARGIN, y + 0.8, RIGHT, 0.35);
  y += 4.5;

  // Payment
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Paid via: ${data.paymentMethod}`, MARGIN, y);
  if (data.paymentReference) {
    doc.text(`Ref: ${data.paymentReference}`, RIGHT, y, { align: 'right' });
  }
  y += 4;

  if (data.cashTendered !== undefined && data.cashTendered > 0) {
    doc.text('Cash Received:', MARGIN, y);
    doc.text(qar(data.cashTendered), RIGHT, y, { align: 'right' });
    y += 3.5;
    doc.text('Balance Due:', MARGIN, y);
    doc.text(qar(data.changeDue ?? 0), RIGHT, y, { align: 'right' });
    y += 4;
  }

  drawSolidLine(doc, MARGIN, y, RIGHT, 0.35);
  y += 4.5;

  // Footer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Thank you for choosing EyeNova Optical!', PAGE_W / 2, y, { align: 'center' });
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(80, 80, 80);
  doc.text('Please retain this receipt for warranty and exchanges.', PAGE_W / 2, y, { align: 'center' });
  y += 3.5;
  doc.text('Exchange / Return within 14 days in original condition.', PAGE_W / 2, y, { align: 'center' });

  return doc;
}

// ─────────────────────────────────────────────
// A4 Formal Tax Invoice
// ─────────────────────────────────────────────
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
  const COL_R = MID + 4;

  let y = 20;

  // Header: store name left, TAX INVOICE pill right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(data.storeNameEn || 'EYENOVA OPTICAL', MARGIN, y);

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

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const addressLine = [
    data.addressEn || '',
    data.phone ? `Tel: ${data.phone}` : '',
  ]
    .filter(Boolean)
    .join('  ·  ');
  doc.text(addressLine, MARGIN, y);
  y += 4.5;

  const regLine = [
    data.crNumber ? `CR: ${data.crNumber}` : '',
    data.vatNumber ? `VAT: ${data.vatNumber}` : '',
  ]
    .filter(Boolean)
    .join('  ·  ');
  if (regLine) {
    doc.text(regLine, MARGIN, y);
  }

  // Invoice # and Date
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

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, RIGHT, y);
  y += 8;

  // Two-column info block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED TO', MARGIN, y);
  doc.text('ORDER DETAILS', COL_R, y);
  y += 4.5;

  type InfoRow = [string, string, string, string];
  const infoRows: InfoRow[] = [
    ['Name:', data.customerName || 'Walk-in Customer', 'Reference:', data.orderNumber],
    ['Phone:', data.customerPhone || '—', 'Payment:', data.paymentMethod],
    ['Email:', data.customerEmail || '—', 'Served by:', data.cashierName || 'Cashier'],
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
      const displayVal = rVal.length > 32 ? rVal.substring(0, 31) + '…' : rVal;
      doc.text(displayVal, COL_R + 24, y);
    }
    y += 5;
  }

  y += 5;

  // Items table
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
      cellPadding: 3,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 97 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    theme: 'grid',
    styles: { lineColor: [226, 232, 240], lineWidth: 0.3 },
  });

  const lastTable = (doc as any).lastAutoTable;
  let totY = (lastTable ? lastTable.finalY : y + 30) + 6;

  // Totals block
  const TOT_BOX_W = 75;
  const TOT_BOX_X = RIGHT - TOT_BOX_W;
  const totRows: [string, string, boolean][] = [
    ['Subtotal', qar(data.subtotal), false],
  ];
  if (data.discount > 0) totRows.push(['Discount', `-${qar(data.discount)}`, false]);
  if (data.deliveryFee > 0) totRows.push(['Delivery Fee', qar(data.deliveryFee), false]);
  if (data.taxAmount > 0) {
    const taxLabel = data.taxRate > 0 ? `VAT (${data.taxRate}%)` : 'VAT';
    totRows.push([taxLabel, qar(data.taxAmount), false]);
  }
  totRows.push(['TOTAL DUE', qar(data.total), true]);

  const boxH = totRows.length * 6 + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(TOT_BOX_X, totY, TOT_BOX_W, boxH, 1.5, 1.5, 'FD');

  let rowY = totY + 5;
  for (const [lbl, val, isGrand] of totRows) {
    if (isGrand) {
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.line(TOT_BOX_X + 3, rowY - 1.5, RIGHT - 3, rowY - 1.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
    }

    doc.text(lbl, TOT_BOX_X + 4, rowY);
    doc.text(val, RIGHT - 4, rowY, { align: 'right' });
    rowY += 6;
  }

  totY = Math.max(totY + boxH + 10, 240);

  // Terms & Conditions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
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

  // Page footer
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

/** Triggers browser download of the 80 mm thermal receipt PDF with full Arabic support. */
export function downloadReceiptPdf(
  data: ReceiptPayload,
  filename?: string,
): void {
  // If in browser, render to high-DPI canvas to guarantee 100% Arabic font support and zero overlap
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const canvas = renderReceiptToCanvas(data);
      if (canvas) {
        const imgData = canvas.toDataURL('image/png');
        const pdfW = 80;
        // 7.25 px per mm scale
        const pdfH = Math.max(120, canvas.height / 7.25);
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [pdfW, pdfH],
        });
        doc.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
        doc.save(filename || `Receipt_${data.invoiceNumber}.pdf`);
        return;
      }
    } catch (err) {
      console.warn('Canvas receipt generation failed, falling back to direct vector:', err);
    }
  }

  // Fallback direct vector
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
