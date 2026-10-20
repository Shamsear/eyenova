'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`py-12 px-4 flex flex-col items-center justify-center text-center space-y-2.5 max-w-sm mx-auto ${className}`}
    >
      {Icon && (
        <div className="w-9 h-9 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-500 mb-1">
          <Icon size={18} />
        </div>
      )}

      <h3 className="text-xs font-medium text-stone-900 truncate max-w-full">{title}</h3>

      {description && (
        <p className="text-[11px] text-stone-500 leading-normal max-w-xs">{description}</p>
      )}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 px-3 py-1.5 bg-stone-900 text-stone-50 rounded-md text-xs font-medium hover:bg-stone-800 transition cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
