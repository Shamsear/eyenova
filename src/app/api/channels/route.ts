import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function getChannelKey(orderSource: string | null, paymentMethod: string | null): string {
  const s = (orderSource || '').toUpperCase();
  const m = (paymentMethod || '').toUpperCase();

  if (s === 'SNOONU' || m === 'SNOONU') return 'SNOONU';
  if (s === 'TALABAT' || m === 'TALABAT') return 'TALABAT';
  if (s === 'RAFEEQ' || m === 'RAFEEQ') return 'RAFEEQ';
  if (s === 'IN_STORE_POS' || s === 'POS' || m === 'IN_STORE_POS' || m === 'IN_STORE_PAYMENT') return 'IN_STORE_POS';
  if (s.includes('SHOPIFY')) return 'SHOPIFY';
  if (s.includes('WEBSITE') || s.includes('WEB')) return 'WEBSITE';
  if (s.includes('WHATSAPP')) return 'WHATSAPP';
  return 'ONLINE_OTHER';
}

function getChannelInfo(key: string) {
  switch (key) {
    case 'IN_STORE_POS':
      return { name: 'In-Store Shop (POS)', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'store' };
    case 'SNOONU':
      return { name: 'Snoonu Delivery', badgeBg: 'bg-red-50 text-red-600 border-red-200', icon: 'truck' };
    case 'TALABAT':
      return { name: 'Talabat Delivery', badgeBg: 'bg-orange-50 text-orange-600 border-orange-200', icon: 'truck' };
    case 'RAFEEQ':
      return { name: 'Rafeeq Delivery', badgeBg: 'bg-rose-50 text-rose-800 border-rose-200', icon: 'truck' };
    case 'SHOPIFY':
      return { name: 'Shopify Store', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'shopping-bag' };
    case 'WEBSITE':
      return { name: 'Online Website', badgeBg: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'globe' };
    case 'WHATSAPP':
      return { name: 'WhatsApp Orders', badgeBg: 'bg-teal-50 text-teal-700 border-teal-200', icon: 'message-circle' };
    default:
      return { name: 'Website & Online', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'globe' };
  }
}

const PAYOUT_COMM_REGEX = /Comm\s+([0-9\.]+)\s*QAR/i;
const NOTE_COMM_PCT_REGEX = /Comm:\s*([0-9\.]+)%/i;

function isCashPayment(method?: string | null): boolean {
  if (!method) return true;
  const m = method.trim().toUpperCase();
  return ['CASH', 'IN_STORE_PAYMENT', 'IN_STORE_POS', 'CASH_ON_DELIVERY', 'TILL', 'COD'].includes(m) || m.includes('CASH');
}

function isCardPayment(method?: string | null): boolean {
  if (!method) return false;
  const m = method.trim().toUpperCase();
  return ['CARD', 'CREDIT_CARD', 'DEBIT_CARD', 'POS_CARD', 'VISA', 'MASTERCARD', 'AMEX'].includes(m) || m.includes('CARD') || m.includes('CREDIT');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const preset = searchParams.get('preset') || 'ALL';
    const fromDateStr = searchParams.get('from');
    const toDateStr = searchParams.get('to');

    // 1. Resolve Date Range
    let fromDate: Date | null = null;
    let toDate: Date | null = null;
    const now = new Date();

    if (preset === 'TODAY') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (preset === 'YESTERDAY') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay();
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (preset === 'THIS_MONTH') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (preset === 'LAST_MONTH') {
      fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (preset === 'CUSTOM' && fromDateStr && toDateStr) {
      fromDate = new Date(fromDateStr);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date(toDateStr);
      toDate.setHours(23, 59, 59, 999);
    }

    const whereOrder: any = {
      orderStatus: { not: 'CANCELLED' }
    };

    if (fromDate && toDate) {
      whereOrder.createdAt = {
        gte: fromDate,
        lte: toDate
      };
    } else if (fromDate) {
      whereOrder.createdAt = { gte: fromDate };
    } else if (toDate) {
      whereOrder.createdAt = { lte: toDate };
    }

    // 2. Query Orders with Items, Products, and Batches
    const orders = await prisma.order.findMany({
      where: whereOrder,
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Map orders and calculate profitability & commissions
    const orderRows: any[] = [];
    const productStatsMap = new Map<string, { id: string; title: string; brand: string; units: number; rev: number; cogs: number }>();

    orders.forEach((o) => {
      const chKey = getChannelKey(o.orderSource, o.paymentMethod);
      const chInfo = getChannelInfo(chKey);

      let orderCogs = 0;
      const itemDescriptions: string[] = [];

      o.items.forEach((it) => {
        const itemCost = Number(it.costPriceQar) > 0 ? Number(it.costPriceQar) : (it.product ? Number(it.product.costPriceQar) || 100 : 100);
        const lineCost = itemCost * it.quantity;
        orderCogs += lineCost;

        const pwr = it.power ? ` (${it.power})` : '';
        itemDescriptions.push(`${it.product?.titleEn || 'Item'}${pwr} x${it.quantity}`);

        // Accumulate product stats
        if (it.product) {
          const pid = it.product.id;
          const existing = productStatsMap.get(pid) || {
            id: pid,
            title: it.product.titleEn,
            brand: it.product.brandName || 'Standard',
            units: 0,
            rev: 0,
            cogs: 0
          };
          existing.units += it.quantity;
          existing.rev += Number(it.totalPriceQar);
          existing.cogs += lineCost;
          productStatsMap.set(pid, existing);
        }
      });

      const netSold = Number(o.totalQar);
      const discount = Number(o.discountQar) || 0;
      const grossSold = netSold + discount;

      // Commission calculation
      let commQar = 0;
      let commPct = 0;
      let settlementStatus = 'SETTLED';

      if (chKey === 'SNOONU' || chKey === 'TALABAT' || chKey === 'RAFEEQ') {
        const note = o.notes || '';
        const isPaidAndSettled = (o.paymentStatus === 'PAID' && (note.includes('Payout') || note.includes('Settled')));
        const commMatch = note.match(PAYOUT_COMM_REGEX);

        if (isPaidAndSettled && commMatch && parseFloat(commMatch[1])) {
          commQar = parseFloat(commMatch[1]);
          commPct = netSold > 0 ? Math.round((commQar / netSold) * 1000) / 10 : 0;
          settlementStatus = 'SETTLED';
        } else if (isPaidAndSettled) {
          const pctMatch = note.match(NOTE_COMM_PCT_REGEX);
          if (pctMatch && parseFloat(pctMatch[1])) {
            commPct = parseFloat(pctMatch[1]);
            commQar = Math.round(netSold * (commPct / 100) * 100) / 100;
          } else {
            commPct = 0;
            commQar = 0;
          }
          settlementStatus = 'SETTLED';
        } else {
          // PENDING: Do NOT put default commission!
          commPct = 0;
          commQar = 0;
          settlementStatus = 'PENDING_PAYOUT';
        }
      } else {
        commPct = 0;
        commQar = 0;
        settlementStatus = 'SETTLED';
      }

      const netPayout = (settlementStatus === 'SETTLED') ? (netSold - commQar) : netSold;
      const netProfit = netPayout - orderCogs;
      const profitMargin = netSold > 0 ? Math.round((netProfit / netSold) * 1000) / 10 : 0;

      orderRows.push({
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt.toISOString(),
        channelKey: chKey,
        channelName: chInfo.name,
        badgeBg: chInfo.badgeBg,
        orderSource: o.orderSource || 'IN_STORE_POS',
        paymentMethod: o.paymentMethod || 'CASH',
        paymentStatus: o.paymentStatus || 'PAID',
        paymentReference: o.paymentReference || '',
        customerName: o.customerName || 'Walk-in Guest',
        salespersonName: o.salespersonName || 'Store Cashier',
        notes: o.notes || '',
        grossSoldQar: grossSold,
        discountQar: discount,
        netSoldQar: netSold,
        commissionQar: commQar,
        commissionPercent: commPct,
        netPayoutQar: netPayout,
        totalCogsQar: orderCogs,
        netProfitQar: netProfit,
        profitMarginPercent: profitMargin,
        settlementStatus,
        itemsSummary: itemDescriptions.join(', ') || 'Contact lenses'
      });
    });

    // 4. Compute Channel Comparisons Matrix
    const channelOrderMap = new Map<string, typeof orderRows>();
    orderRows.forEach((r) => {
      const arr = channelOrderMap.get(r.channelKey) || [];
      arr.push(r);
      channelOrderMap.set(r.channelKey, arr);
    });

    const channelComparisons: any[] = [];
    channelOrderMap.forEach((list, key) => {
      const chInfo = getChannelInfo(key);
      const count = list.length;
      const gross = list.reduce((acc, x) => acc + x.grossSoldQar, 0);
      const disc = list.reduce((acc, x) => acc + x.discountQar, 0);
      const net = list.reduce((acc, x) => acc + x.netSoldQar, 0);
      const cogs = list.reduce((acc, x) => acc + x.totalCogsQar, 0);
      const comm = list.filter((x) => x.settlementStatus === 'SETTLED').reduce((acc, x) => acc + x.commissionQar, 0);
      const profit = net - cogs - comm;
      const margin = net > 0 ? Math.round((profit / net) * 1000) / 10 : 0;
      const settled = list.filter((x) => x.settlementStatus === 'SETTLED').reduce((acc, x) => acc + x.netPayoutQar, 0);
      const pending = list.filter((x) => x.settlementStatus === 'PENDING_PAYOUT').reduce((acc, x) => acc + x.netSoldQar, 0);

      channelComparisons.push({
        channelKey: key,
        channelName: chInfo.name,
        badgeBg: chInfo.badgeBg,
        ordersCount: count,
        grossSalesQar: gross,
        discountsQar: disc,
        netSalesQar: net,
        totalCogsQar: cogs,
        commissionQar: comm,
        netProfitQar: profit,
        profitMarginPercent: margin,
        settledAmountQar: settled,
        pendingPayoutQar: pending
      });
    });
    channelComparisons.sort((a, b) => b.netSalesQar - a.netSalesQar);

    // 5. Overall Summary
    const settledOrders = orderRows.filter((x) => x.settlementStatus === 'SETTLED');
    const pendingOrders = orderRows.filter((x) => x.settlementStatus === 'PENDING_PAYOUT');

    const totalOrders = orderRows.length;
    const grossSales = orderRows.reduce((acc, x) => acc + x.grossSoldQar, 0);
    const totalDiscounts = orderRows.reduce((acc, x) => acc + x.discountQar, 0);
    const netSales = orderRows.reduce((acc, x) => acc + x.netSoldQar, 0);
    const totalCogs = orderRows.reduce((acc, x) => acc + x.totalCogsQar, 0);
    const totalCommission = settledOrders.reduce((acc, x) => acc + x.commissionQar, 0);
    const netProfit = netSales - totalCogs - totalCommission;
    const profitMargin = netSales > 0 ? Math.round((netProfit / netSales) * 1000) / 10 : 0;
    const settledAmount = settledOrders.reduce((acc, x) => acc + x.netPayoutQar, 0);
    const pendingPayout = pendingOrders.reduce((acc, x) => acc + x.netSoldQar, 0);
    const cashSales = orderRows.filter((x) => isCashPayment(x.paymentMethod)).reduce((acc, x) => acc + x.netSoldQar, 0);
    const cardSales = orderRows.filter((x) => isCardPayment(x.paymentMethod)).reduce((acc, x) => acc + x.netSoldQar, 0);

    const overallSummary = {
      totalOrders,
      grossSalesQar: grossSales,
      discountsQar: totalDiscounts,
      netSalesQar: netSales,
      totalCogsQar: totalCogs,
      totalCommissionQar: totalCommission,
      netProfitQar: netProfit,
      profitMarginPercent: profitMargin,
      settledAmountQar: settledAmount,
      pendingPayoutQar: pendingPayout,
      settledOrdersCount: settledOrders.length,
      pendingOrdersCount: pendingOrders.length,
      cashSalesQar: cashSales,
      cardSalesQar: cardSales
    };

    // 6. Top Products Ranking
    const topProducts = Array.from(productStatsMap.values())
      .map((p) => {
        const profit = p.rev - p.cogs;
        const margin = p.rev > 0 ? Math.round((profit / p.rev) * 1000) / 10 : 0;
        return {
          productId: p.id,
          productTitle: p.title,
          brandName: p.brand,
          unitsSold: p.units,
          grossSalesQar: p.rev,
          totalCogsQar: p.cogs,
          totalCommissionQar: 0,
          netProfitQar: profit,
          profitMarginPercent: margin,
          avgUnitCostQar: p.units > 0 ? Math.round((p.cogs / p.units) * 100) / 100 : 0,
          avgSellingPriceQar: p.units > 0 ? Math.round((p.rev / p.units) * 100) / 100 : 0
        };
      })
      .sort((a, b) => b.netProfitQar - a.netProfitQar)
      .slice(0, 15);

    return NextResponse.json({
      success: true,
      overallSummary,
      channelComparisons,
      allOrders: orderRows,
      topProducts
    });
  } catch (err: any) {
    console.error('Error in channels API:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch sales channel audit data' },
      { status: 500 }
    );
  }
}
