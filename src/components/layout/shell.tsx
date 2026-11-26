'use client';

import React, { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { MobileBottomNav } from './mobile-bottom-nav';
import { CommandPalette } from './command-palette';
import { LoginOverlay } from '@/components/auth/login-overlay';
import { ShiftModal } from '@/components/pos/shift-modal';
import { useSessionStore } from '@/stores/session-store';
import { usePosStore } from '@/stores/pos-store';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { ADMIN_ONLY_ROUTES } from '@/lib/navigation';
import { ShieldAlert, KeyRound, ShoppingCart, X } from 'lucide-react';
import { Rise } from 'cube-motion/react';

interface ShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const emptySubscribe = () => () => {};

export function Shell({ title, subtitle, children }: ShellProps) {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const {
    isLoggedIn,
    isStationLocked,
    user,
    isAdmin,
    lockStation,
    toggleCommandPalette,
    toggleFullscreen,
  } = useSessionStore();
  const { toast, hideToast } = usePosStore();

  const isRestrictedRoute = ADMIN_ONLY_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(route + '/')
  );
  const userIsAdmin = mounted && user ? isAdmin() : true;
  const isBlocked = mounted && isRestrictedRoute && !userIsAdmin;
  const unlocked = mounted && isLoggedIn && !isStationLocked;

  // Global workspace navigation shortcuts (Ctrl+1..0, Ctrl+K, F11) across all routes
  useHotkeys({
    enabled: unlocked,
    enableNavigation: true,
    onCommandPalette: toggleCommandPalette,
    onF11: toggleFullscreen,
  });

  return (
    <div className="h-screen h-[100dvh] max-h-screen overflow-hidden bg-stone-50 flex text-stone-900 antialiased font-sans">
      {/* Left Navigation Sidebar (drawer on < md, persistent flex column on md+) */}
      <Sidebar />

      {/* Main App Column */}
      <div className="flex-1 flex flex-col h-full max-h-screen overflow-hidden w-full min-w-0">
        <Topbar title={title} subtitle={subtitle} />

        <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-stone-50 relative">
          {!mounted ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-stone-400 gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs font-mono text-xs font-bold">
                EN
              </div>
              <div className="flex items-center gap-2 text-stone-500 text-xs font-mono">
                <div className="w-3.5 h-3.5 border-2 border-stone-300 border-t-teal-700 rounded-full animate-spin" />
                <span>Loading workspace...</span>
              </div>
            </div>
          ) : isBlocked ? (
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
              <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-sm w-full text-center space-y-4 shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto">
                  <ShieldAlert size={24} />
                </div>

                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-stone-900">
                    Administrator Access Required
                  </h2>
                  <p className="text-xs text-stone-500">
                    This module is restricted to administrators. You are signed in as{' '}
                    <span className="font-medium text-stone-800">
                      {user?.fullName || 'Staff Cashier'}
                    </span>
                    .
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={lockStation}
                    className="w-full sm:w-auto min-h-[40px] px-3.5 py-2 bg-stone-900 text-stone-50 rounded-lg text-xs font-medium hover:bg-stone-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <KeyRound size={13} />
                    <span>Switch Operator</span>
                  </button>

                  <Link
                    href="/pos"
                    className="w-full sm:w-auto min-h-[40px] px-3.5 py-2 border border-stone-200 text-stone-700 rounded-lg text-xs font-medium hover:bg-stone-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingCart size={13} />
                    <span>Return to POS</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </main>

        {/* Mobile Bottom Tab Bar (< 768px) */}
        <MobileBottomNav />
      </div>

      {/* Station Lock / Login Screen */}
      {mounted && (!isLoggedIn || isStationLocked) && <LoginOverlay />}

      {/* Ctrl+K Quick Navigation Palette */}
      {unlocked && <CommandPalette />}

      {/* Floating Toast Notification (top on mobile so it never obscures bottom bar/cart pill) */}
      <Rise
        show={Boolean(toast && toast.visible)}
        className="fixed top-14 inset-x-3 sm:top-auto sm:left-auto sm:bottom-4 sm:right-4 z-50 flex items-center gap-2.5 bg-white border border-stone-200 shadow-lg rounded-xl px-3.5 py-2.5 sm:max-w-sm"
      >
        {toast && (
          <>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                toast.isSuccess ? 'bg-teal-600' : 'bg-rose-600'
              }`}
            />
            <div className="flex-1 min-w-0 text-xs">
              <span className="font-semibold text-stone-900 mr-1.5">{toast.title}:</span>
              <span className="text-stone-600">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={hideToast}
              aria-label="Dismiss notification"
              className="w-7 h-7 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer shrink-0"
            >
              <X size={14} />
            </button>
          </>
        )}
      </Rise>

      {/* Persistent Global Register Shift Modal */}
      <ShiftModal />
    </div>
  );
}
