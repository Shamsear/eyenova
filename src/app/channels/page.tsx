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
  Download,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  CreditCard,
  Banknote,
  ShoppingBag,
  MessageCircle,
} from 'lucide-react';

interface OverallSummary {
  totalOrders?: number;
  netSalesQar?: number;
  totalCogsQar?: number;
  totalCommissionQar?: number;
  profitMarginPercent?: number;
  netProfitQar?: number;
  pendingPayoutQar?: number;
}

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

function isCashMethod(method?: string | null): boolean {
  if (!method) return true;
  const m = method.trim().toUpperCase();
  return ['CASH', 'IN_STORE_PAYMENT', 'IN_STORE_POS', 'CASH_ON_DELIVERY', 'TILL', 'COD'].includes(m) || m.includes('CASH');
}

function isCardMethod(method?: string | null): boolean {
  if (!method) return false;
  const m = method.trim().toUpperCase();
  return ['CARD', 'CREDIT_CARD', 'DEBIT_CARD', 'POS_CARD', 'VISA', 'MASTERCARD', 'AMEX'].includes(m) || m.includes('CARD') || m.includes('CREDIT');
}

function formatTender(method?: string | null): string {
  if (!method) return 'Cash (Till)';
  const m = method.trim().toUpperCase();
  if (['CREDIT_CARD', 'CARD', 'DEBIT_CARD'].includes(m)) return 'Card (POS)';
  if (['IN_STORE_PAYMENT', 'CASH'].includes(m)) return 'Cash (Till)';
  if (m === 'IN_STORE_POS') return 'Cash (POS)';
  if (['CASH_ON_DELIVERY', 'COD'].includes(m)) return 'Cash on Delivery';
  if (m.includes('SNOONU')) return 'Snoonu App';
  if (m.includes('TALABAT')) return 'Talabat App';
  if (m.includes('RAFEEQ')) return 'Rafeeq App';
  if (m.includes('WHATSAPP')) return 'WhatsApp';
  return method;
}

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

  // Online specific sub-filter
  const [onlinePlatform, setOnlinePlatform] = useState('ALL');

  // Data states
  const [overallSummary, setOverallSummary] = useState<OverallSummary>({});
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
    let active = true;
    let url = `/api/channels?preset=${selectedDatePreset}`;
    if (selectedDatePreset === 'CUSTOM' && customFrom && customTo) {
      url += `&from=${customFrom}&to=${customTo}`;
    }
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!active || !data.success) return;
        setOverallSummary(data.overallSummary || {});
        setChannelComparisons(data.channelComparisons || []);
        setAllOrders(data.allOrders || []);
        setTopProducts(data.topProducts || []);
      })
      .catch((err) => {
        console.error('Failed to load channel report:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedDatePreset, customFrom, customTo]);

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
      list = list.filter((o) => ['SHOPIFY', 'WEBSITE', 'WHATSAPP', 'ONLINE_OTHER'].includes(o.channelKey));
      if (onlinePlatform !== 'ALL') {
        list = list.filter((o) => o.channelKey === onlinePlatform);
      }
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
  }, [allOrders, selectedTab, aggPlatform, aggSettlement, onlinePlatform, search]);

  // Tab-specific summary metrics computed live from filtered orders
  const tabSummary = useMemo(() => {
    let target = allOrders;
    if (selectedTab === 'SHOP') {
      target = target.filter((o) => o.channelKey === 'IN_STORE_POS');
    } else if (selectedTab === 'SNOONU') {
      target = target.filter((o) => ['SNOONU', 'TALABAT', 'RAFEEQ'].includes(o.channelKey));
    } else if (selectedTab === 'ONLINE') {
      target = target.filter((o) => ['SHOPIFY', 'WEBSITE', 'WHATSAPP', 'ONLINE_OTHER'].includes(o.channelKey));
      if (onlinePlatform !== 'ALL') {
        target = target.filter((o) => o.channelKey === onlinePlatform);
      }
    }

    const settled = target.filter((x) => x.settlementStatus === 'SETTLED');
    const pending = target.filter((x) => x.settlementStatus === 'PENDING_PAYOUT');

    const count = target.length;
    const sold = target.reduce((a, b) => a + b.netSoldQar, 0);
    const disc = target.reduce((a, b) => a + b.discountQar, 0);
    const cogs = target.reduce((a, b) => a + b.totalCogsQar, 0);
    const comm = settled.reduce((a, b) => a + b.commissionQar, 0); // only settled comm!
    const profit = sold - cogs - comm;
    const margin = sold > 0 ? Math.round((profit / sold) * 1000) / 10 : 0;
    const settledAmount = settled.reduce((a, b) => a + b.netPayoutQar, 0);
    const pendingAmount = pending.reduce((a, b) => a + b.netSoldQar, 0);
    const cashOrders = target.filter((x) => isCashMethod(x.paymentMethod));
    const cardOrders = target.filter((x) => isCardMethod(x.paymentMethod));
    const cash = cashOrders.reduce((a, b) => a + b.netSoldQar, 0);
    const card = cardOrders.reduce((a, b) => a + b.netSoldQar, 0);
    const cashCount = cashOrders.length;
    const cardCount = cardOrders.length;

    const settledGross = settled.reduce((a, b) => a + b.netSoldQar, 0);
    const settledCogs = settled.reduce((a, b) => a + b.totalCogsQar, 0);
    const settledProfit = settledGross - comm - settledCogs;

    const pendingGross = pending.reduce((a, b) => a + b.netSoldQar, 0);
    const pendingCogs = pending.reduce((a, b) => a + b.totalCogsQar, 0);

    const profitWithoutComm = sold - cogs;
    const marginWithoutComm = sold > 0 ? Math.round((profitWithoutComm / sold) * 1000) / 10 : 0;

    const settledProfitWithoutComm = settledGross - settledCogs;
    const settledMarginWithoutComm = settledGross > 0 ? Math.round((settledProfitWithoutComm / settledGross) * 1000) / 10 : 0;

    return { 
      count, sold, disc, cogs, comm, profit, margin, 
      settled: settledAmount, pending: pendingAmount, cash, card, cashCount, cardCount,
      profitWithoutComm, marginWithoutComm,
      settledCount: settled.length,
      settledGross,
      settledCogs,
      settledProfit,
      settledProfitWithoutComm,
      settledMarginWithoutComm,
      pendingCount: pending.length,
      pendingGross,
      pendingCogs,
      pendingMargin: pendingGross > 0 ? Math.round(((pendingGross - pendingCogs) / pendingGross) * 1000) / 10 : 0
    };
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
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-4 bg-stone-100/60 pb-10">
        {/* ==================== PAGE HEADER ==================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-stone-900 tracking-tight truncate">
                  SALES CHANNELS &amp; PROFITABILITY AUDIT
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  REAL PROFIT &amp; COMMISSIONS
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5 line-clamp-2 sm:line-clamp-1">
                Complete breakdown of sold price, wholesale product cost (COGS), platform commissions &amp; net realized profit across In-Store Shop, Snoonu, Talabat &amp; Online
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit CSV</span>
            </button>
          </div>
        </div>

        {/* ==================== PRIMARY TABS ==================== */}
        <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-stone-200 shadow-2xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedTab('UNIFIED')}
            className={`inline-flex items-center gap-2 min-h-[38px] px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              selectedTab === 'UNIFIED'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Unified Channels Overview</span>
          </button>
          <button
            onClick={() => setSelectedTab('SHOP')}
            className={`inline-flex items-center gap-2 min-h-[38px] px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              selectedTab === 'SHOP'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>In-Store Shop Sales</span>
          </button>
          <button
            onClick={() => setSelectedTab('SNOONU')}
            className={`inline-flex items-center gap-2 min-h-[38px] px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              selectedTab === 'SNOONU'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Snoonu &amp; Delivery Aggregators</span>
          </button>
          <button
            onClick={() => setSelectedTab('ONLINE')}
            className={`inline-flex items-center gap-2 min-h-[38px] px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              selectedTab === 'ONLINE'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Website &amp; Online Orders</span>
          </button>
          <button
            onClick={() => setSelectedTab('PRODUCTS')}
            className={`inline-flex items-center gap-2 min-h-[38px] px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              selectedTab === 'PRODUCTS'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Top Product Margins</span>
          </button>
        </div>

        {/* ==================== DATE PRESET TOOLBAR & SEARCH ==================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-stone-500 mr-1">Period:</span>
            {DATE_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleDatePresetClick(p.id)}
                className={`min-h-[32px] px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedDatePreset === p.id
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search order #, customer, app code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-[38px] pl-8 pr-3 py-1.5 text-[16px] sm:text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-teal-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Custom Date Selector Banner */}
        {showCustomDate && (
          <div className="flex flex-wrap items-center gap-3 bg-teal-50 p-3 rounded-xl border border-teal-200 text-xs">
            <span className="font-bold text-teal-900">Custom Date Range:</span>
            <div className="flex items-center gap-1.5">
              <span>From:</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="min-h-[36px] px-2.5 py-1 rounded-lg bg-white border border-stone-300 text-[15px] sm:text-xs font-mono"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span>To:</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="min-h-[36px] px-2.5 py-1 rounded-lg bg-white border border-stone-300 text-[15px] sm:text-xs font-mono"
              />
            </div>
            <button
              onClick={handleApplyCustomDate}
              className="min-h-[36px] px-3.5 py-1 rounded-lg bg-teal-700 text-white font-bold hover:bg-teal-800 cursor-pointer"
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
              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                <div className="flex items-center justify-between text-stone-500 text-[10px] font-bold">
                  <span>TOTAL SOLD VALUE</span>
                  <span className="text-teal-700 font-semibold font-mono">{overallSummary.totalOrders || 0} Orders</span>
                </div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-stone-900 mt-1">
                  {formatQar(overallSummary.netSalesQar || 0)}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">Gross billed to customers</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                <div className="text-stone-500 text-[10px] font-bold">TOTAL PRODUCT COST (COGS)</div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-rose-700 mt-1">
                  {formatQar(overallSummary.totalCogsQar || 0)}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">Wholesale inventory acquisition cost</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                <div className="text-stone-500 text-[10px] font-bold">COMMISSIONS DEDUCTED</div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-orange-600 mt-1">
                  {formatQar(overallSummary.totalCommissionQar || 0)}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">Snoonu / Talabat cuts</div>
              </div>

              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                <div className="flex items-center justify-between text-emerald-800 text-[10px] font-bold">
                  <span>NET REALIZED PROFIT</span>
                  <span className="bg-emerald-200/60 px-1.5 py-0.5 rounded text-emerald-800 font-mono">
                    {overallSummary.profitMarginPercent || 0}% Margin
                  </span>
                </div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-emerald-700 mt-1">
                  {formatQar(overallSummary.netProfitQar || 0)}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Sold − COGS − Commissions</div>
              </div>

              <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 shadow-2xs col-span-2 sm:col-span-1">
                <div className="text-amber-800 text-[10px] font-bold">PENDING FROM AGGREGATORS</div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-amber-700 mt-1">
                  {formatQar(overallSummary.pendingPayoutQar || 0)}
                </div>
                <div className="text-[10px] text-amber-600 mt-0.5">Owed by Snoonu / Talabat</div>
              </div>
            </div>

            {/* Channel Comparison Matrix Table */}
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
              <div className="p-3 border-b border-stone-200 bg-stone-50/60">
                <h3 className="text-xs font-bold text-stone-800">CHANNEL PROFITABILITY &amp; MARGIN MATRIX</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 font-mono text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">SALES CHANNEL</th>
                      <th className="py-2.5 px-3 text-center">ORDERS</th>
                      <th className="py-2.5 px-3 text-right">SOLD PRICE (QAR)</th>
                      <th className="py-2.5 px-3 text-right">PRODUCT COST (COGS)</th>
                      <th className="py-2.5 px-3 text-right">PROFIT (NO COMM)</th>
                      <th className="py-2.5 px-3 text-right">COMMISSION TAKEN</th>
                      <th className="py-2.5 px-3 text-right">PROFIT (WITH COMM)</th>
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
                        <td className="py-3 px-3 text-center font-mono font-semibold text-stone-700 tabular-nums">{c.ordersCount}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-stone-900 tabular-nums">{formatQar(c.netSalesQar)}</td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-rose-700 tabular-nums">{formatQar(c.totalCogsQar)}</td>
                        <td className="py-3 px-3 text-right whitespace-nowrap font-mono tabular-nums">
                          <span className="font-bold text-teal-700">{formatQar(c.netSalesQar - c.totalCogsQar)}</span>
                          <span className="text-[10px] text-stone-400 font-medium ml-1">
                            ({c.netSalesQar > 0 ? (((c.netSalesQar - c.totalCogsQar) / c.netSalesQar) * 100).toFixed(1) : '0.0'}%)
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-orange-600 tabular-nums">
                          {c.commissionQar > 0 ? `-${formatQar(c.commissionQar)}` : '0.00 QAR'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">{formatQar(c.netProfitQar)}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-teal-700 tabular-nums">{c.profitMarginPercent.toFixed(1)}%</td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-amber-700 tabular-nums">
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
              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                <div className="flex items-center justify-between text-stone-500 text-[10px] font-bold">
                  <span>WALK-IN SALES</span>
                  <span className="text-teal-700 font-semibold font-mono">{tabSummary.count} Orders</span>
                </div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-stone-900 mt-1">{formatQar(tabSummary.sold)}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Discounts given: {formatQar(tabSummary.disc)}</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                <div className="text-stone-500 text-[10px] font-bold">PRODUCT WHOLESALE COST</div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-rose-700 mt-1">{formatQar(tabSummary.cogs)}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Cost of goods sold (COGS)</div>
              </div>

              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                <div className="flex items-center justify-between text-emerald-800 text-[10px] font-bold">
                  <span>REAL SHOP PROFIT</span>
                  <span className="bg-emerald-200/60 px-1.5 py-0.5 rounded text-emerald-800 font-mono">
                    {tabSummary.margin}% Margin
                  </span>
                </div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-emerald-700 mt-1">{formatQar(tabSummary.profit)}</div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Net Sales − Wholesale Cost</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                <div className="flex items-center justify-between text-stone-500 text-[10px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                    <span>CASH IN DRAWER</span>
                  </div>
                  <span className="text-emerald-700 font-semibold font-mono">{tabSummary.cashCount}</span>
                </div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-emerald-700 mt-1">{formatQar(tabSummary.cash)}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Physical till register balance</div>
              </div>

              <div className="bg-teal-50/70 p-3.5 rounded-xl border border-teal-200 shadow-2xs col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between text-teal-800 text-[10px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-teal-700" />
                    <span>CARD POS TERMINAL</span>
                  </div>
                  <span className="text-teal-800 font-semibold font-mono">{tabSummary.cardCount}</span>
                </div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-teal-800 mt-1">{formatQar(tabSummary.card)}</div>
                <div className="text-[10px] text-teal-700 mt-0.5">Settled directly to bank</div>
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
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-stone-600 mr-1">Platform:</span>
                {['ALL', 'SNOONU', 'TALABAT', 'RAFEEQ'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setAggPlatform(p)}
                    className={`min-h-[34px] px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      aggPlatform === p
                        ? p === 'SNOONU'
                          ? 'bg-red-600 text-white shadow-2xs'
                          : p === 'TALABAT'
                          ? 'bg-orange-600 text-white shadow-2xs'
                          : p === 'RAFEEQ'
                          ? 'bg-rose-800 text-white shadow-2xs'
                          : 'bg-teal-700 text-white shadow-2xs'
                        : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {p === 'ALL' ? 'All Platforms' : p}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-stone-600 mr-1">Status:</span>
                <button
                  onClick={() => setAggSettlement('PENDING')}
                  className={`min-h-[34px] px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    aggSettlement === 'PENDING'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending ({tabSummary.pendingCount})</span>
                </button>
                <button
                  onClick={() => setAggSettlement('SETTLED')}
                  className={`min-h-[34px] px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    aggSettlement === 'SETTLED'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Deposited ({tabSummary.settledCount})</span>
                </button>
                <button
                  onClick={() => setAggSettlement('ALL')}
                  className={`min-h-[34px] px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    aggSettlement === 'ALL'
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>All ({tabSummary.count})</span>
                </button>
              </div>
            </div>

            {/* Snoonu Dynamic KPI Cards per Settlement View */}
            {aggSettlement === 'PENDING' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 shadow-xs">
                  <div className="text-amber-800 text-[10px] font-bold">PENDING SETTLEMENTS</div>
                  <div className="text-lg font-extrabold text-amber-900 mt-1">{tabSummary.pendingCount} Orders</div>
                  <div className="text-[10px] text-amber-700 mt-0.5">Awaiting app payout deposit</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
                  <div className="text-stone-500 text-[10px] font-bold">GROSS AMOUNT OWED</div>
                  <div className="text-lg font-extrabold text-stone-900 mt-1">{formatQar(tabSummary.pendingGross)}</div>
                  <div className="text-[10px] text-stone-400 mt-0.5">Customer billed via Snoonu / Talabat</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
                  <div className="text-stone-500 text-[10px] font-bold">COMMISSION (FEE)</div>
                  <div className="text-lg font-extrabold text-amber-600 mt-1">0.00 QAR</div>
                  <div className="text-[10px] text-stone-400 mt-0.5">Pending Settlement (No fee deducted)</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
                  <div className="text-stone-500 text-[10px] font-bold">LENS COST (COGS)</div>
                  <div className="text-lg font-extrabold text-red-600 mt-1">{formatQar(tabSummary.pendingCogs)}</div>
                  <div className="text-[10px] text-stone-400 mt-0.5">Wholesale cost of dispatched lenses</div>
                </div>

                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 shadow-xs">
                  <div className="flex items-center justify-between text-stone-700 text-[10px] font-bold">
                    <span>EXPECTED MARGIN</span>
                    <span className="text-[10px] text-teal-700 font-bold">
                      PROFIT (NO COMM)
                    </span>
                    <span className="bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                      {tabSummary.pendingMargin}% Margin
                    </span>
                  </div>
                  <div className="text-lg font-extrabold text-teal-700 mt-1">{formatQar(tabSummary.pendingGross - tabSummary.pendingCogs)}</div>
                  <div className="text-[10px] text-teal-600 mt-0.5">Gross − COGS (0 commission until settled)</div>
                </div>
              </div>
            )}

            {aggSettlement === 'SETTLED' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-xs">
                  <div className="text-emerald-800 text-[10px] font-bold">CONFIRMED SETTLED ORDERS</div>
                  <div className="text-lg font-extrabold text-emerald-900 mt-1">{tabSummary.settledCount} Orders</div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">Payout deposited into bank</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
                  <div className="flex items-center justify-between text-stone-500 text-[10px] font-bold">
                    <span>GROSS BILLED</span>
                    <span className="text-red-600 font-semibold">COGS: {formatQar(tabSummary.settledCogs)}</span>
                  </div>
                  <div className="text-lg font-extrabold text-stone-900 mt-1">{formatQar(tabSummary.settledGross)}</div>
                  <div className="text-[10px] text-stone-400 mt-0.5">Settled customer volume</div>
                </div>

                <div className="bg-teal-50/70 p-3.5 rounded-xl border border-teal-200 shadow-xs">
                  <div className="flex items-center justify-between text-teal-800 text-[10px] font-bold">
                    <span>PROFIT (NO COMM)</span>
                    <span className="bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                      {tabSummary.settledMarginWithoutComm}% Margin
                    </span>
                  </div>
                  <div className="text-lg font-extrabold text-teal-700 mt-1">{formatQar(tabSummary.settledProfitWithoutComm)}</div>
                  <div className="text-[10px] text-teal-600 mt-0.5">Gross − COGS (Before commission)</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
                  <div className="text-stone-500 text-[10px] font-bold">ACTUAL COMMISSION TAKEN</div>
                  <div className="text-lg font-extrabold text-orange-600 mt-1">{formatQar(tabSummary.comm)}</div>
                  <div className="text-[10px] text-stone-400 mt-0.5">Confirmed platform fee deducted</div>
                </div>

                <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-xs">
                  <div className="text-emerald-800 text-[10px] font-bold">REAL PROFIT (WITH COMM)</div>
                  <div className="text-lg font-extrabold text-emerald-700 mt-1">{formatQar(tabSummary.settledProfit)}</div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">Bank payout − Wholesale cost</div>
                </div>
              </div>
            )}

            {aggSettlement === 'ALL' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
                  <div className="flex items-center justify-between text-stone-500 text-[10px] font-bold">
                    <span>AGGREGATOR VOLUME</span>
                    <span className="text-teal-700 font-semibold font-mono">{tabSummary.count} Orders</span>
                  </div>
                  <div className="text-lg font-extrabold font-mono tabular-nums text-stone-900 mt-1">{formatQar(tabSummary.sold)}</div>
                  <div className="text-[10px] text-stone-400 mt-0.5">Combined customer sales</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                  <div className="text-stone-500 text-[10px] font-bold">PRODUCT COST (COGS)</div>
                  <div className="text-lg font-extrabold font-mono tabular-nums text-rose-700 mt-1">{formatQar(tabSummary.cogs)}</div>
                  <div className="text-[10px] text-stone-400 mt-0.5">Wholesale inventory cost</div>
                </div>

                <div className="bg-teal-50/70 p-3.5 rounded-xl border border-teal-200 shadow-2xs">
                  <div className="flex items-center justify-between text-teal-800 text-[10px] font-bold">
                    <span>PROFIT (NO COMM)</span>
                    <span className="bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono">
                      {tabSummary.marginWithoutComm}% Margin
                    </span>
                  </div>
                  <div className="text-lg font-extrabold font-mono tabular-nums text-teal-700 mt-1">{formatQar(tabSummary.profitWithoutComm)}</div>
                  <div className="text-[10px] text-teal-600 mt-0.5">Gross − COGS (Before app fees)</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                  <div className="text-stone-500 text-[10px] font-bold">COMMISSION DEDUCTED</div>
                  <div className="text-lg font-extrabold font-mono tabular-nums text-orange-600 mt-1">{formatQar(tabSummary.comm)}</div>
                  <div className="text-[10px] text-stone-400 mt-0.5">Real cut on settled only (0 for pending)</div>
                </div>

                <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-2xs col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between text-emerald-800 text-[10px] font-bold">
                    <span>REAL PROFIT (WITH COMM)</span>
                    <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono">
                      {tabSummary.margin}% Margin
                    </span>
                  </div>
                  <div className="text-lg font-extrabold font-mono tabular-nums text-emerald-700 mt-1">{formatQar(tabSummary.profit)}</div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">Realized profit after commission</div>
                </div>
              </div>
            )}

            <OrdersTable orders={filteredOrders} isAggregatorView />
          </div>
        )}

        {/* ==================== TAB 4: ONLINE ORDERS ==================== */}
        {selectedTab === 'ONLINE' && (
          <div className="space-y-4">
            {/* Online Platform Selector */}
            <div className="flex flex-wrap items-center gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
              <span className="text-xs font-bold text-stone-600 mr-1">Platform:</span>
              <button
                onClick={() => setOnlinePlatform('ALL')}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  onlinePlatform === 'ALL' ? 'bg-teal-700 text-white shadow-2xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                All Online
              </button>
              <button
                onClick={() => setOnlinePlatform('SHOPIFY')}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  onlinePlatform === 'SHOPIFY' ? 'bg-teal-700 text-white shadow-2xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Shopify Store</span>
              </button>
              <button
                onClick={() => setOnlinePlatform('WEBSITE')}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  onlinePlatform === 'WEBSITE' ? 'bg-teal-700 text-white shadow-2xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Online Website</span>
              </button>
              <button
                onClick={() => setOnlinePlatform('WHATSAPP')}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  onlinePlatform === 'WHATSAPP' ? 'bg-teal-700 text-white shadow-2xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Orders</span>
              </button>
            </div>

            {/* 5 KPI Cards for Online Orders */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                <div className="flex items-center justify-between text-stone-500 text-[10px] font-bold">
                  <span>ONLINE GROSS REVENUE</span>
                  <span className="text-teal-700 font-semibold font-mono">{tabSummary.count} Orders</span>
                </div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-stone-900 mt-1">{formatQar(tabSummary.sold)}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Customer orders billed online</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                <div className="text-stone-500 text-[10px] font-bold">WHOLESALE COST (COGS)</div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-rose-700 mt-1">{formatQar(tabSummary.cogs)}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Wholesale inventory cost</div>
              </div>

              <div className="bg-teal-50/70 p-3.5 rounded-xl border border-teal-200 shadow-2xs">
                <div className="flex items-center justify-between text-teal-800 text-[10px] font-bold">
                  <span>PROFIT (NO COMM)</span>
                  <span className="bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono">
                    {tabSummary.marginWithoutComm}% Margin
                  </span>
                </div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-teal-700 mt-1">{formatQar(tabSummary.profitWithoutComm)}</div>
                <div className="text-[10px] text-teal-600 mt-0.5">Gross − COGS (Before payment fees)</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                <div className="text-stone-500 text-[10px] font-bold">GATEWAY / COMMISSIONS</div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-orange-600 mt-1">{formatQar(tabSummary.comm)}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Card &amp; payment processing fees</div>
              </div>

              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-2xs col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between text-emerald-800 text-[10px] font-bold">
                  <span>REAL ONLINE NET PROFIT</span>
                  <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono">
                    {tabSummary.margin}% Margin
                  </span>
                </div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-emerald-700 mt-1">{formatQar(tabSummary.profit)}</div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Net realized profit after fees</div>
              </div>
            </div>

            <OrdersTable orders={filteredOrders} isOnlineView />
          </div>
        )}

        {/* ==================== TAB 5: TOP PRODUCTS MARGINS ==================== */}
        {selectedTab === 'PRODUCTS' && (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="p-3 border-b border-stone-200 bg-stone-50/60">
              <h3 className="text-xs font-bold text-stone-800">TOP OPTICAL PRODUCTS RANKED BY NET PROFIT</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 font-mono text-[10px] uppercase tracking-wider">
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
                      <td className="py-3 px-3 text-center font-mono font-bold text-stone-800 tabular-nums">{p.unitsSold}</td>
                      <td className="py-3 px-3 text-right font-mono font-medium tabular-nums">{formatQar(p.avgSellingPriceQar)}</td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-rose-700 tabular-nums">{formatQar(p.avgUnitCostQar)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-stone-900 tabular-nums">{formatQar(p.grossSalesQar)}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-rose-700 tabular-nums">{formatQar(p.totalCogsQar)}</td>
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-700 tabular-nums">{formatQar(p.netProfitQar)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-teal-700 tabular-nums">{p.profitMarginPercent.toFixed(1)}%</td>
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

// Reusable Orders Audit Table component with mobile card stack
function OrdersTable({ orders, isShopView, isAggregatorView, isOnlineView }: { orders: OrderAuditRow[]; isShopView?: boolean; isAggregatorView?: boolean; isOnlineView?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
      <div className="p-3 border-b border-stone-200 bg-stone-50/60 flex items-center justify-between">
        <h3 className="text-xs font-bold text-stone-800">
          {isShopView ? 'IN-STORE SHOP SALES & PROFIT AUDIT' : isAggregatorView ? 'SNOONU & AGGREGATOR ORDER AUDIT' : isOnlineView ? 'WEBSITE & ONLINE ORDERS AUDIT' : 'TRANSACTION AUDIT LEDGER'}
        </h3>
        <span className="text-[11px] font-mono font-semibold text-stone-500">{orders.length} Orders</span>
      </div>

      {/* Mobile Cards (< md) */}
      <div className="md:hidden divide-y divide-stone-100">
        {orders.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400">No orders matching filter.</div>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-stone-900 truncate">
                  {isAggregatorView && o.paymentReference ? o.paymentReference : o.orderNumber}
                </span>
                <span className="font-mono text-[10px] text-stone-400 shrink-0">
                  {formatQatarDateTime(o.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-stone-700 truncate">
                  {isShopView ? o.salespersonName || 'Store Staff' : o.customerName}
                </span>
                {!isShopView && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${o.badgeBg}`}>
                    {o.channelName}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 line-clamp-2">{o.itemsSummary}</p>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100 font-mono text-[11px]">
                <span className="font-bold text-stone-900 tabular-nums">Sold: {formatQar(o.netSoldQar)}</span>
                <span className="font-bold text-emerald-700 tabular-nums">
                  Profit: {formatQar(o.netProfitQar)} ({o.profitMarginPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Audit Table (md+) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 font-mono text-[10px] uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">DATE / TIME</th>
              {!isShopView && <th className="py-2.5 px-3">CHANNEL</th>}
              <th className="py-2.5 px-3">{isAggregatorView ? 'APP CODE (REF)' : 'ORDER / INVOICE #'}</th>
              <th className="py-2.5 px-3">{isShopView ? 'SALESPERSON' : 'CUSTOMER'}</th>
              <th className="py-2.5 px-3 min-w-[200px]">ITEMS DELIVERED &amp; POWERS</th>
              <th className="py-2.5 px-3 text-right">SOLD (QAR)</th>
              <th className="py-2.5 px-3 text-right">COGS (QAR)</th>
              <th className="py-2.5 px-3 text-right">PROFIT (NO COMM)</th>
              {isShopView && <th className="py-2.5 px-3 text-right">DISCOUNT</th>}
              {isAggregatorView && <th className="py-2.5 px-3 text-right">COMMISSION</th>}
              {isAggregatorView && <th className="py-2.5 px-3 text-right">NET PAYOUT / OWED</th>}
              <th className="py-2.5 px-3 text-right">{isAggregatorView ? 'PROFIT (WITH COMM)' : 'NET PROFIT'}</th>
              <th className="py-2.5 px-3 text-right">MARGIN</th>
              {isShopView || isOnlineView ? (
                <th className="py-2.5 px-3 text-center">PAYMENT</th>
              ) : (
                <th className="py-2.5 px-3 text-center">PAYOUT STATUS</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-stone-50/80">
                <td className="py-2.5 px-3 whitespace-nowrap text-stone-600 font-mono text-[11px]">
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
                      <span className="font-mono text-teal-700">{o.paymentReference}</span>
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
                <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900 whitespace-nowrap tabular-nums">
                  {formatQar(o.netSoldQar)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-700 whitespace-nowrap tabular-nums">
                  {formatQar(o.totalCogsQar)}
                </td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums">
                  <div className="font-bold text-teal-700">{formatQar(o.netSoldQar - o.totalCogsQar)}</div>
                  <div className="text-[9.5px] font-semibold text-stone-400">
                    ({o.netSoldQar > 0 ? (((o.netSoldQar - o.totalCogsQar) / o.netSoldQar) * 100).toFixed(1) : '0.0'}%)
                  </div>
                </td>
                {isShopView && (
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-stone-500 whitespace-nowrap tabular-nums">
                    {o.discountQar > 0 ? `-${formatQar(o.discountQar)}` : '—'}
                  </td>
                )}
                {isAggregatorView && (
                  <td className="py-2.5 px-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums">
                    {o.settlementStatus === 'SETTLED' ? (
                      o.commissionQar > 0 ? (
                        <div className="text-orange-600">
                          <span>-{formatQar(o.commissionQar)}</span>
                          <div className="text-[9.5px] font-normal text-stone-400">({o.commissionPercent.toFixed(1)}%)</div>
                        </div>
                      ) : (
                        <span className="text-stone-500">0.00 QAR</span>
                      )
                    ) : (
                      <span className="text-amber-700 font-medium">0.00 QAR (Pending)</span>
                    )}
                  </td>
                )}
                {isAggregatorView && (
                  <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap tabular-nums">
                    {o.settlementStatus === 'SETTLED' ? (
                      <span className="text-teal-700">{formatQar(o.netPayoutQar)}</span>
                    ) : (
                      <span className="text-stone-700">{formatQar(o.netSoldQar)} <span className="text-[10px] font-normal text-stone-400">(Owed)</span></span>
                    )}
                  </td>
                )}
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                  {formatQar(o.netProfitQar)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-700 whitespace-nowrap tabular-nums">
                  {o.profitMarginPercent.toFixed(1)}%
                </td>
                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                  {isShopView || isOnlineView ? (
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                      isCardMethod(o.paymentMethod)
                        ? 'bg-teal-50 text-teal-800 border-teal-200'
                        : isCashMethod(o.paymentMethod)
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-stone-100 text-stone-700 border-stone-200'
                    }`}>
                      {formatTender(o.paymentMethod)}
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                        o.settlementStatus === 'SETTLED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {o.settlementStatus === 'SETTLED' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>SETTLED</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>PENDING</span>
                        </>
                      )}
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
