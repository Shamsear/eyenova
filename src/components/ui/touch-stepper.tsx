'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TouchStepperProps {
  value: number;
  onDecrement: (e: React.MouseEvent) => void;
  onIncrement: (e: React.MouseEvent) => void;
  disableDecrement?: boolean;
  disableIncrement?: boolean;
  incrementTitle?: string;
  decrementTitle?: string;
  size?: 'compact' | 'touch';
  className?: string;
}

/**
 * Ergonomic quantity stepper sized for both desktop registers and touch tablets/phones.
 */
export function TouchStepper({
  value,
  onDecrement,
  onIncrement,
  disableDecrement = false,
  disableIncrement = false,
  incrementTitle = 'Increase quantity',
  decrementTitle = 'Decrease quantity',
  size = 'touch',
  className,
}: TouchStepperProps) {
  const btnSize =
    size === 'compact'
      ? 'w-8 h-8 sm:w-7 sm:h-7'
      : 'w-9 h-9 sm:w-8 sm:h-8';

  return (
    <div
      className={cn(
        'inline-flex items-center border border-stone-200 rounded-lg bg-white overflow-hidden shrink-0',
        className
      )}
    >
      <button
        type="button"
        disabled={disableDecrement}
        onClick={onDecrement}
        title={decrementTitle}
        aria-label={decrementTitle}
        className={cn(
          btnSize,
          'flex items-center justify-center text-stone-600 hover:bg-stone-100 active:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer'
        )}
      >
        <Minus size={13} />
      </button>
      <span className="min-w-[28px] px-1 text-center font-mono text-xs font-semibold text-stone-900 tabular-nums select-none">
        {value}
      </span>
      <button
        type="button"
        disabled={disableIncrement}
        onClick={onIncrement}
        title={incrementTitle}
        aria-label={incrementTitle}
        className={cn(
          btnSize,
          'flex items-center justify-center text-stone-600 hover:bg-stone-100 active:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer'
        )}
      >
        <Plus size={13} />
      </button>
    </div>
  );
}
