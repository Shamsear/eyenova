'use client';

import React, { useState } from 'react';
import { Shell } from '@/components/layout/shell';
import { CatalogGrid } from '@/components/pos/catalog-grid';
import { CartTable } from '@/components/pos/cart-table';
import { PaymentModal } from '@/components/pos/payment-modal';
import { ReceiptModal } from '@/components/pos/receipt-modal';
import { CustomerModal } from '@/components/pos/customer-modal';
import { HoldSalesModal } from '@/components/pos/hold-sales-modal';
import { PrintReceiptArea } from '@/components/shared/print-receipt';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { usePosStore } from '@/stores/pos-store';
import { useSessionStore } from '@/stores/session-store';
import { formatQar } from '@/lib/utils';
import { Package, ShoppingCart, ArrowRight } from 'lucide-react';

export default function PosPage() {
  const [mobileTab, setMobileTab] = useState<'CATALOG' | 'CART'>('CATALOG');

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

  const { toggleFullscreen } = useSessionStore();

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

  // Global Keyboard Shortcuts (F1 - F12)
  useHotkeys({
    onF1: () => {
      const searchInput = document.querySelector('input[placeholder*="Search by Barcode"]') as HTMLInputElement;
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
      if (lines.length > 0) setPaymentModalOpen(true);
    },
    onF7: () => {
      if (lines.length > 0) setPaymentModalOpen(true);
    },
    onF8: () => {
      if (lines.length > 0) setPaymentModalOpen(true);
    },
    onF11: () => toggleFullscreen(),
    onF12: () => {
      if (lines.length > 0) setPaymentModalOpen(true);
    },
    onEscape: () => {
      // Modals close on Esc
    },
    onPlus: () => {
      if (selectedLineId) incrementLineQuantity(selectedLineId, 1);
    },
    onMinus: () => {
      if (selectedLineId) incrementLineQuantity(selectedLineId, -1);
    },
  });

  return (
    <Shell
      title="POS Counter Register"
      subtitle="Fast Optical Checkout"
    >
      {/* Mobile/Tablet Segmented Switcher (< lg) */}
      <div className="lg:hidden flex bg-white border-b border-stone-200 p-1.5 shrink-0 gap-1.5">
        <button
          onClick={() => setMobileTab('CATALOG')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition min-h-[38px] ${
            mobileTab === 'CATALOG'
              ? 'bg-stone-900 text-white'
              : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/60'
          }`}
        >
          <Package size={14} />
          <span>Catalog</span>
        </button>
        <button
          onClick={() => setMobileTab('CART')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition min-h-[38px] ${
            mobileTab === 'CART'
              ? 'bg-stone-900 text-white'
              : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/60'
          }`}
        >
          <ShoppingCart size={14} />
          <span className="tabular-nums font-mono">Cart ({itemCount}) · {formatQar(grandTotal)}</span>
        </button>
      </div>

      {/* Main Viewport-Locked Workspace */}
      <div className="flex-1 min-h-0 w-full h-full flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left: Product Catalog */}
        <div
          className={`flex-1 min-h-0 h-full overflow-hidden ${
            mobileTab === 'CATALOG' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
          }`}
        >
          <CatalogGrid />
        </div>

        {/* Mobile Floating Bottom Cart Bar */}
        {mobileTab === 'CATALOG' && itemCount > 0 && (
          <div className="lg:hidden absolute bottom-3 left-3 right-3 z-30 animate-in slide-in-from-bottom-2 duration-150">
            <button
              onClick={() => setMobileTab('CART')}
              className="w-full bg-stone-900 text-stone-50 rounded-lg p-2.5 flex items-center justify-between shadow-lg border border-stone-800 min-h-[44px] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-stone-700 text-white text-[10px] font-mono font-medium flex items-center justify-center tabular-nums">
                  {itemCount}
                </span>
                <span className="font-mono text-xs font-medium tabular-nums">{formatQar(grandTotal)}</span>
              </div>
              <span className="font-medium text-xs text-stone-300 flex items-center gap-1">
                <span>View Cart & Pay</span> <ArrowRight size={13} />
              </span>
            </button>
          </div>
        )}

        {/* Right: Cart & Billing Ticket */}
        <div
          className={`h-full min-h-0 ${
            mobileTab === 'CART'
              ? 'flex flex-col w-full'
              : 'hidden lg:flex lg:flex-col lg:w-[390px] xl:w-[420px]'
          } shrink-0`}
        >
          <CartTable />
        </div>
      </div>

      {/* Optical Modals */}
      <PaymentModal />
      <ReceiptModal />
      <CustomerModal />
      <HoldSalesModal />

      {/* Hidden 80mm Print Area */}
      <PrintReceiptArea />
    </Shell>
  );
}
