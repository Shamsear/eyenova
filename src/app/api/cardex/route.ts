import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export function normalizePower(pwr: string | null | undefined): string {
  if (!pwr) return 'Plano (0.00)';
  const s = pwr.trim();
  const upper = s.toUpperCase();
  if (
    upper === 'PLANO' ||
    upper === 'PLANO (0.00)' ||
    upper === '0.00' ||
    upper === '0' ||
    upper === '0.0'
  ) {
    return 'Plano (0.00)';
  }
  const clean = s.replace(/^[Pp][Ww][Rr]\s*/, '').replace(/^\+/, '');
  const num = parseFloat(clean);
  if (!isNaN(num)) {
    return num >= 0 ? `+${num.toFixed(2)}` : `${num.toFixed(2)}`;
  }
  return s;
}

export function powersMatch(
  p1: string | null | undefined,
  p2: string | null | undefined
): boolean {
  return normalizePower(p1).toLowerCase() === normalizePower(p2).toLowerCase();
}

function sortPowers(powers: string[]): string[] {
  return [...powers].sort((a, b) => {
    const aIsPlano = a.toLowerCase().includes('plano');
    const bIsPlano = b.toLowerCase().includes('plano');
    if (aIsPlano && !bIsPlano) return -1;
    if (!aIsPlano && bIsPlano) return 1;

    const numA = parseFloat(a.replace(/^\+/, ''));
    const numB = parseFloat(b.replace(/^\+/, ''));

    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b);
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode')?.trim();
    const productId = searchParams.get('productId')?.trim();
    const powerFilter = searchParams.get('power')?.trim() || 'ALL';
    const fromDateStr = searchParams.get('fromDate')?.trim();
    const toDateStr = searchParams.get('toDate')?.trim();

    // ──────────────────────────────────────────────
    // Mode: BRANDS LIST
    // ──────────────────────────────────────────────
    if (mode === 'brands') {
      const distinctBrands = await prisma.product.findMany({
        where: {
          isActive: true,
          brandName: { not: null },
        },
        select: { brandName: true },
        distinct: ['brandName'],
        orderBy: { brandName: 'asc' },
      });

      const brands = ['All Brands'];
      distinctBrands.forEach((b) => {
        if (b.brandName && b.brandName.trim()) {
          brands.push(b.brandName.trim());
        }
      });
      return NextResponse.json({ brands });
    }

    // ──────────────────────────────────────────────
    // Mode: PRODUCTS SEARCH
    // ──────────────────────────────────────────────
    if (mode === 'products') {
      const q = searchParams.get('q')?.trim() || '';
      const brand = searchParams.get('brand')?.trim();

      const where: any = { isActive: true };
      if (brand && brand !== 'All Brands' && brand !== 'ALL') {
        where.brandName = { equals: brand, mode: 'insensitive' };
      }
      if (q) {
        where.OR = [
          { titleEn: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
          { brandName: { contains: q, mode: 'insensitive' } },
        ];
      }

      const products = await prisma.product.findMany({
        where,
        take: 500,
        orderBy: [{ brandName: 'asc' }, { titleEn: 'asc' }],
        select: {
          id: true,
          sku: true,
          barcode: true,
          titleEn: true,
          brandName: true,
          collectionName: true,
          productType: true,
          stockQuantity: true,
          basePriceQar: true,
          costPriceQar: true,
        },
      });

      return NextResponse.json({
        products: products.map((p) => ({
          ...p,
          basePriceQar: Number(p.basePriceQar),
          costPriceQar: Number(p.costPriceQar),
        })),
      });
    }

    // ──────────────────────────────────────────────
    // Mode: POWERS FOR PRODUCT
    // ──────────────────────────────────────────────
    if (mode === 'powers') {
      if (!productId) {
        return NextResponse.json(
          { error: 'productId is required for powers mode' },
          { status: 400 }
        );
      }

      const powerSet = new Set<string>();

      // 1. Batches
      const batchPowers = await prisma.productBatch.findMany({
        where: { productId, power: { not: null } },
        select: { power: true },
        distinct: ['power'],
      });
      batchPowers.forEach((b) => {
        if (b.power) powerSet.add(normalizePower(b.power));
      });

      // 2. PO items
      const poPowers = await prisma.purchaseOrderItem.findMany({
        where: { productId, power: { not: null } },
        select: { power: true },
        distinct: ['power'],
      });
      poPowers.forEach((p) => {
        if (p.power) powerSet.add(normalizePower(p.power));
      });

      // 3. Order items
      const orderPowers = await prisma.orderItem.findMany({
        where: { productId, power: { not: null } },
        select: { power: true },
        distinct: ['power'],
      });
      orderPowers.forEach((o) => {
        if (o.power !== null) powerSet.add(normalizePower(o.power.toString()));
      });

      // 4. Product availablePowers
      const prod = await prisma.product.findUnique({
        where: { id: productId },
        select: { availablePowers: true, power: true },
      });
      if (prod?.power !== null && prod?.power !== undefined) {
        powerSet.add(normalizePower(prod.power.toString()));
      }
      if (prod?.availablePowers && Array.isArray(prod.availablePowers)) {
        prod.availablePowers.forEach((p) => {
          if (p) powerSet.add(normalizePower(p));
        });
      }

      const sorted = sortPowers(Array.from(powerSet));
      return NextResponse.json({ powers: ['All Powers', ...sorted] });
    }

    // ──────────────────────────────────────────────
    // Default: FULL CARDEX REPORT
    // ──────────────────────────────────────────────
    if (!productId) {
      return NextResponse.json(
        { error: 'productId parameter is required' },
        { status: 400 }
      );
    }

    const isPowerSpecific =
      Boolean(powerFilter) &&
      powerFilter !== 'All Powers' &&
      powerFilter !== 'ALL';
    const targetPower = isPowerSpecific ? normalizePower(powerFilter) : null;

    // 1. Fetch Product
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // 2. Fetch Active Batches
    const batches = await prisma.productBatch.findMany({
      where: { productId },
      orderBy: [{ expiryDate: 'asc' }],
    });

    let shelfCount = 0;
    const activeBatches: any[] = [];
    const now = new Date();
    const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    batches.forEach((b) => {
      const bPower = b.power || null;
      if (isPowerSpecific && !powersMatch(bPower, targetPower)) {
        return;
      }

      const qty = b.quantity || 0;
      shelfCount += qty;

      let expiryBadgeVariant: 'success' | 'warning' | 'danger' = 'success';
      let expiryBadgeText = 'HEALTHY';
      if (b.expiryDate) {
        const exp = new Date(b.expiryDate);
        if (exp < now) {
          expiryBadgeVariant = 'danger';
          expiryBadgeText = 'EXPIRED';
        } else if (exp <= ninetyDays) {
          expiryBadgeVariant = 'warning';
          expiryBadgeText = 'NEAR EXPIRY';
        }
      }

      activeBatches.push({
        batchId: b.id,
        batchNumber: b.batchNumber || 'LOT-UNASSIGNED',
        power: normalizePower(bPower),
        cylinder: b.cylinder || '',
        axis: b.axis,
        quantity: qty,
        costPriceQar: Number(b.costPriceQar),
        totalValueQar: qty * Number(b.costPriceQar),
        expiryDate: b.expiryDate ? b.expiryDate.toISOString() : null,
        status: b.status,
        expiryBadgeText,
        expiryBadgeVariant,
      });
    });

    // 3. Raw Timeline Entries Collector
    const rawEntries: any[] = [];

    // 3a. Inbound: Purchase Orders (Received Lines)
    const poItems = await prisma.purchaseOrderItem.findMany({
      where: {
        productId,
        receivedQuantity: { gt: 0 },
      },
      include: {
        PurchaseOrder: {
          include: { Supplier: true },
        },
      },
    });

    poItems.forEach((poi) => {
      if (isPowerSpecific && !powersMatch(poi.power, targetPower)) {
        return;
      }

      const po = poi.PurchaseOrder;
      const transDate = po.receivedDate || poi.createdAt;
      const recQty = poi.receivedQuantity;
      const supplierName = po.Supplier?.name || 'Supplier';

      rawEntries.push({
        timestamp: transDate,
        transactionType: 'INBOUND_PO',
        typeBadgeText: 'INBOUND PO',
        typeBadgeVariant: 'success',
        referenceNumber: po.poNumber,
        documentType: 'PURCHASE_ORDER',
        documentId: poi.id,
        partyName: supplierName,
        operator: po.createdByName || 'Admin',
        power: normalizePower(poi.power),
        cylinder: poi.cylinder || '',
        axis: poi.axis,
        quantityDelta: recQty,
        unitPriceQar: Number(poi.unitCostQar),
        batchNumber: poi.batchNumber || '',
        expiryDate: poi.expiryDate ? poi.expiryDate.toISOString() : null,
        notes: `Received against ${po.poNumber} (${recQty} boxes)`,
        status: po.receivingStatus,
      });
    });

    // 3b. Inbound: SupplierPurchase direct shipments (without linked PO)
    const spItems = await prisma.supplierPurchaseItem.findMany({
      where: { productId },
      include: { SupplierPurchase: true },
    });

    spItems.forEach((spi) => {
      if (isPowerSpecific && !powersMatch(spi.power, targetPower)) {
        return;
      }
      const sp = spi.SupplierPurchase;
      if (sp.notes && sp.notes.includes('Received against PO')) {
        return; // Avoid double count
      }

      rawEntries.push({
        timestamp: sp.receivedAt,
        transactionType: 'INBOUND_RECEIPT',
        typeBadgeText: 'DIRECT SHIPMENT',
        typeBadgeVariant: 'teal',
        referenceNumber: sp.invoiceNumber || 'VOUCHER',
        documentType: 'SUPPLIER_PURCHASE',
        documentId: spi.id,
        partyName: sp.supplierName || 'Supplier',
        operator: sp.operatorName || 'Admin',
        power: normalizePower(spi.power),
        cylinder: spi.cylinder || '',
        axis: spi.axis,
        quantityDelta: spi.quantity,
        unitPriceQar: Number(spi.unitCostQar),
        batchNumber: spi.batchNumber || '',
        expiryDate: spi.expiryDate ? spi.expiryDate.toISOString() : null,
        notes: `Ad-hoc stock-in (Inv #${sp.invoiceNumber || 'VOUCHER'})`,
        status: 'RECEIVED',
      });
    });

    // 3c. Outbound: POS & Online Sales Orders
    const orderItems = await prisma.orderItem.findMany({
      where: {
        productId,
        order: { orderStatus: { not: 'CANCELLED' } },
      },
      include: {
        order: true,
      },
    });

    // Pre-fetch batches for allocated batch mapping if any
    const batchMap = new Map<string, any>();
    batches.forEach((b) => batchMap.set(b.id, b));

    orderItems.forEach((oi) => {
      const pwr = oi.power !== null ? oi.power.toString() : null;
      if (isPowerSpecific && !powersMatch(pwr, targetPower)) {
        return;
      }

      const ord = oi.order;
      const isOnline =
        ord.orderSource?.toUpperCase() === 'SHOPIFY' ||
        ord.orderNumber.startsWith('#');
      const party = ord.customerName || 'Walk-in Guest';
      const staff = ord.salespersonName || 'Cashier';
      const linkedBatch = oi.batchId ? batchMap.get(oi.batchId) : null;

      rawEntries.push({
        timestamp: oi.createdAt,
        transactionType: isOnline ? 'ONLINE_SALE' : 'POS_SALE',
        typeBadgeText: isOnline ? 'ONLINE SALE' : 'POS SALE',
        typeBadgeVariant: isOnline ? 'purple' : 'info',
        referenceNumber: ord.orderNumber,
        documentType: 'ORDER',
        documentId: oi.id,
        partyName: party,
        operator: staff,
        power: normalizePower(pwr),
        cylinder: oi.cylinder ? oi.cylinder.toString() : '',
        axis: oi.axis,
        quantityDelta: -oi.quantity,
        unitPriceQar: Number(oi.unitPriceQar),
        batchNumber: linkedBatch?.batchNumber || 'AUTO-ALLOC',
        expiryDate: linkedBatch?.expiryDate
          ? linkedBatch.expiryDate.toISOString()
          : null,
        notes: `Sold via ${ord.orderSource || 'POS'} (${ord.orderNumber}) to ${party}`,
        status: ord.orderStatus,
      });
    });

    // 3d. Returns: Order Returns
    const returnItems = await prisma.orderReturnItem.findMany({
      where: { productId },
      include: {
        orderReturn: {
          include: {
            order: {
              include: {
                items: {
                  where: { productId },
                },
              },
            },
          },
        },
      },
    });

    returnItems.forEach((ori) => {
      const ret = ori.orderReturn;
      const firstOrderItem = ret?.order?.items?.[0];
      const pwr =
        firstOrderItem?.power !== null && firstOrderItem?.power !== undefined
          ? firstOrderItem.power.toString()
          : null;

      if (isPowerSpecific && !powersMatch(pwr, targetPower)) {
        return;
      }

      rawEntries.push({
        timestamp: ret.createdAt,
        transactionType: 'RETURN',
        typeBadgeText: 'RETURN',
        typeBadgeVariant: 'warning',
        referenceNumber: ret.returnNum,
        documentType: 'ORDER_RETURN',
        documentId: ori.id,
        partyName: 'Customer Return',
        operator: ret.processedBy || 'Staff',
        power: normalizePower(pwr),
        cylinder: firstOrderItem?.cylinder
          ? firstOrderItem.cylinder.toString()
          : '',
        axis: firstOrderItem?.axis,
        quantityDelta: ori.quantity,
        unitPriceQar: Number(ori.refundPrice),
        batchNumber: '',
        expiryDate: null,
        notes: `Restocked: ${ret.reason || 'Customer Return'} (${ret.returnNum})`,
        status: 'RESTOCKED',
      });
    });

    // 3e. Stock Adjustments
    const adjustments = await prisma.stockAdjustment.findMany({
      where: { productId },
    });

    adjustments.forEach((adj) => {
      const linkedBatch = adj.batchId ? batchMap.get(adj.batchId) : null;
      const pwr = linkedBatch?.power || null;

      if (isPowerSpecific && !powersMatch(pwr, targetPower)) {
        return;
      }

      rawEntries.push({
        timestamp: adj.createdAt,
        transactionType: 'ADJUSTMENT',
        typeBadgeText: 'CALIBRATION',
        typeBadgeVariant: 'neutral',
        referenceNumber: 'AUDIT',
        documentType: 'STOCK_ADJUSTMENT',
        documentId: adj.id,
        partyName: 'Inventory Count',
        operator: 'Auditor',
        power: normalizePower(pwr),
        cylinder: linkedBatch?.cylinder || '',
        axis: linkedBatch?.axis,
        quantityDelta: adj.deltaQty,
        unitPriceQar: 0,
        batchNumber: linkedBatch?.batchNumber || '',
        expiryDate: linkedBatch?.expiryDate
          ? linkedBatch.expiryDate.toISOString()
          : null,
        notes: `${adj.reason || 'Audit Calibration'}: ${adj.note || ''}`,
        status: 'APPLIED',
      });
    });

    // 3f. Inventory Write-offs
    const writeOffs = await prisma.inventoryWriteOff.findMany({
      where: { productId },
    });

    writeOffs.forEach((wo) => {
      if (isPowerSpecific && !powersMatch(wo.power, targetPower)) {
        return;
      }

      rawEntries.push({
        timestamp: wo.date || wo.createdAt,
        transactionType: 'WRITEOFF',
        typeBadgeText: 'WRITE-OFF',
        typeBadgeVariant: 'danger',
        referenceNumber: 'WRITE-OFF',
        documentType: 'INVENTORY_WRITEOFF',
        documentId: wo.id,
        partyName: 'Inventory Loss',
        operator: wo.writtenOffBy || 'Staff',
        power: normalizePower(wo.power),
        cylinder: wo.cylinder || '',
        axis: wo.axis,
        quantityDelta: -wo.quantity,
        unitPriceQar: Number(wo.unitCostQar),
        batchNumber: '',
        expiryDate: null,
        notes: `Written-off: ${wo.reason} - ${wo.notes || ''}`,
        status: 'WRITTEN_OFF',
      });
    });

    // 4. Chronological Sorting & Balance Equation Calculation
    rawEntries.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let runningBal = 0;
    let totRec = 0;
    let totSold = 0;
    let totRet = 0;
    let totAdj = 0;
    let totWo = 0;

    rawEntries.forEach((entry) => {
      const delta = entry.quantityDelta;
      if (delta > 0) {
        if (entry.transactionType === 'RETURN') {
          totRet += delta;
        } else if (entry.transactionType === 'ADJUSTMENT') {
          totAdj += delta;
        } else {
          totRec += delta;
        }
      } else if (delta < 0) {
        if (entry.transactionType === 'WRITEOFF') {
          totWo += Math.abs(delta);
        } else if (entry.transactionType === 'ADJUSTMENT') {
          totAdj += delta;
        } else {
          totSold += Math.abs(delta);
        }
      }

      runningBal += delta;
      entry.runningBalance = runningBal;
    });

    const calculatedBalance =
      totRec - totSold + totRet + totAdj - totWo;
    const physicalShelfStock = shelfCount;
    const discrepancyDelta = physicalShelfStock - calculatedBalance;
    const isBalanced = discrepancyDelta === 0;

    // Apply Date Range Filter if provided
    let filteredEntries = rawEntries;
    if (fromDateStr) {
      const fromDate = new Date(fromDateStr);
      fromDate.setHours(0, 0, 0, 0);
      filteredEntries = filteredEntries.filter(
        (e) => new Date(e.timestamp) >= fromDate
      );
    }
    if (toDateStr) {
      const toDate = new Date(toDateStr);
      toDate.setHours(23, 59, 59, 999);
      filteredEntries = filteredEntries.filter(
        (e) => new Date(e.timestamp) <= toDate
      );
    }

    // Newest first for display
    const finalEntries = [...filteredEntries].reverse();

    const summary = {
      productId: product.id,
      sku: product.sku || '',
      barcode: product.barcode || '',
      titleEn: product.titleEn,
      titleAr: product.titleAr || '',
      brandName: product.brandName || '',
      collectionName: product.collectionName || '',
      productType: product.productType || '',
      catalogStockQuantity: product.stockQuantity,
      basePriceQar: Number(product.basePriceQar),
      costPriceQar: Number(product.costPriceQar),
      selectedPowerFilter: isPowerSpecific ? targetPower! : 'All Powers',
      totalReceivedUnits: totRec,
      totalSoldUnits: totSold,
      totalReturnedUnits: totRet,
      totalAdjustedUnits: totAdj,
      totalWrittenOffUnits: totWo,
      calculatedBalance,
      physicalShelfStock,
      discrepancyDelta,
      isBalanced,
    };

    return NextResponse.json({
      summary,
      activeBatches,
      entries: finalEntries,
    });
  } catch (error: any) {
    console.error('Cardex API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate cardex' },
      { status: 500 }
    );
  }
}
