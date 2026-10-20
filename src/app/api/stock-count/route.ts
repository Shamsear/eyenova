import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        titleEn: true,
        sku: true,
        barcode: true,
        stockQuantity: true,
      },
      orderBy: [{ stockQuantity: 'desc' }, { titleEn: 'asc' }],
      take: 300,
    });

    const sheet = products.map((p) => ({
      id: p.id,
      name: p.titleEn,
      sku: p.sku || p.barcode || 'NO-SKU',
      systemQty: p.stockQuantity,
      countedQty: p.stockQuantity,
      delta: 0,
    }));

    return NextResponse.json({ sheet });
  } catch (error: any) {
    console.error('Error fetching stock audit sheet:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch stock audit sheet' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adjustments } = body; // Array of { id, countedQty, systemQty, delta }

    if (!Array.isArray(adjustments) || adjustments.length === 0) {
      return NextResponse.json({ error: 'No adjustments provided' }, { status: 400 });
    }

    const varianceItems = adjustments.filter((a: any) => a.delta !== 0);

    for (const item of varianceItems) {
      // 1. Create StockAdjustment entry
      await prisma.stockAdjustment.create({
        data: {
          id: `ADJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productId: item.id,
          storeId: 'STORE-MAIN',
          systemQty: item.systemQty,
          countedQty: item.countedQty,
          deltaQty: item.delta,
          reason: 'STORE_PHYSICAL_COUNT',
          note: `Physical Store Audit Adjustment (System: ${item.systemQty}, Counted: ${item.countedQty})`,
        },
      });

      // 2. Update real stock quantity on Product
      await prisma.product.update({
        where: { id: item.id },
        data: { stockQuantity: item.countedQty },
      });
    }

    return NextResponse.json({
      success: true,
      adjustedCount: varianceItems.length,
      message: `Successfully reconciled ${varianceItems.length} inventory variance items`,
    });
  } catch (error: any) {
    console.error('Error committing stock count:', error);
    return NextResponse.json({ error: error.message || 'Failed to commit stock count' }, { status: 500 });
  }
}
