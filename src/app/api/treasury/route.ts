import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatQatarDateTime } from '@/lib/utils';

export async function GET() {
  try {
    // 1. Fetch or initialize treasury
    let treasury = await prisma.companyTreasury.findFirst();
    if (!treasury) {
      treasury = await prisma.companyTreasury.create({
        data: {
          id: 'COMPANY_MAIN',
          cashBalanceQar: 0,
          bankBalanceQar: 0,
          balanceQar: 0,
        },
      });
    }

    // 2. Fetch financial audit ledger movements
    const movements = await prisma.financialAuditLedger.findMany({
      orderBy: { timestamp: 'desc' },
      take: 200,
    });

    const formattedMovements = movements.map((m) => {
      const isIncoming =
        m.txType === 'SALE_REVENUE' ||
        m.txType === 'SHOPIFY_SALE' ||
        m.txType === 'CAPITAL_TOPUP' ||
        Number(m.amountQar) >= 0;

      return {
        id: m.id,
        timestamp: formatQatarDateTime(m.timestamp),
        type: m.txType,
        channel: m.paymentChannel || 'CASH',
        amount: Math.abs(Number(m.amountQar)),
        direction: isIncoming ? ('IN' as const) : ('OUT' as const),
        operator: m.operatorName || 'System Admin',
        notes: m.notes || m.referenceType || 'Financial Transaction',
      };
    });

    return NextResponse.json({
      treasury: {
        cashBalanceQar: Number(treasury.cashBalanceQar),
        bankBalanceQar: Number(treasury.bankBalanceQar),
        balanceQar: Number(treasury.balanceQar),
        lastUpdated: treasury.lastUpdated,
      },
      movements: formattedMovements,
    });
  } catch (error: any) {
    console.error('Error fetching treasury data:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch treasury' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, notes, channel = 'CASH', operator = 'Branch Manager' } = body;

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      return NextResponse.json({ error: 'Valid positive amount is required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let treasury = await tx.companyTreasury.findFirst();
      if (!treasury) {
        treasury = await tx.companyTreasury.create({
          data: {
            id: 'COMPANY_MAIN',
            cashBalanceQar: 0,
            bankBalanceQar: 0,
            balanceQar: 0,
          },
        });
      }

      const currentCash = Number(treasury.cashBalanceQar);
      const currentBank = Number(treasury.bankBalanceQar);
      const currentTotal = Number(treasury.balanceQar);

      const isCash = channel === 'CASH';
      const newCash = isCash ? currentCash + amt : currentCash;
      const newBank = !isCash ? currentBank + amt : currentBank;
      const newTotal = currentTotal + amt;

      // Update Treasury record
      const updatedTreasury = await tx.companyTreasury.update({
        where: { id: treasury.id },
        data: {
          cashBalanceQar: newCash,
          bankBalanceQar: newBank,
          balanceQar: newTotal,
          lastUpdated: new Date(),
        },
      });

      // Record in FinancialAuditLedger
      const movement = await tx.financialAuditLedger.create({
        data: {
          id: `TM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date(),
          txType: 'MANUAL_ADJUSTMENT',
          amountQar: amt,
          balanceBeforeQar: currentTotal,
          balanceAfterQar: newTotal,
          operatorName: operator,
          notes: notes || (isCash ? 'Store safe vault cash drop' : 'Bank settlement deposit'),
          paymentChannel: isCash ? 'CASH' : 'BANK',
          cashAmountQar: isCash ? amt : 0,
          bankAmountQar: !isCash ? amt : 0,
          cashBalanceAfterQar: newCash,
          bankBalanceAfterQar: newBank,
        },
      });

      return { updatedTreasury, movement };
    });

    return NextResponse.json({
      success: true,
      treasury: {
        cashBalanceQar: Number(result.updatedTreasury.cashBalanceQar),
        bankBalanceQar: Number(result.updatedTreasury.bankBalanceQar),
        balanceQar: Number(result.updatedTreasury.balanceQar),
      },
      movement: result.movement,
    });
  } catch (error: any) {
    console.error('Error logging treasury movement:', error);
    return NextResponse.json({ error: error.message || 'Failed to record vault drop' }, { status: 500 });
  }
}
