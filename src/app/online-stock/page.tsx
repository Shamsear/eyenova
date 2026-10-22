'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Shell } from '@/components/layout/shell';
import {
  Search,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ProductEntry {
  id: string;
  sku: string;
  titleEn: string;
  brandName?: string | null;
  productType?: string | null;
  shopifyProductId?: string | null;
  availablePowers?: string[];
  tags?: string[];
}

const ALL_SPHERES = [
  '0.00', '-0.25', '-0.50', '-0.75', '-1.00', '-1.25', '-1.50', '-1.75', '-2.00',
  '-2.25', '-2.50', '-2.75', '-3.00', '-3.25', '-3.50', '-3.75', '-4.00',
  '-4.25', '-4.50', '-4.75', '-5.00', '-5.25', '-5.50', '-5.75', '-6.00',
  '-6.50', '-7.00', '-7.50', '-8.00', '-8.50', '-9.00', '-9.50', '-10.00',
  '-10.50', '-11.00', '-11.50', '-12.00',
  '+0.25', '+0.50', '+0.75', '+1.00', '+1.25', '+1.50', '+1.75', '+2.00',
  '+2.25', '+2.50', '+2.75', '+3.00', '+3.50', '+4.00', '+4.50',
  '+5.00', '+5.50', '+6.00', '+7.00', '+8.00',
];

const STANDARD_CYLINDERS = ['-0.75', '-1.25', '-1.75', '-2.25', '-2.75'];
const STANDARD_AXES = [
  '10', '20', '30', '40', '50', '60', '70', '80', '90', '100', '110', '120', '130', '140', '150', '160', '170', '180',
];
const STANDARD_ADDS = ['Low', 'Medium', 'High'];

const PAGE_SIZE = 12;

export default function OnlineStockPage() {
  const [products, setProducts] = useState<ProductEntry[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'TORIC' | 'MULTIFOCAL' | 'SPHERICAL' | 'COLOR'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Active / OOS toggles for selected product
  const [oosPowers, setOosPowers] = useState<Set<string>>(new Set());
  const [oosCyls, setOosCyls] = useState<Set<string>>(new Set());
  const [oosAxes, setOosAxes] = useState<Set<string>>(new Set());
  const [oosAdds, setOosAdds] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Loading catalog...');
  const [mobileTab, setMobileTab] = useState<'PRODUCTS' | 'MATRIX'>('PRODUCTS');

  // Load products list
  async function loadProducts() {
    setIsLoading(true);
    setStatusMessage('Loading catalog...');
    try {
      const res = await fetch('/api/products/online-availability');
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
        setStatusMessage(`Loaded ${data.products.length} products`);
        if (!selectedProduct && data.products.length > 0) {
          selectProductItem(data.products[0], false);
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setStatusMessage(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  // When a product is selected, fetch its current online availability
  async function selectProductItem(prod: ProductEntry, switchToMatrixOnMobile = true) {
    setSelectedProduct(prod);
    if (switchToMatrixOnMobile) {
      setMobileTab('MATRIX');
    }
    try {
      const res = await fetch(`/api/products/online-availability?productId=${prod.id}`);
      const data = await res.json();
      if (data) {
        setOosPowers(new Set(data.oosPowers || []));
        setOosCyls(new Set(data.oosCyls || []));
        setOosAxes(new Set(data.oosAxes || []));
        setOosAdds(new Set(data.oosAdds || []));
        setStatusMessage(`Ready: ${prod.titleEn}`);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Filtered products list
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        !q ||
        p.titleEn.toLowerCase().includes(q) ||
        (p.brandName && p.brandName.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q));

      if (!matchSearch) return false;

      const title = p.titleEn.toLowerCase();
      const pType = (p.productType || '').toLowerCase();
      const tags = (p.tags || []).join(' ').toLowerCase();

      switch (selectedCategory) {
        case 'TORIC':
          return title.includes('astigmatism') || title.includes('toric') || tags.includes('toric') || pType.includes('toric');
        case 'MULTIFOCAL':
          return title.includes('multifocal') || title.includes('presbyopia') || tags.includes('multifocal');
        case 'SPHERICAL':
          return !title.includes('astigmatism') && !title.includes('toric') && !title.includes('multifocal') && !pType.includes('solution');
        case 'COLOR':
          return title.includes('color') || title.includes('colour') || tags.includes('color') || pType.includes('color');
        default:
          return true;
      }
    });
  }, [products, searchQuery, selectedCategory]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  // Product classification
  const isToric = useMemo(() => {
    if (!selectedProduct) return false;
    const title = selectedProduct.titleEn.toLowerCase();
    const pType = (selectedProduct.productType || '').toLowerCase();
    return title.includes('astigmatism') || title.includes('toric') || pType.includes('toric');
  }, [selectedProduct]);

  const isMultifocal = useMemo(() => {
    if (!selectedProduct) return false;
    const title = selectedProduct.titleEn.toLowerCase();
    return title.includes('multifocal') || title.includes('presbyopia');
  }, [selectedProduct]);

  // Toggles
  function togglePower(pwr: string) {
    setOosPowers((prev) => {
      const next = new Set(prev);
      if (next.has(pwr)) next.delete(pwr);
      else next.add(pwr);
      return next;
    });
  }

  function toggleCyl(cyl: string) {
    setOosCyls((prev) => {
      const next = new Set(prev);
      if (next.has(cyl)) next.delete(cyl);
      else next.add(cyl);
      return next;
    });
  }

  function toggleAxis(ax: string) {
    setOosAxes((prev) => {
      const next = new Set(prev);
      if (next.has(ax)) next.delete(ax);
      else next.add(ax);
      return next;
    });
  }

  function toggleAdd(add: string) {
    setOosAdds((prev) => {
      const next = new Set(prev);
      if (next.has(add)) next.delete(add);
      else next.add(add);
      return next;
    });
  }

  // Quick preset actions
  function makeAllAvailable() {
    setOosPowers(new Set());
    setOosCyls(new Set());
    setOosAxes(new Set());
    setOosAdds(new Set());
  }

  function disableHighNegative() {
    const next = new Set(oosPowers);
    ALL_SPHERES.forEach((pwr) => {
      const num = parseFloat(pwr);
      if (!isNaN(num) && num <= -6.0) {
        next.add(pwr);
      }
    });
    setOosPowers(next);
  }

  function disablePlusPowers() {
    const next = new Set(oosPowers);
    ALL_SPHERES.forEach((pwr) => {
      if (pwr.startsWith('+')) {
        next.add(pwr);
      }
    });
    setOosPowers(next);
  }

  // Save & Sync action
  async function handleSaveAndSync() {
    if (!selectedProduct) return;
    setIsSaving(true);
    setStatusMessage('Syncing to Shopify...');

    try {
      const activeSpheres = ALL_SPHERES.filter((p) => !oosPowers.has(p));
      const hasPlano = !oosPowers.has('0.00');
      const hasRx = activeSpheres.some((p) => p !== '0.00');

      const res = await fetch('/api/products/online-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          oosPowers: Array.from(oosPowers),
          oosCyls: Array.from(oosCyls),
          oosAxes: Array.from(oosAxes),
          oosAdds: Array.from(oosAdds),
          availablePowers: activeSpheres,
          hasPlanoOption: hasPlano,
          hasPrescription: hasRx,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message || 'Saved successfully');
      } else {
        setStatusMessage(`Error: ${data.error || 'Failed to save'}`);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setStatusMessage(`Sync error: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  }

  const availableCount = ALL_SPHERES.length - oosPowers.size;
  const soldOutCount = oosPowers.size;

  return (
    <Shell
      title="Online Power & Variant Availability"
      subtitle="Configure contact lens powers, cylinders and axes for online storefront"
    >
      <div className="flex-1 min-h-0 flex flex-col p-2.5 sm:p-4 gap-2.5 sm:gap-3 overflow-hidden bg-stone-100/60">
        {/* Top Control Bar */}
        <div className="bg-white border border-stone-200 rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-900 truncate">
              Storefront Availability
            </span>
            {statusMessage && (
              <span className="text-[11px] font-mono text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded truncate max-w-[200px] sm:max-w-none">
                {statusMessage}
              </span>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2 shrink-0 justify-start sm:justify-end min-w-0">
            <button
              onClick={loadProducts}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded transition border border-stone-200 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <RotateCcw size={12} className={isLoading ? 'animate-spin' : ''} />
              <span className="truncate">Refresh</span>
            </button>

            <button
              onClick={handleSaveAndSync}
              disabled={isSaving || !selectedProduct}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-50 bg-stone-900 hover:bg-stone-800 rounded transition disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <Save size={12} />
              <span className="truncate">{isSaving ? 'Syncing...' : 'Save & Sync'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab Switcher (< md) */}
        <div className="md:hidden flex bg-white border border-stone-200 rounded-lg p-1 gap-1 shrink-0">
          <button
            onClick={() => setMobileTab('PRODUCTS')}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition cursor-pointer truncate ${
              mobileTab === 'PRODUCTS'
                ? 'bg-stone-900 text-stone-50'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Products ({filteredProducts.length})
          </button>
          <button
            onClick={() => setMobileTab('MATRIX')}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition cursor-pointer truncate px-2 ${
              mobileTab === 'MATRIX'
                ? 'bg-stone-900 text-stone-50'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Matrix {selectedProduct ? `• ${selectedProduct.titleEn}` : ''}
          </button>
        </div>

        {/* Main 2-Column Workspace */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-2.5 sm:gap-3 overflow-hidden">
          {/* Left Column: Product Search & Paginated List */}
          <div
            className={`bg-white border border-stone-200 rounded-lg flex-col p-3 overflow-hidden shrink-0 ${
              mobileTab === 'PRODUCTS' ? 'flex flex-1 w-full' : 'hidden md:flex md:w-80'
            }`}
          >
            {/* Search Input */}
            <div className="relative mb-2 shrink-0">
              <Search size={13} className="absolute left-2.5 top-2.5 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search catalog, SKU, brand..."
                className="w-full bg-stone-50 border border-stone-200 rounded pl-8 pr-7 py-1.5 text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-stone-900 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter Chips - strictly single line horizontal */}
            <div className="flex items-center gap-1 pb-2 overflow-x-auto shrink-0 scrollbar-none">
              {(['ALL', 'TORIC', 'MULTIFOCAL', 'SPHERICAL', 'COLOR'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-stone-900 text-stone-50'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Products List - strictly single line per item */}
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100 pr-1 space-y-0.5">
              {paginatedProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-400">
                  No matching products.
                </div>
              ) : (
                paginatedProducts.map((p) => {
                  const isSelected = selectedProduct?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => selectProductItem(p, true)}
                      className={`p-2 rounded cursor-pointer transition flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-stone-900 text-stone-50'
                          : 'hover:bg-stone-50 text-stone-900'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-medium truncate ${isSelected ? 'text-stone-50' : 'text-stone-900'}`}>
                          {p.titleEn}
                        </p>
                        <p className={`text-[10px] font-mono truncate ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                          {p.sku || p.brandName || 'EyeNova'}
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                          isSelected
                            ? 'bg-stone-800 text-stone-200'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {p.productType || 'LENS'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* List Pagination Bar */}
            <div className="pt-2 mt-1 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500 shrink-0">
              <span className="font-mono text-[10px] truncate">
                {filteredProducts.length} total • p. {currentPage}/{totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded border border-stone-200 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 rounded border border-stone-200 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Click-to-Toggle Grid */}
          <div
            className={`bg-white border border-stone-200 rounded-lg flex-col p-3 sm:p-4 overflow-hidden ${
              mobileTab === 'MATRIX' ? 'flex flex-1 w-full' : 'hidden md:flex md:flex-1'
            }`}
          >
            {selectedProduct ? (
              <>
                {/* Product Header Banner - strictly single line rows */}
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5 flex items-center justify-between gap-3 shrink-0 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMobileTab('PRODUCTS')}
                        className="md:hidden text-xs font-mono text-stone-600 hover:text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 shrink-0"
                      >
                        Back
                      </button>
                      <h2 className="text-xs sm:text-sm font-semibold text-stone-900 truncate">
                        {selectedProduct.titleEn}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5 font-mono">
                      <span className="truncate">{selectedProduct.brandName || 'EyeNova'}</span>
                      <span>•</span>
                      {selectedProduct.shopifyProductId ? (
                        <span className="text-stone-600 font-mono text-[11px] flex items-center gap-1 truncate">
                          Shopify: {selectedProduct.shopifyProductId}
                          <ExternalLink size={10} />
                        </span>
                      ) : (
                        <span className="text-stone-400">Offline only</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                    <span className="bg-stone-100 text-stone-900 border border-stone-300 font-medium px-2 py-0.5 rounded">
                      {availableCount} Available
                    </span>
                    <span className="bg-stone-100 text-stone-400 border border-stone-200 font-medium px-2 py-0.5 rounded line-through">
                      {soldOutCount} Sold Out
                    </span>
                  </div>
                </div>

                {/* Quick Presets Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-200 shrink-0 mb-3 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] text-stone-500 uppercase tracking-wider">Presets:</span>
                    <button
                      onClick={makeAllAvailable}
                      className="px-2.5 py-1 rounded text-xs font-mono font-medium bg-stone-100 text-stone-800 border border-stone-200 hover:bg-stone-200 transition cursor-pointer"
                    >
                      All Available
                    </button>
                    <button
                      onClick={disableHighNegative}
                      className="px-2.5 py-1 rounded text-xs font-mono font-medium bg-stone-100 text-stone-800 border border-stone-200 hover:bg-stone-200 transition cursor-pointer"
                    >
                      Disable &lt; -6.00
                    </button>
                    <button
                      onClick={disablePlusPowers}
                      className="px-2.5 py-1 rounded text-xs font-mono font-medium bg-stone-100 text-stone-800 border border-stone-200 hover:bg-stone-200 transition cursor-pointer"
                    >
                      Disable (+) Powers
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-stone-700 text-[11px]">Active</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
                      <span className="text-stone-400 text-[11px]">Sold Out</span>
                    </div>
                  </div>
                </div>

                {/* Scrollable Toggle Grids */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {/* SECTION 1: POWER / SPHERE (SPH) */}
                  <div>
                    <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-stone-500 mb-2">
                      Power / Sphere (SPH)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_SPHERES.map((pwr) => {
                        const isOos = oosPowers.has(pwr);
                        return (
                          <button
                            key={pwr}
                            onClick={() => togglePower(pwr)}
                            className={`min-w-[56px] px-2.5 py-2 rounded text-xs font-mono font-medium transition cursor-pointer border ${
                              isOos
                                ? 'bg-stone-100 border-stone-200 text-stone-400 line-through hover:bg-stone-200'
                                : 'bg-white border-stone-300 text-stone-900 hover:border-stone-900 shadow-2xs'
                            }`}
                          >
                            {pwr}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* SECTION 2: CYLINDER (FOR TORIC) */}
                  {isToric && (
                    <div>
                      <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-stone-500 mb-2">
                        Cylinder (CYL) — Astigmatism
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {STANDARD_CYLINDERS.map((cyl) => {
                          const isOos = oosCyls.has(cyl);
                          return (
                            <button
                              key={cyl}
                              onClick={() => toggleCyl(cyl)}
                              className={`min-w-[56px] px-2.5 py-2 rounded text-xs font-mono font-medium transition cursor-pointer border ${
                                isOos
                                  ? 'bg-stone-100 border-stone-200 text-stone-400 line-through hover:bg-stone-200'
                                  : 'bg-white border-stone-300 text-stone-900 hover:border-stone-900 shadow-2xs'
                              }`}
                            >
                              {cyl}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SECTION 3: AXIS (FOR TORIC) */}
                  {isToric && (
                    <div>
                      <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-stone-500 mb-2">
                        Axis — Astigmatism (10° to 180°)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {STANDARD_AXES.map((ax) => {
                          const isOos = oosAxes.has(ax);
                          return (
                            <button
                              key={ax}
                              onClick={() => toggleAxis(ax)}
                              className={`min-w-[50px] px-2 py-2 rounded text-xs font-mono font-medium transition cursor-pointer border ${
                                isOos
                                  ? 'bg-stone-100 border-stone-200 text-stone-400 line-through hover:bg-stone-200'
                                  : 'bg-white border-stone-300 text-stone-900 hover:border-stone-900 shadow-2xs'
                              }`}
                            >
                              {ax}°
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SECTION 4: ADD POWER (FOR MULTIFOCAL) */}
                  {isMultifocal && (
                    <div>
                      <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-stone-500 mb-2">
                        Add Power — Multifocal / Presbyopia
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {STANDARD_ADDS.map((add) => {
                          const isOos = oosAdds.has(add);
                          return (
                            <button
                              key={add}
                              onClick={() => toggleAdd(add)}
                              className={`min-w-[64px] px-3 py-2 rounded text-xs font-mono font-medium transition cursor-pointer border ${
                                isOos
                                  ? 'bg-stone-100 border-stone-200 text-stone-400 line-through hover:bg-stone-200'
                                  : 'bg-white border-stone-300 text-stone-900 hover:border-stone-900 shadow-2xs'
                              }`}
                            >
                              {add}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-400 text-xs">
                Select a product from the list to configure availability.
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
