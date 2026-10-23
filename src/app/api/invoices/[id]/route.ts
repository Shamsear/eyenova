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

      // 2. Update Invoice fields
      const invoiceData: Record<string, unknown> = {};
      if (customerName !== undefined) invoiceData.customerName = customerName;
      if (customerPhone !== undefined) invoiceData.customerPhone = customerPhone;
      if (status !== undefined) invoiceData.status = status;
      if (subtotalQar !== undefined) invoiceData.subtotalQar = subtotalQar;
      if (discountQar !== undefined) invoiceData.discountQar = discountQar;
      if (taxTotalQar !== undefined) invoiceData.taxTotalQar = taxTotalQar;
      if (deliveryFeeQar !== undefined) invoiceData.deliveryFeeQar = deliveryFeeQar;
      if (totalQar !== undefined) invoiceData.totalQar = totalQar;
      if (salespersonName !== undefined) invoiceData.salespersonName = salespersonName;

      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: invoiceData,
      });

      // 3. Update linked Order fields (if order exists)
      if (invoice.orderId) {
        const orderData: Record<string, unknown> = {};
        if (customerName !== undefined) orderData.customerName = customerName;
        if (customerPhone !== undefined) orderData.customerPhone = customerPhone;
        if (customerEmail !== undefined) orderData.customerEmail = customerEmail;
        if (status !== undefined) {
          orderData.orderStatus = status === 'PAID' ? 'CONFIRMED' : status;
          orderData.paymentStatus = status === 'PAID' ? 'PAID' : status === 'REFUNDED' ? 'REFUNDED' : 'PENDING';
        }
        if (paymentMethod !== undefined) orderData.paymentMethod = paymentMethod;
        if (paymentReference !== undefined) orderData.paymentReference = paymentReference || null;
        if (notes !== undefined) orderData.notes = notes || null;
        if (subtotalQar !== undefined) orderData.subtotalQar = subtotalQar;
        if (discountQar !== undefined) orderData.discountQar = discountQar;
        if (deliveryFeeQar !== undefined) orderData.deliveryFeeQar = deliveryFeeQar;
        if (totalQar !== undefined) orderData.totalQar = totalQar;
        if (salespersonName !== undefined) orderData.salespersonName = salespersonName;

        if (Object.keys(orderData).length > 0) {
          await tx.order.update({ where: { id: invoice.orderId }, data: orderData });
        }

        // 4. Update OrderItems quantities/prices
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

      return updatedInvoice;
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
