'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePosStore } from '@/stores/pos-store';
import { useSessionStore } from '@/stores/session-store';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { formatQar } from '@/lib/utils';
import {
  Coins,
  AlertTriangle,
  RotateCw,
  Printer,
  Loader2,
} from 'lucide-react';
import { AnimatedQar } from '@/components/shared/animated-number';

const OPENING_CHIPS = [200, 500, 1000, 1500];

interface ShiftRecord {
  id: string;
  openingFloat?: number | string;
  cashSales?: number | string;
  cardSales?: number | string;
  otherSales?: number | string;
  cashIn?: number | string;
  pettyCashOut?: number | string;
  cashierName?: string;
  storeId?: string;
  openedAt: string;
}

export function ShiftModal() {
  const { isShiftModalOpen, setShiftModalOpen, showToast } = usePosStore();
  const { user, store, setShift, isStaff } = useSessionStore();

  const [activeShift, setActiveShift] = useState<ShiftRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);

  const [openingFloat, setOpeningFloat] = useState('');
  const [openNotes, setOpenNotes] = useState('');
  const [countedCash, setCountedCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  const staffUser = isStaff();

  const applyShiftResponse = useCallback(
    (data: { shift?: ShiftRecord | null }) => {
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
    },
    [store, user, setShift]
  );

  const fetchShift = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/shifts?storeId=${store?.id || 'STORE-MAIN'}`);
      const data = await res.json();
      applyShiftResponse(data);
    } catch (err) {
      console.error('Error fetching shift:', err);
    } finally {
      setLoading(false);
    }
  }, [store, applyShiftResponse]);

  useEffect(() => {
    if (!isShiftModalOpen || !staffUser) return;
    let cancelled = false;
    async function loadShift() {
      try {
        const res = await fetch(`/api/shifts?storeId=${store?.id || 'STORE-MAIN'}`);
        const data = await res.json();
        if (!cancelled) applyShiftResponse(data);
      } catch (err) {
        console.error('Error fetching shift:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadShift();
    return () => {
      cancelled = true;
    };
  }, [isShiftModalOpen, staffUser, refreshTick, store, applyShiftResponse]);

  if (!isShiftModalOpen || !staffUser) return null;

  const openFloatNum = Number(activeShift?.openingFloat || 0);
  const cashSalesNum = Number(activeShift?.cashSales || 0);
  const cardSalesNum = Number(activeShift?.cardSales || 0);
  const cashInNum = Number(activeShift?.cashIn || 0);
  const pettyCashNum = Number(activeShift?.pettyCashOut || 0);

  const expectedCash = openFloatNum + cashSalesNum + cashInNum - pettyCashNum;
  const countedNum = parseFloat(countedCash) || 0;
  const variance = Math.round((countedNum - expectedCash) * 100) / 100;

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start shift');
    } finally {
      setSubmitting(false);
    }
  };

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
          notes:
            closeNotes ||
            `Closed with variance: ${variance >= 0 ? '+' : ''}${variance.toFixed(2)} QAR`,
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to close shift');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open={isShiftModalOpen}
      onClose={() => setShiftModalOpen(false)}
      disableDismiss={submitting}
      title={
        activeShift
          ? 'Active Register Shift & Reconciliation'
          : 'Start Register Shift (Opening Float)'
      }
      icon={
        <span
          className={`w-2.5 h-2.5 rounded-full block ${
            activeShift ? 'bg-teal-600 animate-pulse' : 'bg-stone-400'
          }`}
        />
      }
      headerExtra={
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setRefreshTick((t) => t + 1);
          }}
          disabled={loading}
          title="Refresh shift data"
          aria-label="Refresh shift data"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
        >
          <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      }
      maxWidthClass="sm:max-w-lg"
      bodyClassName="p-4 space-y-4 text-xs"
      footer={
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShiftModalOpen(false)}
            disabled={submitting}
            className="min-h-[44px] px-4 rounded-xl border border-stone-300 bg-white text-xs font-medium text-stone-700 hover:bg-stone-100 transition cursor-pointer"
          >
            Cancel
          </button>

          {activeShift ? (
            <button
              type="button"
              onClick={handleCloseShift}
              disabled={submitting}
              className="flex-1 min-h-[44px] px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin text-stone-400" />
                  <span>Closing Shift...</span>
                </>
              ) : (
                <>
                  <Printer size={14} />
                  <span>Close Shift &amp; Print Z-Report</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenShift}
              disabled={submitting}
              className="flex-1 min-h-[44px] px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin text-teal-100" />
                  <span>Starting Register...</span>
                </>
              ) : (
                <>
                  <Coins size={14} />
                  <span>Start Register Shift</span>
                </>
              )}
            </button>
          )}
        </div>
      }
    >
      {error && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {activeShift ? (
        <div className="space-y-4">
          <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-stone-400 font-mono uppercase block">Status</span>
              <span className="font-semibold text-teal-700 font-mono flex items-center gap-1.5 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                OPEN &amp; RECORDING
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-stone-400 font-mono uppercase block">Operator</span>
              <span className="font-semibold text-stone-900">
                {activeShift.cashierName || user?.fullName}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
            <div className="p-2.5 bg-white border border-stone-200 rounded-xl">
              <span className="text-[10px] text-stone-400 uppercase block">Opening Float</span>
              <AnimatedQar value={openFloatNum} className="font-semibold text-xs text-stone-800" />
            </div>
            <div className="p-2.5 bg-white border border-stone-200 rounded-xl">
              <span className="text-[10px] text-stone-400 uppercase block">Cash Sales</span>
              <AnimatedQar value={cashSalesNum} className="font-semibold text-xs text-stone-800" />
            </div>
            <div className="p-2.5 bg-white border border-stone-200 rounded-xl">
              <span className="text-[10px] text-stone-400 uppercase block">Card Sales</span>
              <AnimatedQar value={cardSalesNum} className="font-semibold text-xs text-stone-800" />
            </div>
            <div className="p-2.5 bg-white border border-stone-200 rounded-xl">
              <span className="text-[10px] text-stone-400 uppercase block">Mid-Shift Cash-In</span>
              <AnimatedQar
                value={cashInNum}
                prefix="+"
                className="font-semibold text-xs text-stone-800"
              />
            </div>
            <div className="p-2.5 bg-white border border-stone-200 rounded-xl">
              <span className="text-[10px] text-stone-400 uppercase block">Petty Cash Out</span>
              <AnimatedQar
                value={pettyCashNum}
                prefix="-"
                className="font-semibold text-xs text-stone-800"
              />
            </div>
            <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl">
              <span className="text-[10px] text-teal-800 uppercase block font-semibold">
                Expected Cash
              </span>
              <AnimatedQar value={expectedCash} className="font-bold text-xs text-teal-950" />
            </div>
          </div>

          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-900 text-xs">
                Close Shift Reconciliation
              </span>
              <span className="text-[10px] text-stone-500 font-mono">
                Count physical bills in drawer
              </span>
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
                className="w-full h-11 text-[16px] font-mono font-semibold text-stone-900 bg-white border border-stone-300 rounded-xl px-3 focus:outline-hidden focus:border-teal-700"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200 text-xs font-mono">
              <span className="text-stone-600">Reconciliation Variance:</span>
              <span
                className={`font-bold ${
                  variance === 0
                    ? 'text-emerald-700'
                    : variance > 0
                    ? 'text-teal-700'
                    : 'text-rose-700'
                }`}
              >
                {variance === 0
                  ? 'Balanced (0.00 QAR)'
                  : `${variance > 0 ? '+' : ''}${formatQar(variance)} (${
                      variance > 0 ? 'Overage' : 'Shortage'
                    })`}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-700 mb-1">
                Closing Notes
              </label>
              <input
                type="text"
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="e.g. Evening shift handoff to Khalid..."
                className="w-full h-10 text-[16px] sm:text-xs text-stone-900 bg-white border border-stone-200 rounded-xl px-3 focus:outline-hidden focus:border-teal-700"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1">
            <span className="font-semibold text-stone-900 block">Open Cash Drawer</span>
            <p className="text-stone-500 text-[11px]">
              Declare the physical cash float present in your register till to track cash sales,
              change due, and end-of-day Z-Report balance.
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
              className="w-full h-11 text-[16px] font-mono font-semibold text-stone-900 bg-stone-50 border border-stone-300 rounded-xl px-3 focus:bg-white focus:outline-hidden focus:border-teal-700"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {OPENING_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setOpeningFloat(chip.toString())}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                  openingFloat === chip.toString()
                    ? 'bg-teal-700 text-white font-semibold'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                {chip} QAR
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={openNotes}
              onChange={(e) => setOpenNotes(e.target.value)}
              placeholder="e.g. Standard morning float from safe..."
              className="w-full h-10 text-[16px] sm:text-xs text-stone-900 bg-stone-50 border border-stone-200 rounded-xl px-3 focus:bg-white focus:outline-hidden focus:border-teal-700"
            />
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
}
