'use client';

import React, { useState } from 'react';
import {
  Save,
  Loader2,
  AlertCircle,
  ShoppingBag,
  User,
  CreditCard,
  DollarSign,
  Calendar,
  Truck,
  Check,
  ArrowLeftRight,
} from 'lucide-react';
import { formatQar, formatInvoiceNumber } from '@/lib/utils';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';

export interface InvoiceEditData {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  status: string;
  salespersonName?: string;
  paymentMethod: string;
  paymentReference?: string;
  orderSource?: string;
  channel?: string;
  notes?: string;
  subtotalQar: number;
  discountQar: number;
  taxTotalQar: number;
  deliveryFeeQar: number;
  totalQar: number;
  issuedAt?: string | null;
  createdAt?: string;
  items: {
    id: string;
    productId: string;
    name: string;
    nameAr?: string;
    specs?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

interface EditInvoiceModalProps {
  invoice: InvoiceEditData;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (updatedInvoice: Record<string, unknown>) => void;
}

function sanitizeEmail(val?: string | null): string {
  if (!val) return '';
  const trimmed = val.trim();
  if (trimmed === '—' || trimmed === '-' || trimmed.toLowerCase() === 'n/a') {
    return '';
  }
  return trimmed;
}

function toQatarDatetimeLocal(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const qatarTimeMs = d.getTime() + 3 * 60 * 60 * 1000;
  const qDate = new Date(qatarTimeMs);
  const year = qDate.getUTCFullYear();
  const month = String(qDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(qDate.getUTCDate()).padStart(2, '0');
  const hours = String(qDate.getUTCHours()).padStart(2, '0');
  const minutes = String(qDate.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function fromQatarDatetimeLocal(val: string): string | null {
  if (!val) return null;
  const isoWithOffset = `${val}:00+03:00`;
  const d = new Date(isoWithOffset);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseInitialSplit(invoice?: InvoiceEditData): { cash: string; card: string } {
  const refStr = invoice?.paymentReference || '';
  const match = refStr.match(/Cash\s+([\d.]+).*?Card\s+([\d.]+)/i);
  if (match) {
    return { cash: match[1], card: match[2] };
  }
  if (invoice?.paymentMethod === 'SPLIT' && (Number(invoice.totalQar) || 0) > 0) {
    const half = (Number(invoice.totalQar) / 2).toFixed(2);
    return { cash: half, card: half };
  }
  return { cash: '', card: '' };
}

export function EditInvoiceModal({
  invoice,
  isOpen,
  onClose,
  onSaveSuccess,
}: EditInvoiceModalProps) {
  return (
    <ResponsiveDialog
      open={isOpen && !!invoice}
      onClose={onClose}
      maxWidthClass="sm:max-w-3xl"
      icon={<CreditCard size={16} className="text-teal-700" />}
      title={
        invoice
          ? `Edit Invoice / تعديل الفاتورة ${formatInvoiceNumber(invoice.invoiceNumber)}`
          : 'Edit Invoice'
      }
      subtitle={invoice ? `Order Ref: ${invoice.orderNumber}` : undefined}
      bodyClassName="p-4 sm:p-6"
    >
      {invoice && (
        <EditInvoiceForm
          key={`${invoice.id}-${invoice.status}-${invoice.totalQar}`}
          invoice={invoice}
          onClose={onClose}
          onSaveSuccess={onSaveSuccess}
        />
      )}
    </ResponsiveDialog>
  );
}

function EditInvoiceForm({
  invoice,
  onClose,
  onSaveSuccess,
}: {
  invoice: InvoiceEditData;
  onClose: () => void;
  onSaveSuccess: (updatedInvoice: Record<string, unknown>) => void;
}) {
  // Local form state
  const [customerName, setCustomerName] = useState(invoice?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(invoice.customerPhone || '');
  const [customerEmail, setCustomerEmail] = useState(sanitizeEmail(invoice?.customerEmail));
  const [salespersonName, setSalespersonName] = useState(invoice.salespersonName || '');
  const [orderSource, setOrderSource] = useState(invoice?.orderSource || invoice?.channel || 'IN_STORE_POS');
  const [paymentMethod, setPaymentMethod] = useState(invoice.paymentMethod || 'CASH');
  const [paymentReference, setPaymentReference] = useState(invoice.paymentReference || '');
  const [splitCashPortion, setSplitCashPortion] = useState<string>(() => parseInitialSplit(invoice).cash);
  const [splitCardPortion, setSplitCardPortion] = useState<string>(() => parseInitialSplit(invoice).card);
  const [status, setStatus] = useState(invoice.status || 'PAID');
  const [notes, setNotes] = useState(invoice.notes || '');
  const [invoiceDate, setInvoiceDate] = useState<string>(() =>
    toQatarDatetimeLocal(invoice?.issuedAt || invoice?.createdAt)
  );

  // Synchronized change handlers for aggregators vs in-store/online
  const handleOrderSourceChange = (newSource: string) => {
    setOrderSource(newSource);
    const isAgg = ['SNOONU', 'TALABAT', 'RAFEEQ'].includes(newSource);
    if (isAgg) {
      setPaymentMethod(newSource);
      setStatus('PENDING_SETTLEMENT');
    } else if (newSource === 'WHATSAPP' || newSource === 'WEBSITE') {
      if (['SNOONU', 'TALABAT', 'RAFEEQ'].includes(paymentMethod)) {
        setPaymentMethod('CASH');
      }
      if (status === 'PENDING_SETTLEMENT') {
        setStatus('PAID');
      }
    } else {
      // IN_STORE_POS
      if (['SNOONU', 'TALABAT', 'RAFEEQ'].includes(paymentMethod)) {
        setPaymentMethod('CASH');
      }
      if (status === 'PENDING_SETTLEMENT') {
        setStatus('PAID');
      }
    }
  };

  const handlePaymentMethodChange = (newMethod: string) => {
    setPaymentMethod(newMethod);
    const isAgg = ['SNOONU', 'TALABAT', 'RAFEEQ'].includes(newMethod);
    if (isAgg) {
      setOrderSource(newMethod);
      setStatus('PENDING_SETTLEMENT');
    } else if (newMethod === 'WHATSAPP' || newMethod === 'WEBSITE') {
      setOrderSource(newMethod);
      if (status === 'PENDING_SETTLEMENT') {
        setStatus('PAID');
      }
    } else {
      // Non-aggregator (CASH, CARD, SPLIT, TRANSFER)
      if (['SNOONU', 'TALABAT', 'RAFEEQ'].includes(orderSource)) {
        setOrderSource('IN_STORE_POS');
      }
      if (status === 'PENDING_SETTLEMENT') {
        setStatus('PAID');
      }
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
  };

  const handleSplitCashEdit = (c: string) => {
    setSplitCashPortion(c);
    const num = parseFloat(c);
    if (!isNaN(num)) {
      const remainder = Math.max(0, Math.round((totalQar - num) * 100) / 100);
      setSplitCardPortion(remainder.toFixed(2));
      const auth = paymentReference.includes('Ref:') ? paymentReference.split('Ref:')[1].replace(')', '').trim() : '';
      setPaymentReference(`SPLIT: Cash ${num.toFixed(2)} QAR, Card ${remainder.toFixed(2)} QAR${auth ? ` (Ref: ${auth})` : ''}`);
    }
  };

  const handleSplitCardEdit = (cardVal: string) => {
    setSplitCardPortion(cardVal);
    const num = parseFloat(cardVal);
    if (!isNaN(num)) {
      const remainder = Math.max(0, Math.round((totalQar - num) * 100) / 100);
      setSplitCashPortion(remainder.toFixed(2));
      const auth = paymentReference.includes('Ref:') ? paymentReference.split('Ref:')[1].replace(')', '').trim() : '';
      setPaymentReference(`SPLIT: Cash ${remainder.toFixed(2)} QAR, Card ${num.toFixed(2)} QAR${auth ? ` (Ref: ${auth})` : ''}`);
    }
  };

  const handleSwapInvoiceSplit = () => {
    const oldCash = splitCashPortion;
    const oldCard = splitCardPortion;
    setSplitCashPortion(oldCard);
    setSplitCardPortion(oldCash);
    const auth = paymentReference.includes('Ref:') ? paymentReference.split('Ref:')[1].replace(')', '').trim() : '';
    setPaymentReference(`SPLIT: Cash ${oldCard} QAR, Card ${oldCash} QAR${auth ? ` (Ref: ${auth})` : ''}`);
  };

  // Line items state
  const [items, setItems] = useState(
    (invoice.items || []).map((it) => ({
      ...it,
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      total: Number(it.total) || 0,
    }))
  );

  // Financial adjustments
  const [discountQar, setDiscountQar] = useState<number>(Number(invoice.discountQar) || 0);
  const [deliveryFeeQar, setDeliveryFeeQar] = useState<number>(Number(invoice.deliveryFeeQar) || 0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recalculate financial totals
  const subtotalQar = items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
  const totalQar = Math.max(0, subtotalQar - discountQar + deliveryFeeQar);

  const handleItemChange = (
    index: number,
    field: 'quantity' | 'unitPrice',
    val: number
  ) => {
    setItems((prev) => {
      const next = [...prev];
      const target = { ...next[index] };
      if (field === 'quantity') {
        target.quantity = Math.max(1, Math.round(val));
      } else {
        target.unitPrice = Math.max(0, val);
      }
      target.total = target.quantity * target.unitPrice;
      next[index] = target;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: sanitizeEmail(customerEmail) || undefined,
        salespersonName: salespersonName.trim() || undefined,
        orderSource,
        channel: orderSource,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
        issuedAt: fromQatarDatetimeLocal(invoiceDate),
        subtotalQar,
        discountQar,
        taxTotalQar: 0,
        deliveryFeeQar,
        totalQar,
        items: items.map((it) => ({
          id: it.id,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          total: it.total,
        })),
      };

      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update invoice');
      }

      onSaveSuccess(data.invoice || payload);
      onClose();
    } catch (err: unknown) {
      console.error('Error updating invoice:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-stone-800">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Invoice Date & Time (Backdating & Historical Entry Support) */}
      <div className="bg-amber-50/70 border border-amber-200/90 rounded-lg p-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
              <Calendar size={14} className="text-amber-700 shrink-0" />
              <span>Invoice Date &amp; Time / تاريخ ووقت الفاتورة</span>
            </div>
            <p className="text-[11px] text-amber-800/90 mt-0.5 leading-normal">
              Change the date to record prior/backdated sales. All order records, print receipts, and PDFs will reflect this date (Qatar Time UTC+3).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="datetime-local"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="text-[16px] sm:text-xs px-2.5 py-1.5 min-h-[38px] sm:h-8.5 border border-amber-300 rounded-md font-mono focus:border-amber-900 focus:outline-none bg-white text-stone-900 shadow-2xs"
            />
            <button
              type="button"
              onClick={() => setInvoiceDate(toQatarDatetimeLocal(new Date()))}
              className="px-3 py-1.5 min-h-[38px] sm:h-8.5 text-[11px] font-semibold text-amber-900 bg-amber-200/70 hover:bg-amber-300/80 border border-amber-300 rounded-md transition cursor-pointer shrink-0"
              title="Reset to current time"
            >
              Set to Now
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Customer Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-900 pb-1.5 border-b border-stone-100">
          <User size={14} className="text-teal-700" />
          <span>Customer Information / بيانات العميل</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-stone-600 mb-1 h-4 leading-4 truncate">
              Customer Name / الاسم *
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full text-[16px] sm:text-xs px-2.5 py-1.5 min-h-[38px] sm:h-8.5 border border-stone-300 rounded-md focus:border-teal-600 focus:outline-none"
              placeholder="Client full name"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-stone-600 mb-1 h-4 leading-4 truncate">
              Phone Number / رقم الهاتف *
            </label>
            <input
              type="text"
              required
              dir="ltr"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full text-[16px] sm:text-xs px-2.5 py-1.5 min-h-[38px] sm:h-8.5 border border-stone-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
              placeholder="+974 ..."
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-stone-600 mb-1 h-4 leading-4 truncate">
              Email / البريد الإلكتروني (اختياري)
            </label>
            <input
              type="text"
              inputMode="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full text-[16px] sm:text-xs px-2.5 py-1.5 min-h-[38px] sm:h-8.5 border border-stone-300 rounded-md focus:border-teal-600 focus:outline-none"
              placeholder="Optional (optional@domain.com)"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Order & Payment Info */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-900 pb-1.5 border-b border-stone-100">
          <CreditCard size={14} className="text-teal-700" />
          <span>Payment &amp; Status / تفاصيل السداد والحالة</span>
        </div>

        {/* Row 1: Primary Classification (3 balanced columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-stone-600 mb-1 h-4 leading-4 truncate">
              Order Source / منصة الطلب
            </label>
            <select
              value={orderSource}
              onChange={(e) => handleOrderSourceChange(e.target.value)}
              className="w-full text-[16px] sm:text-xs px-2.5 py-1.5 min-h-[38px] sm:h-8.5 border border-stone-300 rounded-md focus:border-teal-600 focus:outline-none bg-white font-medium"
            >
              <option value="IN_STORE_POS">محل / In-Store POS</option>
              <option value="SNOONU">سنونو / Snoonu</option>
              <option value="TALABAT">طلبات / Talabat</option>
              <option value="RAFEEQ">رفيق / Rafeeq</option>
              <option value="WHATSAPP">واتساب / WhatsApp</option>
              <option value="WEBSITE">الموقع / Website</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-stone-600 mb-1 h-4 leading-4 truncate">
              Payment Method / طريقة الدفع
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => handlePaymentMethodChange(e.target.value)}
              className="w-full text-[16px] sm:text-xs px-2.5 py-1.5 min-h-[38px] sm:h-8.5 border border-stone-300 rounded-md focus:border-teal-600 focus:outline-none bg-white font-medium"
            >
              <option value="CASH">نقداً / Cash</option>
              <option value="CARD">بطاقة / Card</option>
              <option value="SPLIT">دفع مجزأ / Split</option>
              <option value="TRANSFER">تحويل / Bank Transfer</option>
              <option value="SNOONU">سنونو / Snoonu</option>
              <option value="TALABAT">طلبات / Talabat</option>
              <option value="RAFEEQ">رفيق / Rafeeq</option>
              <option value="WHATSAPP">واتساب / WhatsApp</option>
              <option value="WEBSITE">الموقع / Website</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-stone-600 mb-1 h-4 leading-4 truncate">
              Invoice Status / حالة الفاتورة
            </label>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`w-full text-[16px] sm:text-xs px-2.5 py-1.5 min-h-[38px] sm:h-8.5 border rounded-md focus:border-teal-600 focus:outline-none font-semibold ${
                status === 'PENDING_SETTLEMENT'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : status === 'PAID'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-white border-stone-300 text-stone-800'
              }`}
            >
              <option value="PAID">PAID / مدفوعة</option>
              <option value="PENDING_SETTLEMENT">PENDING SETTLEMENT / معلق للسداد</option>
              <option value="ISSUED">ISSUED / صادرة</option>
              <option value="REFUNDED">REFUNDED / مسترجعة</option>
              <option value="CANCELLED">CANCELLED / ملغاة</option>
            </select>
          </div>
        </div>

        {/* Row 2: Payment Ref & Staff Salesperson (2 balanced columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-stone-600 mb-1 h-4 leading-4 truncate">
              Payment Ref / رقم الإيصال
            </label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="w-full text-[16px] sm:text-xs px-2.5 py-1.5 min-h-[38px] sm:h-8.5 border border-stone-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
              placeholder="e.g. SNOONU-8821 / CARD Auth"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-stone-600 mb-1 h-4 leading-4 truncate">
              Salesperson / البائع
            </label>
            <input
              type="text"
              value={salespersonName}
              onChange={(e) => setSalespersonName(e.target.value)}
              className="w-full text-[16px] sm:text-xs px-2.5 py-1.5 min-h-[38px] sm:h-8.5 border border-stone-300 rounded-md focus:border-teal-600 focus:outline-none"
              placeholder="Staff / Cashier"
            />
          </div>
        </div>

        {/* Split Tender Portions & 1-Click Swap */}
        {paymentMethod === 'SPLIT' && (
          <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-lg text-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-teal-950 flex items-center gap-1.5">
                <CreditCard size={14} className="text-teal-700" />
                <span>Split Payment Portions / توزيع الدفع المجزأ</span>
              </span>
              <button
                type="button"
                onClick={handleSwapInvoiceSplit}
                className="min-h-[32px] px-2.5 py-1 bg-white hover:bg-teal-100 border border-teal-300 text-teal-900 rounded-md font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Swap Cash and Card amounts (vice-versa)"
              >
                <ArrowLeftRight size={12} /> Swap Cash &amp; Card
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">Cash Amount (QAR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={splitCashPortion}
                  onChange={(e) => handleSplitCashEdit(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-[16px] sm:text-xs px-2.5 py-1.5 min-h-[38px] sm:h-8.5 bg-white border border-teal-300 rounded-md font-mono font-bold text-stone-800 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">Card Amount (QAR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={splitCardPortion}
                  onChange={(e) => handleSplitCardEdit(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-[16px] sm:text-xs px-2.5 py-1.5 min-h-[38px] sm:h-8.5 bg-white border border-teal-300 rounded-md font-mono font-bold text-teal-900 focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Status / Platform Notice Banner */}
        {['SNOONU', 'TALABAT', 'RAFEEQ'].includes(orderSource) || ['SNOONU', 'TALABAT', 'RAFEEQ'].includes(paymentMethod) || status === 'PENDING_SETTLEMENT' ? (
          <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
            <Truck size={16} className="text-amber-700 shrink-0 mt-0.5" />
            <div className="text-[11.5px] leading-relaxed">
              <div>
                <strong className="font-bold text-amber-950">Delivery Platform Order ({orderSource}): </strong>
                Payment status is marked as <span className="font-mono font-bold bg-amber-200/80 px-1 py-0.5 rounded text-amber-950">PENDING_SETTLEMENT</span>.
                This bill will appear in the <strong>Aggregator Settlement</strong> modal for {orderSource} until reconciled.
              </div>
              <div className="text-amber-800 text-[11px] mt-1" dir="rtl">
                طلب منصة توصيل ({orderSource}): تم تعيين حالة الدفع لمعلق للسداد من المنصة. ستظهر الفاتورة فوراً في نافذة تسوية المنصات للمطابقة والسداد.
              </div>
            </div>
          </div>
        ) : (
          orderSource === 'IN_STORE_POS' && status === 'PAID' && (
            <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
              <Check size={14} className="text-emerald-700 shrink-0" />
              <span className="text-[11px]">
                <strong>In-Store POS Bill:</strong> Payment marked as <strong>PAID</strong>. Reconciled directly into in-store cash/card treasury.
              </span>
            </div>
          )
        )}

        <div>
          <label className="block text-[11px] font-medium text-stone-600 mb-1 h-4 leading-4 truncate">
            Order Notes / ملاحظات الفاتورة
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-[16px] sm:text-xs px-2.5 py-1.5 min-h-[38px] sm:h-8.5 border border-stone-300 rounded-md focus:border-teal-600 focus:outline-none"
            placeholder="Prescription or special handling notes..."
          />
        </div>
      </div>

      {/* Section 3: Line Items */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-900 pb-1.5 border-b border-stone-100">
          <ShoppingBag size={14} className="text-teal-700" />
          <span>Line Items &amp; Pricing / الأصناف والأسعار</span>
        </div>

        <div className="border border-stone-200 rounded-lg overflow-hidden overflow-x-auto text-xs">
          <table className="w-full min-w-[540px] text-left border-collapse">
            <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-semibold text-stone-600">
              <tr>
                <th className="py-2 px-3">Item / الصنف</th>
                <th className="py-2 px-2 text-center w-24">Qty / الكمية</th>
                <th className="py-2 px-3 text-right w-32">Unit Price / السعر</th>
                <th className="py-2 px-3 text-right w-32">Total / المجموع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((it, idx) => (
                <tr key={it.id || idx} className="hover:bg-stone-50/50">
                  <td className="py-2.5 px-3">
                    {it.nameAr && (
                      <div className="font-semibold text-stone-900 text-[11.5px]">
                        {it.nameAr}
                      </div>
                    )}
                    <div className="font-medium text-stone-700 text-xs">
                      {it.name}
                    </div>
                    {it.specs && (
                      <div className="text-[10.5px] text-stone-500 font-mono mt-0.5">
                        {it.specs}
                      </div>
                    )}
                  </td>

                  <td className="py-2 px-2 text-center align-top">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={it.quantity}
                      onChange={(e) =>
                        handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 1)
                      }
                      className="w-16 text-center text-[15px] sm:text-xs p-1.5 sm:p-1 border border-stone-300 rounded font-mono font-medium focus:border-teal-600 focus:outline-none"
                    />
                  </td>

                  <td className="py-2 px-3 text-right align-top">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={it.unitPrice}
                        onChange={(e) =>
                          handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                        className="w-24 text-right text-[15px] sm:text-xs p-1.5 sm:p-1 border border-stone-300 rounded font-mono focus:border-teal-600 focus:outline-none"
                      />
                      <span className="text-[10px] text-stone-400">QAR</span>
                    </div>
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900 tabular-nums align-top">
                    {formatQar(it.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Totals & Adjustments */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-900 pb-1.5 border-b border-stone-100">
          <DollarSign size={14} className="text-teal-700" />
          <span>Discounts &amp; Totals / الخصومات والإجمالي</span>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 bg-stone-50 p-4 rounded-lg border border-stone-200">
          {/* Adjustments on left */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-3 w-full sm:w-80">
            <div>
              <label className="block text-[11px] font-medium text-stone-600 mb-1">
                Discount / الخصم (QAR)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={discountQar}
                onChange={(e) => setDiscountQar(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full text-[16px] sm:text-xs px-2.5 py-1.5 min-h-[38px] sm:h-8.5 border border-stone-300 rounded-md font-mono focus:border-teal-600 focus:outline-none bg-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-stone-600">
                  Delivery / التوصيل (QAR)
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDeliveryFeeQar(10)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                      deliveryFeeQar === 10
                        ? 'bg-teal-700 text-white font-bold'
                        : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                    }`}
                    title="Apply 10 QAR delivery fee"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryFeeQar(0)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                      deliveryFeeQar === 0
                        ? 'bg-teal-700 text-white font-bold'
                        : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                    }`}
                    title="Set delivery to Free / 0 QAR"
                  >
                    Free (0)
                  </button>
                </div>
              </div>
              <input
                type="number"
                min="0"
                step="0.5"
                value={deliveryFeeQar}
                onChange={(e) => setDeliveryFeeQar(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full text-[16px] sm:text-xs px-2.5 py-1.5 min-h-[38px] sm:h-8.5 border border-stone-300 rounded-md font-mono focus:border-teal-600 focus:outline-none bg-white"
              />
            </div>
          </div>

          {/* Financial Totals Summary on right */}
          <div className="w-full sm:w-64 space-y-1.5 text-xs text-stone-600">
            <div className="flex justify-between">
              <span>Subtotal / المجموع:</span>
              <span className="font-mono font-medium tabular-nums">{formatQar(subtotalQar)}</span>
            </div>
            {discountQar > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Discount / الخصم:</span>
                <span className="font-mono tabular-nums">-{formatQar(discountQar)}</span>
              </div>
            )}
            {deliveryFeeQar > 0 && (
              <div className="flex justify-between">
                <span>Delivery / التوصيل:</span>
                <span className="font-mono tabular-nums">+{formatQar(deliveryFeeQar)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-stone-200 flex justify-between items-center text-stone-900 font-bold">
              <span className="text-xs">TOTAL DUE / الإجمالي:</span>
              <span className="font-mono text-base text-teal-800 tabular-nums">
                {formatQar(totalQar)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="min-h-[42px] px-4 border border-stone-300 rounded-lg text-xs font-medium text-stone-700 hover:bg-stone-100 transition cursor-pointer"
        >
          Cancel / إلغاء
        </button>

        <button
          type="submit"
          disabled={saving}
          className="min-h-[42px] px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          <span>Save Changes / حفظ التعديلات</span>
        </button>
      </div>
    </form>
  );
}
