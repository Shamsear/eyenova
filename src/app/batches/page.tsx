'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { StatusIndicator, StatusVariant } from '@/components/shared/status-indicator';
import { Plus, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { STANDARD_POWERS } from '@/lib/utils';
import { SearchableSelect, type SelectOption } from '@/components/shared/searchable-select';

const SPEC_OPTIONS: SelectOption[] = [
  { value: 'Plano (0.00)', label: 'Plano (0.00)' },
  ...STANDARD_POWERS.filter((p) => p !== '0.00').map((pwr) => ({
    value: `PWR ${pwr}`,
    label: `PWR ${pwr}`,
  })),
];

interface BatchItem {
  id: string;
  brand: string;
  product: string;
  batchNo: string;
  mfgDate: string;
  expDate: string;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
  stockQty: number;
  specs: string;
}

const BATCH_FILTERS = [
  { id: 'ALL', label: 'All Batches' },
  { id: 'VALID', label: 'Valid (>90d)' },
  { id: 'EXPIRING_SOON', label: 'Expiring Soon' },
  { id: 'EXPIRED', label: 'Expired' },
];

function batchStatusVariant(status: string): StatusVariant {
  switch (status.toUpperCase()) {
    case 'VALID':
      return 'success';
    case 'EXPIRING_SOON':
      return 'warning';
    case 'EXPIRED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form state
  const [brand, setBrand] = useState('');
  const [product, setProduct] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [specs, setSpecs] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expDate, setExpDate] = useState('');
  const [stockQty, setStockQty] = useState('');

  const loadBatches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/batches?q=${encodeURIComponent(search.trim())}`);
      const data = await res.json();
      if (data.batches) setBatches(data.batches);
    } catch (err) {
      console.error('Error loading batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const totalBoxes = batches.reduce((sum, b) => sum + b.stockQty, 0);
  const expiringSoonCount = batches.filter((b) => b.status === 'EXPIRING_SOON').length;
  const validCount = batches.filter((b) => b.status === 'VALID').length;

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchNo || !expDate) {
      setFormError('Batch number and expiry date are required.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand,
          productTitle: product,
          batchNo,
          specs,
          mfgDate,
          expDate,
          stockQty,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to save batch');

      setIsModalOpen(false);
      setBrand('');
      setProduct('');
      setBatchNo('');
      setSpecs('');
      setMfgDate('');
      setExpDate('');
      setStockQty('');
      loadBatches();
    } catch (err: any) {
      setFormError(err.message || 'Error registering batch');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<BatchItem>[] = [
    {
      key: 'batchNo',
      header: 'Batch #',
      render: (b) => (
        <span className="font-mono font-medium text-stone-900 truncate block">
          {b.batchNo}
        </span>
      ),
    },
    {
      key: 'product',
      header: 'Brand & Product',
      render: (b) => (
        <div className="truncate">
          <span className="font-medium text-stone-900 truncate block leading-tight">{b.product}</span>
          <span className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block leading-tight truncate">
            {b.brand}
          </span>
        </div>
      ),
    },
    {
      key: 'specs',
      header: 'Power / Specs',
      render: (b) => (
        <span className="font-mono text-xs text-stone-700 truncate block">
          {b.specs || 'Plano'}
        </span>
      ),
    },
    {
      key: 'expDate',
      header: 'Expiry Date',
      render: (b) => (
        <span className="font-mono text-xs text-stone-800 truncate block">
          {b.expDate}
        </span>
      ),
    },
    {
      key: 'stockQty',
      header: 'Stock Units',
      align: 'right',
      render: (b) => (
        <span className="font-mono font-medium text-stone-900 tabular-nums truncate block">
          {b.stockQty} Boxes
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Expiry Status',
      render: (b) => (
        <StatusIndicator
          status={b.status.replace(/_/g, ' ')}
          variant={batchStatusVariant(b.status)}
        />
      ),
    },
  ];

  return (
    <Shell
      title="FEFO Batches & Expiry Management"
      subtitle="First Expired, First Out Lot Controls"
    >
      <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden">
        {/* KPI Strip (Strictly Single-Line) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
          <div className="bg-white p-3 rounded-lg border border-stone-200 flex items-center justify-between">
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">Total Lot Inventory</span>
            <span className="font-mono font-medium text-base text-stone-900 tabular-nums">{totalBoxes} Boxes</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-stone-200 flex items-center justify-between">
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">Expiring in 90 Days</span>
            <span className="font-mono font-medium text-base text-amber-700 tabular-nums">{expiringSoonCount} Lots</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-stone-200 flex items-center justify-between">
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">Valid Fresh Stock</span>
            <span className="font-mono font-medium text-base text-emerald-700 tabular-nums">{validCount} Lots</span>
          </div>
        </div>

        {/* Page Header (Single-Line) */}
        <PageHeader
          title="Batches Ledger"
          subtitle={`${batches.length} Registered Batches`}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search batch #, product, or brand..."
          filters={BATCH_FILTERS}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          primaryAction={{
            label: 'Register Batch',
            onClick: () => setIsModalOpen(true),
            icon: Plus,
          }}
        />

        {/* Universal DataTable with Global Pre-Filtered Pagination & Mobile Cards */}
        <DataTable
          data={batches}
          columns={columns}
          keyExtractor={(b) => b.id}
          searchQuery={search}
          searchFields={[
            (b) => b.batchNo,
            (b) => b.product,
            (b) => b.brand,
            (b) => b.specs,
          ]}
          filterFn={(b) => {
            if (statusFilter === 'ALL') return true;
            return b.status === statusFilter;
          }}
          pageSize={10}
          pageSizeOptions={[10, 25, 50, 100]}
          renderCard={(b) => (
            <>
              {/* Tier 1: Batch # and Status (Strictly Single-Line) */}
              <div className="flex items-center justify-between gap-2 min-w-0 pb-1 border-b border-stone-100">
                <span className="font-mono font-medium text-xs text-stone-900 truncate">
                  {b.batchNo}
                </span>
                <StatusIndicator
                  status={b.status.replace(/_/g, ' ')}
                  variant={batchStatusVariant(b.status)}
                />
              </div>

              {/* Tier 2: Product Name and Expiry (Strictly Single-Line) */}
              <div className="flex items-center justify-between gap-2 text-[11px] text-stone-600 min-w-0">
                <span className="truncate">{b.product}</span>
                <span className="font-mono text-[10px] text-stone-500 shrink-0">Exp: {b.expDate}</span>
              </div>

              {/* Tier 3: Quantity and Specs (Strictly Single-Line) */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100 text-xs">
                <span className="font-mono font-medium text-stone-900">
                  {b.stockQty} Boxes
                </span>
                <span className="font-mono text-[10px] text-stone-500">
                  {b.specs || 'Plano'}
                </span>
              </div>
            </>
          )}
        />
      </div>

      {/* Register Batch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-stone-200 w-full max-w-sm overflow-hidden p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-stone-900">Register FEFO Batch</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1">
                  Batch / Lot Code <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  placeholder="LOT-2026-X88"
                  className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded-md font-mono focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Alcon / Johnson & Johnson"
                  className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded-md focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1">
                  Product Description
                </label>
                <input
                  type="text"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="Dailies Total1 30pk"
                  className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded-md focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-mono text-stone-500 uppercase">
                      Specs / Power
                    </label>
                    <button
                      type="button"
                      onClick={() => setSpecs('Plano (0.00)')}
                      className="text-[10px] text-sky-600 hover:underline cursor-pointer"
                    >
                      Plano
                    </button>
                  </div>
                  <SearchableSelect
                    value={specs}
                    onChange={setSpecs}
                    options={SPEC_OPTIONS}
                    placeholder="-- Choose or Plano --"
                    searchPlaceholder="Search power..."
                    allowClear
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    placeholder="50"
                    className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded-md font-mono focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1">
                    Mfg Date
                  </label>
                  <input
                    type="date"
                    value={mfgDate}
                    onChange={(e) => setMfgDate(e.target.value)}
                    className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded-md font-mono focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1">
                    Expiry Date <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded-md font-mono focus:bg-white"
                  />
                </div>
              </div>

              {formError && (
                <div className="p-1.5 bg-stone-50 border border-stone-300 rounded text-xs text-stone-900 flex items-center gap-1.5">
                  <AlertCircle size={12} className="text-rose-600 shrink-0" />
                  <span className="truncate">{formError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-2.5 py-1.5 rounded-md border border-stone-200 text-stone-700 text-xs hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                >
                  {submitting ? <Loader2 size={12} className="animate-spin text-stone-400" /> : <Check size={12} />}
                  <span>Save Batch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
