import { Inter } from 'next/font/google';
import { Metadata, Viewport } from 'next';
import './globals.css';
import { NotificationProvider } from '@/components/providers/NotificationProvider';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'UAE Delivery Management - Professional Delivery Services',
  description: 'Professional delivery services across all emirates of UAE with real-time tracking, same-day delivery, and reliable service.',
  keywords: 'UAE delivery, Dubai delivery, Abu Dhabi delivery, package tracking, same day delivery, express delivery',
  authors: [{ name: 'UAE Delivery Management' }],
  creator: 'UAE Delivery Management',
  publisher: 'UAE Delivery Management',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://deliveryuae.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_AE',
    url: '/',
    title: 'UAE Delivery Management - Professional Delivery Services',
    description: 'Professional delivery services across all emirates of UAE with real-time tracking and reliable service.',
    siteName: 'UAE Delivery Management',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'UAE Delivery Management - Professional Delivery Services',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UAE Delivery Management - Professional Delivery Services',
    description: 'Professional delivery services across all emirates of UAE with real-time tracking and reliable service.',
    images: ['/images/twitter-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#142C4F' },
    { media: '(prefers-color-scheme: dark)', color: '#142C4F' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className={`${inter.className} antialiased bg-background text-foreground pwa-safe-area`}>
        <NotificationProvider>
          <div className="flex min-h-screen flex-col">
            {children}
          </div>
          <Toaster />
        </NotificationProvider>
      </body>
    </html>
  );
}