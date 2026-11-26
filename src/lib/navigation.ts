import type React from 'react';
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
  SlidersHorizontal,
  History,
  Layers,
} from 'lucide-react';

export interface NavItem {
  title: string;
  shortTitle: string;
  href: string;
  icon: React.ElementType;
  shortcut?: string;
  adminOnly?: boolean;
  keywords?: string[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const ADMIN_ONLY_ROUTES = [
  '/treasury',
  '/reports',
  '/advisor',
  '/dashboard',
  '/settings',
  '/online-stock',
];

export const navSections: NavSection[] = [
  {
    title: 'REGISTER & BILLING',
    items: [
      {
        title: 'POS Checkout',
        shortTitle: 'POS',
        href: '/pos',
        icon: ShoppingCart,
        shortcut: 'Ctrl+1',
        keywords: ['register', 'cashier', 'sale', 'billing', 'cart'],
      },
      {
        title: 'Invoices & Receipts',
        shortTitle: 'Invoices',
        href: '/invoices',
        icon: Receipt,
        shortcut: 'Ctrl+2',
        keywords: ['bills', 'refund', 'reprint', 'settlement'],
      },
      {
        title: 'Online Orders',
        shortTitle: 'Orders',
        href: '/online-orders',
        icon: Globe,
        shortcut: 'Ctrl+3',
        keywords: ['shopify', 'web', 'dispatch', 'tracking'],
      },
    ],
  },
  {
    title: 'INVENTORY & SUPPLY',
    items: [
      {
        title: 'Product Catalog',
        shortTitle: 'Catalog',
        href: '/products',
        icon: Package,
        shortcut: 'Ctrl+4',
        keywords: ['frames', 'lenses', 'sku', 'barcode', 'prices'],
      },
      {
        title: 'Purchases & Inbound',
        shortTitle: 'Purchases',
        href: '/purchases',
        icon: Truck,
        shortcut: 'Ctrl+5',
        keywords: ['grn', 'po', 'suppliers', 'reorder'],
      },
      {
        title: 'Stock Cardex',
        shortTitle: 'Cardex',
        href: '/cardex',
        icon: History,
        shortcut: 'Ctrl+6',
        keywords: ['ledger', 'audit', 'traceability', 'movements'],
      },
      {
        title: 'FEFO Batches',
        shortTitle: 'Batches',
        href: '/batches',
        icon: CalendarClock,
        keywords: ['expiry', 'lot', 'shelf life'],
      },
      {
        title: 'Physical Stock Audit',
        shortTitle: 'Audit',
        href: '/stock-count',
        icon: ClipboardCheck,
        keywords: ['count', 'variance', 'reconciliation'],
      },
      {
        title: 'Online Stock Matrix',
        shortTitle: 'Matrix',
        href: '/online-stock',
        icon: SlidersHorizontal,
        adminOnly: true,
        keywords: ['powers', 'toric', 'availability', 'shopify'],
      },
    ],
  },
  {
    title: 'FINANCIAL & TREASURY',
    items: [
      {
        title: 'Channels & Snoonu Profit',
        shortTitle: 'Channels',
        href: '/channels',
        icon: Layers,
        shortcut: 'Ctrl+7',
        keywords: ['talabat', 'rafeeq', 'commission', 'margins'],
      },
      {
        title: 'Company Treasury',
        shortTitle: 'Treasury',
        href: '/treasury',
        icon: Landmark,
        shortcut: 'Ctrl+8',
        adminOnly: true,
        keywords: ['vault', 'bank', 'cash', 'deposit'],
      },
      {
        title: 'Store Expenses',
        shortTitle: 'Expenses',
        href: '/expenses',
        icon: Wallet,
        shortcut: 'Ctrl+9',
        keywords: ['petty cash', 'bills', 'payouts'],
      },
      {
        title: 'Financial Reports',
        shortTitle: 'Reports',
        href: '/reports',
        icon: BarChart3,
        adminOnly: true,
        keywords: ['pnl', 'profit', 'revenue', 'csv'],
      },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      {
        title: 'Overview Dashboard',
        shortTitle: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        shortcut: 'Ctrl+0',
        adminOnly: true,
        keywords: ['kpi', 'home', 'summary'],
      },
      {
        title: 'AI Commercial Advisor',
        shortTitle: 'Advisor',
        href: '/advisor',
        icon: Bot,
        adminOnly: true,
        keywords: ['insights', 'reorder', 'expiring'],
      },
      {
        title: 'Customers Directory',
        shortTitle: 'Customers',
        href: '/customers',
        icon: Users,
        keywords: ['clients', 'vip', 'store credit', 'phone'],
      },
      {
        title: 'System Settings',
        shortTitle: 'Settings',
        href: '/settings',
        icon: Settings,
        adminOnly: true,
        keywords: ['company', 'tax', 'users', 'stores', 'discrepancies'],
      },
      {
        title: 'Customer Display',
        shortTitle: 'Display',
        href: '/customer-display',
        icon: Tv,
        shortcut: 'Ext',
        keywords: ['screen', 'pole display', 'monitor'],
      },
    ],
  },
];

export const allNavItems: NavItem[] = navSections.flatMap((section) => section.items);
