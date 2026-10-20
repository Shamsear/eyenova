import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatQatarDate, formatQatarTime } from '@/lib/utils';
import { ReceiptPayload } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';
    const status = searchParams.get('status')?.trim() || 'ALL';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (q) {
      where.OR = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            include: {
              items: {
                include: {
                  product: {
                    select: { titleEn: true, sku: true, brandName: true },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    const formatted = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      orderNumber: inv.order?.orderNumber || '—',
      customerName: inv.customerName,
      customerPhone: inv.customerPhone || '—',
      customerEmail: inv.order?.customerEmail || '—',
      status: inv.status,
      subtotalQar: Number(inv.subtotalQar),
      discountQar: Number(inv.discountQar),
      taxTotalQar: Number(inv.taxTotalQar),
      deliveryFeeQar: Number(inv.deliveryFeeQar),
      totalQar: Number(inv.totalQar),
      issuedAt: inv.issuedAt ? inv.issuedAt.toISOString() : null,
      createdAt: inv.createdAt.toISOString(),
      salespersonName: inv.salespersonName || 'Cashier',
      paymentMethod: inv.order?.paymentMethod || 'CASH',
      paymentReference: inv.order?.paymentReference || null,
      channel: inv.order?.orderSource || 'IN_STORE_POS',
      itemsCount: inv.order?.items.length || 0,
      items: inv.order?.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        name: i.product?.titleEn || 'Product Item',
        specs: i.addPower || (i.power ? `PWR: ${i.power}` : '') || '',
        quantity: i.quantity,
        unitPrice: Number(i.unitPriceQar),
        total: Number(i.totalPriceQar),
      })) || [],
    }));

    return NextResponse.json({
      invoices: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch invoices' }, { status: 500 });
  }
}

// Refund / Void Invoice
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceId, reason, refundStock = true } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          order: {
            include: { items: true },
          },
        },
      });

      if (!invoice) throw new Error('Invoice not found');
      if (invoice.status === 'REFUNDED') throw new Error('Invoice is already refunded');

      // Update invoice status
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'REFUNDED',
        },
      });

      // Update order status if present
      if (invoice.orderId) {
        await tx.order.update({
          where: { id: invoice.orderId },
          data: {
            orderStatus: 'REFUNDED',
            paymentStatus: 'REFUNDED',
          },
        });

        // Restore stock
        if (refundStock && invoice.order?.items) {
          for (const item of invoice.order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: { increment: item.quantity },
              },
            });
          }
        }
      }

      return updatedInvoice;
    });

    return NextResponse.json({ success: true, invoice: result });
  } catch (error: any) {
    console.error('Error processing refund:', error);
    return NextResponse.json({ error: error.message || 'Failed to process refund' }, { status: 500 });
  }
}
