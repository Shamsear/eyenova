import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { LOGO_BASE64 } from './logo-base64';
import { formatQatarDateTime, formatQatarDate } from './utils';

export interface CardexSummary {
  productId: string;
  sku: string;
  barcode: string;
  titleEn: string;
  titleAr?: string;
  brandName: string;
  collectionName?: string;
  productType?: string;
  catalogStockQuantity: number;
  basePriceQar: number;
  costPriceQar: number;
  selectedPowerFilter: string;
  totalReceivedUnits: number;
  totalSoldUnits: number;
  totalReturnedUnits: number;
  totalAdjustedUnits: number;
  totalWrittenOffUnits: number;
  calculatedBalance: number;
  physicalShelfStock: number;
  discrepancyDelta: number;
  isBalanced: boolean;
}

export interface CardexBatch {
  batchId: string;
  batchNumber: string;
  power: string;
  cylinder: string;
  axis: number | null;
  quantity: number;
  costPriceQar: number;
  totalValueQar: number;
  expiryDate: string | null;
  status: string;
  expiryBadgeText: string;
  expiryBadgeVariant: string;
}

export interface CardexEntry {
  timestamp: string;
  transactionType: string;
  typeBadgeText: string;
  typeBadgeVariant: string;
  referenceNumber: string;
  documentType: string;
  documentId: string;
  partyName: string;
  operator: string;
  power: string;
  cylinder: string;
  axis: number | null;
  quantityDelta: number;
  runningBalance: number;
  unitPriceQar: number;
  batchNumber: string;
  expiryDate: string | null;
  notes: string;
  status: string;
}

export function exportCardexToExcel(
  summary: CardexSummary,
  batches: CardexBatch[],
  entries: CardexEntry[]
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary & KPIs
  const summaryData = [
    ['EYENOVA OPTICAL - STOCK TRACEABILITY & AUDIT CARDEX'],
    ['Generated At (Qatar Time):', formatQatarDateTime(new Date())],
    [],
    ['PRODUCT DETAILS'],
    ['Product Title:', summary.titleEn],
    ['SKU:', summary.sku],
    ['Barcode:', summary.barcode],
    ['Brand:', summary.brandName],
    ['Collection:', summary.collectionName || '—'],
    ['Power Filter:', summary.selectedPowerFilter],
    ['Base Price (QAR):', summary.basePriceQar.toFixed(2)],
    ['Cost Price (QAR):', summary.costPriceQar.toFixed(2)],
    [],
    ['INVENTORY BALANCE AUDIT EQUATION'],
    ['(+) Total Received Units (Inbound POs & Receipts):', summary.totalReceivedUnits],
    ['(-) Total Sold Units (POS & Online Sales):', summary.totalSoldUnits],
    ['(+) Total Customer Returns:', summary.totalReturnedUnits],
    ['(±) Total Audit Calibrations / Adjustments:', summary.totalAdjustedUnits],
    ['(-) Total Written-off / Damaged Units:', summary.totalWrittenOffUnits],
    ['(=) Calculated Book Balance:', summary.calculatedBalance],
    ['Physical Shelf Batches Count:', summary.physicalShelfStock],
    ['Discrepancy (Shelf - Book Balance):', summary.discrepancyDelta],
    ['Audit Status:', summary.isBalanced ? '100% IN BALANCE' : summary.discrepancyDelta > 0 ? 'SURPLUS ON SHELF' : 'MISSING STOCK'],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Audit Summary');

  // Sheet 2: Movement Ledger
  const ledgerData = entries.map((e, idx) => ({
    '#': idx + 1,
    'Date & Time': formatQatarDateTime(e.timestamp),
    'Event Type': e.typeBadgeText,
    'Reference / Doc #': e.referenceNumber,
    'Party (Supplier/Customer)': e.partyName,
    'Operator': e.operator,
    'Optical Power': e.power,
    'CYL': e.cylinder || '—',
    'AX': e.axis ? `${e.axis}°` : '—',
    'Batch / Lot #': e.batchNumber || '—',
    'Expiry Date': e.expiryDate ? formatQatarDate(e.expiryDate) : '—',
    'Qty Delta': e.quantityDelta > 0 ? `+${e.quantityDelta}` : e.quantityDelta,
    'Running Balance': e.runningBalance,
    'Unit Cost / Price (QAR)': e.unitPriceQar.toFixed(2),
    'Status': e.status,
    'Audit Note': e.notes,
  }));
  const wsLedger = XLSX.utils.json_to_sheet(ledgerData);
  XLSX.utils.book_append_sheet(wb, wsLedger, 'Chronological Ledger');

  // Sheet 3: Active Batches on Shelf
  const batchData = batches.map((b, idx) => ({
    '#': idx + 1,
    'Batch / Lot #': b.batchNumber,
    'Power': b.power,
    'CYL': b.cylinder || '—',
    'AX': b.axis ? `${b.axis}°` : '—',
    'Qty on Shelf': b.quantity,
    'Unit Cost (QAR)': b.costPriceQar.toFixed(2),
    'Total Value (QAR)': b.totalValueQar.toFixed(2),
    'Expiry Date': b.expiryDate ? formatQatarDate(b.expiryDate) : 'No Expiry',
    'Health Status': b.expiryBadgeText,
  }));
  const wsBatches = XLSX.utils.json_to_sheet(batchData);
  XLSX.utils.book_append_sheet(wb, wsBatches, 'Active Batches');

  const filename = `Stock_Cardex_${summary.sku || 'Product'}_${summary.selectedPowerFilter.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportCardexToPdf(
  summary: CardexSummary,
  batches: CardexBatch[],
  entries: CardexEntry[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const MARGIN = 12;
  const PAGE_W = 210;
  const RIGHT = PAGE_W - MARGIN;
  let y = 14;

  // 1. Logo
  try {
    doc.addImage(LOGO_BASE64, 'PNG', MARGIN, y, 36, 14);
  } catch {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('EYENOVA OPTICAL', MARGIN, y + 8);
  }

  // Header Titles
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('STOCK TRACEABILITY & AUDIT CARDEX', RIGHT, y + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Doha, Qatar | Contact: +974 4444 8888 | info@eyenova.qa', RIGHT, y + 9, { align: 'right' });
  doc.text(`Generated: ${formatQatarDateTime(new Date())}`, RIGHT, y + 13, { align: 'right' });

  y += 20;

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, RIGHT, y);
  y += 5;

  // 2. Product Meta Info Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(MARGIN, y, RIGHT - MARGIN, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(summary.titleEn, MARGIN + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  doc.text(`Brand: ${summary.brandName || '—'}`, MARGIN + 4, y + 12);
  doc.text(`SKU: ${summary.sku || '—'}`, MARGIN + 50, y + 12);
  doc.text(`Barcode: ${summary.barcode || '—'}`, MARGIN + 105, y + 12);

  doc.text(`Power Filter: ${summary.selectedPowerFilter}`, MARGIN + 4, y + 18);
  doc.text(`Base Price: ${summary.basePriceQar.toFixed(2)} QAR`, MARGIN + 50, y + 18);
  doc.text(`Cost Price: ${summary.costPriceQar.toFixed(2)} QAR`, MARGIN + 105, y + 18);

  // Status Badge on Top Right of Meta Box
  const badgeX = RIGHT - 38;
  const badgeY = y + 4;
  if (summary.isBalanced) {
    doc.setFillColor(220, 252, 231); // green-100
    doc.setDrawColor(134, 239, 172);
    doc.roundedRect(badgeX, badgeY, 34, 7, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(21, 128, 61); // green-700
    doc.text('100% IN BALANCE', badgeX + 17, badgeY + 4.5, { align: 'center' });
  } else if (summary.discrepancyDelta > 0) {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(badgeX, badgeY, 34, 7, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text(`+${summary.discrepancyDelta} SURPLUS`, badgeX + 17, badgeY + 4.5, { align: 'center' });
  } else {
    doc.setFillColor(254, 226, 226); // red-100
    doc.setDrawColor(252, 165, 165);
    doc.roundedRect(badgeX, badgeY, 34, 7, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(185, 28, 28); // red-700
    doc.text(`${summary.discrepancyDelta} MISSING`, badgeX + 17, badgeY + 4.5, { align: 'center' });
  }

  y += 28;

  // 3. Balance Audit Equation Strip (5 metrics)
  const stripW = (RIGHT - MARGIN) / 5;
  const metrics = [
    { label: '(+) Inbound', value: `+${summary.totalReceivedUnits}`, color: [21, 128, 61] },
    { label: '(-) Sales', value: `-${summary.totalSoldUnits}`, color: [29, 78, 216] },
    { label: '(+) Returns', value: `+${summary.totalReturnedUnits}`, color: [194, 65, 12] },
    { label: '(±) Adjustments', value: summary.totalAdjustedUnits >= 0 ? `+${summary.totalAdjustedUnits}` : `${summary.totalAdjustedUnits}`, color: [71, 85, 105] },
    { label: '(=) Book Balance', value: `${summary.calculatedBalance}`, color: [15, 23, 42] },
  ];

  metrics.forEach((m, i) => {
    const curX = MARGIN + i * stripW;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(curX, y, stripW - 2, 12, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, curX + (stripW - 2) / 2, y + 4, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.value, curX + (stripW - 2) / 2, y + 9.5, { align: 'center' });
  });

  y += 16;

  // 4. Active Batches on Shelf Table (if any)
  if (batches.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Active Shelf Lots (${batches.length} Batches | ${summary.physicalShelfStock} Total Boxes)`, MARGIN, y);
    y += 3;

    const batchRows = batches.map((b) => [
      b.batchNumber,
      b.power,
      b.cylinder ? `${b.cylinder} / ${b.axis || 0}°` : '—',
      b.quantity.toString(),
      `${b.costPriceQar.toFixed(2)} QAR`,
      `${b.totalValueQar.toFixed(2)} QAR`,
      b.expiryDate ? formatQatarDate(b.expiryDate) : 'No Expiry',
      b.expiryBadgeText,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Lot #', 'Power', 'Cylinder/Axis', 'Qty', 'Unit Cost', 'Lot Total', 'Expiry Date', 'Status']],
      body: batchRows,
      margin: { left: MARGIN, right: MARGIN },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2,
      },
      bodyStyles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 24, halign: 'center' },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 24, halign: 'right' },
        5: { cellWidth: 24, halign: 'right' },
        6: { cellWidth: 24, halign: 'center' },
        7: { cellWidth: 24, halign: 'center' },
      },
      theme: 'grid',
      styles: { lineColor: [226, 232, 240], lineWidth: 0.2 },
    });

    const lastTable = (doc as any).lastAutoTable;
    y = (lastTable ? lastTable.finalY : y + 25) + 6;
  }

  // 5. Chronological Movement Ledger Table
  if (y > 230) {
    doc.addPage();
    y = 15;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Chronological Movements Ledger (${entries.length} Records)`, MARGIN, y);
  y += 3;

  const entryRows = entries.map((e) => [
    formatQatarDateTime(e.timestamp),
    e.typeBadgeText,
    e.referenceNumber,
    e.partyName,
    e.operator,
    e.power,
    e.quantityDelta > 0 ? `+${e.quantityDelta}` : e.quantityDelta.toString(),
    e.runningBalance.toString(),
    e.notes,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Date & Time', 'Event Type', 'Doc / Ref #', 'Party', 'Operator', 'Power', 'Delta', 'Balance', 'Audit Note']],
    body: entryRows,
    margin: { left: MARGIN, right: MARGIN },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 6.8,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 22 },
      3: { cellWidth: 28 },
      4: { cellWidth: 16 },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 12, halign: 'center' },
      7: { cellWidth: 14, halign: 'center' },
      8: { cellWidth: 'auto' },
    },
    theme: 'grid',
    styles: { lineColor: [226, 232, 240], lineWidth: 0.2 },
  });

  // Footer Signatures on last page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `EyeNova Optical W.L.L — Confidential Stock Audit Report — Page ${i} of ${totalPages}`,
      PAGE_W / 2,
      290,
      { align: 'center' }
    );
  }

  const filename = `Stock_Cardex_${summary.sku || 'Product'}_${summary.selectedPowerFilter.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}
