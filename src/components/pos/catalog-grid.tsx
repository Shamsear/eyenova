'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ProductItem } from '@/lib/types';
import { usePosStore } from '@/stores/pos-store';
import { Search, Filter, X, SlidersHorizontal, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { AnimatedQar, AnimatedCount } from '@/components/shared/animated-number';
import { Pagination } from '@/components/shared/pagination';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { CardGridSkeleton } from '@/components/ui/skeletons';
import { Rise } from 'cube-motion/react';

const CATEGORY_LABEL_MAP: Record<string, string> = {
  COLORED_CONTACT_LENSES: 'Colored Lenses',
  MEDICAL_CONTACT_LENSES: 'Medical Lenses',
  LENS_SOLUTION_CARE: 'Solutions & Care',
  LASHES_BEAUTY: 'Beauty & Lashes',
  SPECTACLES: 'Frames',
  SUNGLASSES: 'Sunglasses',
  ACCESSORY: 'Accessories',
};

function formatCategoryLabel(type: string): string {
  if (CATEGORY_LABEL_MAP[type]) return CATEGORY_LABEL_MAP[type];
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CatalogGrid() {
  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [powerPickerProduct, setPowerPickerProduct] = useState<ProductItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(18);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { addLine, showToast } = usePosStore();

  const availableCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of allProducts) {
      const type = p.productType || 'OTHER';
      counts[type] = (counts[type] || 0) + 1;
    }

    const list: { value: string; label: string; count: number }[] = [
      { value: 'ALL', label: 'All Products', count: allProducts.length },
    ];

    Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .forEach((type) => {
        if (counts[type] > 0) {
          list.push({
            value: type,
            label: formatCategoryLabel(type),
            count: counts[type],
          });
        }
      });

    return list;
  }, [allProducts]);

  const availableBrands = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of allProducts) {
      const b = p.brandName?.trim() || 'Other';
      counts[b] = (counts[b] || 0) + 1;
    }

    const list: { value: string; label: string; count: number }[] = [
      { value: 'ALL', label: 'All Brands', count: allProducts.length },
    ];

    Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .forEach((b) => {
        if (counts[b] > 0) {
          list.push({
            value: b,
            label: b,
            count: counts[b],
          });
        }
      });

    return list;
  }, [allProducts]);

  useEffect(() => {
    let ignore = false;
    async function loadProducts() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', '500');
        params.set('inStock', 'true');

        const res = await fetch(`/api/products?${params.toString()}`);
        const data = await res.json();
        if (!ignore && data.products) {
          const inStockOnly = (data.products as ProductItem[]).filter(
            (p) => (p.stockQuantity ?? 0) > 0
          );
          setAllProducts(inStockOnly);
        }
      } catch (err) {
        console.error('Error fetching catalog:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadProducts();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    let result = allProducts.filter((p) => (p.stockQuantity ?? 0) > 0);

    if (selectedBrand !== 'ALL') {
      result = result.filter(
        (p) => (p.brandName || '').trim().toLowerCase() === selectedBrand.trim().toLowerCase()
      );
    }

    if (selectedCategory !== 'ALL') {
      result = result.filter((p) => p.productType === selectedCategory);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((p) => {
        const matchesBatchPower = p.batches?.some(
          (b) =>
            (b.quantity ?? 0) > 0 &&
            b.power &&
            (b.power.toLowerCase().includes(query) ||
              (query === '0.00' && b.power.toLowerCase().includes('plano')) ||
              (query.includes('plano') && b.power.includes('0.00')))
        );

        return (
          p.titleEn.toLowerCase().includes(query) ||
          (p.brandName && p.brandName.toLowerCase().includes(query)) ||
          (p.barcode && p.barcode.toLowerCase().includes(query)) ||
          (p.sku && p.sku.toLowerCase().includes(query)) ||
          Boolean(matchesBatchPower)
        );
      });
    }

    return result;
  }, [allProducts, selectedBrand, selectedCategory, searchQuery]);

  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, safePage, pageSize]);

  const handleProductClick = (product: ProductItem) => {
    addLine(product);
    showToast('Item Added', `${product.titleEn} added to bill`, true);
  };

  const handlePowerChipClick = (product: ProductItem, pwr: string) => {
    const isPlano = pwr.toLowerCase().includes('plano') || pwr === '0.00';
    const cleanPower = isPlano ? '0.00' : pwr;
    addLine(product, {
      power: cleanPower,
      isPlano,
    });
    showToast('Item Added', `${product.titleEn} (${pwr}) added to bill`, true);
  };

  const getProductPowers = (product: ProductItem) => {
    const inStockBatches = (product.batches || []).filter((b) => (b.quantity ?? 0) > 0);
    const pwrMap = new Map<string, number>();
    for (const b of inStockBatches) {
      const pwr = b.power?.trim() || 'Plano';
      pwrMap.set(pwr, (pwrMap.get(pwr) || 0) + (b.quantity || 0));
    }
    return Array.from(pwrMap.entries());
  };

  const hasActiveFilters = selectedCategory !== 'ALL' || selectedBrand !== 'ALL';

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-stone-50 lg:border-r border-stone-200 overflow-hidden">
      {/* Top Search & Filter Bar */}
      <div className="shrink-0 p-2.5 bg-white border-b border-stone-200 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
              size={14}
            />
            <input
              id="pos-catalog-search"
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search Barcode, SKU, Title, or Power (-1.50, Plano) · F1"
              className="w-full h-10 sm:h-9 pl-8 pr-8 bg-stone-50 border border-stone-200 rounded-lg text-[16px] sm:text-xs font-normal focus:bg-white focus:outline-hidden focus:border-teal-700 transition placeholder:text-stone-400 text-stone-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Mobile Filter Toggle (< sm) — saves ~100px vertical chrome on phones */}
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            aria-expanded={mobileFiltersOpen}
            className={`sm:hidden h-10 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
              hasActiveFilters || mobileFiltersOpen
                ? 'bg-teal-50 border-teal-300 text-teal-800'
                : 'bg-white border-stone-200 text-stone-700'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>Filter</span>
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />}
          </button>
        </div>

        {/* Category & Brand Filters (Always visible on sm+, collapsible on phone) */}
        <div className={`${mobileFiltersOpen ? 'block' : 'hidden sm:block'} space-y-1.5`}>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs min-w-0 py-0.5">
            {availableCategories.map((cat) => {
              const isSelected = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.value);
                    setCurrentPage(1);
                  }}
                  className={`min-h-[32px] sm:min-h-[28px] px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-stone-900 text-white font-medium'
                      : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/80'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] tabular-nums ${
                      isSelected ? 'text-stone-300' : 'text-stone-400'
                    }`}
                  >
                    (<AnimatedCount value={cat.count} />)
                  </span>
                </button>
              );
            })}
          </div>

          {availableBrands.length > 2 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs min-w-0 pt-1 border-t border-stone-100">
              <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider shrink-0 mr-0.5">
                Brand:
              </span>
              {availableBrands.map((b) => {
                const isSelected = selectedBrand === b.value;
                return (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => {
                      setSelectedBrand(b.value);
                      setCurrentPage(1);
                    }}
                    className={`min-h-[28px] sm:min-h-[24px] px-2 py-0.5 rounded-md text-[10px] whitespace-nowrap transition cursor-pointer shrink-0 flex items-center gap-1 ${
                      isSelected
                        ? 'bg-teal-700 text-white font-medium'
                        : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80'
                    }`}
                  >
                    <span>{b.label}</span>
                    <span
                      className={`text-[9px] tabular-nums ${
                        isSelected ? 'text-teal-100' : 'text-stone-400'
                      }`}
                    >
                      (<AnimatedCount value={b.count} />)
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Container-Query Responsive Product Grid (with bottom clearance for docked bar on < lg) */}
      <div className="@container flex-1 min-h-0 overflow-y-auto p-2.5 pb-24 lg:pb-3">
        {loading && allProducts.length === 0 ? (
          <CardGridSkeleton count={12} />
        ) : totalItems === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center text-stone-400 gap-2 text-center px-4">
            <Filter size={24} className="text-stone-300" />
            <span className="text-xs font-semibold text-stone-700">
              No matching optical products found.
            </span>
            <span className="text-[11px] text-stone-500">
              Try adjusting your brand, search terms, or category filter.
            </span>
            {(hasActiveFilters || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setSelectedBrand('ALL');
                  setCurrentPage(1);
                }}
                className="mt-1 h-9 px-3 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <Rise
            as="div"
            targets="children"
            stagger={16}
            className="grid grid-cols-2 @[460px]:grid-cols-3 @[700px]:grid-cols-4 @[940px]:grid-cols-5 @[1200px]:grid-cols-6 gap-2 sm:gap-2.5"
          >
            {paginatedProducts.map((product) => {
              const price = product.salePriceQar ?? product.basePriceQar;
              const isLowStock =
                product.stockQuantity > 0 && product.stockQuantity <= product.minStockAlert;
              const isOutStock = product.stockQuantity <= 0;
              const pwrEntries = getProductPowers(product);

              const initials = (product.brandName || product.titleEn)
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase();

              return (
                <motion.div
                  key={product.id}
                  role="group"
                  aria-label={product.titleEn}
                  whileHover={{ y: -1 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white border border-stone-200 hover:border-teal-700/60 rounded-xl p-2 text-left transition-colors flex flex-col justify-between group min-h-[156px]"
                >
                  {/* Primary Product Tap Zone (no nested buttons inside!) */}
                  <button
                    type="button"
                    onClick={() => handleProductClick(product)}
                    className="w-full text-left flex-1 flex flex-col cursor-pointer focus:outline-hidden"
                  >
                    {/* Top Image Frame */}
                    <div className="relative w-full h-14 bg-stone-50 rounded-lg overflow-hidden flex items-center justify-center border border-stone-100 shrink-0">
                      {product.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={product.imageUrl}
                          alt={product.titleEn}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-xs font-medium text-stone-400 font-mono tracking-wider">
                          {initials}
                        </span>
                      )}

                      <div className="absolute top-1 right-1 flex items-center gap-1 bg-white/95 px-1.5 py-0.5 rounded-md border border-stone-200/80">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isOutStock
                              ? 'bg-rose-600'
                              : isLowStock
                              ? 'bg-amber-600'
                              : 'bg-emerald-600'
                          }`}
                        />
                        <AnimatedCount
                          value={product.stockQuantity}
                          className="text-[9px] font-mono text-stone-700 tabular-nums"
                        />
                      </div>
                    </div>

                    <div className="mt-1.5 min-w-0 w-full">
                      <span className="text-[9px] text-stone-400 font-mono uppercase tracking-wider block truncate">
                        {product.brandName || 'EyeNova'}
                      </span>
                      <span
                        className="font-medium text-xs text-stone-900 line-clamp-2 leading-snug block"
                        title={product.titleEn}
                      >
                        {product.titleEn}
                      </span>
                    </div>
                  </button>

                  {/* Independent Power Quick-Add Chips (Valid sibling buttons!) */}
                  {pwrEntries.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                      {pwrEntries.slice(0, 3).map(([pwr, qty]) => {
                        const isSearchMatch =
                          searchQuery &&
                          (pwr.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
                            (searchQuery.trim() === '0.00' && pwr.toLowerCase().includes('plano')));

                        return (
                          <button
                            key={pwr}
                            type="button"
                            onClick={() => handlePowerChipClick(product, pwr)}
                            title={`Click to add ${pwr} (${qty} in stock)`}
                            className={`inline-flex items-center px-1.5 py-1 sm:py-0.5 text-[10px] font-mono rounded-md transition cursor-pointer ${
                              isSearchMatch
                                ? 'bg-teal-50 text-teal-900 border border-teal-400 font-semibold'
                                : 'bg-stone-100 text-stone-700 hover:bg-teal-700 hover:text-white border border-stone-200/80'
                            }`}
                          >
                            <span>{pwr}</span>
                            <span className="text-[8px] opacity-75 ml-0.5 font-sans">({qty})</span>
                          </button>
                        );
                      })}
                      {pwrEntries.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setPowerPickerProduct(product)}
                          className="inline-flex items-center px-1.5 py-1 sm:py-0.5 text-[10px] font-mono rounded-md bg-stone-50 hover:bg-stone-200 text-stone-600 border border-stone-200 cursor-pointer"
                          title="View all in-stock powers"
                        >
                          +{pwrEntries.length - 3}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Price & Quick Add Footer */}
                  <button
                    type="button"
                    onClick={() => handleProductClick(product)}
                    className="mt-1.5 pt-1.5 border-t border-stone-100 w-full flex items-center justify-between cursor-pointer"
                  >
                    <AnimatedQar
                      value={price}
                      className="font-semibold text-xs text-stone-900 font-mono tabular-nums"
                    />
                    <span className="w-7 h-7 sm:w-6 sm:h-6 rounded-md bg-stone-100 group-hover:bg-teal-700 group-hover:text-white text-stone-700 flex items-center justify-center transition">
                      <Plus size={13} />
                    </span>
                  </button>
                </motion.div>
              );
            })}
          </Rise>
        )}
      </div>

      {/* Catalog Pagination Toolbar */}
      <Pagination
        currentPage={safePage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[12, 18, 24, 48]}
        className="pb-16 lg:pb-2"
      />

      {/* All In-Stock Powers Picker Dialog (never clips at card edges) */}
      <ResponsiveDialog
        open={Boolean(powerPickerProduct)}
        onClose={() => setPowerPickerProduct(null)}
        title={powerPickerProduct?.titleEn || 'Select Optical Power'}
        subtitle={
          powerPickerProduct
            ? `${powerPickerProduct.brandName || 'EyeNova'} · Tap any in-stock power to add`
            : undefined
        }
        maxWidthClass="sm:max-w-md"
        bodyClassName="p-4"
      >
        {powerPickerProduct && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {getProductPowers(powerPickerProduct).map(([pwr, qty]) => (
              <button
                key={pwr}
                type="button"
                onClick={() => {
                  handlePowerChipClick(powerPickerProduct, pwr);
                  setPowerPickerProduct(null);
                }}
                className="min-h-[44px] px-2.5 py-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-teal-700 hover:text-white hover:border-teal-700 text-stone-900 font-mono text-xs flex flex-col items-center justify-center gap-0.5 transition cursor-pointer"
              >
                <span className="font-semibold">{pwr}</span>
                <span className="text-[10px] opacity-75 font-sans">{qty} left</span>
              </button>
            ))}
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
}
