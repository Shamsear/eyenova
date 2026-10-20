'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface HotkeyHandlers {
  onF1?: () => void; // Search focus
  onF2?: () => void; // Customer modal
  onF3?: () => void; // Hold current sale
  onF4?: () => void; // Recall held sales
  onF6?: () => void; // Cash payment modal
  onF7?: () => void; // Card payment modal
  onF8?: () => void; // Split payment modal
  onF9?: () => void; // Discount modal
  onF10?: () => void; // Till quick action (Add Float / Safe Drop)
  onF11?: () => void; // Fullscreen toggle
  onF12?: () => void; // Pay & Print shortcut
  onEscape?: () => void; // Dismiss modal
  onPlus?: () => void; // Qty increment
  onMinus?: () => void; // Qty decrement
}

export function useHotkeys(handlers: HotkeyHandlers) {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Handle Ctrl+Number global navigation (Ctrl+1 to Ctrl+0)
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            router.push('/pos');
            return;
          case '2':
            e.preventDefault();
            router.push('/invoices');
            return;
          case '3':
            e.preventDefault();
            router.push('/online-orders');
            return;
          case '4':
            e.preventDefault();
            router.push('/products');
            return;
          case '5':
            e.preventDefault();
            router.push('/purchases');
            return;
          case '6':
            e.preventDefault();
            router.push('/batches');
            return;
          case '7':
            e.preventDefault();
            router.push('/stock-count');
            return;
          case '8':
            e.preventDefault();
            router.push('/treasury');
            return;
          case '9':
            e.preventDefault();
            router.push('/expenses');
            return;
          case '0':
            e.preventDefault();
            router.push('/online-stock');
            return;
        }
      }

      // Check if user is typing in an active text input or textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          handlers.onF1?.();
          break;
        case 'F2':
          e.preventDefault();
          handlers.onF2?.();
          break;
        case 'F3':
          e.preventDefault();
          handlers.onF3?.();
          break;
        case 'F4':
          e.preventDefault();
          handlers.onF4?.();
          break;
        case 'F6':
          e.preventDefault();
          handlers.onF6?.();
          break;
        case 'F7':
          e.preventDefault();
          handlers.onF7?.();
          break;
        case 'F8':
          e.preventDefault();
          handlers.onF8?.();
          break;
        case 'F9':
          e.preventDefault();
          handlers.onF9?.();
          break;
        case 'F10':
          e.preventDefault();
          handlers.onF10?.();
          break;
        case 'F11':
          e.preventDefault();
          handlers.onF11?.();
          break;
        case 'F12':
          e.preventDefault();
          handlers.onF12?.();
          break;
        case 'Escape':
          handlers.onEscape?.();
          break;
        case '+':
          if (!isInput) {
            e.preventDefault();
            handlers.onPlus?.();
          }
          break;
        case '-':
          if (!isInput) {
            e.preventDefault();
            handlers.onMinus?.();
          }
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
