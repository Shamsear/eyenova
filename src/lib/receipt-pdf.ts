import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReceiptPayload } from './types';
import { LOGO_BASE64 } from './logo-base64';
import { getInvoiceStatusDisplay } from './utils';

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

function loadLogoImage(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      return resolve(null);
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = LOGO_BASE64;
    if (img.complete) resolve(img);
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─────────────────────────────────────────────
// Canvas-based Bilingual 80mm Receipt Generator
// ─────────────────────────────────────────────
async function renderReceiptToCanvas(data: ReceiptPayload): Promise<HTMLCanvasElement | null> {
  if (typeof document === 'undefined') return null;

  const logoImg = await loadLogoImage();

  const canvas = document.createElement('canvas');
  const W = 580; // High-res width for 80mm roll (~7.25 px/mm)
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Estimate total height needed
  const itemCount = Math.max(1, data.items.length);
  const estH =
    360 + // Header & logo & title
    120 + // Metadata
    itemCount * 70 + // Items
    110 + // Totals
    60 + // Payment
    130 + // Footer
    50; // Safety margin

  canvas.width = W;
  canvas.height = Math.max(850, estH);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, canvas.height);

  const L = 24;
  const R = W - 24; // 556
  const MID = W / 2;
  let y = 20;

  // Draw Logo if loaded
  if (logoImg) {
    const logoW = 140;
    const logoH = 88;
    ctx.drawImage(logoImg, MID - logoW / 2, y, logoW, logoH);
    y += logoH + 12;
  }

  ctx.fillStyle = '#111827';
  ctx.textBaseline = 'top';

  // 1. Store Header (Bilingual)
  ctx.textAlign = 'center';
  ctx.font = 'bold 24px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(data.storeNameAr || 'آي نوفا للتجارة البصرية', MID, y);
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
    ctx.fillText(`Tel: ${data.phone}`, MID, y);
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

  // 7. NET TOTAL
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
// Canvas-based Bilingual Luxury A4 Invoice Generator
// ─────────────────────────────────────────────
async function renderA4ToCanvas(data: ReceiptPayload): Promise<HTMLCanvasElement | null> {
  if (typeof document === 'undefined') return null;

  const logoImg = await loadLogoImage();

  const canvas = document.createElement('canvas');
  // High-resolution A4 at ~150 DPI
  const W = 1240;
  const H = 1754;
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const L = 60;
  const R = W - 60; // 1180
  let y = 50;

  // 1. Header Section
  // Left: Brand Logo + Company Info
  if (logoImg) {
    const logoW = 135;
    const logoH = 85;
    ctx.drawImage(logoImg, L, y, logoW, logoH);
  }

  const headerTextX = L + 155;
  let textY = y + 4;

  ctx.fillStyle = '#0f172a';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = 'bold 23px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(data.storeNameEn || 'EyeNova Optical - 02 Mall, Al Kheesa', headerTextX, textY);
  textY += 28;

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 20px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(data.storeNameAr || 'آي نوفا للتجارة البصرية', headerTextX, textY);
  textY += 26;

  ctx.fillStyle = '#64748b';
  ctx.font = '14.5px "Segoe UI", Tahoma, Arial, sans-serif';
  const addr = [data.addressEn || '02 Mall, 79 Street 773, Al Kheesa', data.addressAr].filter(Boolean).join(' · ');
  ctx.fillText(addr, headerTextX, textY);
  textY += 21;

  const metaParts: string[] = [];
  if (data.phone) metaParts.push(`Tel: ${data.phone}`);
  if (data.website) metaParts.push(data.website);
  if (data.crNumber) metaParts.push(`CR / س.ت: ${data.crNumber}`);
  if (data.vatNumber) metaParts.push(`VAT: ${data.vatNumber}`);
  ctx.fillText(metaParts.join('  ·  '), headerTextX, textY);

  // Right: Tax Invoice Badge + Meta
  const badgeW = 240;
  const badgeH = 34;
  const badgeX = R - badgeW;
  const badgeY = y + 2;

  ctx.fillStyle = '#0f172a';
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 17);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('TAX INVOICE  ·  فاتورة ضريبية', badgeX + badgeW / 2, badgeY + 9);

  let metaY = badgeY + badgeH + 12;
  const metaItems: [string, string][] = [
    ['Invoice # / رقم الفاتورة:', data.invoiceNumber],
    ['Date / التاريخ:', `${data.date}  ${data.time}`],
  ];

  ctx.font = '14px "Segoe UI", Tahoma, Arial, sans-serif';
  for (const [lbl, val] of metaItems) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.fillText(lbl, R - 130, metaY);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(val, R, metaY);
    ctx.font = '14px "Segoe UI", Tahoma, Arial, sans-serif';
    metaY += 22;
  }

  // Status Badge
  const statusInfo = getInvoiceStatusDisplay(data.status);
  const stUpper = (data.status || 'PAID').toUpperCase();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Status / الحالة:', R - 130, metaY);

  const statusBadgeW = 160;
  const statusBadgeH = 24;
  const statusBadgeX = R - statusBadgeW;
  const statusBadgeY = metaY - 3;

  let badgeBg = '#ecfdf5';
  let badgeBorder = '#a7f3d0';
  let badgeText = '#047857';
  if (stUpper === 'PARTIALLY_REFUNDED') {
    badgeBg = '#fffbeb';
    badgeBorder = '#fde68a';
    badgeText = '#b45309';
  } else if (stUpper === 'REFUNDED') {
    badgeBg = '#fff7ed';
    badgeBorder = '#fed7aa';
    badgeText = '#c2410c';
  } else if (stUpper === 'CANCELLED' || stUpper === 'VOID') {
    badgeBg = '#fef2f2';
    badgeBorder = '#fecaca';
    badgeText = '#b91c1c';
  }

  ctx.fillStyle = badgeBg;
  roundRect(ctx, statusBadgeX, statusBadgeY, statusBadgeW, statusBadgeH, 12);
  ctx.fill();
  ctx.strokeStyle = badgeBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = badgeText;
  ctx.font = 'bold 11px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(statusInfo.fullBadgeText, statusBadgeX + statusBadgeW / 2, statusBadgeY + 5);

  y = Math.max(textY + 22, metaY + 36);

  // Divider Line
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(L, y);
  ctx.lineTo(R, y);
  ctx.stroke();
  y += 18;

  // 2. Customer & Order Cards
  const cardW = (R - L - 24) / 2; // ~548
  const cardH = 152;
  const card1X = L;
  const card2X = L + cardW + 24;

  // Card 1: Billed To
  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, card1X, y, cardW, cardH, 8);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('BILLED TO / بيانات العميل', card1X + 16, y + 14);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(card1X + 16, y + 36);
  ctx.lineTo(card1X + cardW - 16, y + 36);
  ctx.stroke();

  let c1RowY = y + 46;
  const c1Rows: [string, string][] = [
    ['Name / الاسم:', data.customerName || 'Walk-in Customer'],
    ['Phone / الهاتف:', data.customerPhone || '—'],
    ['Email / البريد:', data.customerEmail || '—'],
    ['Location / الموقع:', 'Doha, Qatar / الدوحة، قطر'],
  ];
  for (const [cLbl, cVal] of c1Rows) {
    ctx.fillStyle = '#64748b';
    ctx.font = '13.5px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(cLbl, card1X + 16, c1RowY);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 13.5px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(cVal, card1X + cardW - 16, c1RowY);
    c1RowY += 24;
  }

  // Card 2: Order Details
  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, card2X, y, cardW, cardH, 8);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('ORDER DETAILS / تفاصيل الطلب', card2X + 16, y + 14);

  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(card2X + 16, y + 36);
  ctx.lineTo(card2X + cardW - 16, y + 36);
  ctx.stroke();

  let c2RowY = y + 46;
  const c2Rows: [string, string][] = [
    ['Order Ref / رقم الطلب:', data.orderNumber],
    ['Payment / طريقة الدفع:', formatPaymentMethod(data.paymentMethod)],
    ['Staff / البائع:', data.cashierName || 'Cashier'],
    ['Ref / المرجع:', data.paymentReference || '—'],
  ];
  for (const [cLbl, cVal] of c2Rows) {
    ctx.fillStyle = '#64748b';
    ctx.font = '13.5px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(cLbl, card2X + 16, c2RowY);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 13.5px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(cVal, card2X + cardW - 16, c2RowY);
    c2RowY += 24;
  }

  y += cardH + 26;

  // 3. Items Table
  // Header
  const thH = 38;
  ctx.fillStyle = '#0f172a';
  roundRect(ctx, L, y, R - L, thH, 6);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px "Segoe UI", Tahoma, Arial, sans-serif';

  // Columns: # (50), Item Specs (570), Qty (110), Rate (190), Total (200)
  const colNumX = L + 25;
  const colItemX = L + 60;
  const colQtyX = L + 650;
  const colRateX = L + 850;
  const colTotalX = R - 16;

  ctx.textAlign = 'center';
  ctx.fillText('#', colNumX, y + 11);

  ctx.textAlign = 'left';
  ctx.fillText('الصنف والمواصفات / Item & Prescription Specs', colItemX, y + 11);

  ctx.textAlign = 'center';
  ctx.fillText('الكمية / Qty', colQtyX, y + 11);

  ctx.textAlign = 'right';
  ctx.fillText('سعر الوحدة / Rate', colRateX, y + 11);

  ctx.textAlign = 'right';
  ctx.fillText('المجموع / Total', colTotalX, y + 11);

  y += thH + 8;

  // Rows
  data.items.forEach((it, idx) => {
    const rowStartY = y;
    let textInnerY = y + 6;

    // Index
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText((idx + 1).toString(), colNumX, textInnerY);

    // Item Titles
    ctx.textAlign = 'left';
    if (it.nameAr) {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px "Segoe UI", Tahoma, Arial, sans-serif';
      ctx.fillText(it.nameAr, colItemX, textInnerY);
      textInnerY += 22;
    }

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14.5px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(it.name, colItemX, textInnerY);
    textInnerY += 20;

    if (it.specs) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px "Segoe UI", Tahoma, Arial, sans-serif';
      ctx.fillText(it.specs, colItemX, textInnerY);
      textInnerY += 18;
    }

    // Qty
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14.5px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(it.quantity.toString(), colQtyX, rowStartY + 10);

    // Rate
    ctx.textAlign = 'right';
    ctx.fillStyle = '#334155';
    ctx.font = '14.5px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(`${it.unitPrice.toFixed(2)} QAR`, colRateX, rowStartY + 10);

    // Total
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(`${it.total.toFixed(2)} QAR`, colTotalX, rowStartY + 10);

    y = Math.max(textInnerY + 8, rowStartY + 48);

    // Row divider
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L, y);
    ctx.lineTo(R, y);
    ctx.stroke();
    y += 8;
  });

  y += 12;

  // 4. Financial Summary & Totals
  const totBoxW = 380;
  const totBoxX = R - totBoxW;
  const totBoxH = 175;

  // Left side: Notes & Payment Status
  const leftNotesW = totBoxX - L - 32;
  let leftY = y;

  if (data.notes) {
    ctx.fillStyle = '#f8fafc';
    roundRect(ctx, L, leftY, leftNotesW, 64, 6);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 12.5px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText('Notes / ملاحظات الطلب:', L + 14, leftY + 12);
    ctx.fillStyle = '#1e293b';
    ctx.font = '13.5px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(data.notes, L + 14, leftY + 34);
    leftY += 76;
  }

  // Payment Badge Box
  let payBoxBg = '#ecfdf5';
  let payBoxBorder = '#a7f3d0';
  let payBoxText = '#047857';
  if (stUpper === 'PARTIALLY_REFUNDED') {
    payBoxBg = '#fffbeb';
    payBoxBorder = '#fde68a';
    payBoxText = '#b45309';
  } else if (stUpper === 'REFUNDED') {
    payBoxBg = '#fff7ed';
    payBoxBorder = '#fed7aa';
    payBoxText = '#c2410c';
  } else if (stUpper === 'CANCELLED' || stUpper === 'VOID') {
    payBoxBg = '#fef2f2';
    payBoxBorder = '#fecaca';
    payBoxText = '#b91c1c';
  }

  ctx.fillStyle = payBoxBg;
  roundRect(ctx, L, leftY, leftNotesW, 44, 6);
  ctx.fill();
  ctx.strokeStyle = payBoxBorder;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = payBoxText;
  ctx.font = '13px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('Payment Status / حالة السداد:', L + 14, leftY + 14);

  ctx.textAlign = 'right';
  ctx.font = 'bold 12.5px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(statusInfo.paymentStatusText, L + leftNotesW - 14, leftY + 14);

  // Right side: Totals Box
  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, totBoxX, y, totBoxW, totBoxH, 8);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  let totRowY = y + 16;
  const totItems: [string, string, boolean, boolean][] = [
    ['Subtotal / المجموع الفرعي:', `${data.subtotal.toFixed(2)} QAR`, false, false],
  ];
  if (data.discount > 0) {
    totItems.push(['Discount / الخصم:', `-${data.discount.toFixed(2)} QAR`, true, false]);
  }
  if (data.deliveryFee > 0) {
    totItems.push(['Delivery / رسوم التوصيل:', `+${data.deliveryFee.toFixed(2)} QAR`, false, false]);
  }
  if (data.taxAmount > 0) {
    totItems.push(['VAT / ضريبة القيمة المضافة:', `+${data.taxAmount.toFixed(2)} QAR`, false, false]);
  }

  for (const [tLbl, tVal, isGreen] of totItems) {
    ctx.textAlign = 'left';
    ctx.fillStyle = isGreen ? '#047857' : '#475569';
    ctx.font = '14px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(tLbl, totBoxX + 16, totRowY);

    ctx.textAlign = 'right';
    ctx.fillStyle = isGreen ? '#047857' : '#1e293b';
    ctx.font = 'bold 14px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(tVal, R - 16, totRowY);
    totRowY += 26;
  }

  // Divider inside Totals
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(totBoxX + 16, totRowY + 4);
  ctx.lineTo(R - 16, totRowY + 4);
  ctx.stroke();

  totRowY += 16;

  // NET TOTAL DUE
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('TOTAL DUE / الإجمالي:', totBoxX + 16, totRowY + 4);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(`${data.total.toFixed(2)} QAR`, R - 16, totRowY + 2);

  // 5. Terms & Signatory Section
  y = Math.max(y + totBoxH + 40, 1470);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(L, y);
  ctx.lineTo(R, y);
  ctx.stroke();
  y += 18;

  // Terms on left
  const termsW = 740;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 13.5px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('Terms & Conditions / الشروط والأحكام:', L, y);
  y += 22;

  const termsLines = [
    '1. البضاعة المباعة ترد وتستبدل خلال 14 يوماً من تاريخ الشراء بالفاتورة وبحالتها الأصلية.',
    '2. Goods may be exchanged or returned within 14 days in original condition with this receipt.',
    '3. العدسات الطبية المفصلة والخاصة لا ترد ولا تستبدل بعد قصها وتركيبها.',
    '4. Custom-cut prescription lenses cannot be refunded once processed.',
  ];

  ctx.fillStyle = '#64748b';
  ctx.font = '12px "Segoe UI", Tahoma, Arial, sans-serif';
  for (const line of termsLines) {
    ctx.fillText(line, L, y);
    y += 19;
  }

  // Signatory on right
  const sigX = R - 190;
  const sigY = y - 35;
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(sigX, sigY);
  ctx.lineTo(R, sigY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('Authorized Signatory', sigX + 95, sigY + 8);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('التوقيع والختم المعتمد', sigX + 95, sigY + 24);

  // 6. Page Footer
  const footerY = H - 36;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(L, footerY - 10);
  ctx.lineTo(R, footerY - 10);
  ctx.stroke();

  ctx.font = '12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillStyle = '#94a3b8';

  ctx.textAlign = 'left';
  ctx.fillText(data.storeNameEn || 'EyeNova Optical - 02 Mall, Al Kheesa', L, footerY);

  ctx.textAlign = 'center';
  ctx.fillText('Page 1 of 1', W / 2, footerY);

  ctx.textAlign = 'right';
  ctx.fillText(`Invoice ${data.invoiceNumber}`, R, footerY);

  return canvas;
}

// ─────────────────────────────────────────────
// Direct Vector 80mm jsPDF Generator (Fallback)
// ─────────────────────────────────────────────
export function generateReceiptPdf(data: ReceiptPayload): jsPDF {
  const PAGE_W = 80;
  const MARGIN = 4;
  const RIGHT = PAGE_W - MARGIN; // 76

  const baseH = 160;
  const itemH = Math.max(1, data.items.length) * 13;
  const totalH = Math.max(190, baseH + itemH);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_W, totalH],
  });

  let y = 6;

  // Add Logo if available
  try {
    doc.addImage(LOGO_BASE64, 'PNG', PAGE_W / 2 - 12, y, 24, 15);
    y += 17;
  } catch {
    y += 2;
  }

  // Store Name
  doc.setFont('helvetica', 'bold');
  const storeName = data.storeNameEn || 'EYENOVA OPTICAL';
  doc.setFontSize(storeName.length > 25 ? 10 : 11.5);
  doc.setTextColor(0, 0, 0);
  doc.text(storeName, PAGE_W / 2, y, { align: 'center' });
  y += 4.5;

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

  // NET TOTAL
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
// Direct Vector A4 Formal Invoice (Fallback)
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

  let y = 16;

  // Logo top left
  try {
    doc.addImage(LOGO_BASE64, 'PNG', MARGIN, y - 2, 26, 16.3);
  } catch {
    // fallback if base64 issues
  }

  const headerLeftX = MARGIN + 29;

  // Header: store name left, TAX INVOICE pill right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(data.storeNameEn || 'EYENOVA OPTICAL', headerLeftX, y + 4);

  const badgeW = 44;
  const badgeH = 7.5;
  const badgeX = RIGHT - badgeW;
  const badgeY = y - 1;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, 'F');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TAX INVOICE', badgeX + badgeW / 2, badgeY + 5.2, {
    align: 'center',
  });

  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const addressLine = [
    data.addressEn || '02 Mall, 79 Street 773, Al Kheesa',
    data.phone ? `Tel: ${data.phone}` : '',
  ]
    .filter(Boolean)
    .join('  ·  ');
  doc.text(addressLine, headerLeftX, y);
  y += 4.5;

  const regLine = [
    data.crNumber ? `CR: ${data.crNumber}` : '',
    data.vatNumber ? `VAT: ${data.vatNumber}` : '',
  ]
    .filter(Boolean)
    .join('  ·  ');
  if (regLine) {
    doc.text(regLine, headerLeftX, y);
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

  if (data.status) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Status:', RIGHT - 42, metaY + 9);
    doc.setFont('helvetica', 'bold');
    const isRefunded = data.status.toUpperCase().includes('REFUND');
    const isCancelled = data.status.toUpperCase().includes('CANCEL') || data.status.toUpperCase().includes('VOID');
    if (isRefunded) {
      doc.setTextColor(180, 83, 9);
    } else if (isCancelled) {
      doc.setTextColor(185, 28, 28);
    } else {
      doc.setTextColor(4, 120, 87);
    }
    doc.text(data.status.replace(/_/g, ' '), RIGHT, metaY + 9, {
      align: 'right',
    });
    y += 4.5;
  }

  y += 10;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, RIGHT, y);
  y += 7;

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
export async function downloadReceiptPdf(
  data: ReceiptPayload,
  filename?: string,
): Promise<void> {
  // If in browser, render to high-DPI canvas to guarantee 100% Arabic font support, logo and zero overlap
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const canvas = await renderReceiptToCanvas(data);
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

/** Triggers browser download of the A4 formal invoice PDF with full Arabic support and brand logo. */
export async function downloadA4InvoicePdf(
  data: ReceiptPayload,
  filename?: string,
): Promise<void> {
  // If in browser, render to high-DPI canvas to guarantee 100% Arabic shaping, executive luxury styling and brand logo
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const canvas = await renderA4ToCanvas(data);
      if (canvas) {
        const imgData = canvas.toDataURL('image/png');
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });
        doc.addImage(imgData, 'PNG', 0, 0, 210, 297);
        doc.save(filename || `Invoice_${data.invoiceNumber}.pdf`);
        return;
      }
    } catch (err) {
      console.warn('Canvas A4 generation failed, falling back to direct vector:', err);
    }
  }

  // Fallback direct vector
  const doc = generateA4InvoicePdf(data);
  doc.save(filename || `Invoice_${data.invoiceNumber}.pdf`);
}
