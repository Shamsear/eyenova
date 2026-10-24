'use client';

import React from 'react';
import { ReceiptPayload } from '@/lib/types';
import { formatQar, getInvoiceStatusDisplay } from '@/lib/utils';

interface A4InvoiceBillProps {
  data: ReceiptPayload;
  className?: string;
}

export function A4InvoiceBill({ data, className = '' }: A4InvoiceBillProps) {
  const storeNameAr = data.storeNameAr || 'آي نوفا للتجارة البصرية';
  const storeNameEn = data.storeNameEn || 'EyeNova Optical - 02 Mall, Al Kheesa';
  const addressAr = data.addressAr || '';
  const addressEn = data.addressEn || '02 Mall, 79 Street 773, Al Kheesa';
  const phone = data.phone || '+974 6633 7371';
  const cr = data.crNumber || '';
  const website = data.website || 'eyenova.com.qa';
  const statusDisplay = getInvoiceStatusDisplay(data.status);

  return (
    <div
      className={`bg-white rounded-lg border border-stone-200 shadow-sm p-4 sm:p-8 w-full max-w-3xl mx-auto text-stone-800 font-sans leading-normal ${className}`}
      dir="ltr"
    >
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-stone-200">
        {/* Left: Brand Logo & Company Info */}
        <div className="flex items-start gap-3.5">
          <img
            src="/logo.png"
            alt="EyeNova Optical"
            className="h-14 sm:h-16 w-auto object-contain shrink-0"
          />
          <div className="space-y-0.5">
            <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight leading-snug">
              {storeNameEn}
            </h1>
            <h2 className="text-sm sm:text-base font-bold text-stone-700 leading-snug">
              {storeNameAr}
            </h2>
            <p className="text-xs text-stone-500">
              {addressEn} {addressAr ? `· ${addressAr}` : ''}
            </p>
            <div className="text-xs text-stone-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5" dir="ltr">
              <span>Tel: <bdi className="font-mono font-medium" dir="ltr">{phone}</bdi></span>
              {website && <span>· {website}</span>}
              {cr && <span>· CR / س.ت: {cr}</span>}
            </div>
          </div>
        </div>

        {/* Right: Tax Invoice Badge & Key Meta */}
        <div className="sm:text-right shrink-0 w-full sm:w-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-900 text-stone-50 rounded-full text-xs font-semibold tracking-wider uppercase mb-2">
            <span>TAX INVOICE</span>
            <span>·</span>
            <span>فاتورة ضريبية</span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex sm:justify-end gap-2">
              <span className="text-stone-500 font-medium">Invoice # / رقم الفاتورة:</span>
              <span className="font-mono font-bold text-stone-900">{data.invoiceNumber}</span>
            </div>
            <div className="flex sm:justify-end gap-2">
              <span className="text-stone-500">Date / التاريخ:</span>
              <span className="font-mono text-stone-700">{data.date} {data.time}</span>
            </div>
            <div className="flex sm:justify-end gap-2 items-center">
              <span className="text-stone-500">Status / الحالة:</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusDisplay.badgeClasses}`}>
                {statusDisplay.fullBadgeText}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Customer & Order Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-5">
        {/* Billed To Card */}
        <div className="bg-stone-50/70 rounded-lg border border-stone-200/80 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-stone-200/80 pb-1.5">
            <span className="font-bold text-stone-800 uppercase tracking-wide text-[11px]">
              BILLED TO / بيانات العميل
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-stone-500">Name / الاسم:</span>
              <span className="font-bold text-stone-900 truncate max-w-[200px]">
                {data.customerName || 'Walk-in Customer'}
              </span>
            </div>
            <div className="flex justify-between" dir="ltr">
              <span className="text-stone-500">Phone / الهاتف:</span>
              <span className="font-mono text-stone-700" dir="ltr"><bdi dir="ltr">{data.customerPhone || '—'}</bdi></span>
            </div>
            {data.customerEmail && (
              <div className="flex justify-between">
                <span className="text-stone-500">Email / البريد:</span>
                <span className="font-mono text-stone-700 truncate max-w-[180px]">{data.customerEmail}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-stone-500">Location / الموقع:</span>
              <span className="text-stone-700">Doha, Qatar / الدوحة، قطر</span>
            </div>
          </div>
        </div>

        {/* Order Details Card */}
        <div className="bg-stone-50/70 rounded-lg border border-stone-200/80 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-stone-200/80 pb-1.5">
            <span className="font-bold text-stone-800 uppercase tracking-wide text-[11px]">
              ORDER DETAILS / تفاصيل الطلب
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-stone-500">Order Ref / رقم الطلب:</span>
              <span className="font-mono font-medium text-stone-800">{data.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Payment / طريقة الدفع:</span>
              <span className="font-medium text-stone-900">{data.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Staff / البائع:</span>
              <span className="text-stone-700">{data.cashierName || 'Cashier'}</span>
            </div>
            {data.paymentReference && (
              <div className="flex justify-between">
                <span className="text-stone-500">Ref Code / المرجع:</span>
                <span className="font-mono text-stone-700">{data.paymentReference}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Items Table */}
      <div className="border border-stone-200 rounded-lg overflow-x-auto my-5">
        <table className="w-full min-w-[500px] text-left text-xs border-collapse">
          <thead>
            <tr className="bg-stone-900 text-stone-50 uppercase text-[10px] tracking-wider font-semibold">
              <th className="py-2.5 px-3 text-center w-10">#</th>
              <th className="py-2.5 px-3">الصنف والمواصفات / Item & Prescription Specs</th>
              <th className="py-2.5 px-3 text-center w-20">الكمية / Qty</th>
              <th className="py-2.5 px-3 text-right w-28">سعر الوحدة / Rate</th>
              <th className="py-2.5 px-3 text-right w-28">المجموع / Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {data.items.map((it, idx) => (
              <tr key={idx} className="hover:bg-stone-50/50 transition">
                <td className="py-2.5 px-3 text-center font-mono text-stone-400 text-[11px] align-top">
                  {idx + 1}
                </td>
                <td className="py-2.5 px-3 space-y-0.5">
                  {it.nameAr && (
                    <div className="font-bold text-stone-900 text-xs">
                      {it.nameAr}
                    </div>
                  )}
                  <div className="font-medium text-stone-800 text-xs">
                    {it.name}
                  </div>
                  {it.specs && (
                    <div className="text-[11px] text-stone-500 font-mono">
                      {it.specs}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-medium text-stone-800 align-top">
                  {it.quantity}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-stone-700 align-top">
                  {it.unitPrice.toFixed(2)} QAR
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold text-stone-900 align-top">
                  {it.total.toFixed(2)} QAR
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. Financial Summary & Totals */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 my-5">
        {/* Left: Notes & Payment Info */}
        <div className="w-full sm:w-1/2 space-y-2 text-xs">
          {data.notes && (
            <div className="p-2.5 bg-stone-50 rounded border border-stone-200">
              <span className="font-bold text-stone-700 block text-[11px] mb-0.5">
                Notes / ملاحظات الطلب:
              </span>
              <p className="text-stone-600">{data.notes}</p>
            </div>
          )}

          <div className={`p-2.5 rounded border text-[11px] flex items-center justify-between ${statusDisplay.boxClasses}`}>
            <span className="font-semibold">Payment Status / حالة السداد:</span>
            <span className="font-mono font-bold">{statusDisplay.paymentStatusText}</span>
          </div>
        </div>

        {/* Right: Totals Box */}
        <div className="w-full sm:w-64 bg-stone-50 rounded-lg border border-stone-200 p-3.5 space-y-2 text-xs">
          <div className="flex justify-between text-stone-600">
            <span>Subtotal / المجموع الفرعي:</span>
            <span className="font-mono font-medium tabular-nums">{data.subtotal.toFixed(2)} QAR</span>
          </div>

          {data.discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount / الخصم:</span>
              <span className="font-mono font-medium tabular-nums">-{data.discount.toFixed(2)} QAR</span>
            </div>
          )}

          {data.deliveryFee > 0 && (
            <div className="flex justify-between text-stone-600">
              <span>Delivery / رسوم التوصيل:</span>
              <span className="font-mono font-medium tabular-nums">+{data.deliveryFee.toFixed(2)} QAR</span>
            </div>
          )}

          <div className="border-t border-stone-300 pt-2 flex justify-between items-center text-stone-900 font-bold">
            <span className="text-xs">TOTAL DUE / الإجمالي:</span>
            <span className="font-mono text-base tabular-nums text-stone-900">
              {data.total.toFixed(2)} QAR
            </span>
          </div>
        </div>
      </div>

      {/* 5. Terms & Signature */}
      <div className="pt-4 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        {/* Terms */}
        <div className="sm:col-span-2 space-y-1 text-stone-500 text-[10.5px]">
          <p className="font-bold text-stone-700 text-xs">Terms & Conditions / الشروط والأحكام:</p>
          <p>1. البضاعة المباعة ترد وتستبدل خلال 14 يوماً من تاريخ الشراء بالفاتورة وبحالتها الأصلية.</p>
          <p>2. Goods may be exchanged or returned within 14 days in original condition with this receipt.</p>
          <p>3. العدسات الطبية المفصلة والخاصة لا ترد ولا تستبدل بعد قصها وتركيبها.</p>
          <p>4. Custom-cut prescription lenses cannot be refunded once processed.</p>
        </div>

        {/* Signatory Box */}
        <div className="flex flex-col justify-end items-center sm:items-end text-center sm:text-right pt-2 sm:pt-0">
          <div className="border-b border-stone-400 w-36 mb-1 border-dashed" />
          <span className="text-[10px] font-semibold text-stone-600">
            Authorized Signatory
          </span>
          <span className="text-[9.5px] text-stone-400">
            التوقيع والختم المعتمد
          </span>
        </div>
      </div>
    </div>
  );
}
