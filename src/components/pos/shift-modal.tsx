'use client';

import React, { useState, useEffect } from 'react';
import { usePosStore } from '@/stores/pos-store';
import { useSessionStore } from '@/stores/session-store';
import { formatQar } from '@/lib/utils';
import {
  X,
  Clock,
  Coins,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Printer,
  Loader2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AnimatedQar } from '@/components/shared/animated-number';

const OPENING_CHIPS = [200, 500, 1000, 1500];

export function ShiftModal() {
  const { isShiftModalOpen, setShiftModalOpen, showToast } = usePosStore();
  const { user, store, shift: localShift, setShift, isStaff } = useSessionStore();

  const [activeShift, setActiveShift] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Open Shift Form State
  const [openingFloat, setOpeningFloat] = useState('');
  const [openNotes, setOpenNotes] = useState('');

  // Close Shift Form State
  const [countedCash, setCountedCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  // Fetch latest open shift from API
  const fetchShift = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/shifts?storeId=${store?.id || 'STORE-MAIN'}`);
      const data = await res.json();
      if (data.shift) {
        setActiveShift(data.shift);
        const expected =
          Number(data.shift.openingFloat || 0) +
          Number(data.shift.cashSales || 0) +
          Number(data.shift.cashIn || 0) -
          Number(data.shift.pettyCashOut || 0);

        setCountedCash(expected > 0 ? expected.toFixed(2) : '0.00');
        setShift({
          id: data.shift.id,
          userId: user?.id || 'USR-STAFF',
          userName: data.shift.cashierName || user?.fullName || 'Cashier',
          storeId: data.shift.storeId || 'STORE-MAIN',
          storeName: store?.name || 'EyeNova Optical',
          openedAt: data.shift.openedAt,
          openingCash: Number(data.shift.openingFloat || 0),
          expectedClosingCash: expected,
          cashSalesAmount: Number(data.shift.cashSales || 0),
          cardSalesAmount: Number(data.shift.cardSales || 0),
          totalSalesAmount: Number(data.shift.cashSales || 0) + Number(data.shift.cardSales || 0),
          status: 'OPEN',
        });
      } else {
        setActiveShift(null);
        setShift(null);
      }
    } catch (err: any) {
      console.error('Error fetching shift:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isShiftModalOpen) {
      fetchShift();
    }
  }, [isShiftModalOpen]);

  if (!isShiftModalOpen || !isStaff()) return null;

  // Expected Cash calculation
  const openFloatNum = Number(activeShift?.openingFloat || 0);
  const cashSalesNum = Number(activeShift?.cashSales || 0);
  const cardSalesNum = Number(activeShift?.cardSales || 0);
  const otherSalesNum = Number(activeShift?.otherSales || 0);
  const cashInNum = Number(activeShift?.cashIn || 0);
  const pettyCashNum = Number(activeShift?.pettyCashOut || 0);

  const expectedCash = openFloatNum + cashSalesNum + cashInNum - pettyCashNum;
  const countedNum = parseFloat(countedCash) || 0;
  const variance = Math.round((countedNum - expectedCash) * 100) / 100;

  // Handle Open Shift
  const handleOpenShift = async () => {
    const floatAmount = parseFloat(openingFloat);
    if (isNaN(floatAmount) || floatAmount < 0) {
      setError('Please enter a valid opening float amount');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'OPEN',
          openingCash: floatAmount,
          userId: user?.id,
          userName: user?.fullName || 'Staff Cashier',
          storeId: store?.id || 'STORE-MAIN',
          notes: openNotes || 'Opened shift with declared float',
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to open shift');

      showToast('Shift Started', `Declared opening float of ${formatQar(floatAmount)}`, true);
      await fetchShift();
    } catch (err: any) {
      setError(err.message || 'Failed to start shift');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Close Shift & Z-Report
  const handleCloseShift = async () => {
    if (!activeShift?.id) return;

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE',
          shiftId: activeShift.id,
          actualClosingCash: countedNum,
          notes: closeNotes || `Closed with variance: ${variance >= 0 ? '+' : ''}${variance.toFixed(2)} QAR`,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to close shift');

      showToast(
        'Shift Closed (Z-Report)',
        `Register shift completed with ${variance === 0 ? 'zero' : formatQar(variance)} variance`,
        true
      );
      setShift(null);
      setActiveShift(null);
      setShiftModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to close shift');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white rounded-t-xl sm:rounded-xl border border-stone-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-xl"
      >
        {/* Header (Swiss Light Style) */}
        <div className="p-3 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                activeShift ? 'bg-emerald-600 animate-pulse' : 'bg-stone-400'
              }`}
            />
            <h2 className="font-medium text-xs text-stone-900 truncate">
              {activeShift ? 'Active Register Shift & Drawer Reconciliation' : 'Start Register Shift (Opening Float)'}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchShift}
              disabled={loading}
              title="Refresh shift data"
              className="p-1 text-stone-400 hover:text-stone-700 rounded transition cursor-pointer"
            >
              <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShiftModalOpen(false)}
              className="p-1 text-stone-400 hover:text-stone-700 rounded transition cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 overflow-y-auto text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {activeShift ? (
            /* =================== VIEW A: SHIFT ACTIVE =================== */
            <div className="space-y-4">
              {/* Shift Meta Banner */}
              <div className="bg-stone-50 border border-stone-200 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 font-mono uppercase block">Status</span>
                  <span className="font-medium text-emerald-700 font-mono flex items-center gap-1.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    OPEN & RECORDING
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 font-mono uppercase block">Operator</span>
                  <span className="font-medium text-stone-900">{activeShift.cashierName || user?.fullName}</span>
                </div>
              </div>

              {/* Drawer Telemetry Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
                <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                  <span className="text-[10px] text-stone-400 uppercase block">Opening Float</span>
                  <AnimatedQar value={openFloatNum} className="font-medium text-xs text-stone-800" />
                </div>
                <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                  <span className="text-[10px] text-stone-400 uppercase block">Cash Sales</span>
                  <AnimatedQar value={cashSalesNum} className="font-medium text-xs text-stone-800" />
                </div>
                <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                  <span className="text-[10px] text-stone-400 uppercase block">Card Sales</span>
                  <AnimatedQar value={cardSalesNum} className="font-medium text-xs text-stone-800" />
                </div>
                <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                  <span className="text-[10px] text-stone-400 uppercase block">Mid-Shift Cash-In</span>
                  <AnimatedQar value={cashInNum} prefix="+" className="font-medium text-xs text-stone-800" />
                </div>
                <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                  <span className="text-[10px] text-stone-400 uppercase block">Petty Cash Out</span>
                  <AnimatedQar value={pettyCashNum} prefix="-" className="font-medium text-xs text-stone-800" />
                </div>
                <div className="p-2.5 bg-stone-100 border border-stone-300 rounded-lg">
                  <span className="text-[10px] text-stone-500 uppercase block font-semibold">Expected Cash</span>
                  <AnimatedQar value={expectedCash} className="font-bold text-xs text-stone-900" />
                </div>
              </div>

              {/* Close Shift Reconciliation Box */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-stone-900 text-xs">Close Shift Reconciliation</span>
                  <span className="text-[10px] text-stone-400 font-mono">Count physical bills in drawer</span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Counted Cash in Drawer (QAR) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-base font-mono font-medium text-stone-900 bg-white border border-stone-300 rounded-md p-2 focus:outline-hidden focus:border-stone-500"
                  />
                </div>

                {/* Variance Display */}
                <div className="flex items-center justify-between p-2 rounded bg-white border border-stone-200 text-xs font-mono">
                  <span className="text-stone-600">Reconciliation Variance:</span>
                  <span
                    className={`font-bold ${
                      variance === 0
                        ? 'text-emerald-700'
                        : variance > 0
                        ? 'text-sky-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {variance === 0
                      ? 'Balanced (0.00 QAR)'
                      : `${variance > 0 ? '+' : ''}${formatQar(variance)} (${variance > 0 ? 'Overage' : 'Shortage'})`}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">Closing Notes</label>
                  <input
                    type="text"
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder="e.g. Evening shift handoff to Khalid..."
                    className="w-full text-xs text-stone-900 bg-white border border-stone-200 rounded-md p-1.5 focus:outline-hidden focus:border-stone-400"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* =================== VIEW B: NO ACTIVE SHIFT =================== */
            <div className="space-y-4">
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs space-y-1">
                <span className="font-medium text-stone-900 block">Open Cash Drawer</span>
                <p className="text-stone-500 text-[11px]">
                  Declare the physical cash float present in your register till to track cash sales, change due, and
                  end-of-day Z-Report balance.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Opening Float (QAR) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  placeholder="500.00"
                  className="w-full text-base font-mono font-medium text-stone-900 bg-stone-50 border border-stone-300 rounded-md p-2 focus:bg-white focus:outline-hidden focus:border-stone-500"
                />
              </div>

              {/* Quick Opening Float Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {OPENING_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setOpeningFloat(chip.toString())}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition cursor-pointer ${
                      openingFloat === chip.toString()
                        ? 'bg-stone-900 text-white font-medium'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    {chip} QAR
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  placeholder="e.g. Standard morning float from safe..."
                  className="w-full text-xs text-stone-900 bg-stone-50 border border-stone-200 rounded-md p-1.5 focus:bg-white focus:outline-hidden focus:border-stone-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShiftModalOpen(false)}
            disabled={submitting}
            className="px-3 py-1.5 border border-stone-300 rounded-md text-xs font-medium text-stone-700 hover:bg-stone-100 transition cursor-pointer"
          >
            Cancel
          </button>

          {activeShift ? (
            <button
              type="button"
              onClick={handleCloseShift}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-md text-xs font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 size={13} className="animate-spin text-stone-400" />
                  <span>Closing Shift...</span>
                </>
              ) : (
                <>
                  <Printer size={13} />
                  <span>Close Shift &amp; Print Z-Report</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenShift}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-md text-xs font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 size={13} className="animate-spin text-stone-400" />
                  <span>Starting Register...</span>
                </>
              ) : (
                <>
                  <Coins size={13} />
                  <span>Start Register Shift</span>
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
