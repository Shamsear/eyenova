'use client';

import React from 'react';
import { Search, X, LucideIcon } from 'lucide-react';

interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  activeFilter?: string;
  onFilterChange?: (filterId: string) => void;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters,
  activeFilter,
  onFilterChange,
  primaryAction,
  secondaryAction,
  children,
}: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-stone-200 px-3 py-2.5 space-y-2 select-none shrink-0">
      {/* Top Bar: Title + Actions */}
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-sm font-medium text-stone-900 truncate whitespace-nowrap">{title}</h2>
          {subtitle && (
            <span className="text-[11px] text-stone-400 font-mono hidden sm:inline truncate whitespace-nowrap">
              {subtitle}
            </span>
          )}
        </div>

        {/* Action Buttons (Strictly Single-Line) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="px-2.5 py-1 border border-stone-200 hover:bg-stone-50 rounded-md text-xs font-medium text-stone-700 transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              {secondaryAction.icon && <secondaryAction.icon size={12} className="text-stone-500" />}
              <span>{secondaryAction.label}</span>
            </button>
          )}

          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-md text-xs font-medium transition flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-xs"
            >
              {primaryAction.icon && <primaryAction.icon size={12} />}
              <span>{primaryAction.label}</span>
            </button>
          )}

          {children}
        </div>
      </div>

      {/* Bottom Bar: Search + Filter Tabs */}
      {(onSearchChange || filters) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
          {/* Search Box */}
          {onSearchChange && (
            <div className="relative w-full sm:w-64 shrink-0">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-8 pl-7 pr-7 text-xs bg-stone-50 border border-stone-200 rounded-md text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-400 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Filter Chips / Tabs (Scrollable on mobile) */}
          {filters && onFilterChange && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 min-w-0">
              {filters.map((f) => {
                const isActive = activeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onFilterChange(f.id)}
                    className={`px-2 py-1 rounded text-[11px] transition whitespace-nowrap cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-stone-900 text-white font-medium'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200/60'
                    }`}
                  >
                    <span>{f.label}</span>
                    {typeof f.count === 'number' && (
                      <span className={`ml-1 font-mono text-[9px] tabular-nums ${isActive ? 'text-stone-300' : 'text-stone-400'}`}>
                        ({f.count})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
