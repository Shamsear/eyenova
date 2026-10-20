'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginOverlay } from '@/components/auth/login-overlay';
import { useSessionStore } from '@/stores/session-store';

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, isStationLocked } = useSessionStore();

  useEffect(() => {
    if (isLoggedIn && !isStationLocked) {
      router.push('/pos');
    }
  }, [isLoggedIn, isStationLocked, router]);

  return <LoginOverlay />;
}
