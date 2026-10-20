'use client';

import { useEffect, useRef } from 'react';

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxIntervalMs?: number;
}

/**
 * Global Keyboard Wedge Barcode Scanner Listener.
 * Intercepts high-speed barcode scanner input across the whole POS window without needing input focus.
 */
export function useBarcodeScanner({
  onScan,
  minChars = 3,
  maxIntervalMs = 60,
}: BarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore functional and modifier keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || e.key === 'Tab') {
        return;
      }

      const now = Date.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // If the interval between keys is too long, reset buffer (it was human typing)
      if (interval > maxIntervalMs) {
        bufferRef.current = '';
      }

      // Scanner sends Enter at the end of the barcode
      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();
        if (barcode.length >= minChars) {
          e.preventDefault();
          onScan(barcode);
        }
        bufferRef.current = '';
        return;
      }

      // Only accumulate printable characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan, minChars, maxIntervalMs]);
}
