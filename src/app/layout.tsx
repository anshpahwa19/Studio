import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/toast';

export const metadata: Metadata = {
  title: 'Salon Studio',
  description: 'Appointments, billing and records for Shruti Pahwa Luxury Salon & Academy.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <head>
        {/* Falls back to the system font when offline. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
