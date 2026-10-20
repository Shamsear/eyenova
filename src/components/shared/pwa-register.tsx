'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[EyeNova POS] PWA Service Worker registered:', registration.scope);
          })
          .catch((error) => {
            console.warn('[EyeNova POS] PWA Service Worker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
