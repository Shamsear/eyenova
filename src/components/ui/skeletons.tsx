'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="p-3 space-y-2.5 animate-pulse" aria-busy="true" aria-label="Loading records">
      <div className="grid gap-3 pb-2 border-b border-stone-200" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 bg-stone-200 rounded w-3/4" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-3 py-2 border-b border-stone-100"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className={cn('h-3.5 bg-stone-100 rounded', c === 0 ? 'w-4/5' : 'w-2/3')} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 animate-pulse" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-stone-200 rounded-xl p-2.5 flex flex-col justify-between h-[152px]"
        >
          <div className="h-12 bg-stone-100 rounded-lg" />
          <div className="space-y-1.5 mt-2">
            <div className="w-14 h-2.5 bg-stone-100 rounded" />
            <div className="w-4/5 h-3.5 bg-stone-200/70 rounded" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-stone-100">
            <div className="w-16 h-3.5 bg-stone-200 rounded" />
            <div className="w-7 h-7 bg-stone-100 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function KpiStripSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-2">
          <div className="w-24 h-2.5 bg-stone-100 rounded" />
          <div className="w-28 h-6 bg-stone-200 rounded" />
          <div className="w-20 h-2.5 bg-stone-100 rounded" />
        </div>
      ))}
    </div>
  );
}
