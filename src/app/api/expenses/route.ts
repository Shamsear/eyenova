import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const expenses = await prisma.expense.findMany({
      take: 100,
      orderBy: { expenseDate: 'desc' },
    });

    const formatted = expenses.map((e) => ({
      ...e,
      amountQar: Number(e.amountQar),
    }));

    return NextResponse.json({ expenses: formatted });
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, category, amountQar, paymentSource, receiptNumber, vendorName, notes, userId, userName, storeId, shiftId } = body;

    const amount = Math.max(0, parseFloat(amountQar) || 0);
    if (!title || amount <= 0) {
      return NextResponse.json({ error: 'Title and valid amount are required' }, { status: 400 });
    }

    const now = new Date();

    const validCategories = [
      'RENT',
      'UTILITIES_KAHRAMAA',
      'PANTRY_TEA',
      'PACKAGING_BAGS',
      'LOGISTICS_DELIVERY',
      'CLEANING_MAINTENANCE',
      'MARKETING_ADS',
      'POS_ROLLS',
      'MISCELLANEOUS',
    ];
    const expCat = validCategories.includes(category) ? category : 'MISCELLANEOUS';
    const expSource = paymentSource === 'CASH_DRAWER' ? 'CASH_DRAWER' : paymentSource === 'CORPORATE_CARD' ? 'CORPORATE_CARD' : 'COMPANY_TREASURY';

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          id: `EXP_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          expenseNumber: `EXP-${Date.now().toString().slice(-6)}`,
          title: title.trim(),
          category: expCat as any,
          amountQar: amount,
          paymentSource: expSource as any,
          receiptNumber: receiptNumber || null,
          paidTo: vendorName || null,
          recordedBy: userName || 'Store Cashier',
          storeId: storeId || 'STORE-MAIN',
          shiftId: shiftId || null,
          notes: notes || null,
          expenseDate: now,
          createdAt: now,
        },
      });

      // If paid from cash drawer, increment shift pettyCashOut
      if (expSource === 'CASH_DRAWER' && shiftId && shiftId !== 'SHIFT-AUTO') {
        await tx.cashRegisterShift.update({
          where: { id: shiftId },
          data: {
            pettyCashOut: { increment: amount },
          },
        });
      }

      return created;
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    console.error('Error recording expense:', error);
    return NextResponse.json({ error: error.message || 'Failed to record expense' }, { status: 500 });
  }
}
