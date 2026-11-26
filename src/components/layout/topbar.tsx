'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { usePosStore } from '@/stores/pos-store';
import { formatQar } from '@/lib/utils';
import { Store, Clock, Menu, Lock, Maximize2, Minimize2, Search } from 'lucide-react';
import { AnimatedQar } from '@/components/shared/animated-number';
import { Morph } from 'cube-motion/react';

interface TopbarProps {
  title: string;
  subtitle?: string;
}

const emptySubscribe = () => () => {};

export function Topbar({ title, subtitle }: TopbarProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const {
    user,
    store,
    shift,
    setShift,
    toggleMobileMenu,
    setCommandPaletteOpen,
    lockStation,
    isStaff,
    isFullscreen,
    toggleFullscreen,
  } = useSessionStore();
  const { setShiftModalOpen } = usePosStore();
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Qatar',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isStaff()) {
      setShift(null);
      return;
    }
    async function initShift() {
      try {
        const storeId = store?.id || 'STORE-MAIN';
        const res = await fetch(`/api/shifts?storeId=${storeId}`);
        const data = await res.json();
        if (data.shift && data.shift.status === 'OPEN') {
          const expected =
            Number(data.shift.openingFloat || 0) +
            Number(data.shift.cashSales || 0) +
            Number(data.shift.cashIn || 0) -
            Number(data.shift.pettyCashOut || 0);

          setShift({
            id: data.shift.id,
            userId: data.shift.cashierName || 'USR-STAFF',
            userName: data.shift.cashierName || 'Cashier',
            storeId: data.shift.storeId || storeId,
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
          setShift(null);
        }
      } catch {
        // silent fallback
      }
    }
    initShift();
  }, [store?.id, store?.name, setShift, isStaff]);

  const currentUser = mounted ? user : null;
  const currentStore = mounted ? store : null;
  const currentShift = mounted ? shift : null;
  const showShiftBadge = mounted && isStaff();

  return (
    <header className="h-12 md:h-11 border-b border-stone-200 bg-white flex items-center justify-between px-2.5 sm:px-3.5 gap-2 select-none shrink-0">
      {/* Left: Mobile Menu Toggle + Page Title */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={toggleMobileMenu}
          aria-label="Toggle Navigation Menu"
          className="md:hidden w-10 h-10 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition shrink-0 cursor-pointer"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-baseline gap-1.5 min-w-0">
          <h1 className="font-semibold text-stone-900 text-xs sm:text-sm tracking-tight truncate whitespace-nowrap">
            {title}
          </h1>
          {subtitle && (
            <span className="text-[11px] text-stone-400 hidden lg:inline truncate whitespace-nowrap">
              / {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Right Utility Strip */}
      <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
        {/* Quick Jump Command Palette Trigger (Ctrl+K) */}
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          title="Quick Jump (Ctrl+K)"
          aria-label="Quick navigation command palette"
          className="h-9 sm:h-7 px-2.5 sm:px-2 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 hover:text-stone-900 flex items-center gap-1.5 transition cursor-pointer shrink-0"
        >
          <Search size={13} className="text-teal-700" />
          <span className="hidden sm:inline text-[11px]">Jump</span>
          <span className="hidden xl:inline text-[9px] font-mono px-1 py-0.2 rounded bg-white border border-stone-200 text-stone-400">
            Ctrl+K
          </span>
        </button>

        {/* Clock */}
        <div className="hidden xl:flex items-center gap-1 text-[11px] font-mono text-stone-400 px-1">
          <Clock size={11} />
          <span>{timeStr}</span>
        </div>

        {/* Shift Drawer Balance Button */}
        {showShiftBadge && (
          <button
            type="button"
            onClick={() => setShiftModalOpen(true)}
            title={
              currentShift
                ? `Shift Open (Expected Cash: ${formatQar(currentShift.expectedClosingCash)}). Click to reconcile or close.`
                : 'Shift Closed. Click to declare opening float.'
            }
            className={`h-9 sm:h-7 flex items-center gap-1.5 px-2.5 sm:px-2 rounded-lg border text-[11px] font-mono tabular-nums whitespace-nowrap transition cursor-pointer ${
              currentShift
                ? 'bg-teal-50/80 hover:bg-teal-100/70 border-teal-200 text-teal-900'
                : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                currentShift ? 'bg-teal-600 animate-pulse' : 'bg-stone-400'
              }`}
            />
            <span className="flex items-center gap-1">
              {currentShift ? (
                <>
                  <span className="hidden sm:inline">Shift:</span>
                  <AnimatedQar value={currentShift.expectedClosingCash} />
                </>
              ) : (
                'Shift: Closed'
              )}
            </span>
          </button>
        )}

        {/* Store Badge */}
        {currentStore && (
          <div className="hidden lg:flex items-center gap-1 h-7 px-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-600 text-[11px] whitespace-nowrap">
            <Store size={12} className="text-stone-400 shrink-0" />
            <span className="truncate max-w-[120px] font-mono">
              {currentStore.code || currentStore.name}
            </span>
          </div>
        )}

        {/* User Account */}
        {currentUser && (
          <div className="hidden sm:flex items-center gap-1.5 h-7 px-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-700 text-[11px] whitespace-nowrap">
            <span className="w-4 h-4 rounded bg-teal-700 text-white font-mono text-[9px] flex items-center justify-center font-semibold">
              {currentUser.initials || 'OP'}
            </span>
            <span className="truncate max-w-[90px]">{currentUser.fullName}</span>
          </div>
        )}

        {/* Fullscreen Toggle Button */}
        <button
          type="button"
          onClick={() => toggleFullscreen()}
          title={isFullscreen ? 'Exit Fullscreen (Esc / F11)' : 'Enter Fullscreen (F11)'}
          aria-label="Toggle fullscreen"
          className={`hidden sm:flex h-7 px-2 rounded-lg transition items-center gap-1 cursor-pointer shrink-0 ${
            isFullscreen
              ? 'bg-teal-700 text-white hover:bg-teal-800'
              : 'hover:bg-stone-100 text-stone-500 hover:text-stone-900'
          }`}
        >
          <Morph
            active={isFullscreen}
            off={
              <span className="flex items-center gap-1">
                <Maximize2 size={12} />
                <span className="text-[11px] hidden lg:inline">Fullscreen</span>
              </span>
            }
            on={
              <span className="flex items-center gap-1">
                <Minimize2 size={12} />
                <span className="text-[11px] hidden lg:inline">Exit Full</span>
              </span>
            }
          />
        </button>

        {/* Lock Station Button */}
        <button
          type="button"
          onClick={lockStation}
          title="Lock Register"
          aria-label="Lock Register"
          className="h-9 sm:h-7 px-2.5 sm:px-2 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition flex items-center gap-1 cursor-pointer shrink-0"
        >
          <Lock size={13} />
          <span className="text-[11px] hidden sm:inline">Lock</span>
        </button>
      </div>
    </header>
  );
}
