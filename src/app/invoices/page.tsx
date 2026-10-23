'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { formatQar, formatQatarDateTime } from '@/lib/utils';
import { downloadReceiptPdf, downloadA4InvoicePdf } from '@/lib/receipt-pdf';
import { ReceiptPayload } from '@/lib/types';
import { useSessionStore } from '@/stores/session-store';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { StatusIndicator, StatusVariant } from '@/components/shared/status-indicator';
import {
  Download,
  FileText,
  RotateCcw,
  Eye,
  X,
  Printer,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedQar, AnimatedCount } from '@/components/shared/animated-number';
import { ThermalReceiptBill } from '@/components/shared/thermal-receipt-bill';
import { PrintReceiptArea } from '@/components/shared/print-receipt';


interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  status: string;
  subtotalQar: number;
  discountQar: number;
  taxTotalQar: number;
  deliveryFeeQar: number;
  totalQar: number;
  issuedAt: string | null;
  createdAt: string;
  salespersonName: string;
  paymentMethod: string;
  paymentReference?: string;
  channel: string;
  itemsCount: number;
  items: {
    id: string;
    productId: string;
    name: string;
    nameAr?: string;
    specs: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

const STATUS_FILTERS = [
  { id: 'ALL', label: 'All Invoices' },
  { id: 'PAID', label: 'Paid' },
  { id: 'ISSUED', label: 'Issued' },
  { id: 'REFUNDED', label: 'Refunded' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export function statusToVariant(status: string): StatusVariant {
  switch (status.toUpperCase()) {
    case 'PAID':
    case 'ISSUED':
      return 'success';
    case 'REFUNDED':
      return 'warning';
    case 'CANCELLED':
    case 'VOID':
      return 'danger';
    default:
      return 'neutral';
  }
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [refundModalInvoice, setRefundModalInvoice] = useState<InvoiceRow | null>(null);
  const [refundReason, setRefundReason] = useState('Customer return');
  const [refundError, setRefundError] = useState('');
  const [companyProfile, setCompanyProfile] = useState<any>(null);

  const { canRefund, user, store } = useSessionStore();

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '500');

      const res = await fetch(`/api/invoices?${params.toString()}`);
      const data = await res.json();
      if (data.invoices) setInvoices(data.invoices);
      if (data.companyProfile) setCompanyProfile(data.companyProfile);
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalInvoice) return;

    if (!canRefund()) {
      setRefundError('Manager Authorization Required: Only Store Admins can refund invoices.');
      return;
    }

    setRefunding(true);
    setRefundError('');
    try {
      const res = await fetch(`/api/invoices/${refundModalInvoice.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refundReason }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Refund failed');

      setRefundModalInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      setRefundError(err.message || 'Refund processing error');
    } finally {
      setRefunding(false);
    }
  };

  const toReceiptPayload = (inv: InvoiceRow): ReceiptPayload => {
    const dt = inv.issuedAt ? new Date(inv.issuedAt) : new Date(inv.createdAt);
    return {
      invoiceNumber: inv.invoiceNumber,
      orderNumber: inv.orderNumber,
      date: dt.toLocaleDateString('en-GB'),
      time: dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      storeNameEn: companyProfile?.nameEn || store?.name || 'EyeNova Optical - 02 Mall, Al Kheesa',
      storeNameAr: companyProfile?.nameAr || 'آي نوفا للتجارة البصرية',
      addressEn: companyProfile?.addressEn || store?.address || '02 Mall, 79 Street 773, Al Kheesa',
      addressAr: companyProfile?.addressAr || '',
      phone: companyProfile?.phone || store?.phone || '+974 6633 7371',
      crNumber: companyProfile?.crNumber || '',
      vatNumber: '',
      website: companyProfile?.website || 'eyenova.com.qa',
      cashierName: inv.salespersonName || user?.fullName || 'Cashier',
      customerName: inv.customerName,
      customerPhone: inv.customerPhone,
      customerEmail: inv.customerEmail || undefined,
      paymentMethod: inv.paymentMethod,
      paymentReference: inv.paymentReference,
      items: (inv.items || []).map((it) => ({
        name: it.name,
        nameAr: it.nameAr,
        specs: it.specs,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: it.total,
      })),
      subtotal: inv.subtotalQar,
      discount: inv.discountQar,
      taxRate: 0,
      taxAmount: inv.taxTotalQar,
      deliveryFee: inv.deliveryFeeQar,
      total: inv.totalQar,
    };
  };

  // Define Table Columns (Strict Single-Line)
  const columns: Column<InvoiceRow>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (row) => (
        <span className="font-mono font-medium text-stone-900 truncate block">
          {row.invoiceNumber}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date & Time',
      render: (row) => (
        <span className="font-mono text-[11px] text-stone-500 truncate block">
          {formatQatarDateTime(row.issuedAt || row.createdAt)}
        </span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (row) => (
        <div className="truncate">
          <span className="font-medium text-stone-800 truncate block leading-tight">{row.customerName}</span>
          <span className="text-[10px] text-stone-400 font-mono truncate block leading-tight">
            {row.customerPhone || 'Counter Client'}
          </span>
        </div>
      ),
    },
    {
      key: 'channel',
      header: 'Channel',
      render: (row) => (
        <span className="text-[10px] font-mono text-stone-500 uppercase truncate block">
          {row.channel?.replace('_', ' ') || 'POS'}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Payment',
      render: (row) => (
        <span className="text-[11px] font-mono text-stone-600 truncate block">
          {row.paymentMethod}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <StatusIndicator status={row.status} variant={statusToVariant(row.status)} />
      ),
    },
    {
      key: 'totalQar',
      header: 'Total',
      align: 'right',
      render: (row) => (
        <AnimatedQar
          value={row.totalQar}
          className="font-mono font-medium text-stone-900 tabular-nums truncate block justify-end"
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedInvoice(row);
            }}
            title="View invoice details"
            className="p-1 text-stone-500 hover:text-stone-900 rounded hover:bg-stone-100 transition cursor-pointer"
          >
            <Eye size={13} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              downloadReceiptPdf(toReceiptPayload(row));
            }}
            title="Download 80mm receipt PDF"
            className="p-1 text-stone-500 hover:text-stone-900 rounded hover:bg-stone-100 transition cursor-pointer"
          >
            <Download size={13} />
          </button>
          {row.status !== 'REFUNDED' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setRefundModalInvoice(row);
              }}
              title="Refund invoice"
              className="p-1 text-stone-400 hover:text-rose-600 rounded hover:bg-stone-100 transition cursor-pointer"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Shell
      title="Invoices & Receipts"
      subtitle="Register Billing History"
    >
      <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden">
        {/* Page Header (Single-Line) */}
        <PageHeader
          title="Invoices Registry"
          subtitle={`${invoices.length} Total`}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by invoice #, customer name, phone..."
          filters={STATUS_FILTERS}
          activeFilter={selectedStatus}
          onFilterChange={setSelectedStatus}
        />

        {/* Universal DataTable with Global Pre-Filtered Pagination & Mobile Cards */}
        <DataTable
          data={invoices}
          columns={columns}
          keyExtractor={(inv) => inv.id}
          searchQuery={search}
          searchFields={[
            (inv) => inv.invoiceNumber,
            (inv) => inv.customerName,
            (inv) => inv.customerPhone,
            (inv) => inv.salespersonName,
          ]}
          filterFn={(inv) => {
            if (selectedStatus === 'ALL') return true;
            return inv.status === selectedStatus;
          }}
          pageSize={10}
          pageSizeOptions={[10, 25, 50, 100]}
          onRowClick={(inv) => setSelectedInvoice(inv)}
          renderCard={(inv) => (
            <>
              {/* Tier 1: Invoice # and Status (Strictly Single-Line) */}
              <div className="flex items-center justify-between gap-2 min-w-0 pb-1 border-b border-stone-100">
                <span className="font-mono font-medium text-xs text-stone-900 truncate">
                  {inv.invoiceNumber}
                </span>
                <StatusIndicator status={inv.status} variant={statusToVariant(inv.status)} />
              </div>

              {/* Tier 2: Customer and Date (Strictly Single-Line) */}
              <div className="flex items-center justify-between gap-2 text-[11px] min-w-0 text-stone-600">
                <span className="truncate">{inv.customerName || 'Walk-in Client'}</span>
                <span className="font-mono text-[10px] text-stone-400 shrink-0">
                  {formatQatarDateTime(inv.issuedAt || inv.createdAt)}
                </span>
              </div>

              {/* Tier 3: Total and Quick Actions (Strictly Single-Line) */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100">
                <AnimatedQar
                  value={inv.totalQar}
                  className="font-mono font-medium text-xs text-stone-900 tabular-nums"
                />
                <div className="flex items-center gap-1.5 shrink-0 text-xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadReceiptPdf(toReceiptPayload(inv));
                    }}
                    className="px-2 py-0.5 rounded border border-stone-200 text-stone-700 hover:bg-stone-50 font-mono text-[10px] cursor-pointer"
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInvoice(inv);
                    }}
                    className="px-2 py-0.5 rounded bg-stone-900 text-white font-mono text-[10px] cursor-pointer"
                  >
                    View
                  </button>
                </div>
              </div>
            </>
          )}
        />
      </div>

            {/* Invoice Receipt Bill Modal (Same UI copy as POS & EyeNovaBilling) */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="bg-white rounded-t-xl sm:rounded-xl border border-stone-200 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] shadow-xl"
          >
            {/* Header */}
            <div className="p-3 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                <h3 className="font-medium text-xs text-stone-900 truncate">
                  Receipt / فاتورة #{selectedInvoice.invoiceNumber}
                </h3>
                <StatusIndicator status={selectedInvoice.status} variant={statusToVariant(selectedInvoice.status)} />
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* 80mm Thermal Receipt Preview Canvas */}
            <div className="p-4 overflow-y-auto bg-stone-100 flex justify-center">
              <ThermalReceiptBill data={toReceiptPayload(selectedInvoice)} />
            </div>

            {/* Modal Actions */}
            <div className="p-3 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => downloadReceiptPdf(toReceiptPayload(selectedInvoice))}
                  className="px-2.5 py-1.5 border border-stone-200 bg-white hover:bg-stone-100 rounded-md text-[11px] font-medium text-stone-700 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                >
                  <Download size={11} /> 80mm PDF
                </button>
                <button
                  type="button"
                  onClick={() => downloadA4InvoicePdf(toReceiptPayload(selectedInvoice))}
                  className="px-2.5 py-1.5 border border-stone-200 bg-white hover:bg-stone-100 rounded-md text-[11px] font-medium text-stone-700 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                >
                  <FileText size={11} /> A4 PDF
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-stone-900 text-stone-50 rounded-md text-xs font-medium hover:bg-stone-800 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer size={13} /> Print / طباعة (Ctrl+P)
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Refund Confirmation Modal (Replacing prompt()) */}
      {refundModalInvoice && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-stone-200 w-full max-w-sm overflow-hidden p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-stone-900">
                Refund Invoice #{refundModalInvoice.invoiceNumber}
              </h3>
              <button
                onClick={() => setRefundModalInvoice(null)}
                className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-[11px] text-stone-500">
              Amount to refund:{' '}
              <span className="font-mono font-medium text-stone-900">
                {formatQar(refundModalInvoice.totalQar)}
              </span>
            </p>

            <form onSubmit={handleRefundSubmit} className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1">
                  Reason for Refund
                </label>
                <input
                  type="text"
                  required
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer return, prescription change"
                  className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded-md focus:bg-white"
                />
              </div>

              {refundError && (
                <div className="p-1.5 bg-stone-50 border border-stone-300 rounded text-xs text-stone-900 flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-rose-600 shrink-0" />
                  <span className="truncate">{refundError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setRefundModalInvoice(null)}
                  className="px-2.5 py-1.5 rounded-md border border-stone-200 text-stone-700 text-xs hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refunding}
                  className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition cursor-pointer flex items-center gap-1"
                >
                  {refunding ? <Loader2 size={12} className="animate-spin" /> : null}
                  <span>Confirm Refund</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
          {/* Hidden Thermal Print Area for browser / ESC-POS printer */}
      <PrintReceiptArea receipt={selectedInvoice ? toReceiptPayload(selectedInvoice) : null} />
    </Shell>
  );
}
