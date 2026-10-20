'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { useSessionStore } from '@/stores/session-store';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { StatusIndicator } from '@/components/shared/status-indicator';
import { Barcode, Plus, Minus, Save, RotateCcw, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface AuditItem {
  id: string;
  name: string;
  sku: string;
  systemQty: number;
  countedQty: number;
  delta: number;
}

const VARIANCE_FILTERS = [
  { id: 'ALL', label: 'All Stock Items' },
  { id: 'DISCREPANCY', label: 'Discrepancies Only' },
  { id: 'MATCH', label: 'Matched (0 Delta)' },
];

export default function StockCountPage() {
  const [sheet, setSheet] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [scanInput, setScanInput] = useState('');
  const [committing, setCommitting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  const { isAdmin } = useSessionStore();

  const loadSheet = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stock-count');
      const data = await res.json();
      if (data.sheet) {
        setSheet(data.sheet);
      }
    } catch (err) {
      console.error('Failed to load stock sheet:', err);
      setFeedback({ message: 'Error loading inventory sheet', isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSheet();
  }, []);

  const updateCount = (id: string, newCount: number) => {
    setSheet((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const validCount = Math.max(0, newCount);
          return {
            ...item,
            countedQty: validCount,
            delta: validCount - item.systemQty,
          };
        }
        return item;
      })
    );
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    const query = scanInput.trim().toLowerCase();
    const matched = sheet.find(
      (item) => item.sku.toLowerCase() === query || item.name.toLowerCase().includes(query)
    );

    if (matched) {
      updateCount(matched.id, matched.countedQty + 1);
      setScanInput('');
      setFeedback({ message: `Scanned +1 for "${matched.name}"` });
      setTimeout(() => setFeedback(null), 2500);
    } else {
      setFeedback({ message: `No inventory item matches code: ${scanInput}`, isError: true });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleCommitReconciliation = async () => {
    if (!isAdmin()) {
      setFeedback({ message: 'Manager Authorization Required: Only Store Admins can commit inventory reconciliations.', isError: true });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    const varianceItems = sheet.filter((s) => s.delta !== 0);
    if (varianceItems.length === 0) {
      setFeedback({ message: 'All counted items match system quantities (Zero variance).' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setCommitting(true);
    try {
      const res = await fetch('/api/stock-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustments: varianceItems }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Reconciliation failed');

      setFeedback({ message: `Successfully adjusted ${varianceItems.length} items in the database.` });
      setTimeout(() => setFeedback(null), 3500);
      loadSheet();
    } catch (err: any) {
      setFeedback({ message: err.message || 'Error saving reconciliation', isError: true });
    } finally {
      setCommitting(false);
    }
  };

  const totalVariances = sheet.filter((s) => s.delta !== 0).length;
  const totalSystemUnits = sheet.reduce((sum, s) => sum + s.systemQty, 0);
  const totalCountedUnits = sheet.reduce((sum, s) => sum + s.countedQty, 0);

  const columns: Column<AuditItem>[] = [
    {
      key: 'sku',
      header: 'SKU / Barcode',
      render: (item) => (
        <span className="font-mono font-medium text-stone-900 truncate block">
          {item.sku}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Product Description',
      render: (item) => (
        <span className="font-medium text-stone-900 truncate block">
          {item.name}
        </span>
      ),
    },
    {
      key: 'systemQty',
      header: 'System Expected',
      align: 'center',
      render: (item) => (
        <span className="font-mono text-xs text-stone-600 tabular-nums">
          {item.systemQty}
        </span>
      ),
    },
    {
      key: 'countedQty',
      header: 'Counted Units',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => updateCount(item.id, item.countedQty - 1)}
            className="w-5 h-5 rounded border border-stone-200 bg-white hover:bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer"
          >
            <Minus size={10} />
          </button>
          <input
            type="number"
            value={item.countedQty}
            onChange={(e) => updateCount(item.id, parseInt(e.target.value, 10) || 0)}
            className="w-12 h-6 text-center text-xs font-mono font-medium bg-stone-50 border border-stone-200 rounded"
          />
          <button
            type="button"
            onClick={() => updateCount(item.id, item.countedQty + 1)}
            className="w-5 h-5 rounded border border-stone-200 bg-white hover:bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer"
          >
            <Plus size={10} />
          </button>
        </div>
      ),
    },
    {
      key: 'delta',
      header: 'Variance',
      align: 'right',
      render: (item) => {
        if (item.delta === 0) {
          return <span className="font-mono text-stone-400 text-xs">Match</span>;
        }
        return (
          <span
            className={`font-mono font-medium text-xs tabular-nums ${
              item.delta > 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {item.delta > 0 ? `+${item.delta}` : item.delta}
          </span>
        );
      },
    },
  ];

  return (
    <Shell
      title="Physical Stock Audit & Count Sheet"
      subtitle="Barcode Reconciliation & Inventory Ledger Adjustments"
    >
      <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden">
        {/* KPI Strip (Strictly Single-Line) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
          <div className="bg-white p-3 rounded-lg border border-stone-200 flex items-center justify-between">
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">System Expected</span>
            <span className="font-mono font-medium text-base text-stone-900 tabular-nums">{totalSystemUnits} Units</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-stone-200 flex items-center justify-between">
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">Physical Counted</span>
            <span className="font-mono font-medium text-base text-stone-900 tabular-nums">{totalCountedUnits} Units</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-stone-200 flex items-center justify-between">
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">Discrepancies</span>
            <span className={`font-mono font-medium text-base tabular-nums ${totalVariances > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {totalVariances} Items
            </span>
          </div>
        </div>

        {/* Scan Input Bar & Feedback Alert */}
        <div className="bg-white p-2.5 rounded-lg border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <form onSubmit={handleScanSubmit} className="flex items-center gap-2 w-full sm:w-auto flex-1 min-w-0">
            <div className="relative flex-1 sm:max-w-xs">
              <Barcode size={14} className="absolute left-2.5 top-2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan Barcode to increment count (+1)..."
                className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs font-mono focus:bg-white focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="px-2.5 py-1.5 rounded-md bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 transition cursor-pointer whitespace-nowrap"
            >
              Add Scan
            </button>
          </form>

          {feedback && (
            <div
              className={`p-1.5 rounded text-xs flex items-center gap-1.5 truncate max-w-sm ${
                feedback.isError ? 'bg-stone-50 text-rose-700 border border-rose-200' : 'bg-stone-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {feedback.isError ? <AlertTriangle size={13} className="shrink-0" /> : <CheckCircle2 size={13} className="shrink-0" />}
              <span className="truncate">{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Page Header (Single-Line) */}
        <PageHeader
          title="Audit Sheet"
          subtitle={`${sheet.length} SKU Items`}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Filter by SKU or product name..."
          filters={VARIANCE_FILTERS}
          activeFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          primaryAction={{
            label: committing ? 'Committing...' : 'Commit Reconciliation',
            onClick: handleCommitReconciliation,
            icon: Save,
          }}
        />

        {/* Universal DataTable with Global Pre-Filtered Pagination & Mobile Cards */}
        <DataTable
          data={sheet}
          columns={columns}
          keyExtractor={(item) => item.id}
          searchQuery={search}
          searchFields={[
            (item) => item.sku,
            (item) => item.name,
          ]}
          filterFn={(item) => {
            if (selectedFilter === 'DISCREPANCY') return item.delta !== 0;
            if (selectedFilter === 'MATCH') return item.delta === 0;
            return true;
          }}
          pageSize={10}
          pageSizeOptions={[10, 25, 50, 100]}
          renderCard={(item) => (
            <>
              {/* Tier 1: SKU and Variance (Strictly Single-Line) */}
              <div className="flex items-center justify-between gap-2 min-w-0 pb-1 border-b border-stone-100">
                <span className="font-mono font-medium text-xs text-stone-900 truncate">
                  {item.sku}
                </span>
                <span
                  className={`font-mono font-medium text-xs tabular-nums ${
                    item.delta === 0 ? 'text-stone-400' : item.delta > 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {item.delta === 0 ? 'Match' : item.delta > 0 ? `+${item.delta}` : item.delta}
                </span>
              </div>

              {/* Tier 2: Product Name (Strictly Single-Line) */}
              <div className="py-0.5">
                <span className="font-medium text-xs text-stone-900 truncate block">
                  {item.name}
                </span>
              </div>

              {/* Tier 3: Expected vs Counted (Strictly Single-Line) */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100 text-xs">
                <span className="text-[10px] font-mono text-stone-500">
                  Expected: {item.systemQty}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-stone-500">Counted:</span>
                  <div className="flex items-center border border-stone-200 rounded bg-white">
                    <button
                      type="button"
                      onClick={() => updateCount(item.id, item.countedQty - 1)}
                      className="w-5 h-5 flex items-center justify-center text-stone-600 hover:bg-stone-100 cursor-pointer"
                    >
                      <Minus size={9} />
                    </button>
                    <span className="w-7 text-center font-mono text-xs font-medium text-stone-900 tabular-nums">
                      {item.countedQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCount(item.id, item.countedQty + 1)}
                      className="w-5 h-5 flex items-center justify-center text-stone-600 hover:bg-stone-100 cursor-pointer"
                    >
                      <Plus size={9} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        />
      </div>
    </Shell>
  );
}
