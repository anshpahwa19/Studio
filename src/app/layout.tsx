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
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
