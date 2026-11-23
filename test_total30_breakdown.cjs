const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTotal30() {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { titleEn: { contains: 'Total 30', mode: 'insensitive' } },
        { titleEn: { contains: 'Total30', mode: 'insensitive' } },
        { brandName: { contains: 'Alcon', mode: 'insensitive' } },
      ],
    },
    include: {
      storeStocks: true,
      batches: {
        orderBy: [{ power: 'asc' }, { expiryDate: 'asc' }],
      },
      PurchaseOrderItem: {
        include: {
          PurchaseOrder: {
            include: { Supplier: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      orderItems: {
        include: {
          order: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      returnItems: {
        include: {
          orderReturn: true,
        },
      },
    },
  });

  console.log(`Found ${products.length} products matching.`);
  for (const p of products) {
    console.log('----------------------------------------------------');
    console.log(`Product: "${p.titleEn}" (ID: ${p.id}, SKU: ${p.sku})`);
    console.log(`Brand: ${p.brandName}, Type: ${p.productType}`);
    console.log(`Catalog stockQuantity: ${p.stockQuantity}`);
    console.log(`StoreStock:`, p.storeStocks.map(s => ({ store: s.storeId, qty: s.stockQuantity })));
    
    // Sum of batches
    const batchTotal = p.batches.reduce((sum, b) => sum + (b.quantity || 0), 0);
    console.log(`ProductBatches total qty: ${batchTotal} across ${p.batches.length} batch records`);
    console.log('Batches breakdown:');
    p.batches.forEach(b => {
      console.log(`  - Batch: ${b.batchNumber}, Power: ${b.power}, Qty: ${b.quantity}, Exp: ${b.expiryDate ? b.expiryDate.toISOString().split('T')[0] : 'None'}, Status: ${b.status}`);
    });

    // PO items
    console.log(`PurchaseOrderItems (${p.PurchaseOrderItem.length} rows):`);
    p.PurchaseOrderItem.forEach(poi => {
      console.log(`  - PO #${poi.PurchaseOrder.poNumber} (${poi.PurchaseOrder.Supplier?.name || 'Supplier'}): Power: ${poi.power}, Ordered: ${poi.orderedQuantity}, Received: ${poi.receivedQuantity}, Batch: ${poi.batchNumber}, Status: ${poi.PurchaseOrder.receivingStatus}, Date: ${poi.PurchaseOrder.receivedDate || poi.createdAt}`);
    });

    // Order items
    console.log(`OrderItems (${p.orderItems.length} rows):`);
    p.orderItems.forEach(oi => {
      console.log(`  - Order #${oi.order.orderNumber} (${oi.order.orderSource}, Status: ${oi.order.orderStatus}): Power: ${oi.power}, Qty: ${oi.quantity}, Price: ${oi.unitPriceQar}, Date: ${oi.createdAt}`);
    });

    // Stock adjustments
    const adjs = await prisma.stockAdjustment.findMany({ where: { productId: p.id } });
    console.log(`StockAdjustments (${adjs.length} rows):`, adjs);

    // Writeoffs
    const wos = await prisma.inventoryWriteOff.findMany({ where: { productId: p.id } });
    console.log(`InventoryWriteOffs (${wos.length} rows):`, wos);

    // SupplierPurchaseItems (direct)
    const spis = await prisma.supplierPurchaseItem.findMany({
      where: { productId: p.id },
      include: { SupplierPurchase: true },
    });
    console.log(`SupplierPurchaseItems (${spis.length} rows):`);
    spis.forEach(spi => {
      console.log(`  - Inv #${spi.SupplierPurchase.invoiceNumber}: Power: ${spi.power}, Qty: ${spi.quantity}, Notes: ${spi.SupplierPurchase.notes}`);
    });
  }
}

checkTotal30().catch(console.error).finally(() => prisma.$disconnect());
