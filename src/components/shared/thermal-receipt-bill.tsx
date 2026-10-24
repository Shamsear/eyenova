'use client';

import React from 'react';
import { ReceiptPayload } from '@/lib/types';

interface ThermalReceiptBillProps {
  data: ReceiptPayload;
  className?: string;
  isPrintPortal?: boolean;
}

export function formatMethodText(method: string): string {
  const m = (method || '').toUpperCase();
  if (m === 'CASH') return 'نقداً / Cash';
  if (m === 'CARD' || m === 'CREDIT_CARD' || m === 'DEBIT_CARD') return 'بطاقة / Card';
  if (m === 'SPLIT') return 'دفع مجزأ / Split';
  if (m === 'TRANSFER' || m === 'BANK_TRANSFER') return 'تحويل بنكي / Bank Transfer';
  return method;
}

export function ThermalReceiptBill({ data, className = '', isPrintPortal = false }: ThermalReceiptBillProps) {
  const storeNameAr = data.storeNameAr || 'آي نوفا للتجارة البصرية';
  const storeNameEn = data.storeNameEn || 'EyeNova Optical - 02 Mall, Al Kheesa';
  const addressAr = data.addressAr || '';
  const addressEn = data.addressEn || '02 Mall, 79 Street 773, Al Kheesa';
  const phone = data.phone || '+974 6633 7371';
  const cr = data.crNumber || '';
  const vat = data.vatNumber || ''; // No VAT in Qatar

  return (
    <div
      className={`bg-white p-4 rounded border border-stone-300 w-[280px] max-w-full text-[11px] font-mono text-stone-800 leading-tight space-y-2 select-text shadow-xs ${className}`}
      dir="ltr"
    >
      {/* 1. Store Header (Bilingual, Fetched from Supabase) */}
      <div className="text-center space-y-0.5">
        <div className="flex justify-center pb-1">
          <img
            src="/logo.png"
            alt="EyeNova Optical"
            className="h-10 w-auto object-contain"
          />
        </div>
        {storeNameAr && <h2 className="font-bold text-[14.5px] text-stone-900 leading-snug">{storeNameAr}</h2>}
        <h3 className="font-bold text-[12.5px] text-stone-900 leading-snug">{storeNameEn}</h3>
        {addressAr && <p className="text-[9.5px] text-stone-600">{addressAr}</p>}
        {addressEn && <p className="text-[9.5px] text-stone-600">{addressEn}</p>}
        
        {/* Phone number strictly pure LTR to prevent BiDi inversion */}
        {phone && (
          <div className="text-[9.5px] text-stone-600 flex items-center justify-center gap-1 font-mono" dir="ltr">
            <span>Tel:</span>
            <bdi className="tabular-nums font-medium" dir="ltr">
              {phone}
            </bdi>
          </div>
        )}

        {/* CR (Only if present, NO VAT in Qatar) */}
        {cr ? (
          <div className="text-[9px] text-stone-500 flex items-center justify-center gap-1" dir="ltr">
            <span>CR / س.ت:</span>
            <span className="font-mono">{cr}</span>
            {vat ? (
              <>
                <span>|</span>
                <span>VAT: {vat}</span>
              </>
            ) : null}
          </div>
        ) : vat ? (
          <div className="text-[9px] text-stone-500 font-mono" dir="ltr">
            VAT: {vat}
          </div>
        ) : null}

        {data.website && <p className="text-[9.5px] font-semibold text-stone-700">{data.website}</p>}
      </div>

      {/* Solid Divider */}
      <div className="border-b border-stone-800 my-1.5" />

      {/* 2. Bill Title */}
      <div className="text-center space-y-0.5 py-0.5">
        <div className="font-bold text-[13.5px] text-stone-900 leading-tight">فاتورة</div>
        <div className="font-bold text-[11.5px] tracking-wider text-stone-900 leading-tight">INVOICE</div>
      </div>

      {/* Solid Divider */}
      <div className="border-b border-stone-800 my-1.5" />

      {/* 3. Bill Metadata */}
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between">
          <span className="text-stone-600">رقم الفاتورة / Inv #:</span>
          <span className="font-bold text-stone-900 font-mono">{data.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-600">التاريخ / Date:</span>
          <span className="font-mono text-stone-800">
            {data.date} {data.time}
          </span>
        </div>
        {data.status && (
          <div className="flex justify-between">
            <span className="text-stone-600">الحالة / Status:</span>
            <span className="font-bold text-stone-900 font-mono text-[9.5px]">
              {data.status.replace(/_/g, ' ')}
            </span>
          </div>
        )}
        {data.orderNumber && (
          <div className="flex justify-between">
            <span className="text-stone-600">الطلب / Order #:</span>
            <span className="font-mono text-stone-800">{data.orderNumber}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-stone-600">الكاشير / Cashier:</span>
          <span className="text-stone-800">{data.cashierName || 'Cashier'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-600">العميل / Customer:</span>
          <span className="font-bold text-stone-900 truncate max-w-[150px]">{data.customerName || 'Walk-in Client'}</span>
        </div>
        {data.customerPhone && (
          <div className="flex justify-between" dir="ltr">
            <span className="text-stone-600">الهاتف / Phone:</span>
            <span className="font-mono text-stone-800" dir="ltr"><bdi dir="ltr">{data.customerPhone}</bdi></span>
          </div>
        )}
        {data.notes && (
          <div className="text-[9.5px] font-semibold text-stone-700 pt-0.5">
            ملاحظات: {data.notes}
          </div>
        )}
      </div>

      {/* Solid Divider */}
      <div className="border-b border-stone-800 my-1.5" />

      {/* 4. Items Table Header */}
      <div className="flex justify-between font-bold text-[10.5px] text-stone-900">
        <span>الصنف / ITEM</span>
        <span className="text-right">الإجمالي / TOTAL</span>
      </div>

      {/* Dashed Divider */}
      <div className="border-b border-dashed border-stone-400 my-1" />

      {/* 5. Items List */}
      <div className="space-y-1.5 text-[10px]">
        {data.items.map((item, idx) => (
          <div key={idx} className="space-y-0.5">
            {item.nameAr && (
              <div className="font-bold text-[11px] text-stone-900 leading-tight">
                {item.nameAr}
              </div>
            )}
            <div className="font-semibold text-[10.5px] text-stone-900 leading-tight">
              {item.name}
            </div>
            {item.specs && (
              <div className="text-[9px] text-stone-500 leading-tight">
                {item.specs}
              </div>
            )}
            <div className="flex justify-between text-[10px] text-stone-700 pt-0.5">
              <span>
                {item.quantity} × {item.unitPrice.toFixed(2)} QAR
              </span>
              <span className="font-semibold tabular-nums text-stone-900">
                {item.total.toFixed(2)} QAR
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Solid Divider */}
      <div className="border-b border-stone-800 my-1.5" />

      {/* 6. Totals */}
      <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span className="text-stone-600">المجموع الفرعي / Subtotal:</span>
          <span className="tabular-nums text-stone-800">{data.subtotal.toFixed(2)} QAR</span>
        </div>

        {data.discount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>الخصم / Discount:</span>
            <span className="tabular-nums">-{data.discount.toFixed(2)} QAR</span>
          </div>
        )}

        {data.deliveryFee > 0 && (
          <div className="flex justify-between">
            <span className="text-stone-600">رسوم التوصيل / Delivery:</span>
            <span className="tabular-nums text-stone-800">+{data.deliveryFee.toFixed(2)} QAR</span>
          </div>
        )}

        {data.taxAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-stone-600">ضريبة القيمة المضافة / VAT:</span>
            <span className="tabular-nums text-stone-800">+{data.taxAmount.toFixed(2)} QAR</span>
          </div>
        )}
      </div>

      {/* Double Divider */}
      <div className="space-y-[1.5px] my-1.5">
        <div className="border-b border-stone-900" />
        <div className="border-b border-stone-900" />
      </div>

      {/* 7. NET TOTAL (Prominent large font with zero overlap) */}
      <div className="flex justify-between items-center text-stone-900 font-bold py-0.5">
        <span className="text-[12.5px]">الإجمالي / TOTAL:</span>
        <span className="text-[14.5px] tabular-nums font-mono">{data.total.toFixed(2)} QAR</span>
      </div>

      {/* Double Divider */}
      <div className="space-y-[1.5px] my-1.5">
        <div className="border-b border-stone-900" />
        <div className="border-b border-stone-900" />
      </div>

      {/* 8. Payment Breakdown */}
      <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span className="text-stone-600">طريقة الدفع / Payment:</span>
          <span className="font-medium text-stone-900">
            {formatMethodText(data.paymentMethod)}
            {data.paymentReference ? ` (Ref: ${data.paymentReference})` : ''}
          </span>
        </div>

        {data.cashTendered !== undefined && data.cashTendered > 0 && (
          <>
            <div className="flex justify-between text-stone-600">
              <span>المستلم / Cash Received:</span>
              <span className="tabular-nums font-mono">{data.cashTendered.toFixed(2)} QAR</span>
            </div>
            {data.changeDue !== undefined && (
              <div className="flex justify-between text-stone-900 font-bold">
                <span>المتبقي / Balance Amount:</span>
                <span className="tabular-nums font-mono">{data.changeDue.toFixed(2)} QAR</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Solid Divider */}
      <div className="border-b border-stone-800 my-1.5" />

      {/* 9. Polite Bilingual Footer */}
      <div className="text-center pt-1 space-y-0.5">
        <div className="font-bold text-[12px] text-stone-900">شكراً لزيارتكم</div>
        <div className="text-[10.5px] text-stone-700">Thank you for your visit!</div>
        <div className="text-[9px] text-stone-600 pt-0.5">البضاعة المباعة ترد وتستبدل خلال 14 يوماً بالفاتورة</div>
        <div className="text-[8.5px] text-stone-500">Exchange & return within 14 days with original receipt</div>
      </div>
    </div>
  );
}
