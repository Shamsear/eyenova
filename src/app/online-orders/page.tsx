'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { formatQar, formatQatarDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { StatusIndicator, StatusVariant } from '@/components/shared/status-indicator';
import { Eye, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { SlideOverDrawer } from '@/components/ui/slide-over-drawer';

interface OnlineOrderRow {
  id: string;
  orderNumber: string;
  orderSource: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  totalQar: number;
  createdAt: string;
  trackingNumber?: string | null;
  items: {
    id: string;
    productTitle: string;
    specs: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

const SOURCE_FILTERS = [
  { id: 'ALL', label: 'All Platforms' },
  { id: 'TALABAT', label: 'Talabat' },
  { id: 'SNOONU', label: 'Snoonu' },
  { id: 'RAFEEQ', label: 'Rafeeq' },
  { id: 'WEBSITE', label: 'Website' },
  { id: 'WHATSAPP', label: 'WhatsApp' },
];

function orderStatusVariant(status: string): StatusVariant {
  switch (status.toUpperCase()) {
    case 'DISPATCHED':
    case 'DELIVERED':
    case 'COMPLETED':
      return 'success';
    case 'PENDING':
    case 'PROCESSING':
      return 'warning';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export default function OnlineOrdersPage() {
  const [orders, setOrders] = useState<OnlineOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrderRow | null>(null);
  const [dispatchTracking, setDispatchTracking] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchMessage, setDispatchMessage] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/online-orders');
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
    } catch (err) {
      console.error('Error fetching online orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/online-orders')
      .then((res) => res.json())
      .then((data) => {
        if (active && data.orders) setOrders(data.orders);
      })
      .catch((err) => {
        console.error('Error fetching online orders:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleDispatch = async () => {
    if (!selectedOrder) return;
    setDispatching(true);
    setDispatchMessage('');
    try {
      const res = await fetch('/api/online-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          action: 'DISPATCH',
          trackingNumber: dispatchTracking || `QA-EXP-${Date.now().toString().slice(-6)}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Dispatch update failed');

      setDispatchMessage(`Order #${selectedOrder.orderNumber} dispatched`);
      setTimeout(() => {
        setSelectedOrder(null);
        setDispatchMessage('');
        fetchOrders();
      }, 800);
    } catch (err: unknown) {
      setDispatchMessage(err instanceof Error ? err.message : 'Error dispatching order');
    } finally {
      setDispatching(false);
    }
  };

  const columns: Column<OnlineOrderRow>[] = [
    {
      key: 'orderNumber',
      header: 'Order #',
      render: (o) => (
        <span className="font-mono font-medium text-stone-900 truncate block">
          {o.orderNumber}
        </span>
      ),
    },
    {
      key: 'orderSource',
      header: 'Platform',
      priority: 'standard',
      render: (o) => (
        <span className="font-mono text-[10px] text-stone-600 uppercase px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">
          {o.orderSource}
        </span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (o) => (
        <div className="truncate">
          <span className="font-medium text-stone-800 truncate block leading-tight">{o.customerName}</span>
          <span className="text-[10px] text-stone-400 font-mono truncate block leading-tight">
            {o.customerPhone}
          </span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date & Time',
      priority: 'standard',
      render: (o) => (
        <span className="font-mono text-[11px] text-stone-500 truncate block">
          {formatQatarDateTime(o.createdAt)}
        </span>
      ),
    },
    {
      key: 'totalQar',
      header: 'Total',
      align: 'right',
      render: (o) => (
        <span className="font-mono font-medium text-stone-900 tabular-nums truncate block">
          {formatQar(o.totalQar)}
        </span>
      ),
    },
    {
      key: 'orderStatus',
      header: 'Fulfillment',
      render: (o) => (
        <StatusIndicator status={o.orderStatus} variant={orderStatusVariant(o.orderStatus)} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (o) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedOrder(o);
          }}
          className="w-8 h-8 inline-flex items-center justify-center text-stone-500 hover:text-teal-700 hover:bg-teal-50 rounded-md transition cursor-pointer"
          title="Fulfill / view order"
        >
          <Eye size={14} />
        </button>
      ),
    },
  ];

  return (
    <Shell
      title="Online Orders & Store Fulfillment"
      subtitle="E-Commerce, Snoonu & Talabat Dispatch"
    >
      <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden">
        {/* Page Header (Single-Line) */}
        <PageHeader
          title="Fulfillment Queue"
          subtitle={`${orders.length} Active Orders`}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search order #, customer, or phone..."
          filters={SOURCE_FILTERS}
          activeFilter={filterSource}
          onFilterChange={setFilterSource}
        />

        {/* Universal DataTable with Global Pre-Filtered Pagination & Mobile Cards */}
        <DataTable
          data={orders}
          columns={columns}
          keyExtractor={(o) => o.id}
          loading={loading}
          searchQuery={search}
          searchFields={[
            (o) => o.orderNumber,
            (o) => o.customerName,
            (o) => o.customerPhone,
            (o) => o.orderSource,
          ]}
          filterFn={(o) => {
            if (filterSource === 'ALL') return true;
            return o.orderSource === filterSource;
          }}
          pageSize={10}
          pageSizeOptions={[10, 25, 50, 100]}
          onRowClick={(o) => setSelectedOrder(o)}
          renderCard={(o) => (
            <>
              {/* Tier 1: Order # and Platform (Strictly Single-Line) */}
              <div className="flex items-center justify-between gap-2 min-w-0 pb-1 border-b border-stone-100">
                <span className="font-mono font-medium text-xs text-stone-900 truncate">
                  {o.orderNumber}
                </span>
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 shrink-0">
                  {o.orderSource}
                </span>
              </div>

              {/* Tier 2: Customer and Date (Strictly Single-Line) */}
              <div className="flex items-center justify-between gap-2 text-[11px] text-stone-600 min-w-0">
                <span className="truncate">{o.customerName}</span>
                <span className="font-mono text-[10px] text-stone-400 shrink-0">
                  {formatQatarDateTime(o.createdAt)}
                </span>
              </div>

              {/* Tier 3: Total, Status and Action */}
              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-stone-100 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-medium text-stone-900 tabular-nums">
                    {formatQar(o.totalQar)}
                  </span>
                  <StatusIndicator status={o.orderStatus} variant={orderStatusVariant(o.orderStatus)} />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedOrder(o);
                  }}
                  className="min-h-[36px] px-3 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-mono text-[11px] font-medium cursor-pointer transition shrink-0"
                >
                  {o.orderStatus !== 'DISPATCHED' && o.orderStatus !== 'DELIVERED' ? 'Dispatch' : 'View'}
                </button>
              </div>
            </>
          )}
        />
      </div>

      {/* Order Fulfillment Slide-Over Drawer */}
      <SlideOverDrawer
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        widthClass="sm:w-[480px]"
        title={selectedOrder ? `Dispatch #${selectedOrder.orderNumber}` : ''}
        subtitle={
          selectedOrder
            ? `${selectedOrder.orderSource} • ${formatQatarDateTime(selectedOrder.createdAt)}`
            : undefined
        }
        badge={
          selectedOrder ? (
            <StatusIndicator
              status={selectedOrder.orderStatus}
              variant={orderStatusVariant(selectedOrder.orderStatus)}
            />
          ) : undefined
        }
        footer={
          selectedOrder && (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="min-h-[44px] px-4 rounded-lg border border-stone-200 bg-white text-stone-700 text-xs font-medium hover:bg-stone-100 cursor-pointer transition"
              >
                Close
              </button>
              {selectedOrder.orderStatus !== 'DISPATCHED' && selectedOrder.orderStatus !== 'DELIVERED' && (
                <button
                  type="button"
                  onClick={handleDispatch}
                  disabled={dispatching}
                  className="min-h-[44px] px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  {dispatching ? <Loader2 size={13} className="animate-spin text-teal-200" /> : <Send size={13} />}
                  <span>Mark as Dispatched</span>
                </button>
              )}
            </div>
          )
        }
      >
        {selectedOrder && (
          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-2.5 p-3 bg-stone-50 rounded-lg border border-stone-200 text-[11px]">
              <div>
                <span className="text-stone-400 font-mono text-[9px] uppercase block">Platform & Customer</span>
                <span className="font-medium text-stone-900 truncate block mt-0.5">{selectedOrder.orderSource}</span>
                <span className="text-stone-700 truncate block">{selectedOrder.customerName}</span>
                <span className="text-stone-500 font-mono">{selectedOrder.customerPhone}</span>
              </div>
              <div>
                <span className="text-stone-400 font-mono text-[9px] uppercase block">Payment & Total</span>
                <span className="font-medium text-stone-900 truncate block mt-0.5">{selectedOrder.paymentMethod}</span>
                <span className="font-mono font-semibold text-teal-800 tabular-nums block text-sm mt-0.5">
                  {formatQar(selectedOrder.totalQar)}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-stone-200 rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 font-mono text-[10px] text-stone-500 uppercase">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {(selectedOrder.items || []).map((it) => (
                    <tr key={it.id} className="h-9">
                      <td className="p-2.5 truncate max-w-[200px] font-medium text-stone-800">
                        {it.productTitle}
                      </td>
                      <td className="p-2.5 text-center font-mono tabular-nums">{it.quantity}</td>
                      <td className="p-2.5 text-right font-mono tabular-nums">{formatQar(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Dispatch Tracking Input */}
            {selectedOrder.orderStatus !== 'DISPATCHED' && selectedOrder.orderStatus !== 'DELIVERED' && (
              <div>
                <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1">
                  Courier AWB / Rider Tracking Number
                </label>
                <input
                  type="text"
                  value={dispatchTracking}
                  onChange={(e) => setDispatchTracking(e.target.value)}
                  placeholder="e.g. SNOONU-RIDER-8821"
                  className="w-full text-[16px] sm:text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg font-mono focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>
            )}

            {dispatchMessage && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span className="truncate">{dispatchMessage}</span>
              </div>
            )}
          </div>
        )}
      </SlideOverDrawer>
    </Shell>
  );
}
