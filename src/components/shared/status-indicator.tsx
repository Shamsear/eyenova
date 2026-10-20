'use client';

import React from 'react';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusIndicatorProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

const variantStyles: Record<StatusVariant, { dot: string; text: string }> = {
  success: {
    dot: 'bg-emerald-600',
    text: 'text-emerald-700',
  },
  warning: {
    dot: 'bg-amber-600',
    text: 'text-amber-700',
  },
  danger: {
    dot: 'bg-rose-600',
    text: 'text-rose-700',
  },
  info: {
    dot: 'bg-sky-600',
    text: 'text-sky-700',
  },
  neutral: {
    dot: 'bg-stone-400',
    text: 'text-stone-600',
  },
};

export function StatusIndicator({ status, variant = 'neutral', className = '' }: StatusIndicatorProps) {
  const styles = variantStyles[variant];

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap min-w-0 ${styles.text} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
      <span className="truncate">{status}</span>
    </div>
  );
}
