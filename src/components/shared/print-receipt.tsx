'use client';

import React from 'react';
import { usePosStore } from '@/stores/pos-store';
import { ReceiptPayload } from '@/lib/types';
import { ThermalReceiptBill } from './thermal-receipt-bill';

interface PrintReceiptAreaProps {
  receipt?: ReceiptPayload | null;
}

export function PrintReceiptArea({ receipt }: PrintReceiptAreaProps) {
  const { completedReceipt } = usePosStore();
  const receiptToPrint = receipt || completedReceipt;

  if (!receiptToPrint) return null;

  return (
    <div id="thermal-print-area" className="hidden print:block text-black font-mono text-[10.5px] leading-tight">
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: white !important;
          }
          body > *:not(#thermal-print-portal) {
            display: none !important;
          }
          #thermal-print-portal {
            display: block !important;
            width: 76mm !important;
            margin: 0 auto !important;
            padding: 3mm 2mm 15mm 2mm !important;
          }
          #thermal-print-portal * {
            color: black !important;
          }
        }
      `}</style>

      <div id="thermal-print-portal">
        <ThermalReceiptBill data={receiptToPrint} className="w-full border-0 p-0 shadow-none" isPrintPortal />
      </div>
    </div>
  );
}
