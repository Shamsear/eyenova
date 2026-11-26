'use client';

import React, { useState } from 'react';
import { Shell } from '@/components/layout/shell';
import { CatalogGrid } from '@/components/pos/catalog-grid';
import { CartTable } from '@/components/pos/cart-table';
import { PaymentModal } from '@/components/pos/payment-modal';
import { ReceiptModal } from '@/components/pos/receipt-modal';
import { CustomerModal } from '@/components/pos/customer-modal';
import { HoldSalesModal } from '@/components/pos/hold-sales-modal';
import { LensConfigModal } from '@/components/pos/lens-config-modal';
import { PrintReceiptArea } from '@/components/shared/print-receipt';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { usePosStore } from '@/stores/pos-store';
import { formatQar } from '@/lib/utils';
import { ShoppingCart, ChevronUp, CreditCard } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export default function PosPage() {
  const [compactCartOpen, setCompactCartOpen] = useState(false);

  const {
    lines,
    selectedLineId,
    incrementLineQuantity,
    addLine,
    setPaymentModalOpen,
    setCustomerModalOpen,
    setHeldSalesModalOpen,
    holdCurrentSale,
    getGrandTotal,
    getItemCount,
    showToast,
  } = usePosStore();

  const grandTotal = getGrandTotal();
  const itemCount = getItemCount();
  const lastLine = lines.length > 0 ? lines[lines.length - 1] : null;

  // Global Barcode Scanner Integration
  useBarcodeScanner({
    onScan: async (scannedCode) => {
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(scannedCode)}&limit=1`);
        const data = await res.json();
        if (data.products && data.products.length > 0) {
          const product = data.products[0];
          addLine(product);
          showToast('Barcode Scanned', `${product.titleEn} added to cart`, true);
        } else {
          showToast('Barcode Not Found', `No optical product matches code: ${scannedCode}`, false);
        }
      } catch (err) {
        console.error('Barcode lookup error:', err);
      }
    },
  });

  // POS Register Keyboard Shortcuts (F1 - F12, +, -)
  useHotkeys({
    onF1: () => {
      const searchInput = document.getElementById('pos-catalog-search') as HTMLInputElement | null;
      searchInput?.focus();
      searchInput?.select();
    },
    onF2: () => setCustomerModalOpen(true),
    onF3: () => {
      if (lines.length > 0) {
        holdCurrentSale();
        showToast('Cart Parked', 'Current sale moved to held queue', true);
      }
    },
    onF4: () => setHeldSalesModalOpen(true),
    onF6: () => {
      if (lines.length > 0) setPaymentModalOpen(true, 'CASH');
    },
    onF7: () => {
      if (lines.length > 0) setPaymentModalOpen(true, 'CARD');
    },
    onF8: () => {
      if (lines.length > 0) setPaymentModalOpen(true, 'SPLIT');
    },
    onF12: () => {
      if (lines.length > 0) setPaymentModalOpen(true);
    },
    onPlus: () => {
      if (selectedLineId) incrementLineQuantity(selectedLineId, 1);
    },
    onMinus: () => {
      if (selectedLineId) incrementLineQuantity(selectedLineId, -1);
    },
  });

  return (
    <Shell title="POS Counter Register" subtitle="Fast Optical Checkout">
      <div className="flex-1 min-h-0 w-full h-full flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left / Main: Product Catalog */}
        <div className="flex-1 min-w-0 min-h-0 h-full flex flex-col overflow-hidden">
          <CatalogGrid />
        </div>

        {/* Phone & Tablet Portrait (< lg): Persistent Docked Bottom Cart Bar */}
        <div className="lg:hidden absolute bottom-3 inset-x-3 z-20 pointer-events-none">
          <div className="pointer-events-auto bg-stone-900 text-stone-50 rounded-2xl p-2 shadow-xl border border-stone-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setCompactCartOpen(true)}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left px-1.5 py-1 rounded-xl hover:bg-stone-800/80 transition cursor-pointer"
            >
              <span className="w-9 h-9 rounded-xl bg-teal-600 text-white text-xs font-mono font-bold flex items-center justify-center tabular-nums shrink-0">
                {itemCount}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs sm:text-sm font-semibold tabular-nums text-white">
                    {formatQar(grandTotal)}
                  </span>
                  <ChevronUp size={13} className="text-stone-400 shrink-0" />
                </div>
                <div className="text-[11px] text-stone-400 truncate">
                  {lastLine
                    ? `${lastLine.titleEn}${lines.length > 1 ? ` +${lines.length - 1} more` : ''}`
                    : 'Tap to open cart · Scan or tap product'}
                </div>
              </div>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setCompactCartOpen(true)}
                className="h-10 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              >
                <ShoppingCart size={14} />
                <span className="hidden sm:inline">Cart</span>
              </button>

              <button
                type="button"
                disabled={lines.length === 0}
                onClick={() => setPaymentModalOpen(true)}
                className="h-10 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <CreditCard size={14} />
                <span>Pay</span>
              </button>
            </div>
          </div>
        </div>

        {/* Phone & Tablet Portrait (< lg): Slide-Up Cart Sheet */}
        <AnimatePresence>
          {compactCartOpen && (
            <div
              className="lg:hidden fixed inset-0 z-40 bg-stone-900/45 backdrop-blur-xs flex items-end"
              onClick={() => setCompactCartOpen(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                className="w-full h-[86dvh] sm:h-[68dvh] bg-white rounded-t-2xl border-t border-stone-200 shadow-2xl overflow-hidden flex flex-col pb-[env(safe-area-inset-bottom)]"
              >
                <div className="flex justify-center pt-2 pb-1 bg-stone-50 shrink-0">
                  <span className="w-9 h-1 rounded-full bg-stone-300" aria-hidden="true" />
                </div>
                <CartTable onCloseSheet={() => setCompactCartOpen(false)} />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Laptop & Desktop (lg+): Dedicated Side Ticket */}
        <div className="hidden lg:flex lg:flex-col lg:w-[360px] xl:w-[410px] 2xl:w-[440px] h-full min-h-0 shrink-0">
          <CartTable />
        </div>
      </div>

      {/* Optical Modals */}
      <PaymentModal />
      <ReceiptModal />
      <CustomerModal />
      <HoldSalesModal />
      <LensConfigModal />

      {/* Hidden 80mm Print Area */}
      <PrintReceiptArea />
    </Shell>
  );
}
