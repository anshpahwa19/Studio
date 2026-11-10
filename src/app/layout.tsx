import type { Metadata } from 'next';
// Font files ship with the app (no Google request), so it works offline and in PDF downloads.
import '@fontsource/plus-jakarta-sans/latin-400.css';
import '@fontsource/plus-jakarta-sans/latin-500.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/plus-jakarta-sans/latin-700.css';
import '@fontsource/plus-jakarta-sans/latin-800.css';
import '@fontsource/plus-jakarta-sans/latin-600-italic.css';
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
