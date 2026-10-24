'use client';

import React, { useState, useEffect } from 'react';
import { usePosStore } from '@/stores/pos-store';
import { useSessionStore } from '@/stores/session-store';
import { formatQar, formatOpticalSpecs, formatInvoiceNumber } from '@/lib/utils';
import {
  X,
  CreditCard,
  Banknote,
  Split,
  Wallet,
  Check,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedQar, AnimatedCount } from '@/components/shared/animated-number';

const QUICK_CASH_PRESETS = [50, 100, 200, 500];

export function PaymentModal() {
  const {
    isPaymentModalOpen,
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
    getGrandTotal,
    clearCart,
    setReceiptModalOpen,
    showToast,
  } = usePosStore();

  const { user, store, shift } = useSessionStore();
  const grandTotal = getGrandTotal();

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'SPLIT' | 'STORE_CREDIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [cardApprovalCode, setCardApprovalCode] = useState<string>('');
  const [splitCash, setSplitCash] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isPaymentModalOpen) {
      setCashTendered(grandTotal > 0 ? grandTotal.toFixed(2) : '');
      setCardApprovalCode(`AUTH-${Math.floor(100000 + Math.random() * 900000)}`);
      setSplitCash(grandTotal > 0 ? (grandTotal / 2).toFixed(2) : '');
      setErrorMessage('');
    }
  }, [isPaymentModalOpen, grandTotal]);

  if (!isPaymentModalOpen) return null;

  const cashVal = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, Math.round((cashVal - grandTotal) * 100) / 100);
  const cashShortage = Math.max(0, Math.round((grandTotal - cashVal) * 100) / 100);

  const splitCashVal = parseFloat(splitCash) || 0;
  const splitCardVal = Math.max(0, Math.round((grandTotal - splitCashVal) * 100) / 100);

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
        setErrorMessage(`Insufficient store credit. Available: ${formatQar(customerStoreCredit)}, Required: ${formatQar(grandTotal)}`);
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
          paymentMethod,
          paymentReference: paymentMethod === 'CASH' ? null : finalRef,
          cashTendered: paymentMethod === 'CASH' ? cashVal : undefined,
          changeDue: paymentMethod === 'CASH' ? changeDue : undefined,
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

      showToast('Payment Completed', `Invoice ${formatInvoiceNumber(data.invoice.invoiceNumber)} issued`, true);
      setPaymentModalOpen(false);
      setReceiptModalOpen(true, data.receipt);
      clearCart();
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMessage(err.message || 'Payment processing failed. Please check network/stock.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white rounded-t-xl sm:rounded-xl border border-stone-200 w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col shadow-xl"
      >
        {/* Modal Header (Swiss Light Style) */}
        <div className="p-3 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h2 className="font-medium text-sm text-stone-900 truncate">Payment & Receipt</h2>
            <div className="text-[11px] text-stone-500 font-mono truncate flex items-center gap-1">
              <span>Total Due:</span>
              <AnimatedQar value={grandTotal} />
            </div>
          </div>
          <button
            onClick={() => setPaymentModalOpen(false)}
            disabled={submitting}
            className="text-stone-400 hover:text-stone-700 p-1 rounded transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Payment Method Selector Tabs */}
        <div className="grid grid-cols-4 bg-stone-50 p-1 border-b border-stone-200 gap-1 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setPaymentMethod('CASH')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
              paymentMethod === 'CASH'
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/60'
            }`}
          >
            <Banknote size={13} />
            <span>Cash (F6)</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('CARD')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
              paymentMethod === 'CARD'
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/60'
            }`}
          >
            <CreditCard size={13} />
            <span>Card (F7)</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('SPLIT')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
              paymentMethod === 'SPLIT'
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/60'
            }`}
          >
            <Split size={13} />
            <span>Split (F8)</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('STORE_CREDIT')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
              paymentMethod === 'STORE_CREDIT'
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/60'
            }`}
          >
            <Wallet size={13} />
            <span className="truncate">Credit</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3.5">
          {/* Payable Amount Summary Banner */}
          <div className="bg-stone-50 border border-stone-200 p-3 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-stone-500 block font-mono uppercase tracking-wider">
                Total Payable
              </span>
              <AnimatedQar
                value={grandTotal}
                className="text-xl font-medium text-stone-900 font-mono tabular-nums"
              />
            </div>
            <div className="text-right text-xs">
              <span className="text-stone-500">Client: </span>
              <span className="font-medium text-stone-900 truncate">{customerName}</span>
              {customerPhone && (
                <div className="text-[10px] text-stone-500 font-mono tabular-nums">{customerPhone}</div>
              )}
            </div>
          </div>

          {/* Optical Prescription & Items Summary */}
          <div className="border border-stone-200 rounded-md p-2 bg-stone-50/80 max-h-28 overflow-y-auto space-y-1 text-xs">
            <span className="text-[9px] font-mono uppercase tracking-wider text-stone-500 block mb-0.5">
              Items & Optical Prescription (<AnimatedCount value={lines.length} />)
            </span>
            {lines.map((l) => (
              <div key={l.lineId} className="flex items-center justify-between text-[11px] gap-2 py-0.5 border-b border-stone-100 last:border-0">
                <div className="truncate flex-1 min-w-0">
                  <span className="font-medium text-stone-900 truncate block">{l.titleEn}</span>
                  <span className="text-[9px] font-mono text-stone-600 bg-stone-200/70 px-1 py-0.2 rounded inline-block mt-0.5 truncate max-w-full">
                    {formatOpticalSpecs(l)}
                  </span>
                </div>
                <div className="font-mono text-stone-700 shrink-0 text-right flex items-center gap-1 justify-end">
                  <AnimatedCount value={l.quantity} suffix="x" />
                  <AnimatedQar value={l.unitPrice} />
                </div>
              </div>
            ))}
          </div>

          {/* Cash Tender Details */}
          {paymentMethod === 'CASH' && (
            <div className="space-y-2.5">
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
                  className="w-full text-base font-mono font-medium text-stone-900 bg-stone-50 border border-stone-300 rounded-md p-2 focus:bg-white focus:outline-hidden focus:border-stone-500"
                />
              </div>

              {/* Quick Cash Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCashTendered(grandTotal.toFixed(2))}
                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded text-[11px] font-mono text-stone-800 transition cursor-pointer flex items-center gap-1"
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
                    className="px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded text-[11px] font-mono text-stone-800 transition cursor-pointer"
                  >
                    <AnimatedQar value={amt} />
                  </button>
                ))}
              </div>

              {/* Real-time Change or Shortage Display */}
              <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50 flex items-center justify-between text-xs">
                {cashVal >= grandTotal ? (
                  <>
                    <span className="text-stone-600">Change Due:</span>
                    <AnimatedQar
                      value={changeDue}
                      className="font-mono font-medium text-sm text-emerald-700 tabular-nums"
                    />
                  </>
                ) : (
                  <>
                    <span className="text-stone-600">Shortage:</span>
                    <AnimatedQar
                      value={cashShortage}
                      prefix="-"
                      className="font-mono font-medium text-sm text-rose-700 tabular-nums"
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Card / Electronic Payment Details */}
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
                  className="w-full text-xs font-mono font-medium text-stone-900 bg-stone-50 border border-stone-300 rounded-md p-2 focus:bg-white focus:outline-hidden focus:border-stone-500"
                />
              </div>

              <div className="p-2 rounded bg-stone-50 border border-stone-200 text-[11px] text-stone-600 flex items-center gap-2">
                <Check size={14} className="text-emerald-600 shrink-0" />
                <span>Swipe or tap client bank card on Qatar QPay POS terminal.</span>
              </div>
            </div>
          )}

          {/* Split Tender Details */}
          {paymentMethod === 'SPLIT' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
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
                    className="w-full text-xs font-mono font-medium text-stone-900 bg-stone-50 border border-stone-300 rounded-md p-2 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Card Portion (QAR)
                  </label>
                  <div className="w-full text-xs font-mono font-medium text-stone-900 bg-stone-100 border border-stone-200 rounded-md p-2 tabular-nums">
                    <AnimatedQar value={splitCardVal} />
                  </div>
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
                  className="w-full text-xs font-mono text-stone-900 bg-stone-50 border border-stone-300 rounded-md p-1.5 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* Store Credit Payment Details */}
          {paymentMethod === 'STORE_CREDIT' && (
            <div className="space-y-3">
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-600">Client Store Credit:</span>
                  <AnimatedQar value={customerStoreCredit} className="font-mono font-medium text-xs text-stone-900" />
                </div>
                <div className="flex items-center justify-between border-t border-stone-200 pt-2 text-xs">
                  <span className="text-stone-600">Total Deducted:</span>
                  <AnimatedQar value={grandTotal} className="font-mono font-medium text-xs text-stone-900" />
                </div>
                <div className="flex items-center justify-between border-t border-stone-200 pt-2 text-xs">
                  <span className="text-stone-600">Remaining Credit Balance:</span>
                  <AnimatedQar
                    value={Math.max(0, customerStoreCredit - grandTotal)}
                    className={`font-mono font-medium text-xs ${customerStoreCredit >= grandTotal ? 'text-emerald-700' : 'text-rose-700'}`}
                  />
                </div>
              </div>

              {!customerId || customerName === 'Walk-in Customer' ? (
                <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2">
                  <span>No customer selected. Please attach a registered customer to redeem credit.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentModalOpen(false);
                      setCustomerModalOpen(true);
                    }}
                    className="px-2 py-1 bg-amber-800 text-white rounded text-[11px] font-medium shrink-0 cursor-pointer"
                  >
                    Select Customer
                  </button>
                </div>
              ) : customerStoreCredit < grandTotal ? (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  Insufficient credit balance. Short by {formatQar(grandTotal - customerStoreCredit)}. Please choose Cash, Card, or Split.
                </div>
              ) : (
                <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>Sufficient credit available. Amount will be deducted from customer account upon confirmation.</span>
                </div>
              )}
            </div>
          )}

          {/* Optional Transaction Notes */}
          <div>
            <label className="block text-[11px] text-stone-500 mb-1">
              Order Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Prescription details, customer request..."
              className="w-full text-xs text-stone-900 bg-stone-50 border border-stone-200 rounded-md p-1.5 focus:bg-white"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-2 bg-stone-50 border border-stone-300 rounded-md text-xs text-stone-900 flex items-center gap-1.5">
              <AlertTriangle size={13} className="text-stone-700 shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer (Single-Line Button) */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setPaymentModalOpen(false)}
            disabled={submitting}
            className="px-3 py-1.5 border border-stone-300 rounded-md text-xs font-medium text-stone-700 hover:bg-stone-100 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={
              submitting ||
              (paymentMethod === 'CASH' && cashVal < grandTotal) ||
              (paymentMethod === 'STORE_CREDIT' && (!customerId || customerName === 'Walk-in Customer' || customerStoreCredit < grandTotal))
            }
            className="flex-1 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-md text-xs font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-xs"
          >
            {submitting ? (
              <>
                <Loader2 size={13} className="animate-spin text-stone-400" />
                <span>Processing Payment...</span>
              </>
            ) : (
              <span>Complete Sale & Print (F12)</span>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
