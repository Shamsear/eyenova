'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ProductItem } from '@/lib/types';
import { usePosStore } from '@/stores/pos-store';
import { formatQar } from '@/lib/utils';
import { Search, Loader2, Filter, X } from 'lucide-react';
import { motion } from 'motion/react';
import { AnimatedQar, AnimatedCount } from '@/components/shared/animated-number';
import { Pagination } from '@/components/shared/pagination';
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
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(18);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { addLine, showToast } = usePosStore();

  // Dynamically derive categories from loaded products so empty/unnecessary tabs never appear
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

  // Dynamically derive brands from loaded products
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

  // Load products once or on category change (Strictly products with stock > 0)
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
          // Strictly show only products which have stock (stockQuantity > 0)
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

  // Reset to page 1 whenever search query, category, or brand changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedBrand]);

  // Global search & filter across the entire dataset FIRST (Strictly in-stock items)
  const filteredProducts = useMemo(() => {
    let result = allProducts.filter((p) => (p.stockQuantity ?? 0) > 0);

    // Filter by Brand (When a brand is selected, ONLY products of that brand are shown)
    if (selectedBrand !== 'ALL') {
      result = result.filter(
        (p) => (p.brandName || '').trim().toLowerCase() === selectedBrand.trim().toLowerCase()
      );
    }

    // Filter by Category
    if (selectedCategory !== 'ALL') {
      result = result.filter((p) => p.productType === selectedCategory);
    }

    // Filter by Search Query
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((p) => {
        return (
          p.titleEn.toLowerCase().includes(query) ||
          (p.brandName && p.brandName.toLowerCase().includes(query)) ||
          (p.barcode && p.barcode.toLowerCase().includes(query)) ||
          (p.sku && p.sku.toLowerCase().includes(query))
        );
      });
    }

    return result;
  }, [allProducts, selectedBrand, selectedCategory, searchQuery]);

  // Slice paginated items
  const totalItems = filteredProducts.length;
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const handleProductClick = (product: ProductItem) => {
    addLine(product);
    showToast('Item Added', `${product.titleEn} added to bill`, true);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-stone-50 border-r border-stone-200 overflow-hidden">
      {/* Top Search & Filter Bar (Strictly Single-Line) */}
      <div className="shrink-0 p-2 sm:p-2.5 bg-white border-b border-stone-200 space-y-1.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 text-stone-400 pointer-events-none" size={14} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Barcode, SKU, Title, or Brand (F1)..."
            className="w-full pl-8 pr-7 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs font-normal focus:bg-white focus:outline-hidden focus:border-stone-400 transition placeholder:text-stone-400 text-stone-900"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1.5 text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category Filter Tabs (Only categories with existing products) */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs min-w-0 py-0.5">
          {availableCategories.map((cat) => {
            const isSelected = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-stone-900 text-white font-medium shadow-none'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/60'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] tabular-nums ${isSelected ? 'text-stone-300' : 'text-stone-400'}`}>
                  (<AnimatedCount value={cat.count} />)
                </span>
              </button>
            );
          })}
        </div>

        {/* Brand Filter Tabs (When brand is selected, ONLY products of that brand are shown) */}
        {availableBrands.length > 2 && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs min-w-0 pt-0.5 border-t border-stone-100">
            <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider shrink-0 mr-0.5">Brand:</span>
            {availableBrands.map((b) => {
              const isSelected = selectedBrand === b.value;
              return (
                <button
                  key={b.value}
                  onClick={() => setSelectedBrand(b.value)}
                  className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap transition cursor-pointer shrink-0 flex items-center gap-1 ${
                    isSelected
                      ? 'bg-amber-600 text-white font-medium shadow-none'
                      : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/70'
                  }`}
                >
                  <span>{b.label}</span>
                  <span className={`text-[9px] tabular-nums ${isSelected ? 'text-amber-100' : 'text-stone-400'}`}>
                    (<AnimatedCount value={b.count} />)
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Grid Area (flex-1 min-h-0 overflow-y-auto) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-2.5">
        {loading && allProducts.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-stone-200/80 rounded-lg p-2.5 flex flex-col justify-between h-[104px] animate-pulse"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-2.5 bg-stone-100 rounded" />
                    <div className="w-10 h-2.5 bg-stone-100 rounded" />
                  </div>
                  <div className="w-3/4 h-3.5 bg-stone-200/70 rounded" />
                  <div className="w-1/2 h-2.5 bg-stone-100 rounded" />
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                  <div className="w-14 h-3.5 bg-stone-200 rounded" />
                  <div className="w-5 h-5 bg-stone-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : loading ? (
          <div className="h-48 flex flex-col items-center justify-center text-stone-400 gap-2">
            <Loader2 className="animate-spin text-stone-600" size={20} />
            <span className="text-xs font-mono">Loading catalog...</span>
          </div>
        ) : totalItems === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-stone-400 gap-2 text-center">
            <Filter size={24} className="text-stone-300" />
            <span className="text-xs font-medium text-stone-700">No matching optical products found.</span>
            <span className="text-[11px] text-stone-400">Try adjusting your brand, search terms or category filter.</span>
          </div>
        ) : (
          <Rise as="div" targets="children" stagger={20} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-2">
            {paginatedProducts.map((product) => {
              const price = product.salePriceQar ?? product.basePriceQar;
              const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= product.minStockAlert;
              const isOutStock = product.stockQuantity <= 0;

              const initials = (product.brandName || product.titleEn)
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase();

              return (
                <motion.button
                  key={product.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleProductClick(product)}
                  className="bg-white border border-stone-200 rounded-lg p-2 text-left hover:border-stone-400 transition-colors flex flex-col justify-between group cursor-pointer min-h-[145px]"
                >
                  {/* Top Image Frame */}
                  <div className="relative w-full h-16 bg-stone-50 rounded-md overflow-hidden flex items-center justify-center border border-stone-100 shrink-0">
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

                    {/* Stock Indicator Dot */}
                    <div className="absolute top-1 right-1 flex items-center gap-1 bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded border border-stone-200/80">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isOutStock ? 'bg-rose-600' : isLowStock ? 'bg-amber-600' : 'bg-emerald-600'
                        }`}
                      />
                      <AnimatedCount
                        value={product.stockQuantity}
                        className="text-[9px] font-mono text-stone-600 tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Brand & Strictly Single-Line Title */}
                  <div className="mt-1 flex-1 min-w-0">
                    <span className="text-[9px] text-stone-400 font-mono uppercase tracking-wider block truncate">
                      {product.brandName || 'EyeNova'}
                    </span>
                    <span
                      className="font-medium text-xs text-stone-900 truncate block leading-snug"
                      title={product.titleEn}
                    >
                      {product.titleEn}
                    </span>
                  </div>

                  {/* Price & Quick Add Button (Single-Line) */}
                  <div className="mt-1 pt-1 border-t border-stone-100 flex items-center justify-between">
                    <AnimatedQar
                      value={price}
                      className="font-medium text-xs text-stone-900 font-mono tabular-nums"
                    />
                    <span className="w-4.5 h-4.5 rounded bg-stone-100 group-hover:bg-stone-900 group-hover:text-white text-stone-700 flex items-center justify-center text-xs font-medium transition">
                      +
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </Rise>
        )}
      </div>

      {/* Catalog Single-Line Pagination Toolbar */}
      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[12, 18, 24, 48]}
      />
    </div>
  );
}
