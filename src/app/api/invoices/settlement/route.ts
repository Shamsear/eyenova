import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      platform = 'SNOONU',
      invoiceIds,
      netAmountReceived = 0,
      commissionAmount = 0,
      statementRef = '',
      operatorName = 'Branch Manager',
    }: {
      platform: string;
      invoiceIds: string[];
      netAmountReceived: number;
      commissionAmount: number;
      statementRef?: string;
      operatorName?: string;
    } = body;

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json({ error: 'Please select at least one bill to settle.' }, { status: 400 });
    }

    const netReceived = Math.max(0, parseFloat(String(netAmountReceived)) || 0);
    const commission = Math.max(0, parseFloat(String(commissionAmount)) || 0);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch target invoices
      const invoices = await tx.invoice.findMany({
        where: { id: { in: invoiceIds } },
        include: { order: true },
      });

      if (invoices.length === 0) {
        throw new Error('None of the selected invoices were found.');
      }

      const now = new Date();

      // 2. Mark invoices as PAID
      await tx.invoice.updateMany({
        where: { id: { in: invoiceIds } },
        data: {
          status: 'PAID',
          paidAt: now,
          updatedAt: now,
        },
      });

      // 3. Mark underlying orders as PAID
      const orderIds = invoices
        .map((inv) => inv.orderId)
        .filter((oid): oid is string => Boolean(oid));

      if (orderIds.length > 0) {
        await tx.order.updateMany({
          where: { id: { in: orderIds } },
          data: {
            paymentStatus: 'PAID',
            paymentReference: statementRef || `${platform} Payout`,
            updatedAt: now,
          },
        });
      }

      // 4. Update CompanyTreasury
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

      const curCash = Number(treasury.cashBalanceQar || 0);
      const curBank = Number(treasury.bankBalanceQar || 0);
      const curTotal = Number(treasury.balanceQar || 0);

      const newBank = curBank + netReceived;
      const newTotal = curTotal + netReceived;

      if (netReceived > 0) {
        await tx.companyTreasury.update({
          where: { id: treasury.id },
          data: {
            bankBalanceQar: newBank,
            balanceQar: newTotal,
            lastUpdated: now,
          },
        });
      }

      // 5. FinancialAuditLedger entries
      if (netReceived > 0) {
        await tx.financialAuditLedger.create({
          data: {
            id: `TX_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: now,
            txType: 'SALE_REVENUE',
            amountQar: netReceived,
            balanceBeforeQar: curTotal,
            balanceAfterQar: newTotal,
            profitImpactQar: netReceived,
            paymentChannel: 'BANK',
            cashAmountQar: 0,
            bankAmountQar: netReceived,
            cashBalanceAfterQar: curCash,
            bankBalanceAfterQar: newBank,
            referenceType: 'AGGREGATOR_PAYOUT',
            referenceId: statementRef || platform,
            operatorName: operatorName || 'Branch Manager',
            notes: `${platform} Settlement Payout (${invoices.length} bills) - Net Bank Deposit`,
          },
        });
      }

      if (commission > 0) {
        await tx.financialAuditLedger.create({
          data: {
            id: `TX_${Date.now() + 1}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: now,
            txType: 'AGGREGATOR_COMMISSION',
            amountQar: -commission,
            balanceBeforeQar: newTotal,
            balanceAfterQar: newTotal,
            profitImpactQar: -commission,
            paymentChannel: 'BANK',
            cashAmountQar: 0,
            bankAmountQar: 0,
            cashBalanceAfterQar: curCash,
            bankBalanceAfterQar: newBank,
            referenceType: 'AGGREGATOR_COMMISSION',
            referenceId: statementRef || platform,
            operatorName: operatorName || 'Branch Manager',
            notes: `${platform} Deducted Commission/Fee (${invoices.length} bills) Ref #${statementRef || 'Auto'}`,
          },
        });
      }

      return {
        settledCount: invoices.length,
        totalGrossQar: invoices.reduce((sum, inv) => sum + Number(inv.totalQar || 0), 0),
        netAmountReceived: netReceived,
        commissionAmount: commission,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully reconciled and settled ${result.settledCount} ${platform} bills.`,
      result,
    });
  } catch (error: any) {
    console.error('Error settling aggregator bills:', error);
    return NextResponse.json(
      { error: error.message || 'Settlement failed. Please try again.' },
      { status: 500 }
    );
  }
}
