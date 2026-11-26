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
  Wallet,
  FileText,
  Monitor,
  AlertTriangle,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { KpiStripSkeleton } from '@/components/ui/skeletons';

export default function DashboardPage() {
  const { store, shift } = useSessionStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayCount: 0,
    totalRevenue: 0,
    totalCount: 0,
    lowStockCount: 0,
  });

  useEffect(() => {
    let active = true;
    fetch('/api/reports')
      .then((res) => res.json())
      .then((data) => {
        if (active && data.stats) {
          setStats({
            todayRevenue: data.stats.todayRevenue || 0,
            todayCount: data.stats.todayCount || 0,
            totalRevenue: data.stats.totalRevenue || 0,
            totalCount: data.stats.totalCount || 0,
            lowStockCount: data.stats.lowStockCount || 0,
          });
        }
      })
      .catch((err) => console.error('Dashboard load error:', err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Shell
      title="Store Management Dashboard"
      subtitle="Counter performance, inventory health and operational shortcuts"
    >
      <div className="flex-1 min-h-0 p-3 sm:p-5 overflow-y-auto space-y-5 bg-stone-100/60">
        {/* KPI Strip */}
        {loading ? (
          <KpiStripSkeleton />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <KpiCard
              label="Today's Revenue"
              value={formatQar(stats.todayRevenue)}
              sublabel="Live counter billings"
              tone="teal"
              icon={<Wallet size={15} />}
            />
            <KpiCard
              label="Invoices Issued"
              value={`${stats.todayCount} Invoices`}
              sublabel="Completed checkouts"
              icon={<FileText size={15} />}
            />
            <KpiCard
              label="Active Store Register"
              value={store?.name || 'EyeNova Optical'}
              sublabel={shift ? `Shift: ${formatQar(shift.expectedClosingCash)} · Open` : 'Shift: Closed (POS-01)'}
              tone={shift ? 'emerald' : 'default'}
              icon={<Monitor size={15} />}
            />
            <KpiCard
              label="Inventory Alert"
              value={`${stats.lowStockCount} Products`}
              sublabel="Low stock threshold"
              tone={stats.lowStockCount > 0 ? 'amber' : 'emerald'}
              icon={<AlertTriangle size={15} />}
            />
          </div>
        )}

        {/* Operational Shortcuts */}
        <div>
          <div className="text-[11px] font-mono font-semibold text-stone-500 uppercase tracking-wider mb-2.5 px-0.5">
            Quick Actions
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <Link
              href="/pos"
              className="p-4 bg-teal-700 text-white rounded-xl border border-teal-700 hover:bg-teal-800 transition flex items-center justify-between group active:scale-[0.99] cursor-pointer shadow-xs min-h-[64px]"
            >
              <div className="min-w-0 pr-2">
                <span className="text-xs font-semibold block truncate">New POS Counter Sale</span>
                <span className="text-[11px] font-mono text-teal-100 block truncate mt-0.5">Register (Ctrl+1)</span>
              </div>
              <ShoppingCart size={17} className="text-teal-100 shrink-0 group-hover:translate-x-0.5 transition" />
            </Link>

            <Link
              href="/invoices"
              className="p-4 bg-white text-stone-900 rounded-xl border border-stone-200 hover:border-teal-600 transition flex items-center justify-between group active:scale-[0.99] cursor-pointer min-h-[64px]"
            >
              <div className="min-w-0 pr-2">
                <span className="text-xs font-semibold block truncate">Invoices &amp; Receipts</span>
                <span className="text-[11px] font-mono text-stone-500 block truncate mt-0.5">Reprint &amp; refund (Ctrl+2)</span>
              </div>
              <Receipt size={17} className="text-stone-400 group-hover:text-teal-700 shrink-0 group-hover:translate-x-0.5 transition" />
            </Link>

            <Link
              href="/online-orders"
              className="p-4 bg-white text-stone-900 rounded-xl border border-stone-200 hover:border-teal-600 transition flex items-center justify-between group active:scale-[0.99] cursor-pointer min-h-[64px]"
            >
              <div className="min-w-0 pr-2">
                <span className="text-xs font-semibold block truncate">Online Orders</span>
                <span className="text-[11px] font-mono text-stone-500 block truncate mt-0.5">Fulfillment &amp; sync (Ctrl+3)</span>
              </div>
              <Package size={17} className="text-stone-400 group-hover:text-teal-700 shrink-0 group-hover:translate-x-0.5 transition" />
            </Link>

            <Link
              href="/online-stock"
              className="p-4 bg-white text-stone-900 rounded-xl border border-stone-200 hover:border-teal-600 transition flex items-center justify-between group active:scale-[0.99] cursor-pointer min-h-[64px]"
            >
              <div className="min-w-0 pr-2">
                <span className="text-xs font-semibold block truncate">Storefront Stock Matrix</span>
                <span className="text-[11px] font-mono text-stone-500 block truncate mt-0.5">Power availability (Ctrl+0)</span>
              </div>
              <Layers size={17} className="text-stone-400 group-hover:text-teal-700 shrink-0 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>
        </div>
      </div>
    </Shell>
  );
}
