import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { DriverProvider } from '@/providers/DriverProvider';
import { PWAProvider } from '@/providers/PWAProvider';
import { LocationProvider } from '@/providers/LocationProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'UAE Delivery Driver App',
  description: 'Mobile app for delivery drivers with GPS tracking and QR scanning',
  manifest: '/manifest.json',
  themeColor: '#142C4F',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'UAE Driver',
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
        <meta name="apple-mobile-web-app-title" content="UAE Driver" />
        <meta name="application-name" content="UAE Driver" />
        <meta name="msapplication-TileColor" content="#142C4F" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.className} overflow-x-hidden`}>
        <PWAProvider>
          <LocationProvider>
            <DriverProvider>
              {children}
            </DriverProvider>
          </LocationProvider>
        </PWAProvider>
      </body>
    </html>
  );
}