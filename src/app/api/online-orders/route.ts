import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: {
        orderSource: {
          not: 'IN_STORE_POS',
        },
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: { select: { titleEn: true } },
          },
        },
      },
    });

    const formatted = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      orderSource: o.orderSource,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod || 'CASH_ON_DELIVERY',
      customerName: o.customerName || 'Online Customer',
      customerPhone: o.customerPhone || '—',
      totalQar: Number(o.totalQar),
      createdAt: o.createdAt.toISOString(),
      trackingNumber: o.trackingNumber,
      items: o.items.map((i) => ({
        id: i.id,
        productTitle: i.product?.titleEn || 'Optical Product',
        specs: i.addPower || (i.power ? `PWR: ${i.power}` : '') || '',
        quantity: i.quantity,
        unitPrice: Number(i.unitPriceQar),
        total: Number(i.totalPriceQar),
      })),
    }));

    return NextResponse.json({ orders: formatted });
  } catch (error: any) {
    console.error('Error fetching online orders:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch online orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, action, trackingNumber, operatorName } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    if (action === 'DISPATCH' || action === 'DELIVER') {
      const targetStatus = action === 'DELIVER' ? 'DELIVERED' : 'OUT_FOR_DELIVERY';

      // 1. Fetch order and unfulfilled items
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: { product: { include: { batches: true } } },
          },
        },
      });

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // 2. Fulfill shelf inventory for unallocated items
      const now = new Date();
      for (const item of order.items) {
        const isUnallocated = !item.batchId || item.batchId === 'NON_BATCHED' || item.isBackorder;
        if (isUnallocated) {
          const product = item.product;
          if (product && product.batches.length > 0) {
            // Find active matching batch (FEFO)
            const activeBatches = product.batches
              .filter(b => (!b.status || b.status === 'ACTIVE') && (!b.expiryDate || b.expiryDate >= now) && b.quantity > 0)
              .sort((a, b) => (a.expiryDate?.getTime() || 0) - (b.expiryDate?.getTime() || 0));

            let matchedBatch = null;
            // 1. Check if an allocated batch was already assigned
            if (item.allocatedBatchId) {
              matchedBatch = activeBatches.find(b => b.id === item.allocatedBatchId) || null;
            }

            // 2. Match optical prescription (sphere, cylinder, axis)
            if (!matchedBatch) {
              if (item.power !== null && item.power !== undefined) {
                const itemPwrNum = Number(item.power);
                const itemCylNum = item.cylinder !== null && item.cylinder !== undefined ? Number(item.cylinder) : null;
                const itemAxisNum = item.axis !== null && item.axis !== undefined ? Number(item.axis) : null;

                matchedBatch = activeBatches.find(b => {
                  if (!b.power) return false;
                  const bNum = parseFloat(b.power.replace('+', ''));
                  if (isNaN(bNum) || Math.abs(bNum - itemPwrNum) >= 0.001) return false;

                  // Toric: match cylinder if present on item
                  if (itemCylNum !== null) {
                    if (!b.cylinder) return false;
                    const bCyl = parseFloat(b.cylinder.replace('+', ''));
                    if (isNaN(bCyl) || Math.abs(bCyl - itemCylNum) >= 0.001) return false;
                  }

                  // Toric: match axis if present on item
                  if (itemAxisNum !== null) {
                    if (b.axis === null || b.axis === undefined) return false;
                    if (Number(b.axis) !== itemAxisNum) return false;
                  }

                  return true;
                });
              } else if (item.isPlano) {
                matchedBatch = activeBatches.find(b => !b.power || b.power.includes('0.00') || b.power.toLowerCase().includes('plano'));
              } else {
                matchedBatch = activeBatches[0];
              }
            }

            if (matchedBatch) {
              const newBatchQty = Math.max(0, matchedBatch.quantity - item.quantity);
              await prisma.productBatch.update({
                where: { id: matchedBatch.id },
                data: {
                  quantity: newBatchQty,
                  status: newBatchQty === 0 ? 'DEPLETED' : 'ACTIVE',
                  updatedAt: now,
                },
              });

              await prisma.orderItem.update({
                where: { id: item.id },
                data: {
                  batchId: matchedBatch.id,
                  allocatedBatchId: matchedBatch.id,
                  isBackorder: false,
                },
              });

              // Sync StoreStock & Product
              const newActiveSum = product.batches.reduce((sum, b) => {
                if (b.id === matchedBatch.id) return sum + newBatchQty;
                if ((!b.status || b.status === 'ACTIVE') && (!b.expiryDate || b.expiryDate >= now) && b.id !== matchedBatch.id) return sum + b.quantity;
                return sum;
              }, 0);

              await prisma.storeStock.upsert({
                where: { storeId_productId: { storeId: 'STORE-MAIN', productId: product.id } },
                update: { stockQuantity: newActiveSum, updatedAt: now },
                create: { storeId: 'STORE-MAIN', productId: product.id, stockQuantity: newActiveSum },
              });

              await prisma.product.update({
                where: { id: product.id },
                data: { stockQuantity: newActiveSum, updatedAt: now },
              });

              // Prevent duplicate stock adjustments for the same order item
              const existingAdj = await prisma.stockAdjustment.findFirst({
                where: {
                  productId: product.id,
                  note: { contains: order.orderNumber },
                },
              });
              if (!existingAdj) {
                await prisma.stockAdjustment.create({
                  data: {
                    id: `ADJ-WEB-${Date.now()}-${item.id.slice(-4)}`,
                    productId: product.id,
                    storeId: 'STORE-MAIN',
                    batchId: matchedBatch.id,
                    systemQty: product.stockQuantity,
                    countedQty: newActiveSum,
                    deltaQty: -item.quantity,
                    reason: 'ONLINE_DELIVERY',
                    note: `Online Order ${order.orderNumber} delivered by ${operatorName || 'Staff'} (Qty: ${item.quantity})`,
                  },
                });
              }
            } else {
              // No matching batch on shelf (on-demand contact lens / special order)
              await prisma.orderItem.update({
                where: { id: item.id },
                data: { isBackorder: true },
              });
            }
          }
        }
      }

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          orderStatus: targetStatus,
          trackingNumber: trackingNumber || undefined,
        },
      });

      return NextResponse.json({ success: true, order: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating online order:', error);
    return NextResponse.json({ error: error.message || 'Failed to update order' }, { status: 500 });
  }
}
