'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = '',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 bg-white border-t border-stone-200 text-xs select-none min-w-0 ${className}`}
    >
      {/* Left: Range and Item Count Summary */}
      <div className="text-[11px] font-mono text-stone-500 truncate whitespace-nowrap">
        {totalItems > 0 ? (
          <>
            Showing <span className="font-medium text-stone-800 tabular-nums">{startItem}–{endItem}</span> of{' '}
            <span className="font-medium text-stone-800 tabular-nums">{totalItems}</span>
          </>
        ) : (
          <span>0 items</span>
        )}
      </div>

      {/* Center: Rows per page selector (Desktop) */}
      {onPageSizeChange && (
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-stone-500 whitespace-nowrap">
          <span>Rows:</span>
          <div className="flex items-center border border-stone-200 rounded overflow-hidden">
            {pageSizeOptions.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onPageSizeChange(size)}
                className={`px-1.5 py-0.5 font-mono text-[10px] transition cursor-pointer ${
                  pageSize === size
                    ? 'bg-stone-900 text-white font-medium'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-600'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Right: Page Navigation Controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={!canPrev}
          title="First Page"
          className="hidden sm:flex p-1 rounded hover:bg-stone-100 text-stone-500 hover:text-stone-900 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
        >
          <ChevronsLeft size={13} />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canPrev}
          className="px-2 py-0.5 rounded border border-stone-200 hover:bg-stone-100 text-stone-700 disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-0.5 text-[11px] cursor-pointer"
        >
          <ChevronLeft size={12} />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="px-2 py-0.5 text-[11px] font-mono text-stone-700 whitespace-nowrap">
          <span className="font-medium text-stone-900 tabular-nums">{currentPage}</span>
          <span className="text-stone-400"> / </span>
          <span className="tabular-nums">{totalPages}</span>
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canNext}
          className="px-2 py-0.5 rounded border border-stone-200 hover:bg-stone-100 text-stone-700 disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-0.5 text-[11px] cursor-pointer"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={12} />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={!canNext}
          title="Last Page"
          className="hidden sm:flex p-1 rounded hover:bg-stone-100 text-stone-500 hover:text-stone-900 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
        >
          <ChevronsRight size={13} />
        </button>
      </div>
    </div>
  );
}
