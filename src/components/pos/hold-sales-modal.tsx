'use client';

import React from 'react';
import { usePosStore } from '@/stores/pos-store';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Clock, Trash2, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedQar } from '@/components/shared/animated-number';

export function HoldSalesModal() {
  const {
    isHeldSalesModalOpen,
    heldSales,
    setHeldSalesModalOpen,
    recallSale,
    removeHeldSale,
    showToast,
  } = usePosStore();

  return (
    <ResponsiveDialog
      open={isHeldSalesModalOpen}
      onClose={() => setHeldSalesModalOpen(false)}
      title="Parked / Held Orders (F4)"
      icon={<Clock size={15} className="text-teal-700" />}
      maxWidthClass="sm:max-w-lg"
      bodyClassName="p-4 space-y-2.5"
    >
      {heldSales.length === 0 ? (
        <div className="py-10 text-center text-stone-500 text-xs">
          No parked sales on hold. Press{' '}
          <kbd className="font-mono bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded text-[10px]">
            F3
          </kbd>{' '}
          during an active sale to park it.
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {heldSales.map((sale) => (
            <motion.div
              key={sale.id}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="p-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-white hover:border-teal-700/60 transition flex items-center justify-between gap-2.5 min-w-0"
            >
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-xs text-stone-900 truncate">
                    {sale.customerName}
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono shrink-0">
                    {new Date(sale.heldAt).toLocaleTimeString('en-US', {
                      timeZone: 'Asia/Qatar',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 truncate font-mono">
                  {sale.lines.map((l) => `${l.quantity}× ${l.titleEn}`).join(', ')}
                </div>
                <div className="text-xs font-mono font-semibold text-stone-900 tabular-nums">
                  <AnimatedQar value={sale.total} />
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    recallSale(sale.id);
                    showToast('Sale Restored', `Restored ${sale.customerName}'s cart`, true);
                  }}
                  className="min-h-[38px] px-3 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <ArrowUpRight size={13} />
                  <span>Resume</span>
                </button>
                <button
                  type="button"
                  onClick={() => removeHeldSale(sale.id)}
                  title="Delete parked sale"
                  aria-label="Delete parked sale"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </ResponsiveDialog>
  );
}
