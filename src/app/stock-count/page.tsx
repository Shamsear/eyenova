'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { useSessionStore } from '@/stores/session-store';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { Barcode, Plus, Minus, Save, AlertTriangle, CheckCircle2, Package, ClipboardCheck } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { TouchStepper } from '@/components/ui/touch-stepper';

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
    let active = true;
    fetch('/api/stock-count')
      .then((res) => res.json())
      .then((data) => {
        if (active && data.sheet) {
          setSheet(data.sheet);
        }
      })
      .catch((err) => {
        console.error('Failed to load stock sheet:', err);
        if (active) setFeedback({ message: 'Error loading inventory sheet', isError: true });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
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
    } catch (err: unknown) {
      setFeedback({
        message: err instanceof Error ? err.message : 'Error saving reconciliation',
        isError: true,
      });
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
      priority: 'standard',
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
            aria-label={`Decrease count for ${item.name}`}
            className="w-7 h-7 rounded-md border border-stone-200 bg-white hover:bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer transition"
          >
            <Minus size={11} />
          </button>
          <input
            type="number"
            value={item.countedQty}
            onChange={(e) => updateCount(item.id, parseInt(e.target.value, 10) || 0)}
            className="w-14 h-7 text-center text-xs font-mono font-semibold bg-stone-50 border border-stone-200 rounded-md focus:bg-white focus:border-teal-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => updateCount(item.id, item.countedQty + 1)}
            aria-label={`Increase count for ${item.name}`}
            className="w-7 h-7 rounded-md border border-stone-200 bg-white hover:bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer transition"
          >
            <Plus size={11} />
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
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0">
          <KpiCard
            label="System Expected"
            value={`${totalSystemUnits} Units`}
            icon={<Package size={15} />}
          />
          <KpiCard
            label="Physical Counted"
            value={`${totalCountedUnits} Units`}
            tone="teal"
            icon={<ClipboardCheck size={15} />}
          />
          <KpiCard
            label="Discrepancies"
            value={`${totalVariances} Items`}
            tone={totalVariances > 0 ? 'rose' : 'emerald'}
            icon={<AlertTriangle size={15} />}
            className="col-span-2 sm:col-span-1"
          />
        </div>

        {/* Scan Input Bar & Feedback Alert */}
        <div className="bg-white p-2.5 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <form onSubmit={handleScanSubmit} className="flex items-center gap-2 w-full sm:w-auto flex-1 min-w-0">
            <div className="relative flex-1 sm:max-w-xs">
              <Barcode size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan Barcode to increment count (+1)..."
                className="w-full min-h-[38px] pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-[16px] sm:text-xs font-mono focus:bg-white focus:border-teal-600 focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="min-h-[38px] px-3.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shadow-xs"
            >
              Add Scan
            </button>
          </form>

          {feedback && (
            <div
              className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 truncate max-w-sm ${
                feedback.isError
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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
          loading={loading}
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

              {/* Tier 3: Expected vs Counted */}
              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-stone-100 text-xs">
                <span className="text-[11px] font-mono text-stone-500">
                  Expected: <strong className="text-stone-800">{item.systemQty}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-stone-500">Counted:</span>
                  <TouchStepper
                    value={item.countedQty}
                    size="touch"
                    disableDecrement={item.countedQty <= 0}
                    onDecrement={() => updateCount(item.id, item.countedQty - 1)}
                    onIncrement={() => updateCount(item.id, item.countedQty + 1)}
                  />
                </div>
              </div>
            </>
          )}
        />
      </div>
    </Shell>
  );
}
