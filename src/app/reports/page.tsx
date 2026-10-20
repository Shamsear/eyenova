'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { formatQar } from '@/lib/utils';
import { DataTable, Column } from '@/components/shared/data-table';
import { TrendingUp, DollarSign, Download, Loader2 } from 'lucide-react';

interface RecentSalePeriod {
  period: string;
  orders: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface ReportStats {
  todayRevenue: number;
  todayCount: number;
  unpaidCount: number;
  recentSales: RecentSalePeriod[];
  paymentBreakdown: {
    method: string;
    count: number;
    total: number;
  }[];
}

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      try {
        const res = await fetch('/api/reports');
        const data = await res.json();
        if (data.stats) setStats(data.stats);
      } catch (err) {
        console.error('Error fetching reports:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  const handleExportCsv = () => {
    if (!stats || !stats.recentSales) return;
    const headers = 'Period,Orders,Revenue (QAR),Cost (QAR),Profit (QAR),Margin (%)\n';
    const rows = stats.recentSales
      .map(
        (r) => `"${r.period}",${r.orders},${r.revenue.toFixed(2)},${r.cost.toFixed(2)},${r.profit.toFixed(2)},${r.margin}%`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EyeNova-Sales-Report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<RecentSalePeriod>[] = [
    {
      key: 'period',
      header: 'Period',
      className: 'font-medium text-stone-900 whitespace-nowrap',
      render: (r) => <span className="truncate block text-xs">{r.period}</span>,
    },
    {
      key: 'orders',
      header: 'Orders',
      className: 'w-24 text-center whitespace-nowrap',
      render: (r) => (
        <span className="font-mono text-xs tabular-nums text-stone-700 truncate block">
          {r.orders}
        </span>
      ),
    },
    {
      key: 'revenue',
      header: 'Revenue',
      className: 'w-32 text-right whitespace-nowrap',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-stone-900 tabular-nums truncate block">
          {formatQar(r.revenue)}
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'Est. Cost',
      className: 'w-32 text-right whitespace-nowrap',
      render: (r) => (
        <span className="font-mono text-xs text-stone-500 tabular-nums truncate block">
          {formatQar(r.cost)}
        </span>
      ),
    },
    {
      key: 'profit',
      header: 'Gross Profit',
      className: 'w-32 text-right whitespace-nowrap',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-stone-900 tabular-nums truncate block">
          {formatQar(r.profit)}
        </span>
      ),
    },
    {
      key: 'margin',
      header: 'Margin %',
      className: 'w-24 text-right whitespace-nowrap',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-stone-900 tabular-nums truncate block">
          {r.margin}%
        </span>
      ),
    },
  ];

  return (
    <Shell
      title="Financial Reports & P&L Analysis"
      subtitle="Sales performance, gross margins and payment settlement breakdowns"
    >
      <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-5 gap-3 sm:gap-4 overflow-y-auto bg-stone-100/60">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-stone-400 gap-2">
            <Loader2 size={20} className="animate-spin text-stone-600" />
            <span className="text-xs font-mono">Computing financial metrics...</span>
          </div>
        ) : (
          <>
            {/* Typographic KPI Cards - strictly 1 line */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
              <div className="bg-white p-3.5 rounded-lg border border-stone-200">
                <span className="text-[10px] font-mono font-medium text-stone-500 uppercase tracking-wider block truncate">
                  Today&apos;s Gross Revenue
                </span>
                <div className="text-xl font-mono font-semibold text-stone-900 mt-1 tabular-nums truncate">
                  {formatQar(stats?.todayRevenue || 0)}
                </div>
                <span className="text-[11px] text-stone-500 mt-0.5 block truncate">
                  Live registered sales
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-stone-200">
                <span className="text-[10px] font-mono font-medium text-stone-500 uppercase tracking-wider block truncate">
                  Today&apos;s Transactions
                </span>
                <div className="text-xl font-mono font-semibold text-stone-900 mt-1 tabular-nums truncate">
                  {stats?.todayCount || 0} Orders
                </div>
                <span className="text-[11px] font-mono text-stone-500 mt-0.5 block truncate">
                  Completed customer billings
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-stone-200">
                <span className="text-[10px] font-mono font-medium text-stone-500 uppercase tracking-wider block truncate">
                  Estimated Gross Margin
                </span>
                <div className="text-xl font-mono font-semibold text-stone-900 mt-1 tabular-nums truncate">
                  {formatQar((stats?.todayRevenue || 0) * 0.45)}
                </div>
                <span className="text-[11px] font-mono text-stone-500 mt-0.5 block truncate">
                  ~45% Average retail optical margin
                </span>
              </div>
            </div>

            {/* Sales Period Performance Table with Export action */}
            <div className="bg-white rounded-lg border border-stone-200 overflow-hidden flex flex-col shrink-0">
              <div className="px-3.5 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-stone-500" />
                  <span className="text-xs font-semibold text-stone-900">Period-Grouped Sales & Profit Margins</span>
                </div>
                <button
                  onClick={handleExportCsv}
                  className="px-2.5 py-1 rounded border border-stone-200 bg-white text-stone-700 text-xs font-medium hover:bg-stone-50 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={12} />
                  <span>Export CSV</span>
                </button>
              </div>

              <DataTable
                data={stats?.recentSales || []}
                columns={columns}
                keyExtractor={(r) => r.period}
                emptyTitle="No sales history logged yet."
                pageSize={10}
              />
            </div>

            {/* Payment Methods Breakdown */}
            <div className="bg-white rounded-lg border border-stone-200 overflow-hidden shrink-0">
              <div className="px-3.5 py-2.5 bg-stone-50 border-b border-stone-200 font-semibold text-xs text-stone-900 flex items-center gap-1.5">
                <DollarSign size={14} className="text-stone-500" />
                <span>Payment Settlement Channels</span>
              </div>
              <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {stats?.paymentBreakdown && stats.paymentBreakdown.length > 0 ? (
                  stats.paymentBreakdown.map((pm, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-stone-200 bg-stone-50 space-y-1">
                      <span className="font-medium text-xs text-stone-900 block truncate">{pm.method}</span>
                      <span className="text-base font-mono font-semibold text-stone-900 block tabular-nums truncate">
                        {formatQar(pm.total)}
                      </span>
                      <span className="text-[11px] font-mono text-stone-500 block tabular-nums truncate">
                        {pm.count} transactions recorded
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 text-center py-6 text-stone-400 text-xs">
                    No payment settlements recorded yet.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
