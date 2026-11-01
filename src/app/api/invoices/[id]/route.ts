import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ─── PATCH /api/invoices/[id] ─────────────────────────────────────────────────
// Updates editable fields on an Invoice and its linked Order/OrderItems.
// Admin-only; the caller must verify permission on the client side (canRefund gate).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const {
      // Invoice-level fields
      customerName,
      customerPhone,
      status,
      subtotalQar,
      discountQar,
      taxTotalQar,
      deliveryFeeQar,
      totalQar,
      salespersonName,
      // Order-level fields (updated via the linked order)
      customerEmail,
      paymentMethod,
      paymentReference,
      orderSource,
      channel,
      notes,
      // Items: array of { id, quantity, unitPrice, total }
      items,
    } = body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch invoice to get orderId
      const invoice = await tx.invoice.findUnique({
        where: { id },
        select: { id: true, orderId: true, status: true },
      });
      if (!invoice) throw new Error('Invoice not found');

      // 2. Determine sources, payment methods and aggregator/online status
      const effectiveSource = (orderSource || channel || '').toUpperCase();
      const effectivePayment = (paymentMethod || '').toUpperCase();
      const isAggregator =
        ['SNOONU', 'TALABAT', 'RAFEEQ'].includes(effectiveSource) ||
        ['SNOONU', 'TALABAT', 'RAFEEQ'].includes(effectivePayment);
      const isOnline =
        ['WHATSAPP', 'WEBSITE', 'SHOPIFY_ONLINE'].includes(effectiveSource) ||
        ['WHATSAPP', 'WEBSITE'].includes(effectivePayment);

      // 3. Update Invoice fields
      const invoiceData: Record<string, unknown> = {};
      if (customerName !== undefined) invoiceData.customerName = customerName;
      if (customerPhone !== undefined) invoiceData.customerPhone = customerPhone;
      if (subtotalQar !== undefined) invoiceData.subtotalQar = subtotalQar;
      if (discountQar !== undefined) invoiceData.discountQar = discountQar;
      if (taxTotalQar !== undefined) invoiceData.taxTotalQar = taxTotalQar;
      if (deliveryFeeQar !== undefined) invoiceData.deliveryFeeQar = deliveryFeeQar;
      if (totalQar !== undefined) invoiceData.totalQar = totalQar;
      if (salespersonName !== undefined) invoiceData.salespersonName = salespersonName;

      if (status !== undefined) {
        invoiceData.status = status;
        if (status === 'PENDING_SETTLEMENT') {
          invoiceData.paidAt = null;
        } else if (status === 'PAID') {
          invoiceData.paidAt = new Date();
        }
      } else if (isAggregator) {
        invoiceData.status = 'PENDING_SETTLEMENT';
        invoiceData.paidAt = null;
      }

      // 4. Update linked Order fields (if order exists)
      if (invoice.orderId) {
        const orderData: Record<string, unknown> = {};
        if (customerName !== undefined) orderData.customerName = customerName;
        if (customerPhone !== undefined) orderData.customerPhone = customerPhone;
        if (customerEmail !== undefined) orderData.customerEmail = customerEmail;
        if (salespersonName !== undefined) orderData.salespersonName = salespersonName;
        if (paymentReference !== undefined) orderData.paymentReference = paymentReference || null;
        if (notes !== undefined) orderData.notes = notes || null;
        if (subtotalQar !== undefined) orderData.subtotalQar = subtotalQar;
        if (discountQar !== undefined) orderData.discountQar = discountQar;
        if (deliveryFeeQar !== undefined) orderData.deliveryFeeQar = deliveryFeeQar;
        if (totalQar !== undefined) orderData.totalQar = totalQar;

        const effectiveStatus = (status || invoiceData.status || invoice.status) as string;

        if (isAggregator) {
          const platform = ['SNOONU', 'TALABAT', 'RAFEEQ'].includes(effectiveSource)
            ? effectiveSource
            : effectivePayment;
          orderData.orderSource = platform;
          orderData.paymentMethod = effectivePayment || platform;
          orderData.fulfillmentType = 'HOME_DELIVERY';

          if (effectiveStatus === 'PAID') {
            orderData.paymentStatus = 'PAID';
            orderData.orderStatus = 'CONFIRMED';
          } else {
            orderData.paymentStatus = 'PENDING';
            orderData.orderStatus = 'OUT_FOR_DELIVERY';
            invoiceData.status = 'PENDING_SETTLEMENT';
            invoiceData.paidAt = null;
          }
        } else if (isOnline) {
          const onlineSource = ['WHATSAPP', 'WEBSITE'].includes(effectiveSource)
            ? effectiveSource
            : (['WHATSAPP', 'WEBSITE'].includes(effectivePayment) ? effectivePayment : 'WHATSAPP');
          orderData.orderSource = onlineSource;
          orderData.paymentMethod = effectivePayment || 'CASH';
          orderData.fulfillmentType = 'HOME_DELIVERY';

          if (effectiveStatus === 'PAID') {
            orderData.paymentStatus = 'PAID';
            orderData.orderStatus = 'CONFIRMED';
          } else if (effectiveStatus === 'REFUNDED') {
            orderData.paymentStatus = 'REFUNDED';
            orderData.orderStatus = 'REFUNDED';
          } else {
            orderData.paymentStatus = 'PENDING';
            orderData.orderStatus = 'CONFIRMED';
          }
        } else {
          // In-Store POS (CASH, CARD, SPLIT, TRANSFER)
          orderData.orderSource = effectiveSource || 'IN_STORE_POS';
          if (paymentMethod !== undefined) {
            orderData.paymentMethod = paymentMethod;
          }
          orderData.fulfillmentType = 'IN_STORE_TAKEOUT';

          if (effectiveStatus === 'PAID') {
            orderData.paymentStatus = 'PAID';
            orderData.orderStatus = 'CONFIRMED';
          } else if (effectiveStatus === 'REFUNDED') {
            orderData.paymentStatus = 'REFUNDED';
            orderData.orderStatus = 'REFUNDED';
          } else if (effectiveStatus === 'PENDING_SETTLEMENT') {
            orderData.paymentStatus = 'PENDING';
            orderData.orderStatus = 'CONFIRMED';
          } else {
            orderData.paymentStatus = 'PENDING';
            orderData.orderStatus = effectiveStatus;
          }
        }

        if (Object.keys(orderData).length > 0) {
          await tx.order.update({ where: { id: invoice.orderId }, data: orderData });
        }

        // 5. Update OrderItems quantities/prices
        if (Array.isArray(items)) {
          for (const item of items) {
            if (!item.id) continue;
            await tx.orderItem.update({
              where: { id: item.id },
              data: {
                quantity: item.quantity,
                unitPriceQar: item.unitPrice,
                totalPriceQar: item.total,
              },
            });
          }
        }
      }

      // 6. Update Invoice in database
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: invoiceData,
        include: {
          order: {
            include: {
              items: {
                include: {
                  product: {
                    select: { titleEn: true, titleAr: true, sku: true, brandName: true },
                  },
                },
              },
            },
          },
        },
      });

      const formattedItems = (updatedInvoice.order?.items || []).map((i) => ({
        id: i.id,
        productId: i.productId,
        name: i.product?.titleEn || 'Product Item',
        nameAr: i.product?.titleAr || null,
        specs: i.addPower || (i.power ? `PWR: ${i.power}` : '') || '',
        quantity: i.quantity,
        unitPrice: Number(i.unitPriceQar),
        total: Number(i.totalPriceQar),
      }));

      return {
        id: updatedInvoice.id,
        invoiceNumber: updatedInvoice.invoiceNumber,
        orderNumber: updatedInvoice.order?.orderNumber || '—',
        customerName: updatedInvoice.customerName,
        customerPhone: updatedInvoice.customerPhone || '—',
        customerEmail: updatedInvoice.order?.customerEmail || '—',
        status: updatedInvoice.status,
        subtotalQar: Number(updatedInvoice.subtotalQar),
        discountQar: Number(updatedInvoice.discountQar),
        taxTotalQar: Number(updatedInvoice.taxTotalQar),
        deliveryFeeQar: Number(updatedInvoice.deliveryFeeQar),
        totalQar: Number(updatedInvoice.totalQar),
        issuedAt: updatedInvoice.issuedAt ? updatedInvoice.issuedAt.toISOString() : null,
        createdAt: updatedInvoice.createdAt.toISOString(),
        salespersonName: updatedInvoice.salespersonName || 'Cashier',
        paymentMethod: updatedInvoice.order?.paymentMethod || 'CASH',
        paymentReference: updatedInvoice.order?.paymentReference || null,
        channel: updatedInvoice.order?.orderSource || 'IN_STORE_POS',
        orderSource: updatedInvoice.order?.orderSource || 'IN_STORE_POS',
        itemsCount: formattedItems.length,
        items: formattedItems,
      };
    });

    return NextResponse.json({ success: true, invoice: result });
  } catch (err: any) {
    console.error('PATCH /api/invoices/[id]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update invoice' },
      { status: 500 },
    );
  }
}
