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
    const { orderId, action, trackingNumber } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    if (action === 'DISPATCH') {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          orderStatus: 'OUT_FOR_DELIVERY',
          trackingNumber: trackingNumber || null,
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
