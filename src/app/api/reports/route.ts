import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [todayOrders, allOrders, unpaidInvoices, lowStockCount] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: today } },
        select: {
          totalQar: true,
          paymentMethod: true,
          items: {
            select: {
              costPriceQar: true,
              grossProfitQar: true,
              quantity: true,
              totalPriceQar: true,
            },
          },
        },
      }),
      prisma.order.findMany({
        take: 500,
        orderBy: { createdAt: 'desc' },
        select: {
          totalQar: true,
          paymentMethod: true,
          createdAt: true,
          items: {
            select: {
              costPriceQar: true,
              grossProfitQar: true,
              quantity: true,
              totalPriceQar: true,
            },
          },
        },
      }),
      prisma.invoice.count({
        where: { status: { in: ['DRAFT', 'ISSUED'] } },
      }),
      prisma.product.count({
        where: { isActive: true, stockQuantity: { lte: 3 } },
      }),
    ]);

    const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.totalQar), 0);
    const todayCount = todayOrders.length;

    const totalRevenue = allOrders.reduce((sum, o) => sum + Number(o.totalQar), 0);
    const totalCount = allOrders.length;

    // Real cost calculations from OrderItem ledger
    const calcCost = (orders: Array<{ items: Array<{ costPriceQar?: any; quantity?: number }> }>) => {
      return orders.reduce((sum, o) => {
        const orderCost = o.items.reduce(
          (iSum, item) => iSum + Number(item.costPriceQar || 0) * (item.quantity || 1),
          0
        );
        return sum + orderCost;
      }, 0);
    };

    const todayCost = Math.round(calcCost(todayOrders) * 100) / 100;
    const todayProfit = Math.round((todayRevenue - todayCost) * 100) / 100;
    const todayMargin = todayRevenue > 0 ? Math.round((todayProfit / todayRevenue) * 100) : 0;

    const totalCost = Math.round(calcCost(allOrders) * 100) / 100;
    const totalProfit = Math.round((totalRevenue - totalCost) * 100) / 100;
    const totalMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

    // Payment methods aggregation (from all orders or today's orders)
    const paymentMap: Record<string, { count: number; total: number }> = {};
    for (const ord of allOrders) {
      const m = ord.paymentMethod || 'CASH';
      if (!paymentMap[m]) paymentMap[m] = { count: 0, total: 0 };
      paymentMap[m].count += 1;
      paymentMap[m].total += Number(ord.totalQar);
    }

    const paymentBreakdown = Object.entries(paymentMap).map(([method, val]) => ({
      method,
      count: val.count,
      total: val.total,
    }));

    // Period summary
    const recentSales = [
      {
        period: "Today's Counter",
        orders: todayCount,
        revenue: todayRevenue,
        cost: todayCost,
        profit: todayProfit,
        margin: todayMargin,
      },
      {
        period: 'All-Time In-Store & Online',
        orders: totalCount,
        revenue: totalRevenue,
        cost: totalCost,
        profit: totalProfit,
        margin: totalMargin,
      },
    ];

    return NextResponse.json({
      stats: {
        todayRevenue,
        todayCount,
        totalRevenue,
        totalCount,
        unpaidCount: unpaidInvoices,
        lowStockCount,
        recentSales,
        paymentBreakdown,
      },
    });
  } catch (error: any) {
    console.error('Reports API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch reports' }, { status: 500 });
  }
}
