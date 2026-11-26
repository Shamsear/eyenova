'use client';

import React, { useState } from 'react';
import { usePosStore } from '@/stores/pos-store';
import { useSessionStore } from '@/stores/session-store';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { formatQar, formatOpticalSpecs, formatInvoiceNumber } from '@/lib/utils';
import {
  CreditCard,
  Banknote,
  Split,
  Wallet,
  Check,
  Loader2,
  AlertTriangle,
  Truck,
  ArrowLeftRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AnimatedQar, AnimatedCount } from '@/components/shared/animated-number';

const QUICK_CASH_PRESETS = [50, 100, 200, 500];

type PaymentMethodType =
  | 'CASH'
  | 'CARD'
  | 'SPLIT'
  | 'STORE_CREDIT'
  | 'SNOONU'
  | 'TALABAT'
  | 'RAFEEQ';

function PaymentModalBody({
  initialMethod,
  grandTotal,
  isAggregatorChannel,
  orderChannel,
}: {
  initialMethod: PaymentMethodType;
  grandTotal: number;
  isAggregatorChannel: boolean;
  orderChannel: string;
}) {
  const {
    setPaymentModalOpen,
    lines,
    customerName,
    customerPhone,
    customerEmail,
    customerId,
    customerStoreCredit,
    setCustomerModalOpen,
    discountAmount,
    deliveryFee,
    taxRate,
    clearCart,
    setReceiptModalOpen,
    showToast,
  } = usePosStore();

  const { user, store, shift } = useSessionStore();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>(initialMethod);
  const [cashTendered, setCashTendered] = useState<string>(
    grandTotal > 0 ? grandTotal.toFixed(2) : ''
  );
  const [cardApprovalCode, setCardApprovalCode] = useState<string>(() =>
    isAggregatorChannel ? '' : `AUTH-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [splitCash, setSplitCash] = useState<string>(
    grandTotal > 0 ? (grandTotal / 2).toFixed(2) : ''
  );
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isAggregatorPayment = ['TALABAT', 'SNOONU', 'RAFEEQ'].includes(paymentMethod);

  const cashVal = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, Math.round((cashVal - grandTotal) * 100) / 100);
  const cashShortage = Math.max(0, Math.round((grandTotal - cashVal) * 100) / 100);

  const splitCashVal = parseFloat(splitCash) || 0;
  const splitCardVal = Math.max(0, Math.round((grandTotal - splitCashVal) * 100) / 100);

  const handleSplitCardChange = (val: string) => {
    const cardNum = parseFloat(val);
    if (!isNaN(cardNum)) {
      const derivedCash = Math.max(0, Math.round((grandTotal - cardNum) * 100) / 100);
      setSplitCash(derivedCash.toFixed(2));
    } else {
      setSplitCash('');
    }
  };

  const handleSwapSplit = () => {
    setSplitCash(splitCardVal.toFixed(2));
  };

  const handleCheckout = async () => {
    if (grandTotal <= 0) {
      setErrorMessage('Total amount must be greater than 0');
      return;
    }

    if (paymentMethod === 'CASH' && cashVal < grandTotal) {
      setErrorMessage(`Insufficient cash tendered. Short by ${formatQar(cashShortage)}`);
      return;
    }

    if (paymentMethod === 'STORE_CREDIT') {
      if (!customerId || customerName === 'Walk-in Customer') {
        setErrorMessage('Please attach a registered customer to redeem Store Credit.');
        return;
      }
      if (customerStoreCredit < grandTotal) {
        setErrorMessage(
          `Insufficient store credit. Available: ${formatQar(customerStoreCredit)}, Required: ${formatQar(grandTotal)}`
        );
        return;
      }
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      let finalRef = cardApprovalCode.trim();
      if (paymentMethod === 'SPLIT') {
        finalRef = `SPLIT: Cash ${splitCashVal.toFixed(2)} QAR, Card ${splitCardVal.toFixed(2)} QAR (Ref: ${cardApprovalCode})`;
      }

      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines,
          customerName,
          customerPhone,
          customerEmail,
          customerId,
          orderSource: isAggregatorPayment ? paymentMethod : orderChannel,
          paymentMethod,
          paymentReference: isAggregatorPayment
            ? cardApprovalCode.trim() || null
            : paymentMethod === 'CASH'
            ? null
            : finalRef,
          cashTendered: paymentMethod === 'CASH' ? cashVal : undefined,
          changeDue: paymentMethod === 'CASH' ? changeDue : undefined,
          splitCash: paymentMethod === 'SPLIT' ? splitCashVal : undefined,
          splitCard: paymentMethod === 'SPLIT' ? splitCardVal : undefined,
          discountAmount,
          deliveryFee,
          taxRate,
          cashierName: user?.fullName || 'Cashier',
          storeId: store?.id || 'STORE-MAIN',
          shiftId: shift?.id,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Checkout failed');
      }

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}

      showToast(
        isAggregatorPayment ? 'Platform Sale Billed' : 'Payment Completed',
        `Invoice ${formatInvoiceNumber(data.invoice.invoiceNumber)} issued (${
          isAggregatorPayment ? 'Pending Settlement' : 'Paid'
        })`,
        true
      );
      setPaymentModalOpen(false);
      setReceiptModalOpen(true, data.receipt);
      clearCart();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment processing failed.';
      console.error('Checkout error:', err);
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isDisabled =
    submitting ||
    (paymentMethod === 'CASH' && cashVal < grandTotal) ||
    (paymentMethod === 'STORE_CREDIT' &&
      (!customerId || customerName === 'Walk-in Customer' || customerStoreCredit < grandTotal));

  return (
    <ResponsiveDialog
      open={true}
      onClose={() => setPaymentModalOpen(false)}
      disableDismiss={submitting}
      title={isAggregatorPayment ? `${paymentMethod} Platform Billing` : 'Payment & Receipt'}
      subtitle={
        <span className="flex items-center gap-1">
          <span>{isAggregatorPayment ? 'Receivable Total:' : 'Total Due:'}</span>
          <AnimatedQar value={grandTotal} className="text-stone-900 font-semibold" />
        </span>
      }
      maxWidthClass="sm:max-w-lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPaymentModalOpen(false)}
            disabled={submitting}
            className="min-h-[44px] px-4 rounded-xl border border-stone-300 bg-white text-xs font-medium text-stone-700 hover:bg-stone-100 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={isDisabled}
            className="flex-1 min-h-[44px] px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin text-teal-100" />
                <span>Processing Payment...</span>
              </>
            ) : isAggregatorPayment ? (
              <>
                <Truck size={14} className="text-teal-100" />
                <span>Confirm Bill to {paymentMethod} (F12)</span>
              </>
            ) : (
              <span>Complete Sale &amp; Print (F12)</span>
            )}
          </button>
        </div>
      }
    >
      {/* Aggregator Channel Indicator Banner */}
      {isAggregatorChannel && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-1.5 font-medium">
            <Truck size={14} className="text-amber-700 shrink-0" />
            <span>Channel: {orderChannel}</span>
          </div>
          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-mono font-medium">
            PENDING SETTLEMENT
          </span>
        </div>
      )}

      {/* Payment Method Selector Tabs (2x2 on Phone, 4-col on sm+) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 bg-stone-50 p-2 border-b border-stone-200 gap-1.5 text-xs">
        {isAggregatorChannel ? (
          <>
            <button
              type="button"
              onClick={() => setPaymentMethod(orderChannel as PaymentMethodType)}
              className={`min-h-[40px] sm:min-h-[34px] flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                isAggregatorPayment
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Truck size={13} />
              <span>{orderChannel}</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={`min-h-[40px] sm:min-h-[34px] flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                paymentMethod === 'CASH'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Banknote size={13} />
              <span>Cash</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('CARD')}
              className={`min-h-[40px] sm:min-h-[34px] flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                paymentMethod === 'CARD'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <CreditCard size={13} />
              <span>Card</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('SPLIT')}
              className={`min-h-[40px] sm:min-h-[34px] flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                paymentMethod === 'SPLIT'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Split size={13} />
              <span>Split</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={`min-h-[40px] sm:min-h-[34px] flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                paymentMethod === 'CASH'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Banknote size={13} />
              <span>Cash (F6)</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('CARD')}
              className={`min-h-[40px] sm:min-h-[34px] flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                paymentMethod === 'CARD'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <CreditCard size={13} />
              <span>Card (F7)</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('SPLIT')}
              className={`min-h-[40px] sm:min-h-[34px] flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                paymentMethod === 'SPLIT'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Split size={13} />
              <span>Split (F8)</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('STORE_CREDIT')}
              className={`min-h-[40px] sm:min-h-[34px] flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                paymentMethod === 'STORE_CREDIT'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Wallet size={13} />
              <span className="truncate">Credit</span>
            </button>
          </>
        )}
      </div>

      {/* Modal Body */}
      <div className="p-4 space-y-3.5">
        {/* Payable Summary Card */}
        <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-stone-500 block font-mono uppercase tracking-wider">
              {isAggregatorPayment ? 'Receivable Amount' : 'Total Payable'}
            </span>
            <AnimatedQar
              value={grandTotal}
              className="text-xl font-bold text-stone-900 font-mono tabular-nums"
            />
          </div>
          <div className="text-right text-xs min-w-0">
            <span className="text-stone-500">Client: </span>
            <span className="font-semibold text-stone-900 truncate">{customerName}</span>
            {customerPhone && (
              <div className="text-[10px] text-stone-500 font-mono tabular-nums">{customerPhone}</div>
            )}
          </div>
        </div>

        {/* Optical Prescription & Items Summary */}
        <div className="border border-stone-200 rounded-xl p-2.5 bg-stone-50/70 max-h-28 overflow-y-auto space-y-1 text-xs">
          <span className="text-[9px] font-mono uppercase tracking-wider text-stone-500 block mb-0.5">
            Items &amp; Optical Prescription (<AnimatedCount value={lines.length} />)
          </span>
          {lines.map((l) => (
            <div
              key={l.lineId}
              className="flex items-center justify-between text-[11px] gap-2 py-1 border-b border-stone-100 last:border-0"
            >
              <div className="truncate flex-1 min-w-0">
                <span className="font-medium text-stone-900 truncate block">{l.titleEn}</span>
                <span className="text-[10px] font-mono text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded inline-block mt-0.5 truncate max-w-full">
                  {formatOpticalSpecs(l)}
                </span>
              </div>
              <div className="font-mono text-stone-700 shrink-0 text-right flex items-center gap-1 justify-end">
                <AnimatedCount value={l.quantity} suffix="×" />
                <AnimatedQar value={l.unitPrice} />
              </div>
            </div>
          ))}
        </div>

        {/* Aggregator Settlement Details */}
        {isAggregatorPayment && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-amber-900 font-medium">Platform Channel:</span>
                <span className="font-semibold text-amber-950 font-mono">{paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between border-t border-amber-200/60 pt-2">
                <span className="text-amber-900">Gross Platform Receivable:</span>
                <AnimatedQar
                  value={grandTotal}
                  className="font-mono font-semibold text-xs text-amber-950"
                />
              </div>
              <div className="flex items-center justify-between border-t border-amber-200/60 pt-2">
                <span className="text-amber-900">Counter Cash Collected:</span>
                <span className="font-mono text-stone-600">0.00 QAR (Paid via {paymentMethod})</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-700 mb-1">
                {paymentMethod} Order / Waybill ID (Optional)
              </label>
              <input
                type="text"
                value={cardApprovalCode}
                onChange={(e) => setCardApprovalCode(e.target.value)}
                placeholder={`e.g. ${paymentMethod}-10842`}
                className="w-full h-10 text-[16px] sm:text-xs font-mono font-medium text-stone-900 bg-stone-50 border border-stone-300 rounded-lg px-3 focus:bg-white focus:outline-hidden focus:border-teal-700"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-[11px] text-stone-700 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-stone-800">
                <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                <span>No commission is entered during billing</span>
              </div>
              <p className="text-stone-600 text-[10px] leading-relaxed">
                Marked <strong>PENDING_SETTLEMENT</strong> without inflating cashier cash. Reconcile
                payouts in <strong>Invoices &gt; Aggregator Settlement</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Cash Tender Details */}
        {paymentMethod === 'CASH' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Cash Tendered (QAR)
              </label>
              <input
                type="number"
                step="0.01"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                placeholder="0.00"
                className="w-full h-11 text-[16px] font-mono font-semibold text-stone-900 bg-stone-50 border border-stone-300 rounded-xl px-3 focus:bg-white focus:outline-hidden focus:border-teal-700"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setCashTendered(grandTotal.toFixed(2))}
                className="min-h-[36px] px-3 py-1 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg text-xs font-mono font-semibold text-teal-900 transition cursor-pointer flex items-center gap-1"
              >
                <span>Exact (</span>
                <AnimatedQar value={grandTotal} />
                <span>)</span>
              </button>
              {QUICK_CASH_PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCashTendered(amt.toString())}
                  className="min-h-[36px] px-3 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-mono text-stone-800 transition cursor-pointer"
                >
                  <AnimatedQar value={amt} />
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between text-xs">
              {cashVal >= grandTotal ? (
                <>
                  <span className="text-stone-600 font-medium">Change Due:</span>
                  <AnimatedQar
                    value={changeDue}
                    className="font-mono font-bold text-sm text-teal-700 tabular-nums"
                  />
                </>
              ) : (
                <>
                  <span className="text-stone-600 font-medium">Shortage:</span>
                  <AnimatedQar
                    value={cashShortage}
                    prefix="-"
                    className="font-mono font-bold text-sm text-rose-700 tabular-nums"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Card Payment Details */}
        {paymentMethod === 'CARD' && (
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                POS Terminal Authorization Code
              </label>
              <input
                type="text"
                value={cardApprovalCode}
                onChange={(e) => setCardApprovalCode(e.target.value)}
                placeholder="AUTH-XXXXXX"
                className="w-full h-11 text-[16px] sm:text-xs font-mono font-medium text-stone-900 bg-stone-50 border border-stone-300 rounded-xl px-3 focus:bg-white focus:outline-hidden focus:border-teal-700"
              />
            </div>

            <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-900 flex items-center gap-2">
              <Check size={14} className="text-teal-700 shrink-0" />
              <span>Swipe or tap client bank card on Qatar QPay / NAPS POS terminal.</span>
            </div>
          </div>
        )}

        {/* Split Tender Details (Fixed Tailwind grid-cols-[1fr_auto_1fr]) */}
        {paymentMethod === 'SPLIT' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-end">
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Cash Portion (QAR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={splitCash}
                  onChange={(e) => setSplitCash(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-11 text-[16px] sm:text-xs font-mono font-medium text-stone-900 bg-stone-50 border border-stone-300 rounded-xl px-3 focus:bg-white focus:outline-hidden focus:border-teal-700"
                />
              </div>
              <button
                type="button"
                onClick={handleSwapSplit}
                title="Swap Cash and Card portions"
                className="h-11 px-3 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 cursor-pointer transition flex items-center justify-center gap-1.5 shrink-0"
              >
                <ArrowLeftRight size={13} />
                <span>Swap</span>
              </button>
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Card Portion (QAR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={splitCardVal.toFixed(2)}
                  onChange={(e) => handleSplitCardChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-11 text-[16px] sm:text-xs font-mono font-medium text-stone-900 bg-stone-50 border border-stone-300 rounded-xl px-3 focus:bg-white focus:outline-hidden focus:border-teal-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-700 mb-1">
                Card Auth Code
              </label>
              <input
                type="text"
                value={cardApprovalCode}
                onChange={(e) => setCardApprovalCode(e.target.value)}
                placeholder="AUTH-XXXXXX"
                className="w-full h-10 text-[16px] sm:text-xs font-mono text-stone-900 bg-stone-50 border border-stone-300 rounded-xl px-3 focus:bg-white focus:outline-hidden focus:border-teal-700"
              />
            </div>
          </div>
        )}

        {/* Store Credit Payment Details */}
        {paymentMethod === 'STORE_CREDIT' && (
          <div className="space-y-3">
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-600">Client Store Credit:</span>
                <AnimatedQar
                  value={customerStoreCredit}
                  className="font-mono font-semibold text-xs text-stone-900"
                />
              </div>
              <div className="flex items-center justify-between border-t border-stone-200 pt-2 text-xs">
                <span className="text-stone-600">Total Deducted:</span>
                <AnimatedQar
                  value={grandTotal}
                  className="font-mono font-semibold text-xs text-stone-900"
                />
              </div>
              <div className="flex items-center justify-between border-t border-stone-200 pt-2 text-xs">
                <span className="text-stone-600">Remaining Credit Balance:</span>
                <AnimatedQar
                  value={Math.max(0, customerStoreCredit - grandTotal)}
                  className={`font-mono font-semibold text-xs ${
                    customerStoreCredit >= grandTotal ? 'text-teal-700' : 'text-rose-700'
                  }`}
                />
              </div>
            </div>

            {!customerId || customerName === 'Walk-in Customer' ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
                <span>Attach a registered customer to redeem credit.</span>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentModalOpen(false);
                    setCustomerModalOpen(true);
                  }}
                  className="min-h-[34px] px-3 py-1 bg-amber-800 text-white rounded-lg text-[11px] font-medium shrink-0 cursor-pointer"
                >
                  Select Customer
                </button>
              </div>
            ) : customerStoreCredit < grandTotal ? (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                Insufficient credit balance. Short by {formatQar(grandTotal - customerStoreCredit)}.
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center gap-1.5">
                <Check size={14} className="text-teal-700 shrink-0" />
                <span>Sufficient credit available and ready to redeem.</span>
              </div>
            )}
          </div>
        )}

        {/* Optional Transaction Notes */}
        <div>
          <label className="block text-[11px] text-stone-500 mb-1">Order Notes (Optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Prescription details, customer request..."
            className="w-full h-10 text-[16px] sm:text-xs text-stone-900 bg-stone-50 border border-stone-200 rounded-xl px-3 focus:bg-white focus:outline-hidden focus:border-teal-700"
          />
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle size={14} className="text-rose-600 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}

export function PaymentModal() {
  const { isPaymentModalOpen, orderChannel, preferredPaymentMethod, getGrandTotal } = usePosStore();

  if (!isPaymentModalOpen) return null;

  const grandTotal = getGrandTotal();
  const isAggregatorChannel = ['TALABAT', 'SNOONU', 'RAFEEQ'].includes(orderChannel);
  const initialMethod: PaymentMethodType = isAggregatorChannel
    ? (orderChannel as PaymentMethodType)
    : ((preferredPaymentMethod as PaymentMethodType) || 'CASH');

  return (
    <PaymentModalBody
      key={`${orderChannel}-${initialMethod}-${grandTotal}`}
      initialMethod={initialMethod}
      grandTotal={grandTotal}
      isAggregatorChannel={isAggregatorChannel}
      orderChannel={orderChannel}
    />
  );
}
