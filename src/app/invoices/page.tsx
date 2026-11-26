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
  Printer,
  Loader2,
  AlertTriangle,
  Pencil,
  Building2,
} from 'lucide-react';
import { AnimatedQar } from '@/components/shared/animated-number';
import { ThermalReceiptBill } from '@/components/shared/thermal-receipt-bill';
import { A4InvoiceBill } from '@/components/shared/a4-invoice-bill';
import { PrintReceiptArea } from '@/components/shared/print-receipt';
import { EditInvoiceModal } from '@/components/shared/edit-invoice-modal';
import { AggregatorSettlementModal } from '@/components/invoices/aggregator-settlement-modal';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { SlideOverDrawer } from '@/components/ui/slide-over-drawer';


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
  orderSource?: string;
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
  { id: 'PENDING_SETTLEMENT', label: 'Pending Settlement' },
  { id: 'PAID', label: 'Paid' },
  { id: 'ISSUED', label: 'Issued' },
  { id: 'PARTIALLY_REFUNDED', label: 'Partially Refunded' },
  { id: 'REFUNDED', label: 'Refunded' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

interface CompanyProfileSummary {
  nameEn?: string;
  nameAr?: string;
  addressEn?: string;
  addressAr?: string;
  phone?: string;
  crNumber?: string;
  website?: string;
}

export function statusToVariant(status: string): StatusVariant {
  switch (status.toUpperCase()) {
    case 'PAID':
    case 'ISSUED':
      return 'success';
    case 'PENDING_SETTLEMENT':
      return 'warning';
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
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileSummary | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRow | null>(null);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

  const { canRefund, user, store } = useSessionStore();

  const handleEditSuccess = (updatedData: Record<string, unknown>) => {
    fetchInvoices();
    const updatedId = typeof updatedData.id === 'string' ? updatedData.id : undefined;
    if (selectedInvoice && (!updatedId || selectedInvoice.id === updatedId)) {
      setSelectedInvoice((prev) =>
        prev ? ({ ...prev, ...updatedData } as InvoiceRow) : null
      );
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
    let active = true;
    const params = new URLSearchParams();
    params.set('limit', '500');
    fetch(`/api/invoices?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.invoices) setInvoices(data.invoices);
        if (data.companyProfile) setCompanyProfile(data.companyProfile);
      })
      .catch((err) => {
        console.error('Error loading invoices:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
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
    } catch (err: unknown) {
      setRefundError(err instanceof Error ? err.message : 'Refund processing error');
    } finally {
      setRefunding(false);
    }
  };

  const toReceiptPayload = (inv: InvoiceRow): ReceiptPayload => {
    const dt = inv.issuedAt ? new Date(inv.issuedAt) : new Date(inv.createdAt);
    const items = (inv.items || []).map((it) => ({
      name: it.name,
      nameAr: it.nameAr,
      specs: it.specs,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      total: it.total,
    }));
    const itemsSum = items.reduce((acc, it) => acc + (it.total || it.quantity * it.unitPrice), 0);
    const discount = Number(inv.discountQar) || 0;
    const deliveryFee = Number(inv.deliveryFeeQar) || 0;
    const taxAmount = Number(inv.taxTotalQar) || 0;
    const total = Number(inv.totalQar) || 0;
    const subtotal = items.length > 0
      ? itemsSum
      : (Number(inv.subtotalQar) || Math.max(0, total + discount - deliveryFee - taxAmount));

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
      items,
      subtotal,
      discount,
      taxRate: 0,
      taxAmount,
      deliveryFee,
      total,
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
      priority: 'standard',
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
      priority: 'standard',
      render: (row) => (
        <span className="text-[10px] font-mono text-stone-500 uppercase truncate block">
          {row.channel?.replace('_', ' ') || 'POS'}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Payment',
      priority: 'standard',
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
            className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-900 rounded-md hover:bg-stone-100 transition cursor-pointer"
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingInvoice(row);
            }}
            title="Edit invoice"
            className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-teal-700 hover:bg-teal-50 rounded-md transition cursor-pointer"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              downloadReceiptPdf(toReceiptPayload(row));
            }}
            title="Download 80mm receipt PDF"
            className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-900 rounded-md hover:bg-stone-100 transition cursor-pointer"
          >
            <Download size={14} />
          </button>
          {row.status !== 'REFUNDED' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setRefundModalInvoice(row);
              }}
              title="Refund invoice"
              className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition cursor-pointer"
            >
              <RotateCcw size={14} />
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
          primaryAction={{
            label: 'Aggregator Settlement',
            icon: Building2,
            onClick: () => setIsSettlementModalOpen(true),
          }}
        />

        {/* Universal DataTable with Global Pre-Filtered Pagination & Mobile Cards */}
        <DataTable
          data={invoices}
          columns={columns}
          keyExtractor={(inv) => inv.id}
          loading={loading}
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

              {/* Tier 3: Total and Quick Actions */}
              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-stone-100">
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
                    className="min-h-[38px] px-3 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 font-mono text-[11px] cursor-pointer flex items-center gap-1"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadReceiptPdf(toReceiptPayload(inv));
                    }}
                    className="min-h-[38px] px-3 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 font-mono text-[11px] cursor-pointer"
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInvoice(inv);
                    }}
                    className="min-h-[38px] px-3 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-mono text-[11px] font-medium cursor-pointer transition"
                  >
                    View
                  </button>
                </div>
              </div>
            </>
          )}
        />
      </div>

      {/* Invoice Receipt Slide-Over Inspector Drawer */}
      <SlideOverDrawer
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        widthClass={billPreviewMode === 'A4' ? 'sm:w-[820px]' : 'sm:w-[480px]'}
        title={selectedInvoice ? `Invoice ${formatInvoiceNumber(selectedInvoice.invoiceNumber)}` : ''}
        subtitle={
          selectedInvoice
            ? `${selectedInvoice.customerName || 'Walk-in Client'} • ${formatQatarDateTime(
                selectedInvoice.issuedAt || selectedInvoice.createdAt
              )}`
            : undefined
        }
        badge={
          selectedInvoice ? (
            <StatusIndicator
              status={selectedInvoice.status}
              variant={statusToVariant(selectedInvoice.status)}
            />
          ) : undefined
        }
        footer={
          selectedInvoice && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(selectedInvoice)}
                  className="min-h-[42px] px-3 border border-teal-200 bg-teal-50/70 hover:bg-teal-100 rounded-lg text-xs font-semibold text-teal-900 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Pencil size={12} className="text-teal-700" /> Edit / تعديل
                </button>
                <button
                  type="button"
                  onClick={() => downloadA4InvoicePdf(toReceiptPayload(selectedInvoice))}
                  className="min-h-[42px] px-3 border border-stone-300 bg-white hover:bg-stone-100 rounded-lg text-xs font-semibold text-stone-800 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download size={13} className="text-emerald-700" /> A4 PDF
                </button>
                <button
                  type="button"
                  onClick={() => downloadReceiptPdf(toReceiptPayload(selectedInvoice))}
                  className="min-h-[42px] px-3 border border-stone-200 bg-white hover:bg-stone-100 rounded-lg text-xs font-medium text-stone-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download size={12} /> 80mm PDF
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[42px] px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs ml-auto"
              >
                <Printer size={13} /> Print / طباعة (Ctrl+P)
              </button>
            </div>
          )
        }
      >
        {selectedInvoice && (
          <div className="-m-4 flex flex-col min-h-full">
            {/* Format Segmented Toggle */}
            <div className="sticky top-0 z-10 px-4 py-2.5 bg-white border-b border-stone-200 flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
                Bill Format
              </span>
              <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setBillPreviewMode('A4')}
                  className={`min-h-[34px] px-2.5 sm:px-3 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                    billPreviewMode === 'A4'
                      ? 'bg-white text-teal-800 font-semibold shadow-2xs border border-stone-200/80'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <FileText size={12} className={billPreviewMode === 'A4' ? 'text-teal-700' : 'text-stone-500'} />
                  <span>A4 Tax Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillPreviewMode('80MM')}
                  className={`min-h-[34px] px-2.5 sm:px-3 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                    billPreviewMode === '80MM'
                      ? 'bg-white text-teal-800 font-semibold shadow-2xs border border-stone-200/80'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Printer size={12} className={billPreviewMode === '80MM' ? 'text-teal-700' : 'text-stone-500'} />
                  <span>80mm Slip</span>
                </button>
              </div>
            </div>

            {/* Bill Preview Canvas */}
            <div className="flex-1 p-3 sm:p-5 bg-stone-100 flex justify-center items-start">
              {billPreviewMode === 'A4' ? (
                <A4InvoiceBill data={toReceiptPayload(selectedInvoice)} className="w-full shadow-sm" />
              ) : (
                <ThermalReceiptBill data={toReceiptPayload(selectedInvoice)} />
              )}
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* Refund Confirmation Modal */}
      <ResponsiveDialog
        open={!!refundModalInvoice}
        onClose={() => setRefundModalInvoice(null)}
        maxWidthClass="sm:max-w-sm"
        icon={<RotateCcw size={16} className="text-rose-600" />}
        title={
          refundModalInvoice
            ? `Refund Invoice ${formatInvoiceNumber(refundModalInvoice.invoiceNumber)}`
            : 'Refund Invoice'
        }
        subtitle={
          refundModalInvoice
            ? `Amount to refund: ${formatQar(refundModalInvoice.totalQar)}`
            : undefined
        }
      >
        {refundModalInvoice && (
          <form onSubmit={handleRefundSubmit} className="space-y-3">
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
                className="w-full text-[16px] sm:text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-teal-600 focus:outline-none"
              />
            </div>

            {refundError && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                <span className="truncate">{refundError}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundModalInvoice(null)}
                className="min-h-[44px] px-4 rounded-lg border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={refunding}
                className="min-h-[44px] px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                {refunding ? <Loader2 size={13} className="animate-spin" /> : null}
                <span>Confirm Refund</span>
              </button>
            </div>
          </form>
        )}
      </ResponsiveDialog>
      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <EditInvoiceModal
          invoice={editingInvoice}
          isOpen={!!editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSaveSuccess={handleEditSuccess}
        />
      )}

      {/* Aggregator Settlement Modal */}
      <AggregatorSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        invoices={invoices}
        onSettlementSuccess={fetchInvoices}
      />

      {/* Hidden Print Area for browser print (supports A4 and 80mm) */}
      <PrintReceiptArea
        receipt={selectedInvoice ? toReceiptPayload(selectedInvoice) : null}
        format={billPreviewMode}
      />
    </Shell>
  );
}
