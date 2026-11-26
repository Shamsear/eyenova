'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export interface SlideOverDrawerProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string;
}

/**
 * Right-side slide-over inspector drawer (full-width sheet on small phones, fixed inspector on sm+).
 */
export function SlideOverDrawer({
  open,
  onClose,
  title,
  subtitle,
  badge,
  children,
  footer,
  widthClass = 'sm:w-[460px]',
}: SlideOverDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex justify-end"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'h-full w-full max-w-full bg-white border-l border-stone-200 shadow-2xl flex flex-col overflow-hidden',
              widthClass
            )}
          >
            <div className="px-4 py-3 bg-white border-b border-stone-200 flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-sm font-semibold text-stone-900 truncate">{title}</h2>
                  {badge}
                </div>
                {subtitle && (
                  <p className="text-[11px] font-mono text-stone-500 truncate mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close drawer"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4">{children}</div>

            {footer && (
              <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
