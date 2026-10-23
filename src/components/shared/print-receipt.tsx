'use client';

import React from 'react';
import { usePosStore } from '@/stores/pos-store';
import { ReceiptPayload } from '@/lib/types';
import { ThermalReceiptBill } from './thermal-receipt-bill';
import { A4InvoiceBill } from './a4-invoice-bill';

interface PrintReceiptAreaProps {
  receipt?: ReceiptPayload | null;
  format?: '80MM' | 'A4';
}

export function PrintReceiptArea({ receipt, format = '80MM' }: PrintReceiptAreaProps) {
  const { completedReceipt } = usePosStore();
  const receiptToPrint = receipt || completedReceipt;

  if (!receiptToPrint) return null;

  if (format === 'A4') {
    return (
      <div id="a4-print-area" className="hidden print:block text-black">
        <style jsx global>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              margin: 0;
              padding: 0;
              background: white !important;
            }
            body > *:not(#a4-print-portal) {
              display: none !important;
            }
            #a4-print-portal {
              display: block !important;
              width: 100% !important;
              margin: 0 auto !important;
              padding: 0 !important;
            }
          }
        `}</style>

        <div id="a4-print-portal">
          <A4InvoiceBill data={receiptToPrint} className="w-full border-0 p-0 shadow-none max-w-none" />
        </div>
      </div>
    );
  }

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

