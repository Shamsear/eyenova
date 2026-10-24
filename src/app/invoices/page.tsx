'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { formatQar, formatQatarDateTime, formatInvoiceNumber } from '@/lib/utils';
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
  Pencil,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedQar, AnimatedCount } from '@/components/shared/animated-number';
import { ThermalReceiptBill } from '@/components/shared/thermal-receipt-bill';
import { A4InvoiceBill } from '@/components/shared/a4-invoice-bill';
import { PrintReceiptArea } from '@/components/shared/print-receipt';
import { EditInvoiceModal } from '@/components/shared/edit-invoice-modal';


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
  { id: 'PARTIALLY_REFUNDED', label: 'Partially Refunded' },
  { id: 'REFUNDED', label: 'Refunded' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export function statusToVariant(status: string): StatusVariant {
  switch (status.toUpperCase()) {
    case 'PAID':
    case 'ISSUED':
      return 'success';
    case 'PARTIALLY_REFUNDED':
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
  const [billPreviewMode, setBillPreviewMode] = useState<'A4' | '80MM'>('A4');
  const [refunding, setRefunding] = useState(false);
  const [refundModalInvoice, setRefundModalInvoice] = useState<InvoiceRow | null>(null);
  const [refundReason, setRefundReason] = useState('Customer return');
  const [refundError, setRefundError] = useState('');
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRow | null>(null);

  const { canRefund, user, store } = useSessionStore();

  const handleEditSuccess = (updatedData: any) => {
    fetchInvoices();
    if (selectedInvoice && selectedInvoice.id === updatedData.id) {
      setSelectedInvoice((prev) => (prev ? { ...prev, ...updatedData } : null));
    }
  };

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
      status: inv.status,
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
              setEditingInvoice(row);
            }}
            title="Edit invoice"
            className="p-1 text-stone-500 hover:text-blue-600 rounded hover:bg-stone-100 transition cursor-pointer"
          >
            <Pencil size={13} />
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
                      setEditingInvoice(inv);
                    }}
                    className="px-2 py-0.5 rounded border border-stone-200 text-stone-700 hover:bg-stone-50 font-mono text-[10px] cursor-pointer flex items-center gap-1"
                  >
                    <Pencil size={10} /> Edit
                  </button>
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
      {/* Invoice Receipt Bill Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className={`bg-white rounded-xl border border-stone-200 overflow-hidden flex flex-col h-[92vh] max-h-[92vh] my-auto shadow-2xl transition-all duration-200 ${
              billPreviewMode === 'A4' ? 'w-full max-w-4xl' : 'w-full max-w-xl'
            }`}
          >
            {/* Header */}
            <div className="p-3 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                <h3 className="font-semibold text-xs text-stone-900 truncate">
                  Invoice {formatInvoiceNumber(selectedInvoice.invoiceNumber)}
                </h3>
                <StatusIndicator status={selectedInvoice.status} variant={statusToVariant(selectedInvoice.status)} />
              </div>

              {/* View Mode Toggle: A4 vs 80mm */}
              <div className="flex items-center bg-stone-200/80 p-0.5 rounded-lg border border-stone-300/70 text-[11px] font-medium shrink-0">
                <button
                  type="button"
                  onClick={() => setBillPreviewMode('A4')}
                  className={`px-2.5 sm:px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                    billPreviewMode === 'A4'
                      ? 'bg-white text-stone-900 font-semibold shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <FileText size={12} className={billPreviewMode === 'A4' ? 'text-stone-900' : 'text-stone-500'} />
                  <span>A4 Tax Invoice / فاتورة A4</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillPreviewMode('80MM')}
                  className={`px-2.5 sm:px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                    billPreviewMode === '80MM'
                      ? 'bg-white text-stone-900 font-semibold shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Printer size={12} className={billPreviewMode === '80MM' ? 'text-stone-900' : 'text-stone-500'} />
                  <span>80mm Slip / إيصال حراري</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-md transition cursor-pointer hover:bg-stone-200/50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Bill Preview Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 bg-stone-100">
              <div className="flex justify-center items-start min-h-full">
                {billPreviewMode === 'A4' ? (
                  <A4InvoiceBill data={toReceiptPayload(selectedInvoice)} className="w-full shadow-sm" />
                ) : (
                  <ThermalReceiptBill data={toReceiptPayload(selectedInvoice)} />
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(selectedInvoice)}
                  className="px-3 py-1.5 border border-blue-200 bg-blue-50/70 hover:bg-blue-100 rounded-md text-xs font-semibold text-blue-900 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Pencil size={12} className="text-blue-700" /> Edit Invoice / تعديل
                </button>
                <button
                  type="button"
                  onClick={() => downloadA4InvoicePdf(toReceiptPayload(selectedInvoice))}
                  className="px-3 py-1.5 border border-stone-300 bg-white hover:bg-stone-100 rounded-md text-xs font-semibold text-stone-800 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Download size={13} className="text-emerald-700" /> Download A4 PDF
                </button>
                <button
                  type="button"
                  onClick={() => downloadReceiptPdf(toReceiptPayload(selectedInvoice))}
                  className="px-2.5 py-1.5 border border-stone-200 bg-white hover:bg-stone-100 rounded-md text-xs font-medium text-stone-700 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Download size={12} /> 80mm Slip PDF
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-stone-900 text-stone-50 rounded-md text-xs font-medium hover:bg-stone-800 transition flex items-center gap-1.5 cursor-pointer shadow-xs ml-auto"
              >
                <Printer size={13} /> Print / طباعة (Ctrl+P)
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Refund Confirmation Modal (Replacing prompt()) */}
      {refundModalInvoice && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-stone-200 w-full max-w-sm overflow-hidden p-4 space-y-3 shadow-xl my-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-stone-900">
                Refund Invoice {formatInvoiceNumber(refundModalInvoice.invoiceNumber)}
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
      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <EditInvoiceModal
          invoice={editingInvoice}
          isOpen={!!editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSaveSuccess={handleEditSuccess}
        />
      )}

      {/* Hidden Print Area for browser print (supports A4 and 80mm) */}
      <PrintReceiptArea
        receipt={selectedInvoice ? toReceiptPayload(selectedInvoice) : null}
        format={billPreviewMode}
      />
    </Shell>
  );
}
