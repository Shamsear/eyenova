'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export interface ResponsiveDialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
  disableDismiss?: boolean;
  bodyClassName?: string;
  headerExtra?: React.ReactNode;
}

/**
 * Unified adaptive dialog: renders as a thumb-friendly bottom sheet on phones (<640px)
 * and a centered modal on tablets/desktops (sm+), with Escape handling and safe-area padding.
 */
export function ResponsiveDialog({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidthClass = 'sm:max-w-lg',
  disableDismiss = false,
  bodyClassName,
  headerExtra,
}: ResponsiveDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableDismiss) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, disableDismiss, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => {
            if (!disableDismiss) onClose();
          }}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'bg-white w-full border border-stone-200 shadow-2xl flex flex-col overflow-hidden',
              'rounded-t-2xl sm:rounded-2xl max-h-[92dvh] sm:max-h-[88dvh]',
              maxWidthClass
            )}
          >
            {/* Mobile Sheet Handle */}
            <div className="sm:hidden flex justify-center pt-2 pb-0.5 shrink-0">
              <span className="w-9 h-1 rounded-full bg-stone-300" aria-hidden="true" />
            </div>

            {(title || headerExtra) && (
              <div className="px-4 py-3 bg-white border-b border-stone-200 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {icon && <div className="shrink-0">{icon}</div>}
                  <div className="min-w-0 flex-1">
                    {title && (
                      <h2 className="text-sm font-semibold text-stone-900 truncate leading-tight">
                        {title}
                      </h2>
                    )}
                    {subtitle && (
                      <div className="text-[11px] font-mono text-stone-500 truncate mt-0.5">
                        {subtitle}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {headerExtra}
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={disableDismiss}
                    aria-label="Close dialog"
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 disabled:opacity-40 transition cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            <div className={cn('flex-1 min-h-0 overflow-y-auto', bodyClassName)}>
              {children}
            </div>

            {footer && (
              <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
