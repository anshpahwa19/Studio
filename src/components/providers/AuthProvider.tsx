'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from '@/components/ui/Toast';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <ToastProvider />
    </SessionProvider>
  );
}
