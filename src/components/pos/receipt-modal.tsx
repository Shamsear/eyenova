'use client';

import React from 'react';
import { usePosStore } from '@/stores/pos-store';
import { formatQar } from '@/lib/utils';
import { downloadReceiptPdf, downloadA4InvoicePdf } from '@/lib/receipt-pdf';
import { Printer, Download, FileText, CheckCircle2, X } from 'lucide-react';

import { motion } from 'motion/react';

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
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="bg-white rounded-t-xl sm:rounded-xl border border-stone-200 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] shadow-xl"
      >
        {/* Header (Swiss Light Style) */}
        <div className="p-3 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
            <h2 className="font-medium text-xs text-stone-900 truncate">
              Receipt #{completedReceipt.invoiceNumber}
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
        <div className="p-4 overflow-y-auto bg-stone-100 flex justify-center">
          <div className="bg-white p-4 rounded border border-stone-300 w-[280px] text-[11px] font-mono text-stone-800 leading-tight space-y-2 select-text shadow-xs">
            {/* Store Header */}
            <div className="text-center space-y-0.5">
              <h3 className="font-bold text-xs uppercase text-stone-900">{completedReceipt.storeNameEn}</h3>
              {completedReceipt.storeNameAr && <p className="text-[11px] text-stone-600">{completedReceipt.storeNameAr}</p>}
              <p className="text-[10px] text-stone-500">{completedReceipt.addressEn}</p>
              <p className="text-[10px] text-stone-500">Tel: {completedReceipt.phone}</p>
              <p className="text-[9px] text-stone-400">
                CR: {completedReceipt.crNumber} | VAT: {completedReceipt.vatNumber}
              </p>
            </div>

            <div className="border-b border-dashed border-stone-300 my-1.5" />

            <div className="text-center font-medium text-[10px] uppercase tracking-wider text-stone-600">
              Tax Invoice / Simplified Receipt
            </div>

            <div className="border-b border-dashed border-stone-300 my-1.5" />

            {/* Metadata */}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Invoice: {completedReceipt.invoiceNumber}</span>
                <span>{completedReceipt.date}</span>
              </div>
              <div className="flex justify-between">
                <span>Order: {completedReceipt.orderNumber}</span>
                <span>{completedReceipt.time}</span>
              </div>
              <div>Cashier: {completedReceipt.cashierName}</div>
              <div>Customer: {completedReceipt.customerName}</div>
              {completedReceipt.customerPhone && <div>Phone: {completedReceipt.customerPhone}</div>}
            </div>

            <div className="border-b border-dashed border-stone-300 my-1.5" />

            {/* Items Header */}
            <div className="flex justify-between font-medium text-[9px] text-stone-500 uppercase">
              <span>Item</span>
              <span>Total (QAR)</span>
            </div>
            <div className="border-b border-stone-200 my-1" />

            {/* Line Items */}
            <div className="space-y-1 text-[10px]">
              {completedReceipt.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-medium">
                    <span className="truncate max-w-[170px]">{item.name}</span>
                    <span className="tabular-nums">{item.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-stone-500">
                    <span>{item.specs || ''}</span>
                    <span className="tabular-nums">
                      {item.quantity} x {item.unitPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-b border-dashed border-stone-300 my-1.5" />

            {/* Totals */}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="tabular-nums">{completedReceipt.subtotal.toFixed(2)} QAR</span>
              </div>

              {completedReceipt.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span className="tabular-nums">-{completedReceipt.discount.toFixed(2)} QAR</span>
                </div>
              )}

              {completedReceipt.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span className="tabular-nums">+{completedReceipt.deliveryFee.toFixed(2)} QAR</span>
                </div>
              )}

              {completedReceipt.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>VAT / Tax:</span>
                  <span className="tabular-nums">+{completedReceipt.taxAmount.toFixed(2)} QAR</span>
                </div>
              )}

              <div className="border-b border-stone-300 my-1" />

              <div className="flex justify-between font-bold text-xs pt-0.5">
                <span>GRAND TOTAL:</span>
                <span className="tabular-nums">{completedReceipt.total.toFixed(2)} QAR</span>
              </div>
            </div>

            <div className="border-b border-dashed border-stone-300 my-1.5" />

            {/* Footer */}
            <div className="text-center text-[9px] text-stone-500 pt-1 space-y-0.5">
              <p>Thank you for shopping at EyeNova Optics!</p>
              <p>Qatar Medical & Luxury Eyewear</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDownloadThermalPdf}
              className="px-2.5 py-1.5 border border-stone-200 bg-white hover:bg-stone-100 rounded-md text-[11px] font-medium text-stone-700 flex items-center gap-1 transition cursor-pointer"
            >
              <Download size={11} /> 80mm PDF
            </button>
            <button
              onClick={handleDownloadA4Pdf}
              className="px-2.5 py-1.5 border border-stone-200 bg-white hover:bg-stone-100 rounded-md text-[11px] font-medium text-stone-700 flex items-center gap-1 transition cursor-pointer"
            >
              <FileText size={11} /> A4 PDF
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-stone-900 text-stone-50 rounded-md text-xs font-medium hover:bg-stone-800 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer size={13} /> Print (Ctrl+P)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
