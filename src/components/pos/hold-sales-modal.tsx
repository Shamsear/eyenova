'use client';

import React from 'react';
import { usePosStore } from '@/stores/pos-store';
import { formatQar } from '@/lib/utils';
import { X, Clock, Trash2, ArrowUpRight } from 'lucide-react';

export function HoldSalesModal() {
  const { isHeldSalesModalOpen, heldSales, setHeldSalesModalOpen, recallSale, removeHeldSale, showToast } =
    usePosStore();

  if (!isHeldSalesModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-t-xl sm:rounded-xl border border-stone-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] shadow-xl">
        {/* Header (Swiss Light Style) */}
        <div className="p-3 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Clock size={14} className="text-stone-500 shrink-0" />
            <h2 className="font-medium text-xs text-stone-900 truncate">Parked / Held Orders (F4)</h2>
          </div>
          <button
            onClick={() => setHeldSalesModalOpen(false)}
            className="text-stone-400 hover:text-stone-700 p-1 rounded transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* List of Held Sales */}
        <div className="p-3.5 flex-1 overflow-y-auto space-y-2">
          {heldSales.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-xs">
              No parked sales on hold. Press <kbd className="font-mono bg-stone-100 border border-stone-200 px-1 py-0.5 rounded text-[10px]">F3</kbd> during an active sale to park it.
            </div>
          ) : (
            heldSales.map((sale) => (
              <div
                key={sale.id}
                className="p-2.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-white hover:border-stone-400 transition flex items-center justify-between gap-2.5 min-w-0"
              >
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-xs text-stone-900 truncate">{sale.customerName}</span>
                    <span className="text-[10px] text-stone-400 font-mono shrink-0">
                      {new Date(sale.heldAt).toLocaleTimeString('en-US', {
                        timeZone: 'Asia/Qatar',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="text-[10px] text-stone-500 truncate font-mono">
                    {sale.lines.map((l) => `${l.quantity}× ${l.titleEn}`).join(', ')}
                  </div>
                  <div className="text-xs font-mono font-medium text-stone-900 tabular-nums">{formatQar(sale.total)}</div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      recallSale(sale.id);
                      showToast('Sale Restored', `Restored ${sale.customerName}'s cart`, true);
                    }}
                    className="px-2.5 py-1 rounded bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 flex items-center gap-1 transition cursor-pointer"
                  >
                    <ArrowUpRight size={12} />
                    <span>Resume</span>
                  </button>
                  <button
                    onClick={() => removeHeldSale(sale.id)}
                    title="Delete parked sale"
                    className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-stone-100 transition cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
