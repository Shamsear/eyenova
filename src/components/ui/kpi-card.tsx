'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  sublabel?: React.ReactNode;
  tone?: 'default' | 'teal' | 'emerald' | 'amber' | 'rose';
  icon?: React.ReactNode;
  className?: string;
}

const toneValueMap: Record<NonNullable<KpiCardProps['tone']>, string> = {
  default: 'text-stone-900',
  teal: 'text-teal-700',
  emerald: 'text-emerald-700',
  amber: 'text-amber-700',
  rose: 'text-rose-700',
};

export function KpiCard({
  label,
  value,
  sublabel,
  tone = 'default',
  icon,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        'bg-white p-3.5 rounded-xl border border-stone-200 flex flex-col justify-between min-w-0',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-[10px] font-mono font-medium text-stone-500 uppercase tracking-wider truncate">
          {label}
        </span>
        {icon && <span className="text-stone-400 shrink-0">{icon}</span>}
      </div>
      <div
        className={cn(
          'text-lg sm:text-xl font-mono font-semibold mt-1 tabular-nums truncate',
          toneValueMap[tone]
        )}
      >
        {value}
      </div>
      {sublabel && (
        <div className="text-[11px] text-stone-500 mt-0.5 truncate">{sublabel}</div>
      )}
    </div>
  );
}
