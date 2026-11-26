'use client';

import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSessionStore } from '@/stores/session-store';
import { navSections } from '@/lib/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Lock,
  X,
} from 'lucide-react';

const emptySubscribe = () => () => {};

export function Sidebar() {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);

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
      const doc = document as Document & {
        webkitFullscreenElement?: Element;
        mozFullScreenElement?: Element;
        msFullscreenElement?: Element;
      };
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
          className="fixed inset-0 bg-stone-900/45 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-150"
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Primary navigation"
        className={`fixed top-0 left-0 bottom-0 z-50 md:static md:z-auto bg-stone-50 border-r border-stone-200 text-stone-800 flex flex-col shrink-0 transition-all duration-200 select-none ${
          isMobileMenuOpen
            ? 'translate-x-0 w-72 shadow-2xl'
            : '-translate-x-full md:translate-x-0 ' + (collapsed ? 'md:w-14' : 'md:w-56')
        }`}
      >
        {/* Brand Header */}
        {collapsed && !isMobileMenuOpen ? (
          <div className="h-11 border-b border-stone-200 flex items-center justify-center px-1.5 shrink-0 bg-white">
            <button
              type="button"
              onClick={toggleSidebar}
              title="EyeNova Optics (Click to expand sidebar)"
              aria-label="Expand Sidebar"
              className="w-9 h-9 rounded-lg bg-stone-100 hover:bg-teal-50 border border-stone-200 hover:border-teal-200 p-1 flex items-center justify-center shrink-0 transition cursor-pointer relative group"
            >
              <Image
                src="/logo.png"
                alt="EyeNova Logo"
                width={22}
                height={22}
                className="object-contain transition-opacity duration-150 group-hover:opacity-15"
                style={{ width: 'auto', height: 'auto' }}
              />
              <ChevronRight
                size={15}
                className="absolute inset-0 m-auto text-teal-700 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              />
            </button>
          </div>
        ) : (
          <div className="h-12 md:h-11 border-b border-stone-200 flex items-center justify-between px-3 shrink-0 bg-white">
            <Link
              href="/pos"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 overflow-hidden group min-w-0"
            >
              <div className="w-7 h-7 rounded-lg bg-teal-700/10 border border-teal-700/20 p-1 flex items-center justify-center shrink-0">
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
                <span className="font-semibold text-stone-900 text-xs tracking-tight block leading-tight truncate">
                  EyeNova Optics
                </span>
                <span className="text-[10px] font-mono text-teal-700 block leading-tight">
                  POS &amp; Billing
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden md:flex w-7 h-7 rounded-md hover:bg-stone-100 text-stone-400 hover:text-stone-800 items-center justify-center transition cursor-pointer shrink-0"
              aria-label="Collapse Navigation"
              title="Collapse Sidebar"
            >
              <ChevronLeft size={14} />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden w-9 h-9 rounded-lg hover:bg-stone-100 text-stone-500 flex items-center justify-center transition cursor-pointer shrink-0"
              aria-label="Close Navigation Menu"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Operator Profile Card */}
        {currentUser && (!collapsed || isMobileMenuOpen) && (
          <div className="p-2 mx-2 mt-2 bg-white rounded-xl border border-stone-200 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-mono text-[10px] flex items-center justify-center font-semibold shrink-0">
                {currentUser.initials || 'OP'}
              </div>
              <div className="truncate">
                <span className="font-medium text-xs text-stone-900 truncate block leading-tight">
                  {currentUser.fullName}
                </span>
                <span className="text-[9px] font-mono text-stone-500 block leading-tight truncate">
                  {currentUser.roleBadge || currentUser.role}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={lockStation}
              title="Lock Station"
              aria-label="Lock Station"
              className="w-8 h-8 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-900 flex items-center justify-center transition cursor-pointer shrink-0"
            >
              <Lock size={13} />
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
                    className={`flex items-center gap-2 px-2.5 min-h-[40px] md:min-h-[34px] py-1.5 rounded-lg text-xs transition-all duration-150 group cursor-pointer ${
                      isActive
                        ? 'bg-stone-900 text-white font-medium shadow-xs'
                        : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
                    } ${collapsed && !isMobileMenuOpen ? 'justify-center px-0 w-10 h-10 mx-auto' : ''}`}
                    title={
                      collapsed && !isMobileMenuOpen
                        ? `${item.title}${item.shortcut ? ` (${item.shortcut})` : ''}`
                        : undefined
                    }
                  >
                    <Icon
                      size={15}
                      className={`shrink-0 transition-colors ${
                        isActive ? 'text-teal-300' : 'text-stone-400 group-hover:text-stone-700'
                      }`}
                    />
                    {(!collapsed || isMobileMenuOpen) && (
                      <>
                        <span className="truncate flex-1">{item.title}</span>
                        {item.shortcut && (
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 transition-colors ${
                              isActive
                                ? 'bg-stone-800 text-stone-300'
                                : 'text-stone-400 group-hover:text-stone-600'
                            }`}
                          >
                            {item.shortcut}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-stone-200 p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-1 text-[11px] text-stone-600 bg-white shrink-0">
          <button
            type="button"
            onClick={lockStation}
            title="Lock Register"
            className="flex-1 min-h-[38px] md:min-h-[32px] flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:bg-stone-100 transition cursor-pointer"
          >
            <Lock size={13} className="text-stone-500" />
            {(!collapsed || isMobileMenuOpen) && <span className="truncate">Lock</span>}
          </button>
          <button
            type="button"
            onClick={() => toggleFullscreen()}
            title={isFullscreen ? 'Exit Fullscreen (Esc / F11)' : 'Toggle Fullscreen (F11)'}
            className={`flex-1 min-h-[38px] md:min-h-[32px] flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition cursor-pointer ${
              isFullscreen
                ? 'bg-teal-700 text-white hover:bg-teal-800'
                : 'hover:bg-stone-100 text-stone-600'
            }`}
          >
            {isFullscreen ? (
              <Minimize2 size={13} className="text-teal-100" />
            ) : (
              <Maximize2 size={13} className="text-stone-500" />
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
