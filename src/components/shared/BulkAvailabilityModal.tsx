'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Tag,
} from 'lucide-react';

interface ProductPlanItem {
  productId: string;
  shopifyProductId: string | null;
  titleEn: string;
  sku: string;
  brandName: string | null;
  productType?: string | null;
  isUnlisted: boolean;
  activePowers: string[];
  oosPowers: string[];
  activePowersCount: number;
  oosPowersCount: number;
  hasPlano: boolean;
  hasRx: boolean;
  existingStockQty: number;
}

interface SummaryData {
  totalExcelRows: number;
  matchedExcelRows: number;
  unmatchedExcelRows: number;
  matchedProductsCount: number;
  unlistedProductsCount: number;
  totalProductsInPlan: number;
  detectedBrands: string[];
  totalActiveDiopters: number;
  totalOosDiopters: number;
}

interface UnmatchedRow {
  particulars: string;
  qty: unknown;
  baseName: string;
  power: string;
}

interface BulkAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BulkAvailabilityModal({ isOpen, onClose, onSuccess }: BulkAvailabilityModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [useDefaultFile, setUseDefaultFile] = useState(true);
  const [markUnlistedOos, setMarkUnlistedOos] = useState(true);
  const [unlistedScope, setUnlistedScope] = useState<'MATCHED_BRANDS' | 'ALL_CATALOG'>('MATCHED_BRANDS');

  const [isLoadingPreview, setIsLoadingRunning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');

  const [previewData, setPreviewData] = useState<{
    summary: SummaryData;
    products: ProductPlanItem[];
    unmatchedRows: UnmatchedRow[];
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'ALL' | 'MATCHED' | 'UNLISTED' | 'UNMATCHED'>('ALL');
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());

  const [resultMessage, setResultMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    details?: string[];
  } | null>(null);

  async function handleFetchPreview() {
    setIsLoadingRunning(true);
    setResultMessage(null);
    try {
      const formData = new FormData();
      formData.append('action', 'preview');
      formData.append('markUnlistedOos', markUnlistedOos ? 'true' : 'false');
      formData.append('unlistedScope', unlistedScope);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await fetch('/api/products/bulk-stock-update', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate preview');
      }

      setPreviewData({
        summary: data.summary,
        products: data.products,
        unmatchedRows: data.unmatchedRows || [],
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResultMessage({ type: 'error', text: msg });
    } finally {
      setIsLoadingRunning(false);
    }
  }

  async function handleApplySync() {
    if (!previewData) return;
    setIsSyncing(true);
    setSyncProgress('Updating database and syncing Shopify Storefront...');
    setResultMessage(null);

    try {
      const formData = new FormData();
      formData.append('action', 'apply');
      formData.append('markUnlistedOos', markUnlistedOos ? 'true' : 'false');
      formData.append('unlistedScope', unlistedScope);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await fetch('/api/products/bulk-stock-update', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to apply availability changes');
      }

      const errors = data.shopifyErrors || [];
      const errorStrings = errors.map((e: { title: string; error: string }) => `${e.title}: ${e.error}`);

      setResultMessage({
        type: 'success',
        text: `✓ Success! Updated ${data.dbUpdatedCount} products. Synced ${data.shopifySyncedCount} items to Shopify storefront (${data.shopifySkippedCount} non-Shopify items skipped).`,
        details: errorStrings.length > 0 ? errorStrings : undefined,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResultMessage({ type: 'error', text: msg });
    } finally {
      setIsSyncing(false);
      setSyncProgress('');
    }
  }

  function toggleExpand(id: string) {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredProducts = useMemo(() => {
    if (!previewData) return [];
    const q = searchQuery.trim().toLowerCase();

    return previewData.products.filter((p) => {
      const matchBrand = selectedBrandFilter === 'ALL' || (p.brandName || '').toLowerCase() === selectedBrandFilter.toLowerCase();
      if (!matchBrand) return false;

      const matchSearch =
        !q ||
        p.titleEn.toLowerCase().includes(q) ||
        (p.brandName || '').toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.activePowers.some((pow) => pow.includes(q));

      if (!matchSearch) return false;

      if (activeTab === 'MATCHED') return !p.isUnlisted;
      if (activeTab === 'UNLISTED') return p.isUnlisted;
      return true;
    });
  }, [previewData, searchQuery, selectedBrandFilter, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex flex-col w-full max-w-5xl h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Bulk Diopter Availability & Shopify Sync</h2>
              <p className="text-xs text-neutral-400">
                Update Active / Out-of-Stock diopter powers directly on Shopify and POS across any brand
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">

          {/* FILE UPLOAD & CONFIGURATION SECTION */}
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 space-y-4 shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Excel Source File (Any Brand or All Catalog)
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Select any Excel file or load the server default file.
                </p>
              </div>

              {/* Quick Preset vs Upload */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setUseDefaultFile(true);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                    useDefaultFile && !selectedFile
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  ⚡ Default: D:\movie\Bella Update.xlsx
                </button>
                <label className="cursor-pointer px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 transition flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{selectedFile ? selectedFile.name : 'Upload New (.xlsx)'}</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                        setUseDefaultFile(false);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Options */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-neutral-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markUnlistedOos}
                    onChange={(e) => setMarkUnlistedOos(e.target.checked)}
                    className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 w-4 h-4"
                  />
                  <span>Mark unlisted products as Out of Stock in Shopify</span>
                </label>

                {markUnlistedOos && (
                  <select
                    value={unlistedScope}
                    onChange={(e) => setUnlistedScope(e.target.value as 'MATCHED_BRANDS' | 'ALL_CATALOG')}
                    className="text-xs bg-white border border-neutral-300 rounded px-2 py-1 text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-900 font-medium"
                  >
                    <option value="MATCHED_BRANDS">Scope: Detected Brands Only (Safe)</option>
                    <option value="ALL_CATALOG">Scope: All Catalog Products</option>
                  </select>
                )}
              </div>

              <button
                type="button"
                onClick={handleFetchPreview}
                disabled={isLoadingPreview || isSyncing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-2"
              >
                {isLoadingPreview ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing File & Catalog...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Inspect & Generate Preview</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* NOTIFICATION MESSAGES */}
          {resultMessage && (
            <div
              className={`p-4 rounded-xl border text-xs ${
                resultMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-start gap-2">
                {resultMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">{resultMessage.text}</div>
                  {resultMessage.details && resultMessage.details.length > 0 && (
                    <ul className="mt-2 list-disc list-inside space-y-1 opacity-90 max-h-32 overflow-y-auto">
                      {resultMessage.details.map((d, idx) => (
                        <li key={idx}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW CONTENT */}
          {previewData && (
            <div className="flex-1 flex flex-col space-y-4">
              
              {/* KPI STAT CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Excel Rows Parsed</div>
                  <div className="text-xl font-black text-neutral-900 mt-1">
                    {previewData.summary.totalExcelRows.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                    {previewData.summary.matchedExcelRows} matched ({((previewData.summary.matchedExcelRows / previewData.summary.totalExcelRows) * 100).toFixed(1)}%)
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Catalog Products</div>
                  <div className="text-xl font-black text-neutral-900 mt-1">
                    {previewData.summary.totalProductsInPlan}
                  </div>
                  <div className="text-[11px] text-neutral-500 font-medium mt-0.5">
                    {previewData.summary.matchedProductsCount} in file · {previewData.summary.unlistedProductsCount} unlisted
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Active Diopters</div>
                  <div className="text-xl font-black text-emerald-700 mt-1">
                    {previewData.summary.totalActiveDiopters.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                    Live on Shopify storefront
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="text-[10px] uppercase font-bold text-neutral-500">OOS Diopters</div>
                  <div className="text-xl font-black text-neutral-600 mt-1">
                    {previewData.summary.totalOosDiopters.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-neutral-400 font-medium mt-0.5">
                    Disabled on Shopify storefront
                  </div>
                </div>
              </div>

              {/* DETECTED BRANDS PILLS */}
              {previewData.summary.detectedBrands.length > 0 && (
                <div className="flex items-center gap-2 p-2.5 bg-neutral-100 rounded-xl border border-neutral-200 text-xs shrink-0">
                  <Tag className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="font-bold text-neutral-700">Detected Brands in File:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {previewData.summary.detectedBrands.map((b) => (
                      <span key={b} className="px-2 py-0.5 bg-white border border-neutral-300 rounded font-semibold text-neutral-900">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SEARCH & FILTER BAR */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search by title, brand, SKU, diopter..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  <button
                    onClick={() => setActiveTab('ALL')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      activeTab === 'ALL'
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    All ({previewData.products.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('MATCHED')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      activeTab === 'MATCHED'
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    In Excel ({previewData.summary.matchedProductsCount})
                  </button>
                  <button
                    onClick={() => setActiveTab('UNLISTED')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      activeTab === 'UNLISTED'
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    Unlisted OOS ({previewData.summary.unlistedProductsCount})
                  </button>
                  {previewData.unmatchedRows.length > 0 && (
                    <button
                      onClick={() => setActiveTab('UNMATCHED')}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                        activeTab === 'UNMATCHED'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      Unmatched Rows ({previewData.unmatchedRows.length})
                    </button>
                  )}
                </div>
              </div>

              {/* MAIN PREVIEW TABLE */}
              {activeTab === 'UNMATCHED' ? (
                <div className="flex-1 overflow-y-auto border border-neutral-200 rounded-xl p-4 bg-amber-50/30">
                  <h4 className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Unmatched Excel Rows ({previewData.unmatchedRows.length} items)
                  </h4>
                  <p className="text-xs text-neutral-500 mb-4">
                    These rows could not be mapped to any existing SKU across your product catalog and will be safely skipped.
                  </p>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {previewData.unmatchedRows.map((u, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-neutral-200 text-xs"
                      >
                        <span className="font-medium text-neutral-800">{u.particulars}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-neutral-400">Power: {u.power}</span>
                          <span className="text-[11px] px-2 py-0.5 bg-neutral-100 rounded text-neutral-600">
                            Qty: {String(u.qty)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto border border-neutral-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-100 text-neutral-600 font-bold sticky top-0 border-b border-neutral-200 z-10">
                      <tr>
                        <th className="py-2.5 px-4">Brand & Product Title</th>
                        <th className="py-2.5 px-3">Shopify ID</th>
                        <th className="py-2.5 px-3">Storefront Status</th>
                        <th className="py-2.5 px-3">Available Diopters</th>
                        <th className="py-2.5 px-4 text-right">Preview</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-neutral-400">
                            No products match your search query.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p) => {
                          const isExpanded = expandedProductIds.has(p.productId);

                          return (
                            <React.Fragment key={p.productId}>
                              <tr className="hover:bg-neutral-50 transition">
                                <td className="py-2.5 px-4">
                                  <div className="flex items-center gap-1.5">
                                    {p.brandName && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-neutral-200/70 text-neutral-700 rounded uppercase">
                                        {p.brandName}
                                      </span>
                                    )}
                                    <span className="font-semibold text-neutral-900">{p.titleEn}</span>
                                  </div>
                                  <div className="text-[11px] text-neutral-400 font-mono mt-0.5">{p.sku}</div>
                                </td>
                                <td className="py-2.5 px-3">
                                  {p.shopifyProductId ? (
                                    <span className="font-mono text-[11px] px-2 py-0.5 bg-neutral-100 rounded text-neutral-700">
                                      #{p.shopifyProductId}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-neutral-400">Not Linked</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  {p.isUnlisted ? (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700">
                                      ALL OUT OF STOCK
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                                      {p.activePowersCount} ACTIVE · {p.oosPowersCount} OOS
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  {p.isUnlisted || p.activePowersCount === 0 ? (
                                    <span className="text-neutral-400 italic">None active</span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1 max-w-sm">
                                      {p.activePowers.slice(0, 5).map((pow) => (
                                        <span
                                          key={pow}
                                          className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 rounded"
                                        >
                                          {pow}
                                        </span>
                                      ))}
                                      {p.activePowers.length > 5 && (
                                        <span className="text-[10px] text-neutral-400 self-center">
                                          +{p.activePowers.length - 5} more
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  <button
                                    onClick={() => toggleExpand(p.productId)}
                                    className="p-1 rounded hover:bg-neutral-200 text-neutral-500 transition"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>
                                </td>
                              </tr>

                              {/* EXPANDED DIOPTER CHIPS VIEW */}
                              {isExpanded && (
                                <tr className="bg-neutral-50/70">
                                  <td colSpan={5} className="py-3 px-6 border-y border-neutral-200">
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-neutral-700">
                                          Complete Diopter Grid for {p.titleEn}
                                        </span>
                                        <span className="text-[11px] text-neutral-500">
                                          Green = Active on Shopify | Gray = Disabled
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-2 bg-white rounded-lg border border-neutral-200">
                                        {p.activePowers.map((pow) => (
                                          <span
                                            key={pow}
                                            className="px-2 py-1 text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-300 shadow-xs"
                                          >
                                            {pow}
                                          </span>
                                        ))}
                                        {p.oosPowers.map((pow) => (
                                          <span
                                            key={pow}
                                            className="px-2 py-1 text-[11px] font-mono text-neutral-400 bg-neutral-100 rounded line-through border border-neutral-200 opacity-60"
                                          >
                                            {pow}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-neutral-50 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-neutral-300 hover:bg-neutral-100 text-neutral-700 transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {isSyncing && (
              <div className="flex items-center gap-2 text-xs text-neutral-600 font-medium">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                <span>{syncProgress || 'Processing...'}</span>
              </div>
            )}

            <button
              onClick={handleApplySync}
              disabled={!previewData || isSyncing}
              className="px-5 py-2.5 bg-neutral-900 hover:bg-black disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Proceed & Sync to Shopify Storefront</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
