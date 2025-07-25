import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { BusinessProvider } from '@/providers/BusinessProvider';
import { PWAProvider } from '@/providers/PWAProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'UAE Delivery Business Portal',
  description: 'Business portal for managing company delivery requests and operations',
  manifest: '/manifest.json',
  themeColor: '#142C4F',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="UAE Business" />
        <meta name="application-name" content="UAE Business" />
        <meta name="msapplication-TileColor" content="#142C4F" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <PWAProvider>
          <BusinessProvider>
            {children}
          </BusinessProvider>
        </PWAProvider>
      </body>
    </html>
  );
}