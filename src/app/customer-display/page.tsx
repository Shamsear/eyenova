'use client';

import React, { useState, useEffect } from 'react';
import { usePosStore } from '@/stores/pos-store';
import { formatQar } from '@/lib/utils';
import { Eye, ShoppingBag } from 'lucide-react';

export default function CustomerDisplayPage() {
  const { lines, customerName, getSubtotal, getDiscountTotal, getGrandTotal } =
    usePosStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const subtotal = getSubtotal();
  const discount = getDiscountTotal();
  const grandTotal = getGrandTotal();
  const totalItemsCount = lines.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-stone-950 text-stone-100 flex flex-col justify-between p-4 sm:p-6 select-none font-sans">
      {/* Top Header - strictly single line */}
      <header className="flex items-center justify-between border-b border-stone-800 pb-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded bg-white p-1 flex items-center justify-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="EyeNova" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-stone-100 truncate">
              EyeNova Optical
            </h1>
            <p className="text-[11px] font-mono text-stone-400 truncate">
              Doha, Qatar • Premium Eyewear & Contact Lenses
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] font-mono text-stone-400 block uppercase tracking-wider">Customer</span>
          <span className="text-xs sm:text-sm font-medium text-stone-200 block truncate max-w-[200px]">
            {customerName || 'Valued Customer'}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 my-4 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden min-h-0">
        {/* Scanned Items List */}
        <div className="md:col-span-2 bg-stone-900/60 border border-stone-800 rounded-lg p-3.5 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-2 text-xs font-mono text-stone-400 uppercase tracking-wider shrink-0">
            <div className="flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-stone-400" />
              <span>Order Summary</span>
            </div>
            <span>{totalItemsCount} items</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {lines.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-stone-500 gap-2">
                <Eye size={36} className="text-stone-700 animate-pulse" />
                <p className="text-sm font-medium text-stone-400">Ready for your optical order</p>
                <p className="text-xs font-mono text-stone-600">Selected lenses and frames will appear here.</p>
              </div>
            ) : (
              lines.map((line) => (
                <div
                  key={line.lineId}
                  className="bg-stone-900 border border-stone-800 p-2.5 rounded flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-xs sm:text-sm text-stone-100 truncate">{line.titleEn}</h3>
                    {line.lensSummary && line.lensSummary !== 'Standard' && (
                      <p className="text-[11px] font-mono text-stone-400 truncate mt-0.5">{line.lensSummary}</p>
                    )}
                    <span className="text-[11px] text-stone-500 font-mono tabular-nums truncate block">
                      {formatQar(line.unitPrice)} each
                    </span>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <span className="text-xs text-stone-400 block tabular-nums">Qty: {line.quantity}</span>
                    <span className="text-sm sm:text-base font-semibold text-stone-100 block tabular-nums">
                      {formatQar(line.unitPrice * line.quantity)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Running Totals & Payment Status */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-xs font-mono text-stone-400 uppercase tracking-wider border-b border-stone-800 pb-2">
              Payment Summary
            </h2>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-stone-300">
                <span>Subtotal:</span>
                <span className="font-semibold tabular-nums">{formatQar(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount:</span>
                  <span className="font-semibold tabular-nums">-{formatQar(discount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Grand Total Box */}
          <div className="bg-stone-900 border border-stone-700 text-stone-50 rounded-lg p-4 text-center my-3">
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-stone-400 block mb-1">
              Total Amount Payable
            </span>
            <span className="text-2xl sm:text-3xl font-mono font-bold tracking-tight tabular-nums block">
              {formatQar(grandTotal)}
            </span>
          </div>

          <div className="text-center text-xs font-mono text-stone-500 space-y-0.5">
            <p>Cards & Contactless Payments Accepted</p>
            <p className="text-[10px] text-stone-600">NAPS • Visa • Mastercard • Apple Pay</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs font-mono text-stone-500 border-t border-stone-800 pt-2 shrink-0">
        Thank you for choosing EyeNova Optical
      </footer>
    </div>
  );
}
