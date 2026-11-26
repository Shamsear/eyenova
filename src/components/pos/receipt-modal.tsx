'use client';

import React from 'react';
import { usePosStore } from '@/stores/pos-store';
import { downloadReceiptPdf, downloadA4InvoicePdf } from '@/lib/receipt-pdf';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Printer, Download, FileText } from 'lucide-react';
import { ThermalReceiptBill } from '@/components/shared/thermal-receipt-bill';
import { formatInvoiceNumber } from '@/lib/utils';

export function ReceiptModal() {
  const { isReceiptModalOpen, completedReceipt, setReceiptModalOpen } = usePosStore();

  if (!isReceiptModalOpen || !completedReceipt) return null;

  return (
    <ResponsiveDialog
      open={isReceiptModalOpen}
      onClose={() => setReceiptModalOpen(false)}
      title={`Receipt / فاتورة ${formatInvoiceNumber(completedReceipt.invoiceNumber)}`}
      icon={<span className="w-2.5 h-2.5 rounded-full bg-teal-600 block" />}
      maxWidthClass="sm:max-w-md"
      bodyClassName="p-4 bg-stone-100"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => downloadReceiptPdf(completedReceipt)}
              className="min-h-[40px] px-3 border border-stone-200 bg-white hover:bg-stone-100 rounded-xl text-xs font-medium text-stone-700 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Download size={13} /> 80mm PDF
            </button>
            <button
              type="button"
              onClick={() => downloadA4InvoicePdf(completedReceipt)}
              className="min-h-[40px] px-3 border border-stone-200 bg-white hover:bg-stone-100 rounded-xl text-xs font-medium text-stone-700 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <FileText size={13} /> A4 PDF
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 sm:flex-initial min-h-[42px] px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer size={14} /> Print / طباعة (Ctrl+P)
          </button>
        </div>
      }
    >
      <div className="flex justify-center items-start min-h-full">
        <ThermalReceiptBill data={completedReceipt} />
      </div>
    </ResponsiveDialog>
  );
}
