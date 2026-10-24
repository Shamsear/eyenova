'use client';

import React from 'react';
import { usePosStore } from '@/stores/pos-store';
import { downloadReceiptPdf, downloadA4InvoicePdf } from '@/lib/receipt-pdf';
import { Printer, Download, FileText, X } from 'lucide-react';
import { motion } from 'motion/react';
import { ThermalReceiptBill } from '@/components/shared/thermal-receipt-bill';
import { formatInvoiceNumber } from '@/lib/utils';

export function ReceiptModal() {
  const { isReceiptModalOpen, completedReceipt, setReceiptModalOpen } = usePosStore();

  if (!isReceiptModalOpen || !completedReceipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadThermalPdf = () => {
    downloadReceiptPdf(completedReceipt);
  };

  const handleDownloadA4Pdf = () => {
    downloadA4InvoicePdf(completedReceipt);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="bg-white rounded-t-xl sm:rounded-xl border border-stone-200 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] my-auto shadow-xl"
      >
        {/* Header */}
        <div className="p-3 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
            <h2 className="font-medium text-xs text-stone-900 truncate">
              Receipt / فاتورة {formatInvoiceNumber(completedReceipt.invoiceNumber)}
            </h2>
          </div>
          <button
            onClick={() => setReceiptModalOpen(false)}
            className="text-stone-400 hover:text-stone-700 p-1 rounded transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* 80mm Thermal Receipt Preview Canvas */}
        <div className="flex-1 min-h-0 p-4 overflow-y-auto bg-stone-100 flex justify-center">
          <ThermalReceiptBill data={completedReceipt} />
        </div>

        {/* Modal Actions */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDownloadThermalPdf}
              className="px-2.5 py-1.5 border border-stone-200 bg-white hover:bg-stone-100 rounded-md text-[11px] font-medium text-stone-700 flex items-center gap-1 transition cursor-pointer shadow-2xs"
            >
              <Download size={11} /> 80mm PDF
            </button>
            <button
              onClick={handleDownloadA4Pdf}
              className="px-2.5 py-1.5 border border-stone-200 bg-white hover:bg-stone-100 rounded-md text-[11px] font-medium text-stone-700 flex items-center gap-1 transition cursor-pointer shadow-2xs"
            >
              <FileText size={11} /> A4 PDF
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-stone-900 text-stone-50 rounded-md text-xs font-medium hover:bg-stone-800 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer size={13} /> Print / طباعة (Ctrl+P)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
