'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Receipt, Globe, Package, Menu } from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';

const PRIMARY_MOBILE_TABS = [
  { label: 'POS', href: '/pos', icon: ShoppingCart },
  { label: 'Invoices', href: '/invoices', icon: Receipt },
  { label: 'Orders', href: '/online-orders', icon: Globe },
  { label: 'Catalog', href: '/products', icon: Package },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isMobileMenuOpen, toggleMobileMenu, setMobileMenuOpen } = useSessionStore();

  const isActive = (href: string) => {
    if (href === '/pos') return pathname === '/pos' || pathname === '/';
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <nav
      aria-label="Mobile quick navigation"
      className="md:hidden shrink-0 bg-white border-t border-stone-200 grid grid-cols-5 px-1 pb-[env(safe-area-inset-bottom)] select-none z-30"
    >
      {PRIMARY_MOBILE_TABS.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.href) && !isMobileMenuOpen;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`min-h-[52px] flex flex-col items-center justify-center gap-0.5 text-[11px] transition cursor-pointer ${
              active ? 'text-teal-700 font-semibold' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <span
              className={`w-6 h-0.5 rounded-full mb-0.5 transition-colors ${
                active ? 'bg-teal-700' : 'bg-transparent'
              }`}
            />
            <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
            <span className="leading-none">{tab.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={toggleMobileMenu}
        aria-expanded={isMobileMenuOpen}
        aria-label="Open all modules menu"
        className={`min-h-[52px] flex flex-col items-center justify-center gap-0.5 text-[11px] transition cursor-pointer ${
          isMobileMenuOpen ? 'text-teal-700 font-semibold' : 'text-stone-500 hover:text-stone-900'
        }`}
      >
        <span
          className={`w-6 h-0.5 rounded-full mb-0.5 transition-colors ${
            isMobileMenuOpen ? 'bg-teal-700' : 'bg-transparent'
          }`}
        />
        <Menu size={17} strokeWidth={isMobileMenuOpen ? 2.2 : 1.8} />
        <span className="leading-none">More</span>
      </button>
    </nav>
  );
}
