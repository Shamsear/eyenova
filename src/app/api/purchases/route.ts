import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatQatarDate } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';

    // 1. Inbound Shipments History (SupplierPurchase)
    const purchaseWhere: any = {};
    if (q) {
      purchaseWhere.OR = [
        { supplierName: { contains: q, mode: 'insensitive' } },
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [shipmentsRaw, ordersRaw, suppliersRaw, lowStockRaw, treasuryRaw, activeShiftRaw] = await Promise.all([
      prisma.supplierPurchase.findMany({
        where: purchaseWhere,
        include: {
          SupplierPurchaseItem: true,
        },
        orderBy: { receivedAt: 'desc' },
        take: 100,
      }),
      prisma.purchaseOrder.findMany({
        include: {
          Supplier: true,
          PurchaseOrderItem: {
            include: {
              Product: {
                select: { id: true, titleEn: true, brandName: true, sku: true },
              },
            },
          },
        },
        orderBy: { orderDate: 'desc' },
        take: 100,
      }),
      prisma.supplier.findMany({
        orderBy: { name: 'asc' },
      }),
      prisma.product.findMany({
        where: {
          isActive: true,
          stockQuantity: { lte: prisma.product.fields.minStockAlert },
        },
        include: {
          batches: {
            where: { quantity: { gt: 0 } },
            select: { id: true, batchNumber: true, power: true, cylinder: true, axis: true, quantity: true, expiryDate: true },
            orderBy: { expiryDate: 'asc' },
          },
        },
        orderBy: { stockQuantity: 'asc' },
        take: 50,
      }),
      prisma.companyTreasury.findFirst(),
      prisma.cashRegisterShift.findFirst({
        where: { status: 'OPEN' },
        orderBy: { openedAt: 'desc' },
      }),
    ]);

    // Format Inbound Shipments History
    const shipments = (shipmentsRaw as any[]).map((s: any) => ({
      id: s.id,
      supplierName: s.supplierName,
      invoiceNumber: s.invoiceNumber || 'N/A',
      receivedAt: formatQatarDate(s.receivedAt),
      receivedAtRaw: s.receivedAt.toISOString(),
      operatorName: s.operatorName,
      totalCostQar: Number(s.totalCostQar),
      itemsCount: s.itemsCount || s.SupplierPurchaseItem.reduce((acc: number, i: any) => acc + (i.quantity || 0), 0),
      notes: s.notes,
      deliveredByName: s.deliveredByName,
      supplierRepContact: s.supplierRepContact,
      items: (s.SupplierPurchaseItem as any[]).map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productTitle: item.productTitle,
        sku: item.sku,
        quantity: item.quantity,
        unitCostQar: Number(item.unitCostQar),
        totalCostQar: Number(item.unitCostQar) * item.quantity,
        batchNumber: item.batchNumber || 'STANDARD',
        expiryDate: item.expiryDate ? formatQatarDate(item.expiryDate) : null,
        power: item.power,
        cylinder: item.cylinder,
        axis: item.axis,
      })),
    }));

    // Format Purchase Orders
    const orders = (ordersRaw as any[]).map((po: any) => {
      const totalUnitsOrdered = (po.PurchaseOrderItem as any[]).reduce((sum: number, i: any) => sum + (i.orderedQuantity || 0), 0);
      const totalUnitsReceived = (po.PurchaseOrderItem as any[]).reduce((sum: number, i: any) => sum + (i.receivedQuantity || 0), 0);

      return {
        id: po.id,
        poNumber: po.poNumber,
        supplierId: po.supplierId,
        supplierName: po.Supplier?.name || 'Authorized Distributor',
        supplierContact: po.Supplier?.phone || po.Supplier?.email || null,
        orderDate: formatQatarDate(po.orderDate),
        orderDateRaw: po.orderDate.toISOString(),
        expectedDeliveryDate: po.expectedDeliveryDate ? formatQatarDate(po.expectedDeliveryDate) : null,
        expectedDeliveryDateRaw: po.expectedDeliveryDate ? po.expectedDeliveryDate.toISOString().slice(0, 10) : null,
        totalAmountQar: Number(po.totalAmountQar),
        receivingStatus: po.receivingStatus, // ORDERED | FULLY_RECEIVED | PARTIALLY_RECEIVED | CANCELLED
        paymentStatus: po.paymentStatus,
        notes: po.notes,
        createdByName: po.createdByName,
        totalUnitsOrdered,
        totalUnitsReceived,
        items: (po.PurchaseOrderItem as any[]).map((i: any) => ({
          id: i.id,
          productId: i.productId,
          productTitle: i.Product?.titleEn || 'Optical Product',
          brandName: i.Product?.brandName || '',
          sku: i.Product?.sku || '',
          orderedQuantity: i.orderedQuantity,
          receivedQuantity: i.receivedQuantity,
          unitCostQar: Number(i.unitCostQar),
          totalCostQar: Number(i.totalCostQar),
          power: i.power,
          cylinder: i.cylinder,
          axis: i.axis,
        })),
      };
    });

    // Format Suppliers List
    const suppliers = (suppliersRaw as any[]).map((sup: any) => ({
      id: sup.id,
      name: sup.name,
      contactPerson: sup.contactPerson || '',
      phone: sup.phone || '',
      email: sup.email || '',
      creditTerms: sup.creditTerms,
      advanceCreditBalanceQar: Number(sup.advanceCreditBalanceQar),
      notes: sup.notes || '',
      isMultiBrand: sup.isMultiBrand,
    }));

    // Low stock reorder list
    const lowStock = (lowStockRaw as any[]).map((p: any) => {
      const batchWithPower = p.batches?.find((b: any) => b.power && b.power !== 'Plano (0.00)') || p.batches?.[0];
      const effectivePower = p.power ? String(p.power) : (batchWithPower?.power || (p.hasPlanoOption ? 'Plano (0.00)' : (p.availablePowers?.[0] || null)));
      const effectiveCylinder = p.cylinder ? String(p.cylinder) : (batchWithPower?.cylinder || null);
      const effectiveAxis = p.axis ?? (batchWithPower?.axis ?? null);

      return {
        id: p.id,
        title: p.titleEn,
        titleEn: p.titleEn,
        titleAr: p.titleAr,
        brand: p.brandName || 'EyeNova',
        brandName: p.brandName || 'EyeNova',
        sku: p.sku,
        barcode: p.barcode,
        currentStock: p.stockQuantity ?? 0,
        stockQuantity: p.stockQuantity ?? 0,
        minStockAlert: p.minStockAlert ?? 3,
        suggestedReorder: Math.max(20, (p.minStockAlert * 2) - p.stockQuantity),
        estimatedCostQar: Number(p.costPriceQar || (Number(p.basePriceQar) * 0.5)),
        costEstimateQar: Number(p.costPriceQar || (Number(p.basePriceQar) * 0.5)),
        power: effectivePower,
        cylinder: effectiveCylinder,
        axis: effectiveAxis,
        addPower: p.addPower ?? null,
        availablePowers: Array.isArray(p.availablePowers) ? p.availablePowers : [],
        hasPlanoOption: p.hasPlanoOption ?? true,
      };
    });

    // Calculate totals
    const totalInboundVolume = shipments.reduce((sum: number, s: any) => sum + s.totalCostQar, 0);
    const totalUnitsReceived = shipments.reduce((sum: number, s: any) => sum + s.itemsCount, 0);

    return NextResponse.json({
      shipments,
      orders,
      suppliers,
      lowStock,
      kpis: {
        totalInboundVolume,
        totalUnitsReceived,
        lowStockAlertCount: lowStock.length,
        bankBalance: Number(treasuryRaw?.bankBalanceQar ?? 500),
        safeCashBalance: Number(treasuryRaw?.cashBalanceQar ?? 500),
        tillDrawerCash: activeShiftRaw
          ? Number(activeShiftRaw.openingFloat) + Number(activeShiftRaw.cashSales) - Number(activeShiftRaw.pettyCashOut)
          : 500,
      },
    });
  } catch (error: any) {
    console.error('Error fetching purchases data:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch purchases data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ----------------------------------------------------
    // ACTION 1: CREATE_PO (Draft Official Purchase Order)
    // ----------------------------------------------------
    if (action === 'CREATE_PO') {
      const {
        poNumber,
        supplierId,
        orderDate,
        expectedDeliveryDate,
        notes,
        createdByName,
        items, // array of { productId, power, cylinder, axis, quantity, unitCostQar }
      } = body;

      if (!supplierId || !items || items.length === 0) {
        return NextResponse.json({ error: 'Please select a supplier and add at least one line item.' }, { status: 400 });
      }

      // Auto-generate PO number if not provided
      let finalPoNumber = poNumber?.trim();
      if (!finalPoNumber) {
        const count = await prisma.purchaseOrder.count();
        finalPoNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      }

      const totalCost = items.reduce(
        (sum: number, it: any) => sum + Number(it.quantity || 1) * Number(it.unitCostQar || 0),
        0
      );

      const newPo = await prisma.purchaseOrder.create({
        data: {
          id: `PO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          poNumber: finalPoNumber,
          supplierId,
          orderDate: orderDate ? new Date(orderDate) : new Date(),
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          receivingStatus: 'ORDERED',
          paymentStatus: 'UNPAID',
          currency: 'QAR',
          exchangeRate: 1,
          subtotalQar: totalCost,
          totalAmountQar: totalCost,
          notes: notes || null,
          createdByName: createdByName || 'Staff Cashier',
          PurchaseOrderItem: {
            create: items.map((it: any) => ({
              id: `POI-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              productId: it.productId,
              power: it.power || null,
              cylinder: it.cylinder || null,
              axis: it.axis ? parseInt(it.axis, 10) : null,
              orderedQuantity: parseInt(it.quantity || '1', 10),
              receivedQuantity: 0,
              unitCostOriginal: Number(it.unitCostQar || 0),
              unitCostQar: Number(it.unitCostQar || 0),
              totalCostQar: Number(it.quantity || 1) * Number(it.unitCostQar || 0),
            })),
          },
        },
        include: {
          Supplier: true,
          PurchaseOrderItem: true,
        },
      });

      return NextResponse.json({ success: true, po: newPo });
    }

    // ----------------------------------------------------
    // ACTION 2: RECEIVE_PO (Receive Stock against Official PO)
    // ----------------------------------------------------
    if (action === 'RECEIVE_PO') {
      const {
        poId,
        deliveryNoteNumber,
        deliveredByName,
        supplierRepContact,
        paymentChannel,
        payFromTreasury,
        operatorName,
      } = body;

      if (!poId) {
        return NextResponse.json({ error: 'Purchase Order ID is required' }, { status: 400 });
      }

      const po = await prisma.purchaseOrder.findUnique({
        where: { id: poId },
        include: {
          Supplier: true,
          PurchaseOrderItem: {
            include: { Product: true },
          },
        },
      });

      if (!po) {
        return NextResponse.json({ error: 'Purchase Order not found.' }, { status: 404 });
      }

      // 1. Update PO status to FULLY_RECEIVED
      await prisma.purchaseOrder.update({
        where: { id: poId },
        data: {
          receivingStatus: 'FULLY_RECEIVED',
          receivedDate: new Date(),
          deliveredByName: deliveredByName || null,
          supplierRepContact: supplierRepContact || null,
          paymentChannel: paymentChannel || 'BANK',
        },
      });

      // 2. Increment stock quantities on products and mark items received
      let totalUnits = 0;
      for (const item of po.PurchaseOrderItem) {
        const qty = item.orderedQuantity;
        totalUnits += qty;

        // Increment Product Catalog stock
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { increment: qty },
          },
        });

        // Update PO item
        await prisma.purchaseOrderItem.update({
          where: { id: item.id },
          data: { receivedQuantity: qty },
        });

        // Register batch in ProductBatch table
        try {
          await prisma.productBatch.create({
            data: {
              id: `PB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              productId: item.productId,
              storeId: 'STORE-MAIN',
              batchNumber: item.batchNumber || `LOT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`,
              expiryDate: new Date(Date.now() + 365 * 2 * 24 * 3600 * 1000),
              quantity: qty,
              costPriceQar: item.unitCostQar,
              power: item.power || null,
              cylinder: item.cylinder || null,
              axis: item.axis ?? null,
            },
          });
        } catch (e) {
          console.warn('Batch registration warning:', e);
        }
      }

      // 3. Create SupplierPurchase (Inbound History Record)
      const purchaseRecord = await prisma.supplierPurchase.create({
        data: {
          id: `SP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          supplierName: po.Supplier.name,
          invoiceNumber: deliveryNoteNumber || po.poNumber,
          operatorName: operatorName || po.createdByName || 'Staff Cashier',
          totalCostQar: po.totalAmountQar,
          itemsCount: totalUnits,
          notes: `Received against PO ${po.poNumber}`,
          deliveredByName: deliveredByName || null,
          supplierRepContact: supplierRepContact || null,
          SupplierPurchaseItem: {
            create: po.PurchaseOrderItem.map((i) => ({
              id: `SPI-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              productId: i.productId,
              productTitle: i.Product?.titleEn || 'Optical Product',
              sku: i.Product?.sku || null,
              quantity: i.orderedQuantity,
              unitCostQar: i.unitCostQar,
              batchNumber: `LOT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`,
              expiryDate: new Date(Date.now() + 365 * 2 * 24 * 3600 * 1000), // 2 years default
              power: i.power,
              cylinder: i.cylinder,
              axis: i.axis,
            })),
          },
        },
      });

      // 4. Record payment if payFromTreasury is true
      if (payFromTreasury) {
        await prisma.supplierPayment.create({
          data: {
            id: `SPAY-${Date.now()}`,
            poId: po.id,
            poNumber: po.poNumber,
            supplierName: po.Supplier.name,
            amountQar: po.totalAmountQar,
            paymentChannel: paymentChannel || 'BANK',
            operatorName: operatorName || 'Cashier',
            notes: `Treasury settlement for received PO ${po.poNumber}`,
          },
        });
      }

      return NextResponse.json({ success: true, purchase: purchaseRecord });
    }

    // ----------------------------------------------------
    // ACTION 3: DIRECT_INBOUND (Stock-in without prior PO)
    // ----------------------------------------------------
    if (action === 'DIRECT_INBOUND') {
      const {
        supplierName,
        invoiceNumber,
        productId,
        quantity,
        focQuantity,
        unitCostPrice,
        batchNumber,
        expiryDate,
        power,
        cylinder,
        axis,
        operatorName,
        deliveredByName,
        supplierRepContact,
      } = body;

      if (!supplierName || !productId || !quantity || !unitCostPrice) {
        return NextResponse.json({ error: 'Supplier, Product, Quantity and Unit Cost are required.' }, { status: 400 });
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
      }

      const qty = parseInt(quantity, 10);
      const foc = focQuantity ? parseInt(focQuantity, 10) : 0;
      const totalUnits = qty + foc;
      const cost = parseFloat(unitCostPrice);
      const totalCost = cost * qty;

      // 1. Increment product stock quantity
      await prisma.product.update({
        where: { id: productId },
        data: {
          stockQuantity: { increment: totalUnits },
        },
      });

      // 2. Parse expiry date or default to 2 years
      let parsedExpiry: Date | null = null;
      if (expiryDate) {
        const parts = expiryDate.split('-');
        if (parts.length === 3) {
          // dd-MM-yyyy
          parsedExpiry = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        } else {
          parsedExpiry = new Date(expiryDate);
        }
      }
      if (!parsedExpiry || isNaN(parsedExpiry.getTime())) {
        parsedExpiry = new Date(Date.now() + 365 * 2 * 24 * 3600 * 1000);
      }

      // 3. Create SupplierPurchase Record
      const shipment = await prisma.supplierPurchase.create({
        data: {
          id: `SP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          supplierName: supplierName.trim(),
          invoiceNumber: invoiceNumber?.trim() || `DN-${Date.now().toString().slice(-6)}`,
          operatorName: operatorName || 'Staff Cashier',
          totalCostQar: totalCost,
          itemsCount: totalUnits,
          notes: `Direct stock-in: ${product.titleEn} (${totalUnits} units)`,
          deliveredByName: deliveredByName || null,
          supplierRepContact: supplierRepContact || null,
          SupplierPurchaseItem: {
            create: [
              {
                id: `SPI-${Date.now()}`,
                productId: product.id,
                productTitle: product.titleEn,
                sku: product.sku,
                quantity: totalUnits,
                unitCostQar: cost,
                batchNumber: batchNumber || `LOT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`,
                expiryDate: parsedExpiry,
                power: power || null,
                cylinder: cylinder || null,
                axis: axis ? parseInt(axis, 10) : null,
              },
            ],
          },
        },
      });

      // Register batch in ProductBatch table
      try {
        await prisma.productBatch.create({
          data: {
            id: `PB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            productId: product.id,
            storeId: 'STORE-MAIN',
            batchNumber: batchNumber || `LOT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`,
            expiryDate: parsedExpiry,
            quantity: totalUnits,
            costPriceQar: cost,
            power: power || null,
            cylinder: cylinder || null,
            axis: axis ? parseInt(axis, 10) : null,
          },
        });
      } catch (e) {
        console.warn('Batch registration warning:', e);
      }

      return NextResponse.json({ success: true, shipment });
    }

    // ----------------------------------------------------
    // ACTION 4: CREATE_SUPPLIER (Register Optical Vendor)
    // ----------------------------------------------------
    if (action === 'CREATE_SUPPLIER') {
      const { name, contactPerson, phone, email, creditTerms, notes, isMultiBrand } = body;

      if (!name) {
        return NextResponse.json({ error: 'Vendor name is required.' }, { status: 400 });
      }

      const supplier = await prisma.supplier.create({
        data: {
          id: `SUP-${Date.now()}`,
          name: name.trim(),
          contactPerson: contactPerson?.trim() || null,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          creditTerms: creditTerms || 'COD',
          notes: notes?.trim() || null,
          isMultiBrand: isMultiBrand !== undefined ? Boolean(isMultiBrand) : false,
        },
      });

      return NextResponse.json({ success: true, supplier });
    }

    // ----------------------------------------------------
    // ACTION 5: UPDATE_PO (Edit Official Purchase Order)
    // ----------------------------------------------------
    if (action === 'UPDATE_PO') {
      const {
        poId,
        poNumber,
        supplierId,
        supplierInvoiceNumber,
        orderDate,
        expectedDeliveryDate,
        notes,
        receivingStatus,
        items,
      } = body;

      if (!poId) {
        return NextResponse.json({ error: 'Purchase Order ID is required.' }, { status: 400 });
      }

      const totalCost = (items || []).reduce(
        (sum: number, it: any) => sum + Number(it.quantity || 1) * Number(it.unitCostQar || 0),
        0
      );

      // Recreate line items if updated items list is provided
      if (items && Array.isArray(items)) {
        await prisma.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: poId },
        });
      }

      const updatedPo = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: {
          poNumber: poNumber?.trim() || undefined,
          supplierId: supplierId || undefined,
          supplierInvoiceNumber: supplierInvoiceNumber !== undefined ? (supplierInvoiceNumber?.trim() || null) : undefined,
          orderDate: orderDate ? new Date(orderDate) : undefined,
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          receivingStatus: receivingStatus || undefined,
          subtotalQar: items ? totalCost : undefined,
          totalAmountQar: items ? totalCost : undefined,
          notes: notes !== undefined ? (notes?.trim() || null) : undefined,
          updatedAt: new Date(),
          ...(items && Array.isArray(items)
            ? {
                PurchaseOrderItem: {
                  create: items.map((it: any) => ({
                    id: `POI-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    productId: it.productId,
                    power: it.power || null,
                    cylinder: it.cylinder || null,
                    axis: it.axis ? parseInt(it.axis, 10) : null,
                    orderedQuantity: parseInt(it.quantity || '1', 10),
                    receivedQuantity: parseInt(it.receivedQuantity || '0', 10),
                    unitCostOriginal: Number(it.unitCostQar || 0),
                    unitCostQar: Number(it.unitCostQar || 0),
                    totalCostQar: Number(it.quantity || 1) * Number(it.unitCostQar || 0),
                  })),
                },
              }
            : {}),
        },
        include: {
          Supplier: true,
          PurchaseOrderItem: true,
        },
      });

      return NextResponse.json({ success: true, po: updatedPo });
    }

    // ----------------------------------------------------
    // ACTION 6: DELETE_PO (Delete Purchase Order)
    // ----------------------------------------------------
    if (action === 'DELETE_PO') {
      const { poId } = body;
      if (!poId) return NextResponse.json({ error: 'PO ID is required.' }, { status: 400 });

      const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
      if (!po) return NextResponse.json({ error: 'Purchase order not found.' }, { status: 404 });
      if (po.receivingStatus === 'FULLY_RECEIVED') {
        return NextResponse.json({ error: 'Cannot delete a fully received purchase order.' }, { status: 400 });
      }

      await prisma.purchaseOrder.delete({ where: { id: poId } });
      return NextResponse.json({ success: true, message: 'Purchase order deleted successfully.' });
    }

    // ----------------------------------------------------
    // ACTION 7: UPDATE_SHIPMENT (Edit Inbound Shipment / GRN)
    // ----------------------------------------------------
    if (action === 'UPDATE_SHIPMENT') {
      const {
        shipmentId,
        invoiceNumber,
        receivedAt,
        deliveredByName,
        supplierRepContact,
        notes,
      } = body;

      if (!shipmentId) {
        return NextResponse.json({ error: 'Shipment ID is required.' }, { status: 400 });
      }

      const updated = await prisma.supplierPurchase.update({
        where: { id: shipmentId },
        data: {
          invoiceNumber: invoiceNumber !== undefined ? (invoiceNumber?.trim() || null) : undefined,
          receivedAt: receivedAt ? new Date(receivedAt) : undefined,
          deliveredByName: deliveredByName !== undefined ? (deliveredByName?.trim() || null) : undefined,
          supplierRepContact: supplierRepContact !== undefined ? (supplierRepContact?.trim() || null) : undefined,
          notes: notes !== undefined ? (notes?.trim() || null) : undefined,
        },
      });

      return NextResponse.json({ success: true, shipment: updated });
    }

    // ----------------------------------------------------
    // ACTION 8: DELETE_SHIPMENT (Delete Inbound Shipment / GRN)
    // ----------------------------------------------------
    if (action === 'DELETE_SHIPMENT') {
      const { shipmentId } = body;
      if (!shipmentId) return NextResponse.json({ error: 'Shipment ID is required.' }, { status: 400 });

      await prisma.supplierPurchase.delete({ where: { id: shipmentId } });
      return NextResponse.json({ success: true, message: 'Inbound shipment deleted successfully.' });
    }

    // ----------------------------------------------------
    // ACTION 9: UPDATE_SUPPLIER (Edit Optical Vendor)
    // ----------------------------------------------------
    if (action === 'UPDATE_SUPPLIER') {
      const {
        supplierId,
        name,
        contactPerson,
        phone,
        email,
        creditTerms,
        notes,
        isMultiBrand,
      } = body;

      if (!supplierId || !name) {
        return NextResponse.json({ error: 'Supplier ID and Name are required.' }, { status: 400 });
      }

      const updated = await prisma.supplier.update({
        where: { id: supplierId },
        data: {
          name: name.trim(),
          contactPerson: contactPerson !== undefined ? (contactPerson?.trim() || null) : undefined,
          phone: phone !== undefined ? (phone?.trim() || null) : undefined,
          email: email !== undefined ? (email?.trim() || null) : undefined,
          creditTerms: creditTerms || undefined,
          notes: notes !== undefined ? (notes?.trim() || null) : undefined,
          isMultiBrand: isMultiBrand !== undefined ? Boolean(isMultiBrand) : undefined,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, supplier: updated });
    }

    // ----------------------------------------------------
    // ACTION 10: DELETE_SUPPLIER (Delete Optical Vendor)
    // ----------------------------------------------------
    if (action === 'DELETE_SUPPLIER') {
      const { supplierId } = body;
      if (!supplierId) return NextResponse.json({ error: 'Supplier ID is required.' }, { status: 400 });

      const linkedOrders = await prisma.purchaseOrder.count({ where: { supplierId } });
      if (linkedOrders > 0) {
        return NextResponse.json(
          { error: `Cannot delete supplier with ${linkedOrders} linked purchase order(s).` },
          { status: 400 }
        );
      }

      await prisma.supplier.delete({ where: { id: supplierId } });
      return NextResponse.json({ success: true, message: 'Supplier deleted successfully.' });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling purchase POST action:', error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}
