'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { LoginOverlay } from '@/components/auth/login-overlay';
import { ShiftModal } from '@/components/pos/shift-modal';
import { useSessionStore } from '@/stores/session-store';
import { usePosStore } from '@/stores/pos-store';
import { ShieldAlert, KeyRound, ShoppingCart, X } from 'lucide-react';

interface ShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const ADMIN_ONLY_ROUTES = ['/treasury', '/reports', '/advisor', '/dashboard', '/settings', '/online-stock'];

export function Shell({ title, subtitle, children }: ShellProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { isLoggedIn, isStationLocked, isSidebarCollapsed, user, isAdmin, lockStation } = useSessionStore();
  const { toast, hideToast } = usePosStore();

  const collapsed = mounted ? isSidebarCollapsed : false;
  const isRestrictedRoute = ADMIN_ONLY_ROUTES.some((route) => pathname === route || pathname?.startsWith(route + '/'));
  const userIsAdmin = mounted && user ? isAdmin() : true;
  const isBlocked = mounted && isRestrictedRoute && !userIsAdmin;

  return (
    <div className="h-screen h-[100dvh] max-h-screen overflow-hidden bg-stone-50 flex text-stone-900 antialiased font-sans">
      {/* Left Sidebar remains permanently visible and mounted */}
      <Sidebar />

      {/* Main App Layout */}
      <div
        className={`flex-1 flex flex-col h-full max-h-screen overflow-hidden transition-all duration-200 w-full min-w-0 ${
          collapsed ? 'md:ml-14' : 'md:ml-56'
        }`}
      >
        <Topbar title={title} subtitle={subtitle} />

        <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-stone-50 relative">
          {!mounted ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-stone-400 gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shadow-2xs">
                <span className="font-semibold text-xs tracking-tight text-stone-700">EN</span>
              </div>
              <div className="flex items-center gap-2 text-stone-500 text-xs font-mono">
                <div className="w-3.5 h-3.5 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
                <span>Loading workspace...</span>
              </div>
            </div>
          ) : isBlocked ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-sm w-full text-center space-y-4 shadow-xs">
                <div className="w-12 h-12 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 mx-auto">
                  <ShieldAlert size={24} />
                </div>

                <div className="space-y-1">
                  <h2 className="text-sm font-medium text-stone-900">Administrator Access Required</h2>
                  <p className="text-xs text-stone-500">
                    This module is restricted to administrators. You are signed in as{' '}
                    <span className="font-medium text-stone-800">{user?.fullName || 'Staff Cashier'}</span>.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <button
                    onClick={lockStation}
                    className="w-full sm:w-auto px-3 py-2 bg-stone-900 text-stone-50 rounded-lg text-xs font-medium hover:bg-stone-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <KeyRound size={13} />
                    <span>Switch Operator</span>
                  </button>

                  <Link
                    href="/pos"
                    className="w-full sm:w-auto px-3 py-2 border border-stone-200 text-stone-700 rounded-lg text-xs font-medium hover:bg-stone-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
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
      </div>

      {/* If station is locked or not logged in, overlay login screen */}
      {mounted && (!isLoggedIn || isStationLocked) && <LoginOverlay />}

      {/* Floating Single-Line Minimalist Toast Notification */}
      {toast && toast.visible && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 bg-white border border-stone-200 shadow-md rounded-lg px-3 py-2.5 max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              toast.isSuccess ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          />
          <div className="flex-1 min-w-0 text-xs">
            <span className="font-medium text-stone-900 mr-1.5 truncate">{toast.title}:</span>
            <span className="text-stone-500 truncate">{toast.message}</span>
          </div>
          <button onClick={hideToast} className="text-stone-400 hover:text-stone-700 cursor-pointer p-0.5">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Persistent Global Register Shift Modal */}
      <ShiftModal />
    </div>
  );
}
