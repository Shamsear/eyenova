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
    <div className="bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 space-y-2.5 select-none shrink-0">
      {/* Top Bar: Title + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-sm font-semibold text-stone-900 truncate">{title}</h2>
          {subtitle && (
            <span className="text-[11px] text-stone-500 font-mono hidden sm:inline truncate">
              {subtitle}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-1.5 justify-start sm:justify-end shrink-0 min-w-0">
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="min-h-[38px] sm:min-h-[32px] px-3 py-1.5 border border-stone-200 hover:bg-stone-50 rounded-lg text-xs font-medium text-stone-700 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {secondaryAction.icon && <secondaryAction.icon size={13} className="text-stone-500" />}
              <span>{secondaryAction.label}</span>
            </button>
          )}

          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="min-h-[38px] sm:min-h-[32px] px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
            >
              {primaryAction.icon && <primaryAction.icon size={13} />}
              <span>{primaryAction.label}</span>
            </button>
          )}

          {children}
        </div>
      </div>

      {/* Bottom Bar: Search + Filter Tabs */}
      {(onSearchChange || filters) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
          {/* Search Box (16px on mobile prevents iOS Safari auto-zoom) */}
          {onSearchChange && (
            <div className="relative w-full sm:w-64 shrink-0">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-10 sm:h-8 pl-8 pr-8 text-[16px] sm:text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-hidden focus:border-teal-700 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X size={13} />
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
                    className={`min-h-[34px] sm:min-h-[28px] px-2.5 py-1 rounded-lg text-[11px] transition whitespace-nowrap cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-stone-900 text-white font-medium'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200/80'
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
