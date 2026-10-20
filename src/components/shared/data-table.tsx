'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Pagination } from './pagination';
import { EmptyState } from './empty-state';
import { Search } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  searchQuery?: string;
  searchFields?: ((item: T) => string | undefined | null)[];
  filterFn?: (item: T) => boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  renderCard?: (item: T) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  searchQuery = '',
  searchFields,
  filterFn,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  renderCard,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching the current view.',
  className = '',
  onRowClick,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  // Reset to page 1 whenever search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Step 1: Global Search & Filter across the entire dataset FIRST
  const filteredData = useMemo(() => {
    let result = data;

    // Apply custom filter predicate if provided
    if (filterFn) {
      result = result.filter(filterFn);
    }

    // Apply text search across all defined search fields
    const query = searchQuery.trim().toLowerCase();
    if (query && searchFields && searchFields.length > 0) {
      result = result.filter((item) => {
        return searchFields.some((fieldExtractor) => {
          const val = fieldExtractor(item);
          return val ? val.toLowerCase().includes(query) : false;
        });
      });
    }

    return result;
  }, [data, searchQuery, searchFields, filterFn]);

  // Total count & page clamp
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Auto-clamp current page if total pages shrunk
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Step 2: Slice for viewport
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  return (
    <div className={`flex flex-col flex-1 min-h-0 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-none ${className}`}>
      {/* Content Container */}
      <div className="flex-1 min-h-0 overflow-auto">
        {totalItems === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={searchQuery ? 'Try modifying your search query or filter options.' : emptyDescription}
            icon={Search}
          />
        ) : (
          <>
            {/* Desktop / Laptop Table View (Hidden on screens < 768px) */}
            <table className="hidden md:table w-full border-collapse text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 sticky top-0 z-10 select-none">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      className={`px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-stone-500 font-medium whitespace-nowrap ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      } ${col.headerClassName || ''}`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedData.map((item) => {
                  const rowKey = keyExtractor(item);
                  return (
                    <tr
                      key={rowKey}
                      onClick={() => onRowClick && onRowClick(item)}
                      className={`h-10 hover:bg-stone-50/80 transition-colors ${
                        onRowClick ? 'cursor-pointer' : ''
                      }`}
                    >
                      {columns.map((col) => (
                        <td
                          key={`${rowKey}-${col.key}`}
                          className={`px-3 py-2 text-xs text-stone-800 whitespace-nowrap truncate max-w-[240px] ${
                            col.align === 'right'
                              ? 'text-right tabular-nums font-mono'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          } ${col.className || ''}`}
                        >
                          {col.render
                            ? col.render(item)
                            : (item as Record<string, unknown>)[col.key] !== undefined
                            ? String((item as Record<string, unknown>)[col.key])
                            : null}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile / Small Devices Card View (Rendered on screens < 768px) */}
            <div className="md:hidden p-2.5 space-y-2">
              {paginatedData.map((item) => {
                const cardKey = keyExtractor(item);

                // Use custom card renderer if provided
                if (renderCard) {
                  return (
                    <div
                      key={cardKey}
                      onClick={() => onRowClick && onRowClick(item)}
                      className={`bg-white border border-stone-200 rounded-lg p-3 space-y-2 transition ${
                        onRowClick ? 'cursor-pointer hover:border-stone-300' : ''
                      }`}
                    >
                      {renderCard(item)}
                    </div>
                  );
                }

                // Default Fallback 3-tier card rendering
                const firstCol = columns[0];
                const lastCol = columns[columns.length - 1];
                const otherCols = columns.slice(1, -1);

                return (
                  <div
                    key={cardKey}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`bg-white border border-stone-200 rounded-lg p-3 space-y-1.5 transition ${
                      onRowClick ? 'cursor-pointer hover:border-stone-300' : ''
                    }`}
                  >
                    {/* Tier 1: Header */}
                    <div className="flex items-center justify-between gap-2 min-w-0 pb-1.5 border-b border-stone-100">
                      <div className="font-medium text-xs text-stone-900 truncate">
                        {firstCol.render ? firstCol.render(item) : String((item as Record<string, unknown>)[firstCol.key] ?? '')}
                      </div>
                      <div className="text-[11px] shrink-0">
                        {lastCol.render ? lastCol.render(item) : String((item as Record<string, unknown>)[lastCol.key] ?? '')}
                      </div>
                    </div>

                    {/* Tier 2: Metadata Rows (Strictly Single-Line) */}
                    <div className="space-y-1 py-0.5">
                      {otherCols.slice(0, 3).map((col) => (
                        <div key={col.key} className="flex items-center justify-between gap-2 text-[11px] min-w-0">
                          <span className="text-stone-400 font-mono uppercase text-[9px] truncate">{col.header}:</span>
                          <span className="text-stone-700 truncate font-medium">
                            {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Single-Line Pagination Footer */}
      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={pageSizeOptions}
      />
    </div>
  );
}
