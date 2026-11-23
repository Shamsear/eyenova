'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Shell } from '@/components/layout/shell';
import { PageHeader } from '@/components/shared/page-header';
import { StatusIndicator } from '@/components/shared/status-indicator';
import {
  formatQar,
  formatQatarDateTime,
  formatQatarDate,
} from '@/lib/utils';
import {
  exportCardexToExcel,
  exportCardexToPdf,
  type CardexSummary,
  type CardexBatch,
  type CardexEntry,
} from '@/lib/cardex-export';
import {
  History,
  Search,
  Filter,
  Calendar,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Package,
  Truck,
  ShoppingCart,
  Globe,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  ShieldCheck,
  Loader2,
  Clock,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

interface ProductOption {
  id: string;
  sku: string;
  barcode: string;
  titleEn: string;
  brandName: string;
  collectionName?: string;
  productType?: string;
  stockQuantity: number;
  basePriceQar: number;
  costPriceQar: number;
}

export default function StockCardexPage() {
  // Filters & Selection
  const [brands, setBrands] = useState<string[]>(['All Brands']);
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [searchQuery, setSearchQuery] = useState('');
  const [productList, setProductList] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [availablePowers, setAvailablePowers] = useState<string[]>(['All Powers']);
  const [selectedPower, setSelectedPower] = useState('All Powers');

  // Date Range Presets
  const [datePreset, setDatePreset] = useState<'ALL' | '30D' | 'MONTH'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Cardex Data
  const [loading, setLoading] = useState(false);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [summary, setSummary] = useState<CardexSummary | null>(null);
  const [activeBatches, setActiveBatches] = useState<CardexBatch[]>([]);
  const [entries, setEntries] = useState<CardexEntry[]>([]);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  // Power breakdown & tabs
  const [powerStockSummaries, setPowerStockSummaries] = useState<any[]>([]);
  const [activeCardexTab, setActiveCardexTab] = useState<'POWERS' | 'MOVEMENTS' | 'BATCHES'>('POWERS');
  const [powerStockFilter, setPowerStockFilter] = useState<'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [powerSearch, setPowerSearch] = useState('');
  const [hideZeroBatches, setHideZeroBatches] = useState(true);

  // Table filtering & pagination
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // 1. Initial Load: Fetch Brands
  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await fetch('/api/cardex?mode=brands');
        const data = await res.json();
        if (data.brands) {
          setBrands(data.brands);
        }
      } catch (err) {
        console.error('Failed to load brands:', err);
      }
    }
    loadBrands();
  }, []);

  // 2. Search Products
  const searchProducts = useCallback(
    async (query = '', brand = selectedBrand) => {
      setSearchingProducts(true);
      try {
        const params = new URLSearchParams({
          mode: 'products',
          q: query,
          brand: brand === 'All Brands' ? '' : brand,
        });
        const res = await fetch(`/api/cardex?${params.toString()}`);
        const data = await res.json();
        if (data.products) {
          setProductList(data.products);
          // If no product is currently selected and we got results, select the first
          if (!selectedProductId && data.products.length > 0) {
            setSelectedProductId(data.products[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to search products:', err);
      } finally {
        setSearchingProducts(false);
      }
    },
    [selectedBrand, selectedProductId]
  );

  // Run initial product search
  useEffect(() => {
    searchProducts(searchQuery, selectedBrand);
  }, [searchProducts, selectedBrand]);

  // 3. When Selected Product Changes: Fetch Powers
  useEffect(() => {
    if (!selectedProductId) return;

    async function loadPowers() {
      try {
        const res = await fetch(
          `/api/cardex?mode=powers&productId=${encodeURIComponent(selectedProductId)}`
        );
        const data = await res.json();
        if (data.powers) {
          setAvailablePowers(data.powers);
          setSelectedPower('All Powers');
        }
      } catch (err) {
        console.error('Failed to load powers:', err);
      }
    }
    loadPowers();
  }, [selectedProductId]);

  // 4. Fetch Full Cardex Report
  const loadCardex = useCallback(async () => {
    if (!selectedProductId) return;

    setLoading(true);
    setFeedback(null);
    try {
      const params = new URLSearchParams({
        productId: selectedProductId,
        power: selectedPower === 'All Powers' ? 'ALL' : selectedPower,
      });
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const res = await fetch(`/api/cardex?${params.toString()}`);
      const data = await res.json();

      if (data.error) {
        setFeedback({ message: data.error, isError: true });
        return;
      }

      setSummary(data.summary);
      setActiveBatches(data.activeBatches || []);
      setEntries(data.entries || []);
      setPowerStockSummaries(data.powerStockSummaries || []);
      setPage(1);
    } catch (err: any) {
      console.error('Failed to load cardex:', err);
      setFeedback({ message: err.message || 'Error loading cardex ledger', isError: true });
    } finally {
      setLoading(false);
    }
  }, [selectedProductId, selectedPower, fromDate, toDate]);

  // Auto reload when selection or date changes
  useEffect(() => {
    loadCardex();
  }, [loadCardex]);

  // Date Presets Handler
  const handleDatePreset = (preset: 'ALL' | '30D' | 'MONTH') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
    } else if (preset === '30D') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setFromDate(past.toISOString().split('T')[0]);
      setToDate(now.toISOString().split('T')[0]);
    } else if (preset === 'MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(firstDay.toISOString().split('T')[0]);
      setToDate(now.toISOString().split('T')[0]);
    }
  };

  // Filtered Ledger Rows
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      // Type filter
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'INBOUND' && !e.transactionType.startsWith('INBOUND')) return false;
        if (typeFilter === 'SALES' && !e.transactionType.includes('SALE')) return false;
        if (typeFilter === 'RETURN' && e.transactionType !== 'RETURN') return false;
        if (typeFilter === 'ADJUSTMENT' && e.transactionType !== 'ADJUSTMENT') return false;
        if (typeFilter === 'WRITEOFF' && e.transactionType !== 'WRITEOFF') return false;
      }

      // Search query filter
      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase().trim();
        const matchesRef = e.referenceNumber.toLowerCase().includes(q);
        const matchesParty = e.partyName.toLowerCase().includes(q);
        const matchesOperator = e.operator.toLowerCase().includes(q);
        const matchesBatch = e.batchNumber.toLowerCase().includes(q);
        const matchesNotes = e.notes.toLowerCase().includes(q);
        const matchesPower = e.power.toLowerCase().includes(q);
        const filteredPowerSummaries = useMemo(() => {
    let list = powerStockSummaries;
    if (powerStockFilter === 'IN_STOCK') {
      list = list.filter((p) => p.shelfQuantity > 0);
    } else if (powerStockFilter === 'OUT_OF_STOCK') {
      list = list.filter((p) => p.shelfQuantity === 0);
    }
    if (powerSearch.trim()) {
      const q = powerSearch.toLowerCase();
      list = list.filter((p) => p.power.toLowerCase().includes(q));
    }
    return list;
  }, [powerStockSummaries, powerStockFilter, powerSearch]);

  const filteredBatches = useMemo(() => {
    return hideZeroBatches ? activeBatches.filter((b) => b.quantity > 0) : activeBatches;
  }, [activeBatches, hideZeroBatches]);

  return (
          matchesRef ||
          matchesParty ||
          matchesOperator ||
          matchesBatch ||
          matchesNotes ||
          matchesPower
        );
      }
      return true;
    });
  }, [entries, typeFilter, ledgerSearch]);

  // Paginated Ledger Rows
  const totalPages = Math.ceil(filteredEntries.length / pageSize) || 1;
  const paginatedEntries = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, page]);

  // Selected product object
  const selectedProduct = useMemo(() => {
    return productList.find((p) => p.id === selectedProductId);
  }, [productList, selectedProductId]);

  const filteredPowerSummaries = useMemo(() => {
    let list = powerStockSummaries;
    if (powerStockFilter === 'IN_STOCK') {
      list = list.filter((p) => p.shelfQuantity > 0);
    } else if (powerStockFilter === 'OUT_OF_STOCK') {
      list = list.filter((p) => p.shelfQuantity === 0);
    }
    if (powerSearch.trim()) {
      const q = powerSearch.toLowerCase();
      list = list.filter((p) => p.power.toLowerCase().includes(q));
    }
    return list;
  }, [powerStockSummaries, powerStockFilter, powerSearch]);

  const filteredBatches = useMemo(() => {
    return hideZeroBatches ? activeBatches.filter((b) => b.quantity > 0) : activeBatches;
  }, [activeBatches, hideZeroBatches]);

  return (
    <Shell
      title="Stock Traceability & Cardex"
      subtitle="Full lifecycle audit ledger & batch movement breakdown"
    >
      <div className="space-y-6 pb-12">
        {/* Page Header */}
        <PageHeader
          title="Stock Traceability & Cardex"
          subtitle="Full lifecycle audit ledger & chronological batch movement history for every product and power"
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (summary) {
                  exportCardexToExcel(summary, activeBatches, entries);
                }
              }}
              disabled={!summary || loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              title="Download Excel (.xlsx) spreadsheet with audit summary, batch lots, and full ledger"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={() => {
                if (summary) {
                  exportCardexToPdf(summary, activeBatches, entries);
                }
              }}
              disabled={!summary || loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              title="Generate and print formal A4 Cardex audit PDF report"
            >
              <Printer className="w-4 h-4" />
              <span>Print Cardex PDF</span>
            </button>

            <button
              onClick={loadCardex}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </PageHeader>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              feedback.isError
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs font-bold underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter & Selection Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Traceability Target & Filter Controls
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Showing active catalog inventory & physical shelf batches
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Brand Filter */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">
                1. Filter by Brand
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
              >
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Selector / Search */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                <span>2. Search &amp; Select Product</span>
                <span className="text-[11px] text-blue-600 font-semibold">
                  {productList.length} Products Available
                </span>
              </label>
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Type product name, SKU, or scan barcode..."
                    value={searchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      searchProducts(val, selectedBrand);
                    }}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 transition shadow-2xs"
                  />
                </div>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition truncate"
                >
                  {productList.length === 0 ? (
                    <option value="">No products found</option>
                  ) : (
                    productList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.titleEn} — {p.brandName} | SKU: {p.sku} ({p.stockQuantity} in stock)
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Dynamic Optical Power Selector */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                <span>3. Prescription Optical Power</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {availablePowers.length - 1} Powers Recorded
                </span>
              </label>
              <select
                value={selectedPower}
                onChange={(e) => setSelectedPower(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-blue-700 font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
              >
                {availablePowers.map((pwr) => (
                  <option key={pwr} value={pwr}>
                    {pwr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Date Range Bar */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Timeline Window:</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => handleDatePreset('ALL')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    datePreset === 'ALL'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Time
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePreset('30D')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    datePreset === '30D'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePreset('MONTH')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    datePreset === 'MONTH'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  This Month
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Custom:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDatePreset('ALL');
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDatePreset('ALL');
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
              {(fromDate || toDate) && (
                <button
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                    setDatePreset('ALL');
                  }}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Selected Product Summary Header & Reconciliation Equation */}
        {summary && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
            {/* Header Identity Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {summary.brandName || 'EyeNova'}
                  </span>
                  {summary.collectionName && (
                    <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-700">
                      {summary.collectionName}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-mono">
                    SKU: {summary.sku || 'N/A'}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {summary.titleEn}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                  <span>
                    Barcode:{' '}
                    <strong className="text-slate-700 font-mono">
                      {summary.barcode || '—'}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Retail Price:{' '}
                    <strong className="text-slate-700">
                      {formatQar(summary.basePriceQar)}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Cost Price:{' '}
                    <strong className="text-slate-700">
                      {formatQar(summary.costPriceQar)}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Power Filter:{' '}
                    <strong className="text-blue-700">
                      {summary.selectedPowerFilter}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex flex-col items-start md:items-end gap-1">
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold border shadow-xs ${
                    summary.isBalanced
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : summary.discrepancyDelta > 0
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}
                >
                  {summary.isBalanced ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>100% IN BALANCE (0 DELTA)</span>
                    </>
                  ) : summary.discrepancyDelta > 0 ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>+{summary.discrepancyDelta} SHELF SURPLUS</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>{summary.discrepancyDelta} MISSING ON SHELF</span>
                    </>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">
                  Physical Shelves ({summary.physicalShelfStock}) vs Book Ledgers ({summary.calculatedBalance})
                </span>
              </div>
            </div>

            {/* Reconciliation Balance Equation Cards (6 Cards) */}
            <div>
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Mathematical Inventory Ledger Balance Equation
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  [Inbound - Sales + Returns ± Audit - Write-offs = Book Balance]
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {/* 1. Inbound (+) */}
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-emerald-700">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      (+) Inbound
                    </span>
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-2xl font-black text-emerald-800">
                    +{summary.totalReceivedUnits}
                  </div>
                  <div className="text-[11px] text-emerald-700/80">
                    POs & Direct Shipments
                  </div>
                </div>

                {/* 2. Sales (-) */}
                <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-blue-700">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      (-) Sales Out
                    </span>
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-2xl font-black text-blue-800">
                    -{summary.totalSoldUnits}
                  </div>
                  <div className="text-[11px] text-blue-700/80">
                    POS & Online Orders
                  </div>
                </div>

                {/* 3. Returns (+) */}
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-amber-700">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      (+) Returns
                    </span>
                    <RotateCcw className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-2xl font-black text-amber-800">
                    +{summary.totalReturnedUnits}
                  </div>
                  <div className="text-[11px] text-amber-700/80">
                    Restocked Customer Returns
                  </div>
                </div>

                {/* 4. Adjustments (±) */}
                <div className="bg-slate-100/70 border border-slate-300/80 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      (±) Calibrations
                    </span>
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-2xl font-black text-slate-800">
                    {summary.totalAdjustedUnits >= 0
                      ? `+${summary.totalAdjustedUnits}`
                      : summary.totalAdjustedUnits}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Physical Stock Counts
                  </div>
                </div>

                {/* 5. Write-offs (-) */}
                <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-rose-700">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      (-) Write-offs
                    </span>
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-2xl font-black text-rose-800">
                    -{summary.totalWrittenOffUnits}
                  </div>
                  <div className="text-[11px] text-rose-700/80">
                    Damage & Expiry Discards
                  </div>
                </div>

                {/* 6. Calculated Book Balance */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1 text-white shadow-md">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      (=) Book Balance
                    </span>
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="text-2xl font-black text-white">
                    {summary.calculatedBalance}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Shelf: {summary.physicalShelfStock}</span>
                    <span
                      className={`font-bold ${
                        summary.isBalanced
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {summary.isBalanced ? '✓ 0' : `Δ ${summary.discrepancyDelta}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ==================== 3-TAB UN-CRAMPED NAVIGATION ==================== */}
            <div className="pt-2 border-t border-slate-100 space-y-4">
              {/* Tab Selector */}
              <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveCardexTab('POWERS')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeCardexTab === 'POWERS'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>📦 Available Powers &amp; Stock Matrix ({powerStockSummaries.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCardexTab('MOVEMENTS')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeCardexTab === 'MOVEMENTS'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>📜 Chronological Cardex Ledger ({filteredEntries.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCardexTab('BATCHES')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeCardexTab === 'BATCHES'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>🏷️ Physical Shelf Lots ({activeBatches.length})</span>
                </button>
              </div>

              {/* TAB 1: AVAILABLE POWERS & STOCK MATRIX */}
              {activeCardexTab === 'POWERS' && (
                <div className="space-y-4">
                  {/* Quick Power Matrix Chips */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">QUICK SHELF STOCK MATRIX BY PRESCRIPTION POWER</span>
                      <span className="text-slate-400">Click any power to inspect movements</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                      {powerStockSummaries.map((p) => (
                        <button
                          key={p.power}
                          type="button"
                          onClick={() => {
                            setSelectedPower(p.power);
                            setActiveCardexTab('MOVEMENTS');
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold border transition ${
                            p.shelfQuantity > 0
                              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                              : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span>{p.power}:</span>
                          <span className={p.shelfQuantity > 0 ? 'text-blue-900' : 'text-slate-400'}>
                            {p.shelfQuantity} {p.shelfQuantity === 1 ? 'box' : 'boxes'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sub-filter Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                      {[
                        { id: 'ALL', label: 'All Powers' },
                        { id: 'IN_STOCK', label: 'In Stock Only' },
                        { id: 'OUT_OF_STOCK', label: 'Out of Stock' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setPowerStockFilter(f.id as any)}
                          className={`px-2.5 py-1 rounded-md font-bold transition text-[11px] ${
                            powerStockFilter === f.id
                              ? 'bg-white text-blue-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-48">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search power (e.g. -2.50)..."
                        value={powerSearch}
                        onChange={(e) => setPowerSearch(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Full Powers DataGrid */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">POWER (SPH)</th>
                          <th className="py-2.5 px-3">PHYSICAL SHELF STOCK</th>
                          <th className="py-2.5 px-3 text-center">ACTIVE LOTS</th>
                          <th className="py-2.5 px-3">EARLIEST EXPIRY</th>
                          <th className="py-2.5 px-3">HEALTH STATUS</th>
                          <th className="py-2.5 px-3 text-right">UNIT COST</th>
                          <th className="py-2.5 px-3 text-right">SHELF VALUE</th>
                          <th className="py-2.5 px-3 text-center">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPowerSummaries.map((p) => (
                          <tr key={p.power} className="hover:bg-slate-50/70 transition">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{p.power}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                                  p.shelfQuantity > 2
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : p.shelfQuantity > 0
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                {p.shelfQuantity > 0 ? `${p.shelfQuantity} Boxes` : '0 Boxes (Out of Stock)'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{p.activeBatchCount}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {p.earliestExpiry ? formatQatarDate(p.earliestExpiry) : 'No Expiry'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                  p.statusBadgeVariant === 'danger'
                                    ? 'bg-rose-100 text-rose-700'
                                    : p.statusBadgeVariant === 'warning'
                                    ? 'bg-amber-100 text-amber-700'
                                    : p.statusBadgeVariant === 'success'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {p.statusBadgeText}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600">{formatQar(p.unitCostQar)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{formatQar(p.totalValueQar)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPower(p.power);
                                  setActiveCardexTab('MOVEMENTS');
                                }}
                                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 text-blue-700 font-bold text-[11px] border border-slate-200 transition"
                              >
                                View Movements →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: PHYSICAL SHELF LOTS (FEFO) */}
              {activeCardexTab === 'BATCHES' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      Physical Shelf Lots ({activeBatches.length} Batches | {summary.physicalShelfStock} Boxes on Shelf)
                    </h4>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideZeroBatches}
                        onChange={(e) => setHideZeroBatches(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-0"
                      />
                      <span>Hide 0 Quantity Batches</span>
                    </label>
                  </div>

                  {filteredBatches.length === 0 ? (
                    <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                      No matching physical batches on the shelf.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3">Batch / Lot #</th>
                            <th className="py-2.5 px-3">Optical Power</th>
                            <th className="py-2.5 px-3">CYL / Axis</th>
                            <th className="py-2.5 px-3 text-center">Qty on Shelf</th>
                            <th className="py-2.5 px-3 text-right">Unit Cost</th>
                            <th className="py-2.5 px-3 text-right">Lot Total</th>
                            <th className="py-2.5 px-3">Expiry Date</th>
                            <th className="py-2.5 px-3 text-center">Health Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredBatches.map((b) => (
                            <tr key={b.batchId} className="hover:bg-slate-50/70 transition">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                              <td className="py-2.5 px-3 font-semibold text-blue-700">{b.power}</td>
                              <td className="py-2.5 px-3 text-slate-600 font-mono">
                                {b.cylinder ? `${b.cylinder} / ${b.axis || 0}°` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-center font-extrabold text-slate-900">{b.quantity}</td>
                              <td className="py-2.5 px-3 text-right text-slate-600">{formatQar(b.costPriceQar)}</td>
                              <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                                {formatQar(b.totalValueQar)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {b.expiryDate ? formatQatarDate(b.expiryDate) : 'No Expiry'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                    b.expiryBadgeVariant === 'danger'
                                      ? 'bg-rose-100 text-rose-700'
                                      : b.expiryBadgeVariant === 'warning'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {b.expiryBadgeText}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CHRONOLOGICAL MOVEMENTS LEDGER */}
        {activeCardexTab === 'MOVEMENTS' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Chronological Movement Ledger
                </h3>
                <p className="text-xs text-slate-500">
                  {filteredEntries.length} movements matching active filter (newest on top)
                </p>
              </div>
            </div>

            {/* Filter Pills & Table Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter reference, party, notes..."
                  value={ledgerSearch}
                  onChange={(e) => {
                    setLedgerSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-56 text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Event Filter Pills */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                {['ALL', 'INBOUND', 'SALES', 'RETURN', 'ADJUSTMENT', 'WRITEOFF'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTypeFilter(t);
                      setPage(1);
                    }}
                    className={`px-2 py-1 rounded-md font-semibold transition text-[11px] ${
                      typeFilter === t
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t === 'ALL'
                      ? 'All'
                      : t === 'INBOUND'
                      ? 'Inbound'
                      : t === 'SALES'
                      ? 'Sales'
                      : t === 'RETURN'
                      ? 'Returns'
                      : t === 'ADJUSTMENT'
                      ? 'Audit'
                      : 'Write-off'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-xs font-medium">Reconciling Cardex movements...</span>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-1">
              <Clock className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No inventory movements found</p>
              <p className="text-xs">There are no transactions recorded for the chosen filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3 text-center">Event Type</th>
                      <th className="py-2.5 px-3">Doc / Reference #</th>
                      <th className="py-2.5 px-3">Party (Supplier/Customer)</th>
                      <th className="py-2.5 px-3">Operator</th>
                      <th className="py-2.5 px-3 text-center">Power</th>
                      <th className="py-2.5 px-3 text-center">Batch / Lot</th>
                      <th className="py-2.5 px-3 text-center">Delta</th>
                      <th className="py-2.5 px-3 text-center">Balance</th>
                      <th className="py-2.5 px-3">Audit Note / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedEntries.map((e, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                          {formatQatarDateTime(e.timestamp)}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 text-[10px] font-extrabold rounded-full ${
                              e.transactionType === 'INBOUND_PO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : e.transactionType === 'INBOUND_RECEIPT'
                                ? 'bg-teal-100 text-teal-800'
                                : e.transactionType === 'POS_SALE'
                                ? 'bg-blue-100 text-blue-800'
                                : e.transactionType === 'ONLINE_SALE'
                                ? 'bg-purple-100 text-purple-800'
                                : e.transactionType === 'RETURN'
                                ? 'bg-amber-100 text-amber-800'
                                : e.transactionType === 'ADJUSTMENT'
                                ? 'bg-slate-200 text-slate-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {e.typeBadgeText}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {e.referenceNumber}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-[180px] truncate" title={e.partyName}>
                          {e.partyName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {e.operator}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-blue-700 whitespace-nowrap">
                          {e.power}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600 whitespace-nowrap">
                          {e.batchNumber || '—'}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-center font-black text-sm whitespace-nowrap ${
                            e.quantityDelta > 0
                              ? 'text-emerald-600'
                              : e.quantityDelta < 0
                              ? 'text-rose-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {e.quantityDelta > 0 ? `+${e.quantityDelta}` : e.quantityDelta}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 whitespace-nowrap bg-slate-50/50">
                          {e.runningBalance}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[240px] truncate" title={e.notes}>
                          {e.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 text-xs text-slate-600">
                  <span>
                    Showing {(page - 1) * pageSize + 1} to{' '}
                    {Math.min(page * pageSize, filteredEntries.length)} of{' '}
                    {filteredEntries.length} entries
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition font-medium"
                    >
                      Previous
                    </button>
                    <span className="px-2 font-semibold">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition font-medium"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        )}
      </div>
    </Shell>
  );
}
