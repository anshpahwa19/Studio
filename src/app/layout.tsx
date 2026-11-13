import type { Metadata, Viewport } from 'next';
// Font files ship with the app (no Google request), so it works offline and in PDF downloads.
import '@fontsource/plus-jakarta-sans/latin-400.css';
import '@fontsource/plus-jakarta-sans/latin-500.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/plus-jakarta-sans/latin-700.css';
import '@fontsource/plus-jakarta-sans/latin-800.css';
import '@fontsource/plus-jakarta-sans/latin-600-italic.css';
import './globals.css';
import { Toaster } from '@/components/toast';

const NAME = 'Shruti Pahwa Luxury Salon & Academy';
const DESCRIPTION = 'Appointments, billing, clients, stock and reports for Shruti Pahwa Luxury Salon & Academy.';

// What shows when the address is shared (WhatsApp, Slack, Facebook, X, iMessage ...). SITE_URL is the public address
// of this app, e.g. https://salon.example.com; it turns /share.png into a full link the chat apps can fetch.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
  title: { default: 'Salon Studio', template: '%s · Salon Studio' },
  description: DESCRIPTION,
  applicationName: 'Salon Studio',
  // A private business app: keep it out of search engines. Link previews still work.
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: 'Salon Studio',
    title: NAME,
    description: DESCRIPTION,
    locale: 'en_IN',
    images: [{ url: '/share.png', width: 512, height: 512, alt: `${NAME} logo` }],
  },
  twitter: {
    card: 'summary',
    title: NAME,
    description: DESCRIPTION,
    images: ['/share.png'],
  },
};

export const viewport: Viewport = { themeColor: '#7c3aed' };

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
