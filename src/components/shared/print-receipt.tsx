'use client';

import React from 'react';
import { usePosStore } from '@/stores/pos-store';

export function PrintReceiptArea() {
  const { completedReceipt } = usePosStore();

  if (!completedReceipt) return null;

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
            width: 78mm !important;
            margin: 0 auto !important;
            padding: 2mm 3mm !important;
          }
        }
      `}</style>

      <div id="thermal-print-portal">
        {/* Store Title */}
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>
            {completedReceipt.storeNameEn}
          </div>
          {completedReceipt.storeNameAr && (
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{completedReceipt.storeNameAr}</div>
          )}
          <div style={{ fontSize: '9px' }}>{completedReceipt.addressEn}</div>
          <div style={{ fontSize: '9px' }}>Tel: {completedReceipt.phone}</div>
          {(completedReceipt.crNumber || completedReceipt.vatNumber) && (
            <div style={{ fontSize: '8.5px' }}>
              CR: {completedReceipt.crNumber} | VAT: {completedReceipt.vatNumber}
            </div>
          )}
        </div>

        <div style={{ borderBottom: '1px dashed black', margin: '4px 0' }} />

        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '10px' }}>
          TAX INVOICE / SIMPLIFIED RECEIPT
        </div>

        <div style={{ borderBottom: '1px dashed black', margin: '4px 0' }} />

        <div style={{ fontSize: '9px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Invoice: {completedReceipt.invoiceNumber}</span>
            <span>{completedReceipt.date}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Order: {completedReceipt.orderNumber}</span>
            <span>{completedReceipt.time}</span>
          </div>
          <div>Cashier: {completedReceipt.cashierName}</div>
          <div>Customer: {completedReceipt.customerName}</div>
          {completedReceipt.customerPhone && <div>Phone: {completedReceipt.customerPhone}</div>}
        </div>

        <div style={{ borderBottom: '1px dashed black', margin: '4px 0' }} />

        {/* Item table */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '9.5px' }}>
          <span>ITEM</span>
          <span>TOTAL</span>
        </div>
        <div style={{ borderBottom: '1px solid black', margin: '2px 0' }} />

        {completedReceipt.items.map((item, idx) => (
          <div key={idx} style={{ marginBottom: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>{item.name}</span>
              <span>{item.total.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: '#333' }}>
              <span>{item.specs || 'Standard'}</span>
              <span>
                {item.quantity} × {item.unitPrice.toFixed(2)} QAR
              </span>
            </div>
          </div>
        ))}

        <div style={{ borderBottom: '1px dashed black', margin: '4px 0' }} />

        {/* Totals */}
        <div style={{ fontSize: '9.5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <span>{completedReceipt.subtotal.toFixed(2)} QAR</span>
          </div>
          {completedReceipt.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Discount:</span>
              <span>-{completedReceipt.discount.toFixed(2)} QAR</span>
            </div>
          )}
          {completedReceipt.deliveryFee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Delivery Fee:</span>
              <span>{completedReceipt.deliveryFee.toFixed(2)} QAR</span>
            </div>
          )}
          {completedReceipt.taxAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tax ({completedReceipt.taxRate}%):</span>
              <span>{completedReceipt.taxAmount.toFixed(2)} QAR</span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              fontSize: '12px',
              borderTop: '1px solid black',
              paddingTop: '3px',
              marginTop: '3px',
            }}
          >
            <span>TOTAL:</span>
            <span>{completedReceipt.total.toFixed(2)} QAR</span>
          </div>
        </div>

        <div style={{ borderBottom: '1px dashed black', margin: '4px 0' }} />

        {/* Payment */}
        <div style={{ fontSize: '9px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Paid via: {completedReceipt.paymentMethod}</span>
            {completedReceipt.paymentReference && <span>Ref: {completedReceipt.paymentReference}</span>}
          </div>
          {completedReceipt.cashTendered !== undefined && completedReceipt.cashTendered > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cash Tendered:</span>
                <span>{completedReceipt.cashTendered.toFixed(2)} QAR</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Change Due:</span>
                <span>{(completedReceipt.changeDue ?? 0).toFixed(2)} QAR</span>
              </div>
            </>
          )}
        </div>

        {/* Barcode & Footer */}
        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '9px', fontWeight: 'bold' }}>
          *{completedReceipt.invoiceNumber}*
        </div>

        <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '8px', color: '#555' }}>
          <div>شكراً لتسوقكم معنا - نرجو زيارتنا مجدداً</div>
          <div>Thank you for choosing EyeNova Optical!</div>
          <div>Exchange / Return within 14 days with original receipt.</div>
        </div>
      </div>
    </div>
  );
}
