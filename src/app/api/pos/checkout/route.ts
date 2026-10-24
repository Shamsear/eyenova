import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CartLineItem, ReceiptPayload } from '@/lib/types';
import { formatQatarDate, formatQatarTime, formatOpticalSpecs } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      lines,
      customerName,
      customerPhone,
      customerEmail,
      customerId,
      paymentMethod,
      paymentReference,
      cashTendered,
      changeDue,
      discountAmount,
      deliveryFee,
      taxRate,
      cashierName,
      storeId,
      shiftId,
      notes,
    }: {
      lines: CartLineItem[];
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      customerId?: string | null;
      paymentMethod: string; // CASH | CARD | SPLIT | STORE_CREDIT
      paymentReference?: string;
      cashTendered?: number;
      changeDue?: number;
      discountAmount: number;
      deliveryFee: number;
      taxRate: number;
      cashierName: string;
      storeId?: string;
      shiftId?: string;
      notes?: string;
    } = body;

    if (!lines || lines.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Calculate totals on server to guarantee integrity
    const subtotal = lines.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discount = Math.min(subtotal, Math.max(0, discountAmount || 0));
    const taxable = Math.max(0, subtotal - discount);
    const taxTotal = Math.round(((taxable * (taxRate || 0)) / 100) * 100) / 100;
    const delFee = Math.max(0, deliveryFee || 0);
    const grandTotal = Math.max(0, Math.round((subtotal - discount + taxTotal + delFee) * 100) / 100);

    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `EN-${year}-${randomSuffix}`;
    const invoiceNumber = `INV-${year}-${randomSuffix}`;
    const now = new Date();

    // 1. Resolve or create customer
    let finalCustomerId = customerId;
    if (!finalCustomerId && customerPhone && customerPhone.trim().length >= 4) {
      const existing = await prisma.customer.findUnique({
        where: { phone: customerPhone.trim() },
      });
      if (existing) {
        finalCustomerId = existing.id;
      } else {
        const newCust = await prisma.customer.create({
          data: {
            id: `CUST_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            phone: customerPhone.trim(),
            fullName: customerName || 'Walk-in Customer',
            email: customerEmail || null,
          },
        });
        finalCustomerId = newCust.id;
      }
    }

    // 1b. If Store Credit payment, verify and deduct customer credit
    if (paymentMethod === 'STORE_CREDIT') {
      if (!finalCustomerId) {
        return NextResponse.json(
          { error: 'Store Credit payment requires selecting a registered customer.' },
          { status: 400 }
        );
      }
      const customer = await prisma.customer.findUnique({
        where: { id: finalCustomerId },
      });
      if (!customer) {
        return NextResponse.json({ error: 'Selected customer not found in database.' }, { status: 404 });
      }
      const availableCredit = Number(customer.storeCreditQar || 0);
      if (availableCredit < grandTotal) {
        return NextResponse.json(
          {
            error: `Insufficient store credit. Available: ${availableCredit.toFixed(2)} QAR, Required: ${grandTotal.toFixed(2)} QAR.`,
          },
          { status: 400 }
        );
      }
      await prisma.customer.update({
        where: { id: finalCustomerId },
        data: {
          storeCreditQar: {
            decrement: grandTotal,
          },
        },
      });
    }

    // 2. Map PaymentMethod enum and Create Order
    let mappedPaymentMethod = 'IN_STORE_PAYMENT';
    if (paymentMethod === 'STORE_CREDIT') {
      mappedPaymentMethod = 'STORE_CREDIT';
    } else if (paymentMethod === 'CARD' || paymentMethod === 'CREDIT_CARD') {
      mappedPaymentMethod = 'CREDIT_CARD';
    } else if (paymentMethod === 'QPAY' || paymentMethod === 'DEBIT_CARD_QPAY') {
      mappedPaymentMethod = 'DEBIT_CARD_QPAY';
    } else if (paymentMethod === 'CASH_ON_DELIVERY') {
      mappedPaymentMethod = 'CASH_ON_DELIVERY';
    } else {
      mappedPaymentMethod = 'IN_STORE_PAYMENT';
    }

    const order = await prisma.order.create({
      data: {
        id: `ORD_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        orderNumber,
        userId: finalCustomerId || null,
        orderSource: 'IN_STORE_POS',
        fulfillmentType: 'IN_STORE_TAKEOUT',
        orderStatus: 'PAYMENT_CONFIRMED',
        paymentStatus: 'PAID',
        paymentMethod: mappedPaymentMethod,
        paymentReference: paymentReference || null,
        subtotalQar: subtotal,
        discountQar: discount,
        deliveryFeeQar: delFee,
        totalQar: grandTotal,
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone && customerPhone.trim() ? customerPhone.trim() : '—',
        customerEmail: customerEmail || null,
        salespersonName: cashierName || 'Cashier',
        notes: notes || null,
        createdAt: now,
        updatedAt: now,
      },
    });

    // 3. Create OrderItems & Decrement Stock
    for (const line of lines) {
      let sph: number | null = null;
      let cyl: number | null = null;
      if (line.power) {
        const clean = line.power.replace('+', '').replace('Plano', '0.00').trim();
        const parsed = parseFloat(clean);
        if (!isNaN(parsed)) sph = parsed;
      }
      if (line.cylinder) {
        const clean = line.cylinder.replace('+', '').trim();
        const parsed = parseFloat(clean);
        if (!isNaN(parsed)) cyl = parsed;
      }

      const lineTotal = line.unitPrice * line.quantity;

      await prisma.orderItem.create({
        data: {
          id: `ITEM_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          orderId: order.id,
          productId: line.productId,
          quantity: line.quantity,
          unitPriceQar: line.unitPrice,
          lensPriceQar: line.lensPrice || 0,
          totalPriceQar: lineTotal,
          isContactLensOrder: !!line.power || !!line.isPlano || line.eye !== '',
          isPlano: !!line.isPlano,
          power: sph,
          cylinder: cyl,
          axis: line.axis || null,
          addPower: line.addPower || (line.lensSummary && line.lensSummary !== 'Standard' ? line.lensSummary : null),
          createdAt: now,
        },
      });

      // Decrement Product stock
      await prisma.product.update({
        where: { id: line.productId },
        data: {
          stockQuantity: {
            decrement: line.quantity,
          },
        },
      });
    }

    // 4. Create Invoice
    const invoice = await prisma.invoice.create({
      data: {
        id: `INV_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        invoiceNumber,
        orderId: order.id,
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone && customerPhone.trim() ? customerPhone.trim() : '—',
        status: 'PAID',
        subtotalQar: subtotal,
        taxRate: taxRate || 0,
        taxTotalQar: taxTotal,
        discountQar: discount,
        deliveryFeeQar: delFee,
        totalQar: grandTotal,
        issuedAt: now,
        paidAt: now,
        salespersonName: cashierName || 'Cashier',
        createdAt: now,
        updatedAt: now,
      },
    });

    // 5. Update CashRegisterShift if open
    if (shiftId && shiftId !== 'SHIFT-AUTO') {
      const isCash = paymentMethod === 'CASH' || mappedPaymentMethod === 'IN_STORE_PAYMENT';
      const isCard = paymentMethod === 'CARD' || mappedPaymentMethod === 'CREDIT_CARD' || mappedPaymentMethod === 'DEBIT_CARD_QPAY';
      const isOther = paymentMethod === 'STORE_CREDIT';
      await prisma.cashRegisterShift.update({
        where: { id: shiftId },
        data: {
          ...(isCash ? { cashSales: { increment: grandTotal } } : {}),
          ...(isCard ? { cardSales: { increment: grandTotal } } : {}),
          ...(isOther ? { otherSales: { increment: grandTotal } } : {}),
        },
      });
    }

    // 6. Fetch Company Profile for receipt header
    const company = await prisma.companyProfile.findFirst();

    // 7. Assemble Receipt Payload matching EyeNovaBilling ReceiptData
    const receipt: ReceiptPayload = {
      invoiceNumber: invoice.invoiceNumber,
      orderNumber: order.orderNumber,
      status: invoice.status || 'PAID',
      date: formatQatarDate(now),
      time: formatQatarTime(now),
      storeNameEn: company?.nameEn || 'EyeNova Optical - 02 Mall, Al Kheesa',
      storeNameAr: company?.nameAr || 'آي نوفا للتجارة البصرية',
      addressEn: company?.addressEn || '02 Mall, 79 Street 773, Al Kheesa',
      addressAr: company?.addressAr || '',
      phone: company?.phone || '+974 6633 7371',
      crNumber: company?.crNumber || '',
      vatNumber: '',
      cashierName: cashierName || 'Cashier',
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || '',
      paymentMethod,
      paymentReference: paymentReference || undefined,
      subtotal,
      discount,
      taxRate: taxRate || 0,
      taxAmount: taxTotal,
      deliveryFee: delFee,
      total: grandTotal,
      cashTendered: cashTendered !== undefined ? Number(cashTendered) : undefined,
      changeDue: changeDue !== undefined ? Number(changeDue) : undefined,
      notes: notes || undefined,
      items: lines.map((l) => ({
        name: l.titleEn,
        specs: formatOpticalSpecs(l),
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        total: l.unitPrice * l.quantity,
      })),
    };

    return NextResponse.json({
      success: true,
      order,
      invoice,
      receipt,
    });
  } catch (error: any) {
    console.error('POS Checkout Transaction Error:', error);
    return NextResponse.json(
      { error: error.message || 'Transaction failed. Please check stock or database connection.' },
      { status: 500 }
    );
  }
}
