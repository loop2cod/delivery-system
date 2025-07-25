/**
 * Shared PWA Configuration for all UAE Delivery Management PWAs
 * Provides unified configuration for service workers, caching, and PWA features
 */

export interface PWAConfig {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  scope: string;
  startUrl: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation: 'any' | 'portrait' | 'landscape';
  categories: string[];
  shortcuts: PWAShortcut[];
  cacheStrategy: CacheStrategy;
}

export interface PWAShortcut {
  name: string;
  shortName: string;
  description: string;
  url: string;
  icons: { src: string; sizes: string }[];
}

export interface CacheStrategy {
  static: string[];
  api: string[];
  dynamic: string[];
  networkFirst: string[];
  cacheFirst: string[];
}

// UAE Brand Colors
export const UAE_COLORS = {
  navy: '#142C4F',
  red: '#C32C3C',
  light: '#EFEFEF',
  white: '#ffffff',
  dark: '#0f172a'
} as const;

// Base PWA Configuration
const basePWAConfig = {
  display: 'standalone' as const,
  orientation: 'any' as const,
  lang: 'en',
  dir: 'ltr',
  categories: ['business', 'logistics'],
  icons: [
    { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png', purpose: 'any maskable' },
    { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any maskable' },
    { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png', purpose: 'any maskable' },
    { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'any maskable' },
    { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png', purpose: 'any maskable' },
    { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'any maskable' },
    { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
  ]
};

// Public PWA Configuration
export const publicPWAConfig: PWAConfig = {
  name: 'UAE Delivery Management - Customer Portal',
  shortName: 'DeliveryUAE',
  description: 'Professional delivery services across UAE',
  themeColor: UAE_COLORS.navy,
  backgroundColor: UAE_COLORS.white,
  scope: '/',
  startUrl: '/',
  display: 'standalone',
  orientation: 'any',
  categories: ['business', 'logistics'],
  shortcuts: [
    {
      name: 'Track Package',
      shortName: 'Track',
      description: 'Track your package delivery',
      url: '/track',
      icons: [{ src: '/icons/track-icon.png', sizes: '96x96' }]
    },
    {
      name: 'New Inquiry',
      shortName: 'Inquire',
      description: 'Submit delivery inquiry',
      url: '/inquiry',
      icons: [{ src: '/icons/inquiry-icon.png', sizes: '96x96' }]
    }
  ],
  cacheStrategy: {
    static: ['/', '/inquiry', '/track', '/about'],
    api: ['/api/public/*'],
    dynamic: ['images', 'fonts', 'styles'],
    networkFirst: ['/api/public/track/*'],
    cacheFirst: ['/images/*', '/fonts/*', '/_next/static/*']
  }
};

// Admin PWA Configuration
export const adminPWAConfig: PWAConfig = {
  name: 'UAE Delivery Management - Admin Panel',
  shortName: 'UAE Admin',
  description: 'Administrative control panel for delivery operations',
  themeColor: UAE_COLORS.navy,
  backgroundColor: '#f8fafc',
  scope: '/admin/',
  startUrl: '/admin/',
  display: 'standalone',
  orientation: 'any',
  categories: ['business', 'productivity'],
  shortcuts: [
    {
      name: 'Dashboard',
      shortName: 'Dashboard',
      description: 'View admin dashboard',
      url: '/admin/dashboard',
      icons: [{ src: '/icons/dashboard-icon.png', sizes: '96x96' }]
    },
    {
      name: 'Inquiries',
      shortName: 'Inquiries',
      description: 'Manage inquiries',
      url: '/admin/inquiries',
      icons: [{ src: '/icons/inquiries-icon.png', sizes: '96x96' }]
    },
    {
      name: 'Drivers',
      shortName: 'Drivers',
      description: 'Manage drivers',
      url: '/admin/drivers',
      icons: [{ src: '/icons/drivers-icon.png', sizes: '96x96' }]
    }
  ],
  cacheStrategy: {
    static: ['/admin/', '/admin/dashboard', '/admin/inquiries'],
    api: ['/api/admin/*', '/api/auth/*'],
    dynamic: ['charts', 'reports', 'exports'],
    networkFirst: ['/api/admin/*'],
    cacheFirst: ['/admin/_next/static/*']
  }
};

// Business PWA Configuration
export const businessPWAConfig: PWAConfig = {
  name: 'UAE Delivery Management - Business Portal',
  shortName: 'UAE Business',
  description: 'Business delivery management portal',
  themeColor: UAE_COLORS.navy,
  backgroundColor: UAE_COLORS.white,
  scope: '/business/',
  startUrl: '/business/',
  display: 'standalone',
  orientation: 'any',
  categories: ['business', 'productivity'],
  shortcuts: [
    {
      name: 'New Request',
      shortName: 'New Request',
      description: 'Create delivery request',
      url: '/business/requests/new',
      icons: [{ src: '/icons/new-request-icon.png', sizes: '96x96' }]
    },
    {
      name: 'Track Packages',
      shortName: 'Track',
      description: 'Track your packages',
      url: '/business/packages',
      icons: [{ src: '/icons/track-packages-icon.png', sizes: '96x96' }]
    }
  ],
  cacheStrategy: {
    static: ['/business/', '/business/dashboard', '/business/requests'],
    api: ['/api/company/*', '/api/auth/*'],
    dynamic: ['documents', 'slips', 'invoices'],
    networkFirst: ['/api/company/*'],
    cacheFirst: ['/business/_next/static/*']
  }
};

// Driver PWA Configuration
export const driverPWAConfig: PWAConfig = {
  name: 'UAE Delivery Management - Driver App',
  shortName: 'UAE Driver',
  description: 'Mobile delivery driver application',
  themeColor: UAE_COLORS.red,
  backgroundColor: '#fafafa',
  scope: '/driver/',
  startUrl: '/driver/',
  display: 'standalone',
  orientation: 'portrait',
  categories: ['business', 'productivity', 'navigation'],
  shortcuts: [
    {
      name: 'Scan Package',
      shortName: 'Scan',
      description: 'Scan package QR code',
      url: '/driver/scan',
      icons: [{ src: '/icons/scan-icon.png', sizes: '96x96' }]
    },
    {
      name: 'My Assignments',
      shortName: 'Assignments',
      description: 'View my assignments',
      url: '/driver/assignments',
      icons: [{ src: '/icons/assignments-icon.png', sizes: '96x96' }]
    }
  ],
  cacheStrategy: {
    static: ['/driver/', '/driver/assignments', '/driver/scan'],
    api: ['/api/driver/*', '/api/auth/*'],
    dynamic: ['photos', 'signatures', 'maps'],
    networkFirst: ['/api/driver/*'],
    cacheFirst: ['/driver/_next/static/*']
  }
};

// Service Worker Cache Names
export const CACHE_NAMES = {
  STATIC: 'delivery-uae-static-v1',
  DYNAMIC: 'delivery-uae-dynamic-v1',
  API: 'delivery-uae-api-v1',
  IMAGES: 'delivery-uae-images-v1'
} as const;

// Cache Strategies
export const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
} as const;

// PWA Installation Prompt Configuration
export const PWA_INSTALL_CONFIG = {
  showAfterPageViews: 3,
  showAfterMinutes: 2,
  daysToWaitBeforePromptingAgain: 7,
  maxPromptCount: 3
};

// Offline Configuration
export const OFFLINE_CONFIG = {
  fallbackPage: '/offline.html',
  offlineMessage: 'You are currently offline. Some features may not be available.',
  retryInterval: 5000, // 5 seconds
  maxRetries: 3
};

// Push Notification Configuration
export const PUSH_CONFIG = {
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  applicationServerKey: process.env.NEXT_PUBLIC_APPLICATION_SERVER_KEY || '',
  swPath: '/sw.js'
};

export default {
  publicPWAConfig,
  adminPWAConfig,
  businessPWAConfig,
  driverPWAConfig,
  UAE_COLORS,
  CACHE_NAMES,
  CACHE_STRATEGIES,
  PWA_INSTALL_CONFIG,
  OFFLINE_CONFIG,
  PUSH_CONFIG
};