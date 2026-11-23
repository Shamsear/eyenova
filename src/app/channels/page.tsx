'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Shell } from '@/components/layout/shell';
import { formatQar, formatQatarDateTime } from '@/lib/utils';
import {
  Layers,
  Store,
  Truck,
  Globe,
  Package,
  TrendingUp,
  Percent,
  DollarSign,
  Download,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  AlertCircle,
  CreditCard,
  Banknote,
  Receipt
} from 'lucide-react';

interface ChannelComparison {
  channelKey: string;
  channelName: string;
  badgeBg: string;
  ordersCount: number;
  grossSalesQar: number;
  discountsQar: number;
  netSalesQar: number;
  totalCogsQar: number;
  commissionQar: number;
  netProfitQar: number;
  profitMarginPercent: number;
  settledAmountQar: number;
  pendingPayoutQar: number;
}

interface OrderAuditRow {
  id: string;
  orderNumber: string;
  createdAt: string;
  channelKey: string;
  channelName: string;
  badgeBg: string;
  orderSource: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentReference: string;
  customerName: string;
  salespersonName: string;
  notes: string;
  grossSoldQar: number;
  discountQar: number;
  netSoldQar: number;
  commissionQar: number;
  commissionPercent: number;
  netPayoutQar: number;
  totalCogsQar: number;
  netProfitQar: number;
  profitMarginPercent: number;
  settlementStatus: string;
  itemsSummary: string;
}

interface ProductProfitRank {
  productId: string;
  productTitle: string;
  brandName: string;
  unitsSold: number;
  grossSalesQar: number;
  totalCogsQar: number;
  totalCommissionQar: number;
  netProfitQar: number;
  profitMarginPercent: number;
  avgUnitCostQar: number;
  avgSellingPriceQar: number;
}

const DATE_PRESETS = [
  { id: 'ALL', label: 'All Time' },
  { id: 'TODAY', label: 'Today' },
  { id: 'YESTERDAY', label: 'Yesterday' },
  { id: 'THIS_WEEK', label: 'This Week' },
  { id: 'THIS_MONTH', label: 'This Month' },
  { id: 'LAST_MONTH', label: 'Last Month' },
  { id: 'CUSTOM', label: 'Custom...' },
];

export default function SalesChannelsPage() {
  const [selectedTab, setSelectedTab] = useState<'UNIFIED' | 'SHOP' | 'SNOONU' | 'ONLINE' | 'PRODUCTS'>('UNIFIED');
  const [selectedDatePreset, setSelectedDatePreset] = useState('ALL');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Snoonu specific sub-filters
  const [aggPlatform, setAggPlatform] = useState('ALL');
  const [aggSettlement, setAggSettlement] = useState('ALL');

  // Data states
  const [overallSummary, setOverallSummary] = useState<any>({});
  const [channelComparisons, setChannelComparisons] = useState<ChannelComparison[]>([]);
  const [allOrders, setAllOrders] = useState<OrderAuditRow[]>([]);
  const [topProducts, setTopProducts] = useState<ProductProfitRank[]>([]);

  const loadData = async (preset = selectedDatePreset, from = customFrom, to = customTo) => {
    setLoading(true);
    try {
      let url = `/api/channels?preset=${preset}`;
      if (preset === 'CUSTOM' && from && to) {
        url += `&from=${from}&to=${to}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setOverallSummary(data.overallSummary || {});
        setChannelComparisons(data.channelComparisons || []);
        setAllOrders(data.allOrders || []);
        setTopProducts(data.topProducts || []);
      }
    } catch (err) {
      console.error('Failed to load channel report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDatePreset]);

  const handleDatePresetClick = (pId: string) => {
    setSelectedDatePreset(pId);
    if (pId === 'CUSTOM') {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
    }
  };

  const handleApplyCustomDate = () => {
    setShowCustomDate(false);
    loadData('CUSTOM', customFrom, customTo);
  };

  // Filtered orders based on selected tab and filters
  const filteredOrders = useMemo(() => {
    let list = allOrders;

    if (selectedTab === 'SHOP') {
      list = list.filter((o) => o.channelKey === 'IN_STORE_POS');
    } else if (selectedTab === 'SNOONU') {
      list = list.filter((o) => ['SNOONU', 'TALABAT', 'RAFEEQ'].includes(o.channelKey));
      if (aggPlatform !== 'ALL') {
        list = list.filter((o) => o.channelKey === aggPlatform);
      }
      if (aggSettlement === 'SETTLED') {
        list = list.filter((o) => o.settlementStatus === 'SETTLED');
      } else if (aggSettlement === 'PENDING') {
        list = list.filter((o) => o.settlementStatus === 'PENDING_PAYOUT');
      }
    } else if (selectedTab === 'ONLINE') {
      list = list.filter((o) => o.channelKey === 'ONLINE_OTHER');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.salespersonName.toLowerCase().includes(q) ||
          o.paymentReference.toLowerCase().includes(q) ||
          o.itemsSummary.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allOrders, selectedTab, aggPlatform, aggSettlement, search]);

  // Tab-specific summary metrics computed live from filtered orders
  const tabSummary = useMemo(() => {
    let target = allOrders;
    if (selectedTab === 'SHOP') {
      target = target.filter((o) => o.channelKey === 'IN_STORE_POS');
    } else if (selectedTab === 'SNOONU') {
      target = target.filter((o) => ['SNOONU', 'TALABAT', 'RAFEEQ'].includes(o.channelKey));
    } else if (selectedTab === 'ONLINE') {
      target = target.filter((o) => o.channelKey === 'ONLINE_OTHER');
    }

    const count = target.length;
    const sold = target.reduce((a, b) => a + b.netSoldQar, 0);
    const disc = target.reduce((a, b) => a + b.discountQar, 0);
    const cogs = target.reduce((a, b) => a + b.totalCogsQar, 0);
    const comm = target.reduce((a, b) => a + b.commissionQar, 0);
    const profit = sold - cogs - comm;
    const margin = sold > 0 ? Math.round((profit / sold) * 1000) / 10 : 0;
    const settled = target.filter((x) => x.settlementStatus === 'SETTLED').reduce((a, b) => a + b.netPayoutQar, 0);
    const pending = target.filter((x) => x.settlementStatus === 'PENDING_PAYOUT').reduce((a, b) => a + b.netPayoutQar, 0);
    const cash = target.filter((x) => x.paymentMethod.toUpperCase().includes('CASH')).reduce((a, b) => a + b.netSoldQar, 0);
    const card = target.filter((x) => x.paymentMethod.toUpperCase().includes('CARD') || x.paymentMethod.toUpperCase().includes('CREDIT')).reduce((a, b) => a + b.netSoldQar, 0);

    return { count, sold, disc, cogs, comm, profit, margin, settled, pending, cash, card };
  }, [allOrders, selectedTab]);

  const exportCsv = () => {
    if (!filteredOrders.length) return;
    const headers = [
      'Order Number',
      'Date & Time',
      'Channel',
      'Payment Method',
      'Customer',
      'Salesperson',
      'App / Card Ref',
      'Sold Price QAR',
      'Discount QAR',
      'Commission QAR',
      'Commission %',
      'Net Payout QAR',
      'COGS QAR',
      'Net Profit QAR',
      'Margin %',
      'Settlement Status',
      'Items Delivered'
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.orderNumber}"`,
      `"${formatQatarDateTime(o.createdAt)}"`,
      `"${o.channelName}"`,
      `"${o.paymentMethod}"`,
      `"${o.customerName.replace(/"/g, '""')}"`,
      `"${o.salespersonName}"`,
      `"${o.paymentReference}"`,
      o.netSoldQar.toFixed(2),
      o.discountQar.toFixed(2),
      o.commissionQar.toFixed(2),
      o.commissionPercent.toFixed(1),
      o.netPayoutQar.toFixed(2),
      o.totalCogsQar.toFixed(2),
      o.netProfitQar.toFixed(2),
      o.profitMarginPercent.toFixed(1),
      `"${o.settlementStatus}"`,
      `"${o.itemsSummary.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Profit_Audit_${selectedTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Shell title="Sales Channels & Profitability Audit">
      <div className="space-y-4">
        {/* ==================== PAGE HEADER ==================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-stone-900 tracking-tight">
                  SALES CHANNELS &amp; PROFITABILITY AUDIT
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  REAL PROFIT &amp; COMMISSIONS
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Complete breakdown of sold price, wholesale product cost (COGS), platform commissions &amp; net realized profit across In-Store Shop, Snoonu, Talabat &amp; Online
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit CSV</span>
            </button>
          </div>
        </div>

        {/* ==================== PRIMARY TABS (OPTION B: UNIFIED & SEPARATE) ==================== */}
        <div className="flex flex-wrap items-center gap-1 bg-white p-1.5 rounded-xl border border-stone-200 shadow-xs">
          <button
            onClick={() => setSelectedTab('UNIFIED')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedTab === 'UNIFIED'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>📊 Unified Channels Overview</span>
          </button>
          <button
            onClick={() => setSelectedTab('SHOP')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedTab === 'SHOP'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>🏪 In-Store Shop Sales</span>
          </button>
          <button
            onClick={() => setSelectedTab('SNOONU')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedTab === 'SNOONU'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>🛵 Snoonu &amp; Delivery Aggregators</span>
          </button>
          <button
            onClick={() => setSelectedTab('ONLINE')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedTab === 'ONLINE'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>🌐 Website &amp; Online Orders</span>
          </button>
          <button
            onClick={() => setSelectedTab('PRODUCTS')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedTab === 'PRODUCTS'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>📦 Top Product Margins</span>
          </button>
        </div>

        {/* ==================== DATE PRESET TOOLBAR & SEARCH ==================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-stone-500 mr-1">Period:</span>
            {DATE_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleDatePresetClick(p.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  selectedDatePreset === p.id
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search order #, customer, app code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Custom Date Selector Modal / Banner */}
        {showCustomDate && (
          <div className="flex flex-wrap items-center gap-3 bg-sky-50 p-3 rounded-xl border border-sky-200 text-xs">
            <span className="font-bold text-sky-900">Custom Date Range:</span>
            <div className="flex items-center gap-1.5">
              <span>From:</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-1 rounded bg-white border border-stone-300 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span>To:</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-1 rounded bg-white border border-stone-300 text-xs"
              />
            </div>
            <button
              onClick={handleApplyCustomDate}
              className="px-3 py-1 rounded bg-sky-600 text-white font-bold hover:bg-sky-700"
            >
              Apply Filter
            </button>
          </div>
        )}

        {/* ==================== TAB 1: UNIFIED CHANNELS OVERVIEW ==================== */}
        {selectedTab === 'UNIFIED' && (
          <div className="space-y-4">
            {/* 5 KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 text-[10px] font-bold">
                  <span>TOTAL SOLD VALUE</span>
                  <span className="text-sky-600 font-semibold">{overallSummary.totalOrders || 0} Orders</span>
                </div>
                <div className="text-lg font-extrabold text-stone-900 mt-1">
                  {formatQar(overallSummary.netSalesQar || 0)}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">Gross billed to customers</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
                <div className="text-stone-500 text-[10px] font-bold">TOTAL PRODUCT COST (COGS)</div>
                <div className="text-lg font-extrabold text-red-600 mt-1">
                  {formatQar(overallSummary.totalCogsQar || 0)}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">Wholesale inventory acquisition cost</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
                <div className="text-stone-500 text-[10px] font-bold">COMMISSIONS DEDUCTED</div>
                <div className="text-lg font-extrabold text-orange-600 mt-1">
                  {formatQar(overallSummary.totalCommissionQar || 0)}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">Snoonu / Talabat cuts</div>
              </div>

              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-xs">
                <div className="flex items-center justify-between text-emerald-800 text-[10px] font-bold">
                  <span>NET REALIZED PROFIT</span>
                  <span className="bg-emerald-200/60 px-1.5 py-0.5 rounded text-emerald-800">
                    {overallSummary.profitMarginPercent || 0}% Margin
                  </span>
                </div>
                <div className="text-lg font-extrabold text-emerald-700 mt-1">
                  {formatQar(overallSummary.netProfitQar || 0)}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Sold − COGS − Commissions</div>
              </div>

              <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 shadow-xs">
                <div className="text-amber-800 text-[10px] font-bold">PENDING FROM AGGREGATORS</div>
                <div className="text-lg font-extrabold text-amber-700 mt-1">
                  {formatQar(overallSummary.pendingPayoutQar || 0)}
                </div>
                <div className="text-[10px] text-amber-600 mt-0.5">Owed by Snoonu / Talabat</div>
              </div>
            </div>

            {/* Channel Comparison Matrix Table */}
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="p-3 border-b border-stone-200 bg-stone-50/60">
                <h3 className="text-xs font-bold text-stone-800">CHANNEL PROFITABILITY &amp; MARGIN MATRIX</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="py-2.5 px-3">SALES CHANNEL</th>
                      <th className="py-2.5 px-3 text-center">ORDERS</th>
                      <th className="py-2.5 px-3 text-right">SOLD PRICE (QAR)</th>
                      <th className="py-2.5 px-3 text-right">PRODUCT COST (COGS)</th>
                      <th className="py-2.5 px-3 text-right">COMMISSION TAKEN</th>
                      <th className="py-2.5 px-3 text-right">NET REALIZED PROFIT</th>
                      <th className="py-2.5 px-3 text-right">PROFIT MARGIN</th>
                      <th className="py-2.5 px-3 text-right">PENDING PAYOUT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {channelComparisons.map((c) => (
                      <tr key={c.channelKey} className="hover:bg-stone-50/80">
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${c.badgeBg}`}>
                            {c.channelName}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-stone-700">{c.ordersCount}</td>
                        <td className="py-3 px-3 text-right font-bold text-stone-900">{formatQar(c.netSalesQar)}</td>
                        <td className="py-3 px-3 text-right font-semibold text-red-600">{formatQar(c.totalCogsQar)}</td>
                        <td className="py-3 px-3 text-right font-semibold text-orange-600">
                          {c.commissionQar > 0 ? `-${formatQar(c.commissionQar)}` : '0.00 QAR'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-600">{formatQar(c.netProfitQar)}</td>
                        <td className="py-3 px-3 text-right font-bold text-sky-600">{c.profitMarginPercent.toFixed(1)}%</td>
                        <td className="py-3 px-3 text-right font-semibold text-amber-700">
                          {c.pendingPayoutQar > 0 ? formatQar(c.pendingPayoutQar) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Complete Orders Table */}
            <OrdersTable orders={filteredOrders} />
          </div>
        )}

        {/* ==================== TAB 2: IN-STORE SHOP SALES ==================== */}
        {selectedTab === 'SHOP' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 text-[10px] font-bold">
                  <span>WALK-IN SALES</span>
                  <span className="text-sky-600 font-semibold">{tabSummary.count} Orders</span>
                </div>
                <div className="text-lg font-extrabold text-stone-900 mt-1">{formatQar(tabSummary.sold)}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Discounts given: {formatQar(tabSummary.disc)}</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
                <div className="text-stone-500 text-[10px] font-bold">PRODUCT WHOLESALE COST</div>
                <div className="text-lg font-extrabold text-red-600 mt-1">{formatQar(tabSummary.cogs)}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Cost of goods sold (COGS)</div>
              </div>

              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-xs">
                <div className="flex items-center justify-between text-emerald-800 text-[10px] font-bold">
                  <span>REAL SHOP PROFIT</span>
                  <span className="bg-emerald-200/60 px-1.5 py-0.5 rounded text-emerald-800">
                    {tabSummary.margin}% Margin
                  </span>
                </div>
                <div className="text-lg font-extrabold text-emerald-700 mt-1">{formatQar(tabSummary.profit)}</div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Net Sales − Wholesale Cost</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
                <div className="flex items-center gap-1.5 text-stone-500 text-[10px] font-bold">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CASH IN DRAWER (TILL)</span>
                </div>
                <div className="text-lg font-extrabold text-emerald-700 mt-1">{formatQar(tabSummary.cash)}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Physical till register balance</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
                <div className="flex items-center gap-1.5 text-stone-500 text-[10px] font-bold">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  <span>CARD POS TERMINAL</span>
                </div>
                <div className="text-lg font-extrabold text-blue-700 mt-1">{formatQar(tabSummary.card)}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Settled directly to bank</div>
              </div>
            </div>

            <OrdersTable orders={filteredOrders} isShopView />
          </div>
        )}

        {/* ==================== TAB 3: SNOONU & DELIVERY AGGREGATORS ==================== */}
        {selectedTab === 'SNOONU' && (
          <div className="space-y-4">
            {/* Aggregator Sub-Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-600">Platform:</span>
                {['ALL', 'SNOONU', 'TALABAT', 'RAFEEQ'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setAggPlatform(p)}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                      aggPlatform === p
                        ? p === 'SNOONU'
                          ? 'bg-red-600 text-white shadow-2xs'
                          : p === 'TALABAT'
                          ? 'bg-orange-600 text-white shadow-2xs'
                          : p === 'RAFEEQ'
                          ? 'bg-rose-800 text-white shadow-2xs'
                          : 'bg-stone-800 text-white shadow-2xs'
                        : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {p === 'ALL' ? 'All Platforms' : p}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-600">Payout Status:</span>
                {['ALL', 'SETTLED', 'PENDING'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setAggSettlement(s)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      aggSettlement === s
                        ? 'bg-sky-600 text-white shadow-2xs'
                        : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {s === 'ALL' ? 'All Orders' : s === 'SETTLED' ? 'Deposited (Settled)' : 'Pending Payout (Owed)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Snoonu 5 KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 text-[10px] font-bold">
                  <span>AGGREGATOR GMV (SOLD)</span>
                  <span className="text-red-600 font-semibold">{tabSummary.count} Orders</span>
                </div>
                <div className="text-lg font-extrabold text-stone-900 mt-1">{formatQar(tabSummary.sold)}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Total customer billed amount</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
                <div className="text-stone-500 text-[10px] font-bold">COMMISSION TAKEN</div>
                <div className="text-lg font-extrabold text-orange-600 mt-1">{formatQar(tabSummary.comm)}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Snoonu / Talabat app cut</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
                <div className="text-stone-500 text-[10px] font-bold">NET CASH REALIZED</div>
                <div className="text-lg font-extrabold text-sky-600 mt-1">{formatQar(tabSummary.sold - tabSummary.comm)}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Gross − App Commission</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
                <div className="text-stone-500 text-[10px] font-bold">PRODUCT WHOLESALE COST</div>
                <div className="text-lg font-extrabold text-red-600 mt-1">{formatQar(tabSummary.cogs)}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Wholesale cost of lenses</div>
              </div>

              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-xs">
                <div className="flex items-center justify-between text-emerald-800 text-[10px] font-bold">
                  <span>REAL AGGREGATOR PROFIT</span>
                  <span className="bg-emerald-200/60 px-1.5 py-0.5 rounded text-emerald-800">
                    {tabSummary.margin}% Margin
                  </span>
                </div>
                <div className="text-lg font-extrabold text-emerald-700 mt-1">{formatQar(tabSummary.profit)}</div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Take-home after commission</div>
              </div>
            </div>

            <OrdersTable orders={filteredOrders} isAggregatorView />
          </div>
        )}

        {/* ==================== TAB 4: ONLINE ORDERS ==================== */}
        {selectedTab === 'ONLINE' && (
          <div className="space-y-4">
            <OrdersTable orders={filteredOrders} />
          </div>
        )}

        {/* ==================== TAB 5: TOP PRODUCTS MARGINS ==================== */}
        {selectedTab === 'PRODUCTS' && (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="p-3 border-b border-stone-200 bg-stone-50/60">
              <h3 className="text-xs font-bold text-stone-800">TOP OPTICAL PRODUCTS RANKED BY NET PROFIT</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-3">PRODUCT TITLE</th>
                    <th className="py-2.5 px-3">BRAND</th>
                    <th className="py-2.5 px-3 text-center">UNITS SOLD</th>
                    <th className="py-2.5 px-3 text-right">AVG SELLING PRICE</th>
                    <th className="py-2.5 px-3 text-right">AVG WHOLESALE COST</th>
                    <th className="py-2.5 px-3 text-right">TOTAL REVENUE</th>
                    <th className="py-2.5 px-3 text-right">TOTAL COGS</th>
                    <th className="py-2.5 px-3 text-right">TOTAL PROFIT</th>
                    <th className="py-2.5 px-3 text-right">PROFIT MARGIN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {topProducts.map((p) => (
                    <tr key={p.productId} className="hover:bg-stone-50/80">
                      <td className="py-3 px-3 font-bold text-stone-900">{p.productTitle}</td>
                      <td className="py-3 px-3 font-semibold text-stone-600">{p.brandName}</td>
                      <td className="py-3 px-3 text-center font-bold text-stone-800">{p.unitsSold}</td>
                      <td className="py-3 px-3 text-right font-medium">{formatQar(p.avgSellingPriceQar)}</td>
                      <td className="py-3 px-3 text-right font-medium text-red-600">{formatQar(p.avgUnitCostQar)}</td>
                      <td className="py-3 px-3 text-right font-bold text-stone-900">{formatQar(p.grossSalesQar)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-red-600">{formatQar(p.totalCogsQar)}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-emerald-600">{formatQar(p.netProfitQar)}</td>
                      <td className="py-3 px-3 text-right font-bold text-sky-600">{p.profitMarginPercent.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

// Reusable Orders Audit Table component
function OrdersTable({ orders, isShopView, isAggregatorView }: { orders: OrderAuditRow[]; isShopView?: boolean; isAggregatorView?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
      <div className="p-3 border-b border-stone-200 bg-stone-50/60 flex items-center justify-between">
        <h3 className="text-xs font-bold text-stone-800">
          {isShopView ? 'IN-STORE SHOP SALES & PROFIT AUDIT' : isAggregatorView ? 'SNOONU & AGGREGATOR ORDER AUDIT' : 'TRANSACTION AUDIT LEDGER'}
        </h3>
        <span className="text-[11px] font-semibold text-stone-500">{orders.length} Orders Listed</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
            <tr>
              <th className="py-2.5 px-3">DATE / TIME</th>
              {!isShopView && <th className="py-2.5 px-3">CHANNEL</th>}
              <th className="py-2.5 px-3">{isAggregatorView ? 'APP CODE (REF)' : 'ORDER / INVOICE #'}</th>
              <th className="py-2.5 px-3">{isShopView ? 'SALESPERSON' : 'CUSTOMER'}</th>
              <th className="py-2.5 px-3 min-w-[200px]">ITEMS DELIVERED &amp; POWERS</th>
              <th className="py-2.5 px-3 text-right">SOLD (QAR)</th>
              {isShopView && <th className="py-2.5 px-3 text-right">DISCOUNT</th>}
              {isAggregatorView && <th className="py-2.5 px-3 text-right">COMMISSION</th>}
              {isAggregatorView && <th className="py-2.5 px-3 text-right">NET PAYOUT</th>}
              <th className="py-2.5 px-3 text-right">COGS (QAR)</th>
              <th className="py-2.5 px-3 text-right">NET PROFIT</th>
              <th className="py-2.5 px-3 text-right">MARGIN</th>
              {isShopView ? (
                <th className="py-2.5 px-3 text-center">TENDER</th>
              ) : (
                <th className="py-2.5 px-3 text-center">PAYOUT STATUS</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-stone-50/80">
                <td className="py-2.5 px-3 whitespace-nowrap text-stone-600 font-medium">
                  {formatQatarDateTime(o.createdAt)}
                </td>
                {!isShopView && (
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${o.badgeBg}`}>
                      {o.channelName}
                    </span>
                  </td>
                )}
                <td className="py-2.5 px-3 whitespace-nowrap font-bold text-stone-900">
                  {isAggregatorView && o.paymentReference ? (
                    <div>
                      <span className="font-mono text-sky-700">{o.paymentReference}</span>
                      <div className="text-[10px] font-normal text-stone-400">{o.orderNumber}</div>
                    </div>
                  ) : (
                    o.orderNumber
                  )}
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap text-stone-800">
                  {isShopView ? o.salespersonName || 'Store Staff' : o.customerName}
                </td>
                <td className="py-2.5 px-3 text-stone-600 text-[11px] leading-relaxed">
                  {o.itemsSummary}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-stone-900 whitespace-nowrap">
                  {formatQar(o.netSoldQar)}
                </td>
                {isShopView && (
                  <td className="py-2.5 px-3 text-right font-medium text-stone-500 whitespace-nowrap">
                    {o.discountQar > 0 ? `-${formatQar(o.discountQar)}` : '—'}
                  </td>
                )}
                {isAggregatorView && (
                  <td className="py-2.5 px-3 text-right font-semibold text-orange-600 whitespace-nowrap">
                    {o.commissionQar > 0 ? (
                      <div>
                        <span>-{formatQar(o.commissionQar)}</span>
                        <div className="text-[9.5px] font-normal text-stone-400">({o.commissionPercent.toFixed(1)}%)</div>
                      </div>
                    ) : (
                      '0.00 QAR'
                    )}
                  </td>
                )}
                {isAggregatorView && (
                  <td className="py-2.5 px-3 text-right font-bold text-sky-600 whitespace-nowrap">
                    {formatQar(o.netPayoutQar)}
                  </td>
                )}
                <td className="py-2.5 px-3 text-right font-semibold text-red-600 whitespace-nowrap">
                  {formatQar(o.totalCogsQar)}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                  {formatQar(o.netProfitQar)}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-stone-700 whitespace-nowrap">
                  {o.profitMarginPercent.toFixed(1)}%
                </td>
                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                  {isShopView ? (
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
                      {o.paymentMethod}
                    </span>
                  ) : (
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                        o.settlementStatus === 'SETTLED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {o.settlementStatus === 'SETTLED' ? 'SETTLED' : 'PENDING'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
