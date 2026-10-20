'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/layout/shell';
import { TrendingUp, AlertTriangle, ShoppingCart, PackageCheck, Loader2 } from 'lucide-react';

interface ExpiringBatch {
  id: string;
  batchNumber: string;
  productName: string;
  brand: string;
  power: string;
  quantity: number;
  expiryDate: string;
  daysUntilExpiry: number;
}

interface LowStockItem {
  id: string;
  title: string;
  sku: string;
  brand: string;
  stockQuantity: number;
  suggestedReorder: number;
}

export default function AdvisorPage() {
  const [loading, setLoading] = useState(true);
  const [expiringBatches, setExpiringBatches] = useState<ExpiringBatch[]>([]);
  const [lowStockSuggestions, setLowStockSuggestions] = useState<LowStockItem[]>([]);
  const [healthyStockCount, setHealthyStockCount] = useState(0);

  useEffect(() => {
    async function loadAdvisor() {
      try {
        const res = await fetch('/api/advisor');
        const data = await res.json();
        if (data.insights) {
          setExpiringBatches(data.insights.expiringBatches || []);
          setLowStockSuggestions(data.insights.lowStockSuggestions || []);
          setHealthyStockCount(data.insights.healthyStockCount || 0);
        }
      } catch (err) {
        console.error('Failed to load advisor insights:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAdvisor();
  }, []);

  return (
    <Shell
      title="Commercial Intelligence & Stock Advisor"
      subtitle="Automated inventory reorder thresholds and FEFO expiry mitigations"
    >
      <div className="flex-1 min-h-0 p-3 sm:p-5 overflow-y-auto space-y-4 bg-stone-100/60">
        {/* Typographic Header Card - strictly 1 line per row */}
        <div className="p-4 bg-white border border-stone-200 rounded-lg flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-mono font-medium text-stone-500 uppercase tracking-wider block truncate">
              Intelligence Engine
            </span>
            <h2 className="text-sm font-semibold text-stone-900 truncate mt-0.5">
              Optical Inventory & Velocity Analysis
            </h2>
            <p className="text-xs text-stone-500 truncate mt-0.5">
              Real-time audit of contact lens batches, reorder cycles, and FEFO expiry risk
            </p>
          </div>
          <div className="text-right shrink-0 font-mono">
            <span className="text-[10px] text-stone-400 block uppercase tracking-wider">Catalog Health</span>
            <span className="text-sm font-semibold text-stone-900 block">{healthyStockCount} Stable SKUs</span>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-stone-400" />
            <span className="font-mono">Analyzing stock velocity and expiration dates...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Reorder Suggestions */}
            <div className="bg-white p-3.5 rounded-lg border border-stone-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <div className="flex items-center gap-1.5 text-stone-900 font-semibold text-xs">
                  <TrendingUp size={14} className="text-stone-500" />
                  <span>Reorder Suggestions ({lowStockSuggestions.length})</span>
                </div>
                <Link
                  href="/purchases"
                  className="text-xs font-mono text-stone-600 hover:text-stone-900 flex items-center gap-1"
                >
                  <ShoppingCart size={12} />
                  <span>Create PO</span>
                </Link>
              </div>

              {lowStockSuggestions.length === 0 ? (
                <p className="text-xs text-stone-400 py-3 text-center">All catalog items have healthy stock levels.</p>
              ) : (
                <div className="space-y-2">
                  {lowStockSuggestions.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-stone-50 rounded border border-stone-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-stone-900 truncate">{item.title}</div>
                        <div className="text-[10px] text-stone-500 font-mono truncate">
                          {item.brand} • SKU: {item.sku}
                        </div>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <span className="font-medium text-stone-900 bg-stone-100 border border-stone-300 px-1.5 py-0.5 rounded text-[11px] block tabular-nums">
                          {item.stockQuantity} in stock
                        </span>
                        <span className="text-[10px] text-stone-500 mt-0.5 block tabular-nums">
                          +{item.suggestedReorder} pcs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expiring Batches FEFO */}
            <div className="bg-white p-3.5 rounded-lg border border-stone-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <div className="flex items-center gap-1.5 text-stone-900 font-semibold text-xs">
                  <AlertTriangle size={14} className="text-stone-500" />
                  <span>FEFO Expiry Mitigation ({expiringBatches.length})</span>
                </div>
                <Link
                  href="/batches"
                  className="text-xs font-mono text-stone-600 hover:text-stone-900 flex items-center gap-1"
                >
                  <PackageCheck size={12} />
                  <span>View Batches</span>
                </Link>
              </div>

              {expiringBatches.length === 0 ? (
                <p className="text-xs text-stone-400 py-3 text-center">No active batches expiring within 180 days.</p>
              ) : (
                <div className="space-y-2">
                  {expiringBatches.map((batch) => (
                    <div
                      key={batch.id}
                      className="p-2.5 bg-stone-50 rounded border border-stone-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-stone-900 truncate">{batch.productName}</div>
                        <div className="text-[10px] text-stone-500 font-mono truncate">
                          Batch: {batch.batchNumber} • PWR: {batch.power} • Qty: {batch.quantity}
                        </div>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <span className="font-medium text-stone-900 bg-stone-100 border border-stone-300 px-1.5 py-0.5 rounded text-[11px] block tabular-nums">
                          Exp: {batch.expiryDate}
                        </span>
                        <span className="text-[10px] text-stone-500 mt-0.5 block tabular-nums">
                          {batch.daysUntilExpiry > 0 ? `${batch.daysUntilExpiry}d remaining` : 'Expired'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
