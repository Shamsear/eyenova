'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSessionStore } from '@/stores/session-store';
import {
  ShoppingCart,
  Receipt,
  Globe,
  Package,
  Truck,
  CalendarClock,
  ClipboardCheck,
  Landmark,
  Wallet,
  BarChart3,
  Bot,
  LayoutDashboard,
  Users,
  Settings,
  Tv,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  Lock,
} from 'lucide-react';

interface NavSection {
  title: string;
  items: {
    title: string;
    href: string;
    icon: React.ElementType;
    shortcut: string;
    adminOnly?: boolean;
  }[];
}

const navSections: NavSection[] = [
  {
    title: 'REGISTER & BILLING',
    items: [
      { title: 'POS Checkout', href: '/pos', icon: ShoppingCart, shortcut: 'Ctrl+1' },
      { title: 'Invoices & Receipts', href: '/invoices', icon: Receipt, shortcut: 'Ctrl+2' },
      { title: 'Online Orders', href: '/online-orders', icon: Globe, shortcut: 'Ctrl+3' },
    ],
  },
  {
    title: 'INVENTORY & SUPPLY',
    items: [
      { title: 'Product Catalog', href: '/products', icon: Package, shortcut: 'Ctrl+4' },
      { title: 'Purchases & Inbound', href: '/purchases', icon: Truck, shortcut: 'Ctrl+5' },
      { title: 'FEFO Batches', href: '/batches', icon: CalendarClock, shortcut: 'Ctrl+6' },
      { title: 'Physical Stock Audit', href: '/stock-count', icon: ClipboardCheck, shortcut: 'Ctrl+7' },
      { title: 'Online Stock Matrix', href: '/online-stock', icon: SlidersHorizontal, shortcut: 'Ctrl+0', adminOnly: true },
    ],
  },
  {
    title: 'FINANCIAL & TREASURY',
    items: [
      { title: 'Company Treasury', href: '/treasury', icon: Landmark, shortcut: 'Ctrl+8', adminOnly: true },
      { title: 'Store Expenses', href: '/expenses', icon: Wallet, shortcut: 'Ctrl+9' },
      { title: 'Financial Reports', href: '/reports', icon: BarChart3, shortcut: 'F4', adminOnly: true },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { title: 'AI Commercial Advisor', href: '/advisor', icon: Bot, shortcut: 'F5', adminOnly: true },
      { title: 'Overview Dashboard', href: '/dashboard', icon: LayoutDashboard, shortcut: 'F1', adminOnly: true },
      { title: 'Customers Directory', href: '/customers', icon: Users, shortcut: 'F2' },
      { title: 'System Settings', href: '/settings', icon: Settings, shortcut: 'F3', adminOnly: true },
      { title: 'Customer Display', href: '/customer-display', icon: Tv, shortcut: 'Ext' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // When pathname changes or on mount, auto-scroll and focus the active link
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [pathname, mounted]);

  const {
    user,
    isAdmin,
    lockStation,
    isSidebarCollapsed,
    toggleSidebar,
    isFullscreen,
    toggleFullscreen,
    setFullscreen,
    isMobileMenuOpen,
    setMobileMenuOpen,
  } = useSessionStore();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleFsChange = () => {
      const doc = document as any;
      const activeFs = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setFullscreen(activeFs);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, [setFullscreen]);

  const userIsAdmin = mounted && user ? isAdmin() : true;
  const collapsed = mounted ? isSidebarCollapsed : false;
  const currentUser = mounted ? user : null;

  // Filter sections and items based on role (hydrates cleanly with 0 mismatch)
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.adminOnly || userIsAdmin),
    }))
    .filter((section) => section.items.length > 0);

  const isItemActive = (href: string) => {
    if (href === '/pos') {
      return pathname === '/pos' || pathname === '/';
    }
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-150"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 bg-stone-50 border-r border-stone-200 text-stone-800 flex flex-col transition-all duration-200 select-none ${
          isMobileMenuOpen
            ? 'translate-x-0 w-60 shadow-xl'
            : '-translate-x-full md:translate-x-0 ' + (collapsed ? 'md:w-14' : 'md:w-56')
        }`}
      >
        {/* Brand Header */}
        {collapsed && !isMobileMenuOpen ? (
          <div className="h-11 border-b border-stone-200 flex items-center justify-center px-1.5 shrink-0 bg-white">
            <button
              onClick={toggleSidebar}
              title="EyeNova Optics (Click to expand sidebar)"
              aria-label="Expand Sidebar"
              className="w-8 h-8 rounded-md bg-stone-100 hover:bg-stone-200 border border-stone-200 p-1 flex items-center justify-center shrink-0 transition cursor-pointer relative group"
            >
              <Image
                src="/logo.png"
                alt="EyeNova Logo"
                width={22}
                height={22}
                className="object-contain transition-opacity duration-150 group-hover:opacity-20"
                style={{ width: 'auto', height: 'auto' }}
              />
              <ChevronRight
                size={14}
                className="absolute inset-0 m-auto text-stone-700 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              />
            </button>
          </div>
        ) : (
          <div className="h-11 border-b border-stone-200 flex items-center justify-between px-3 shrink-0 bg-white">
            <Link href="/pos" className="flex items-center gap-2 overflow-hidden group min-w-0">
              <div className="w-6 h-6 rounded-md bg-stone-100 border border-stone-200 p-0.5 flex items-center justify-center shrink-0">
                <Image
                  src="/logo.png"
                  alt="EyeNova Logo"
                  width={18}
                  height={18}
                  className="object-contain"
                  style={{ width: 'auto', height: 'auto' }}
                />
              </div>
              <div className="truncate">
                <span className="font-medium text-stone-900 text-xs tracking-tight block leading-tight truncate">
                  EyeNova Optics
                </span>
              </div>
            </Link>

            <button
              onClick={toggleSidebar}
              className="hidden md:flex w-5 h-5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 items-center justify-center transition cursor-pointer shrink-0"
              aria-label="Collapse Navigation"
              title="Collapse Sidebar"
            >
              <ChevronLeft size={13} />
            </button>
          </div>
        )}

        {/* Operator Profile Card */}
        {currentUser && (!collapsed || isMobileMenuOpen) && (
          <div className="p-2 mx-2 mt-2 bg-white rounded-lg border border-stone-200 flex items-center justify-between gap-1.5 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-stone-100 text-stone-700 font-mono text-[10px] flex items-center justify-center font-medium shrink-0">
                {currentUser.initials || 'OP'}
              </div>
              <div className="truncate">
                <span className="font-medium text-xs text-stone-900 truncate block leading-tight">{currentUser.fullName}</span>
                <span className="text-[9px] font-mono text-stone-500 block leading-tight truncate">
                  {currentUser.roleBadge || currentUser.role}
                </span>
              </div>
            </div>

            <button
              onClick={lockStation}
              title="Lock Station"
              className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-800 transition cursor-pointer shrink-0"
            >
              <Lock size={12} />
            </button>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 min-h-0 overflow-y-auto py-2 px-1.5 space-y-3">
          {visibleSections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              {(!collapsed || isMobileMenuOpen) && (
                <div className="px-2 py-0.5 text-[9px] font-mono text-stone-400 uppercase tracking-wider truncate">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const isActive = isItemActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    ref={isActive ? activeItemRef : undefined}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all duration-150 group cursor-pointer ${
                      isActive
                        ? 'bg-stone-900 text-white font-medium shadow-xs'
                        : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
                    } ${collapsed && !isMobileMenuOpen ? 'justify-center px-0 w-9 h-9 mx-auto' : ''}`}
                    title={collapsed && !isMobileMenuOpen ? `${item.title} (${item.shortcut})` : undefined}
                  >
                    <Icon
                      size={15}
                      className={`shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-stone-400 group-hover:text-stone-700'
                      }`}
                    />
                    {(!collapsed || isMobileMenuOpen) && (
                      <>
                        <span className="truncate flex-1">{item.title}</span>
                        <span
                          className={`text-[9px] font-mono px-1 py-0.5 rounded shrink-0 transition-colors ${
                            isActive
                              ? 'bg-stone-800 text-stone-300'
                              : 'text-stone-400 group-hover:text-stone-600'
                          }`}
                        >
                          {item.shortcut}
                        </span>
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-stone-200 p-1.5 flex items-center justify-between gap-1 text-[11px] text-stone-600 bg-white shrink-0">
          <button
            onClick={lockStation}
            title="Lock Register"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded hover:bg-stone-100 transition cursor-pointer"
          >
            <Lock size={12} className="text-stone-500" />
            {(!collapsed || isMobileMenuOpen) && <span className="truncate">Lock</span>}
          </button>
          <button
            onClick={() => toggleFullscreen()}
            title={isFullscreen ? 'Exit Fullscreen (Esc / F11)' : 'Toggle Fullscreen (F11)'}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded transition cursor-pointer ${
              isFullscreen ? 'bg-stone-900 text-stone-50 hover:bg-stone-800' : 'hover:bg-stone-100 text-stone-600'
            }`}
          >
            {isFullscreen ? (
              <Minimize2 size={12} className={isFullscreen ? 'text-stone-300' : 'text-stone-500'} />
            ) : (
              <Maximize2 size={12} className="text-stone-500" />
            )}
            {(!collapsed || isMobileMenuOpen) && (
              <span className="truncate">{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
