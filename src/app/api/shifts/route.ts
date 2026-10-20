import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const storeId = searchParams.get('storeId') || 'STORE-MAIN';

    // Find latest open shift
    const shift = await prisma.cashRegisterShift.findFirst({
      where: {
        storeId,
        status: 'OPEN',
      },
      orderBy: { openedAt: 'desc' },
    });

    return NextResponse.json({ shift });
  } catch (error: any) {
    console.error('Error fetching shift:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch shift' }, { status: 500 });
  }
}

// Open or Close Shift
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, shiftId, openingCash, actualClosingCash, userId, userName, storeId, storeName, notes } = body;

    const now = new Date();

    if (action === 'OPEN') {
      const openAmount = Math.max(0, parseFloat(openingCash) || 0);

      const shift = await prisma.cashRegisterShift.create({
        data: {
          id: `SHIFT_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          cashierName: userName || 'Store Cashier',
          storeId: storeId || 'STORE-MAIN',
          openedAt: now,
          openingFloat: openAmount,
          cashSales: 0,
          cardSales: 0,
          splitCashSales: 0,
          otherSales: 0,
          notes: notes || 'Opened register shift',
          status: 'OPEN',
        },
      });

      return NextResponse.json({ success: true, shift });
    }

    if (action === 'CLOSE') {
      if (!shiftId) {
        return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 });
      }

      const existing = await prisma.cashRegisterShift.findUnique({
        where: { id: shiftId },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
      }

      const actualCash = parseFloat(actualClosingCash) || 0;
      const expectedCash = Number(existing.openingFloat) + Number(existing.cashSales) + Number(existing.cashIn) - Number(existing.pettyCashOut);
      const diff = Math.round((actualCash - expectedCash) * 100) / 100;

      const closed = await prisma.cashRegisterShift.update({
        where: { id: shiftId },
        data: {
          closedAt: now,
          countedCash: actualCash,
          variance: diff,
          status: 'CLOSED',
          notes: (existing.notes ? `${existing.notes} | ` : '') + (notes || `Closed shift with ${diff >= 0 ? '+' : ''}${diff.toFixed(2)} QAR variance`),
        },
      });

      return NextResponse.json({ success: true, shift: closed });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling shift:', error);
    return NextResponse.json({ error: error.message || 'Shift operation failed' }, { status: 500 });
  }
}
