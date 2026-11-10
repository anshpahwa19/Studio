'use client';

import React from 'react';
import { Toaster as HotToaster } from 'react-hot-toast';

export const ToastProvider: React.FC = () => {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          background: '#ffffff',
          color: '#1c1917',
          border: '1px solid #e7e5e4',
          borderRadius: '12px',
          boxShadow:
            '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
          fontSize: '13px',
          fontWeight: 500,
          padding: '10px 16px',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: '#f43f5e',
            secondary: '#ffffff',
          },
        },
      }}
    />
  );
};
