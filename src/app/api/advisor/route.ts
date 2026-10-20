import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatQatarDate } from '@/lib/utils';

export async function GET() {
  try {
    const sixMonthsFromNow = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

    const [expiringBatches, lowStockProducts, healthyStockCount] = await Promise.all([
      prisma.productBatch.findMany({
        where: {
          status: 'ACTIVE',
          quantity: { gt: 0 },
          expiryDate: { lte: sixMonthsFromNow },
        },
        include: {
          product: { select: { titleEn: true, sku: true, brandName: true } },
        },
        take: 8,
        orderBy: { expiryDate: 'asc' },
      }),
      prisma.product.findMany({
        where: {
          isActive: true,
          stockQuantity: { lte: 5 },
        },
        select: {
          id: true,
          titleEn: true,
          sku: true,
          brandName: true,
          stockQuantity: true,
          minStockAlert: true,
          salePriceQar: true,
        },
        take: 8,
        orderBy: { stockQuantity: 'asc' },
      }),
      prisma.product.count({
        where: { isActive: true, stockQuantity: { gt: 5 } },
      }),
    ]);

    const formattedExpiring = expiringBatches.map((b) => ({
      id: b.id,
      batchNumber: b.batchNumber,
      productName: b.product?.titleEn || 'Contact Lens',
      brand: b.product?.brandName || 'EyeNova',
      power: b.power ? Number(b.power).toFixed(2) : 'Plano',
      quantity: b.quantity,
      expiryDate: b.expiryDate ? formatQatarDate(b.expiryDate) : 'Unknown',
      daysUntilExpiry: b.expiryDate
        ? Math.ceil((b.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0,
    }));

    const formattedLowStock = lowStockProducts.map((p) => ({
      id: p.id,
      title: p.titleEn,
      sku: p.sku,
      brand: p.brandName || 'EyeNova',
      stockQuantity: p.stockQuantity,
      suggestedReorder: Math.max(20, (p.minStockAlert || 5) * 4),
    }));

    return NextResponse.json({
      insights: {
        expiringBatches: formattedExpiring,
        lowStockSuggestions: formattedLowStock,
        healthyStockCount,
      },
    });
  } catch (error: any) {
    console.error('Advisor API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch advisor data' }, { status: 500 });
  }
}
