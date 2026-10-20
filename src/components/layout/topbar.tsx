'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSessionStore } from '@/stores/session-store';
import { usePosStore } from '@/stores/pos-store';
import { formatQar } from '@/lib/utils';
import { Store, Clock, Menu, Lock, Maximize2, Minimize2 } from 'lucide-react';

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { user, store, shift, setShift, toggleMobileMenu, lockStation, isStaff, isFullscreen, toggleFullscreen } = useSessionStore();
  const { setShiftModalOpen } = usePosStore();
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    setMounted(true);
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
  // Shift drawer is strictly for Staff (cashier) users only
  const showShiftBadge = mounted && isStaff();

  return (
    <header className="h-10.5 border-b border-stone-200 bg-white flex items-center justify-between px-3 select-none shrink-0">
      {/* Left: Mobile Menu Toggle + Breadcrumb Title */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={toggleMobileMenu}
          aria-label="Toggle Navigation Menu"
          className="md:hidden w-7 h-7 rounded bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition shrink-0 cursor-pointer"
        >
          <Menu size={16} />
        </button>

        <div className="flex items-center gap-1.5 min-w-0">
          <h1 className="font-medium text-stone-900 text-xs sm:text-sm tracking-tight truncate whitespace-nowrap">
            {title}
          </h1>
          {subtitle && (
            <span className="text-[10px] text-stone-400 hidden sm:inline truncate whitespace-nowrap">
              / {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Right Badges (All strictly single-line) */}
      <div className="flex items-center gap-2 text-xs">
        {/* Clock */}
        <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-stone-400">
          <Clock size={11} />
          <span>{timeStr}</span>
        </div>

        {/* Shift Drawer Balance Button (Shown for cashiers / on POS; hidden for Admins on backend pages matching desktop POS) */}
        {showShiftBadge && (
          <button
            type="button"
            onClick={() => setShiftModalOpen(true)}
            title={
              currentShift
                ? `Shift Open (Expected Cash: ${formatQar(currentShift.expectedClosingCash)}). Click to reconcile or close.`
                : 'Shift Closed. Click to declare opening float.'
            }
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 text-[11px] font-mono tabular-nums whitespace-nowrap transition cursor-pointer"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                currentShift ? 'bg-emerald-600 animate-pulse' : 'bg-stone-400'
              }`}
            />
            <span>{currentShift ? `Shift: ${formatQar(currentShift.expectedClosingCash)}` : 'Shift: Closed'}</span>
          </button>
        )}

        {/* Store Badge */}
        {currentStore && (
          <div className="hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-50 border border-stone-200 text-stone-600 text-[11px] whitespace-nowrap">
            <Store size={11} className="text-stone-400 shrink-0" />
            <span className="truncate max-w-[120px] font-mono">{currentStore.code || currentStore.name}</span>
          </div>
        )}

        {/* User Account */}
        {currentUser && (
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-stone-50 border border-stone-200 text-stone-700 text-[11px] whitespace-nowrap">
            <span className="w-4 h-4 rounded bg-stone-200 text-stone-700 font-mono text-[9px] flex items-center justify-center font-medium">
              {currentUser.initials || 'OP'}
            </span>
            <span className="truncate max-w-[90px] hidden sm:inline">{currentUser.fullName}</span>
          </div>
        )}

        {/* Fullscreen Toggle Button */}
        <button
          onClick={() => toggleFullscreen()}
          title={isFullscreen ? 'Exit Fullscreen (Esc / F11)' : 'Enter Fullscreen (F11)'}
          className={`p-1 rounded transition flex items-center gap-1 cursor-pointer shrink-0 ${
            isFullscreen
              ? 'bg-stone-900 text-stone-50 hover:bg-stone-800'
              : 'hover:bg-stone-100 text-stone-500 hover:text-stone-900'
          }`}
        >
          {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          <span className="text-[11px] hidden md:inline">{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
        </button>

        {/* Lock Station Button */}
        <button
          onClick={lockStation}
          title="Lock Register"
          className="p-1 rounded hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition flex items-center gap-1 cursor-pointer shrink-0"
        >
          <Lock size={12} />
          <span className="text-[11px] hidden sm:inline">Lock</span>
        </button>
      </div>
    </header>
  );
}
