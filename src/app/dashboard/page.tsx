'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/layout/shell';
import { useSessionStore } from '@/stores/session-store';
import { formatQar } from '@/lib/utils';
import {
  ShoppingCart,
  Receipt,
  Package,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function DashboardPage() {
  const { store, shift } = useSessionStore();
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayCount: 0,
    totalRevenue: 0,
    totalCount: 0,
    lowStockCount: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/reports');
        const data = await res.json();
        if (data.stats) {
          setStats({
            todayRevenue: data.stats.todayRevenue || 0,
            todayCount: data.stats.todayCount || 0,
            totalRevenue: data.stats.totalRevenue || 0,
            totalCount: data.stats.totalCount || 0,
            lowStockCount: data.stats.lowStockCount || 0,
          });
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      }
    }
    loadStats();
  }, []);

  return (
    <Shell
      title="Store Management Dashboard"
      subtitle="Counter performance, inventory health and operational shortcuts"
    >
      <div className="flex-1 min-h-0 p-3 sm:p-5 overflow-y-auto space-y-4 bg-stone-100/60">
        {/* KPI Strip - strictly 1 line per row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-lg border border-stone-200">
            <span className="text-[10px] font-mono font-medium text-stone-500 uppercase tracking-wider block truncate">
              Today&apos;s Revenue
            </span>
            <div className="text-xl font-mono font-semibold text-stone-900 mt-1 tabular-nums truncate">
              {formatQar(stats.todayRevenue)}
            </div>
            <span className="text-[11px] text-stone-500 block mt-0.5 truncate">
              Live counter billings
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-stone-200">
            <span className="text-[10px] font-mono font-medium text-stone-500 uppercase tracking-wider block truncate">
              Invoices Issued
            </span>
            <div className="text-xl font-mono font-semibold text-stone-900 mt-1 tabular-nums truncate">
              {stats.todayCount} Invoices
            </div>
            <span className="text-[11px] text-stone-500 block mt-0.5 truncate">
              Completed checkouts
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-stone-200">
            <span className="text-[10px] font-mono font-medium text-stone-500 uppercase tracking-wider block truncate">
              Active Store Register
            </span>
            <div className="text-base font-semibold text-stone-900 mt-1 truncate">
              {store?.name || 'EyeNova Optical - 02 Mall'}
            </div>
            <span className="text-[11px] font-mono text-stone-500 block mt-0.5 truncate">
              {shift ? `Shift: ${formatQar(shift.expectedClosingCash)} · Open` : 'Shift: Closed (Terminal POS-01)'}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-stone-200">
            <span className="text-[10px] font-mono font-medium text-stone-500 uppercase tracking-wider block truncate">
              Inventory Alert
            </span>
            <div className="text-xl font-mono font-semibold text-stone-900 mt-1 tabular-nums truncate">
              {stats.lowStockCount} Products
            </div>
            <span className="text-[11px] font-mono text-stone-500 block mt-0.5 truncate">
              Low stock threshold
            </span>
          </div>
        </div>

        {/* Operational Shortcuts */}
        <div>
          <div className="text-[11px] font-mono font-semibold text-stone-500 uppercase tracking-wider mb-2.5 px-0.5">
            Quick Actions
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/pos"
              className="p-3.5 bg-stone-900 text-stone-50 rounded-lg border border-stone-900 hover:bg-stone-800 transition flex items-center justify-between group active:scale-[0.99] cursor-pointer"
            >
              <div className="min-w-0 pr-2">
                <span className="text-xs font-semibold block truncate">New POS Counter Sale</span>
                <span className="text-[11px] font-mono text-stone-400 block truncate">Register (Ctrl+1)</span>
              </div>
              <ShoppingCart size={16} className="text-stone-300 shrink-0 group-hover:translate-x-0.5 transition" />
            </Link>

            <Link
              href="/invoices"
              className="p-3.5 bg-white text-stone-900 rounded-lg border border-stone-200 hover:border-stone-900 transition flex items-center justify-between group active:scale-[0.99] cursor-pointer"
            >
              <div className="min-w-0 pr-2">
                <span className="text-xs font-semibold block truncate">Invoices & Receipts</span>
                <span className="text-[11px] font-mono text-stone-500 block truncate">Reprint & refund (Ctrl+2)</span>
              </div>
              <Receipt size={16} className="text-stone-400 group-hover:text-stone-900 shrink-0 group-hover:translate-x-0.5 transition" />
            </Link>

            <Link
              href="/online-orders"
              className="p-3.5 bg-white text-stone-900 rounded-lg border border-stone-200 hover:border-stone-900 transition flex items-center justify-between group active:scale-[0.99] cursor-pointer"
            >
              <div className="min-w-0 pr-2">
                <span className="text-xs font-semibold block truncate">Online Orders</span>
                <span className="text-[11px] font-mono text-stone-500 block truncate">Fulfillment & sync (Ctrl+3)</span>
              </div>
              <Package size={16} className="text-stone-400 group-hover:text-stone-900 shrink-0 group-hover:translate-x-0.5 transition" />
            </Link>

            <Link
              href="/online-stock"
              className="p-3.5 bg-white text-stone-900 rounded-lg border border-stone-200 hover:border-stone-900 transition flex items-center justify-between group active:scale-[0.99] cursor-pointer"
            >
              <div className="min-w-0 pr-2">
                <span className="text-xs font-semibold block truncate">Storefront Stock Matrix</span>
                <span className="text-[11px] font-mono text-stone-500 block truncate">Power availability (Ctrl+0)</span>
              </div>
              <Layers size={16} className="text-stone-400 group-hover:text-stone-900 shrink-0 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>
        </div>
      </div>
    </Shell>
  );
}
