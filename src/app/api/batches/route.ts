import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatQatarDate } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';

    const where: any = {};
    if (q) {
      where.OR = [
        { batchNumber: { contains: q, mode: 'insensitive' } },
        { product: { titleEn: { contains: q, mode: 'insensitive' } } },
        { product: { brandName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const batches = await prisma.productBatch.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            titleEn: true,
            brandName: true,
            sku: true,
          },
        },
      },
      orderBy: [{ expiryDate: 'asc' }, { quantity: 'desc' }],
      take: 500,
    });

    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const formatted = batches.map((b) => {
      let status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' = 'VALID';
      if (b.expiryDate) {
        const exp = new Date(b.expiryDate);
        if (exp < now) {
          status = 'EXPIRED';
        } else if (exp < ninetyDaysFromNow) {
          status = 'EXPIRING_SOON';
        }
      }

      let specs = b.power ? `PWR ${b.power}` : 'Standard';
      if (b.cylinder) specs += ` / CYL ${b.cylinder}`;
      if (b.axis) specs += ` / AX ${b.axis}°`;

      return {
        id: b.id,
        brand: b.product?.brandName || 'EyeNova',
        product: b.product?.titleEn || 'Contact Lens',
        batchNo: b.batchNumber,
        mfgDate: b.manufactureDate ? formatQatarDate(b.manufactureDate) : '—',
        expDate: b.expiryDate ? formatQatarDate(b.expiryDate) : 'No Expiry',
        status,
        stockQty: b.quantity,
        specs,
      };
    });

    return NextResponse.json({ batches: formatted });
  } catch (error: any) {
    console.error('Error fetching batches:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch batches' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brand, productTitle, batchNo, specs, mfgDate, expDate, stockQty } = body;

    if (!batchNo || !expDate) {
      return NextResponse.json({ error: 'Batch number and expiry date are required' }, { status: 400 });
    }

    // Find product or assign to first active product
    let product = await prisma.product.findFirst({
      where: productTitle ? { titleEn: { contains: productTitle.trim(), mode: 'insensitive' } } : undefined,
    });

    if (!product) {
      product = await prisma.product.findFirst({ where: { isActive: true } });
    }

    if (!product) {
      return NextResponse.json({ error: 'No product found to attach batch' }, { status: 404 });
    }

    const newBatch = await prisma.productBatch.create({
      data: {
        id: `B-${Date.now()}`,
        productId: product.id,
        storeId: 'STORE-MAIN',
        batchNumber: batchNo.trim(),
        quantity: parseInt(stockQty || '1', 10),
        expiryDate: new Date(expDate),
        power: specs || null,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ success: true, batch: newBatch });
  } catch (error: any) {
    console.error('Error creating batch:', error);
    return NextResponse.json({ error: error.message || 'Failed to create batch' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    await prisma.productBatch.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting batch:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete batch' }, { status: 500 });
  }
}
