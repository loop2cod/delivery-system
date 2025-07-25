import { Emirate, PackageType } from './types';

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3
} as const;

// PWA Configuration
export const PWA_CONFIG = {
  CACHE_NAME: 'delivery-uae-v1.0.0',
  STATIC_CACHE: 'static-v1',
  DYNAMIC_CACHE: 'dynamic-v1', 
  API_CACHE: 'api-v1',
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  MAX_CACHE_SIZE: 50 * 1024 * 1024 // 50MB
} as const;

// Business Rules
export const BUSINESS_RULES = {
  MIN_PACKAGE_WEIGHT: 0.1, // kg
  MAX_PACKAGE_WEIGHT: 50, // kg
  MIN_PACKAGE_VALUE: 1, // AED
  MAX_PACKAGE_VALUE: 100000, // AED
  CREDIT_TERMS_DAYS: 30,
  MAX_DELIVERY_DAYS: 7,
  PICKUP_WINDOW_HOURS: 2
} as const;

// Pricing Configuration
export const PRICING_CONFIG = {
  BASE_RATES: {
    SAME_EMIRATE: 15, // AED per kg
    DIFFERENT_EMIRATE: 25, // AED per kg
    EXPRESS: 35 // AED per kg
  },
  PACKAGE_TYPE_MULTIPLIERS: {
    [PackageType.DOCUMENTS]: 1.2,
    [PackageType.PARCELS]: 1.0,
    [PackageType.FRAGILE]: 1.5,
    [PackageType.ELECTRONICS]: 1.3,
    [PackageType.CLOTHING]: 1.0,
    [PackageType.FOOD]: 1.4,
    [PackageType.OTHER]: 1.1
  },
  VOLUME_DISCOUNTS: {
    50: 0.1, // 10% discount for 50+ packages/month
    100: 0.15, // 15% discount for 100+ packages/month  
    200: 0.2 // 20% discount for 200+ packages/month
  },
  INSURANCE_RATE: 0.001, // 0.1% of package value
  MIN_CHARGE: 10 // Minimum charge in AED
} as const;

// Geographic Data
export const EMIRATES_DATA = {
  [Emirate.DUBAI]: {
    name: 'Dubai',
    code: 'DXB',
    coordinates: { lat: 25.2048, lng: 55.2708 },
    zones: ['Downtown', 'Marina', 'JLT', 'Business Bay', 'DIFC']
  },
  [Emirate.ABU_DHABI]: {
    name: 'Abu Dhabi', 
    code: 'AUH',
    coordinates: { lat: 24.4539, lng: 54.3773 },
    zones: ['Khalifa City', 'Al Reem', 'Yas Island', 'Saadiyat']
  },
  [Emirate.SHARJAH]: {
    name: 'Sharjah',
    code: 'SHJ', 
    coordinates: { lat: 25.3463, lng: 55.4209 },
    zones: ['Al Majaz', 'Al Qasba', 'Rolla', 'Industrial Area']
  },
  [Emirate.AJMAN]: {
    name: 'Ajman',
    code: 'AJM',
    coordinates: { lat: 25.4052, lng: 55.5136 },
    zones: ['Corniche', 'Industrial', 'Residential']
  },
  [Emirate.RAS_AL_KHAIMAH]: {
    name: 'Ras Al Khaimah',
    code: 'RAK', 
    coordinates: { lat: 25.7889, lng: 55.9598 },
    zones: ['Al Nakheel', 'Old Town', 'Industrial']
  },
  [Emirate.FUJAIRAH]: {
    name: 'Fujairah',
    code: 'FJR',
    coordinates: { lat: 25.1164, lng: 56.3267 },
    zones: ['City Center', 'Port Area', 'Beach Resort']
  },
  [Emirate.UMM_AL_QUWAIN]: {
    name: 'Umm Al Quwain',
    code: 'UAQ',
    coordinates: { lat: 25.5647, lng: 55.7713 },
    zones: ['Old Town', 'Marina', 'Industrial']
  }
} as const;

// Notification Templates
export const NOTIFICATION_TYPES = {
  PACKAGE_PICKED_UP: 'PACKAGE_PICKED_UP',
  PACKAGE_IN_TRANSIT: 'PACKAGE_IN_TRANSIT',
  PACKAGE_DELIVERED: 'PACKAGE_DELIVERED',
  DELIVERY_FAILED: 'DELIVERY_FAILED',
  NEW_ASSIGNMENT: 'NEW_ASSIGNMENT',
  INQUIRY_RECEIVED: 'INQUIRY_RECEIVED',
  ACCOUNT_APPROVED: 'ACCOUNT_APPROVED'
} as const;

// File Upload Configuration  
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
  MAX_FILES_PER_UPLOAD: 10
} as const;

// QR Code Configuration
export const QR_CONFIG = {
  SIZE: 200,
  ERROR_CORRECTION_LEVEL: 'M',
  MARGIN: 4,
  COLOR: {
    DARK: '#142C4F', // UAE Navy
    LIGHT: '#FFFFFF'
  }
} as const;

// Cache Strategies
export const CACHE_STRATEGIES = {
  PUBLIC: {
    static: ['/', '/inquiry', '/track', '/about'],
    api: ['/api/public/*'],
    dynamic: ['images', 'fonts', 'styles']
  },
  ADMIN: {
    static: ['/admin/', '/admin/dashboard', '/admin/inquiries'],  
    api: ['/api/admin/*', '/api/auth/*'],
    dynamic: ['charts', 'reports', 'exports']
  },
  BUSINESS: {
    static: ['/business/', '/business/dashboard', '/business/requests'],
    api: ['/api/company/*', '/api/auth/*'], 
    dynamic: ['documents', 'slips', 'invoices']
  },
  DRIVER: {
    static: ['/driver/', '/driver/assignments', '/driver/scan'],
    api: ['/api/driver/*', '/api/auth/*'],
    dynamic: ['photos', 'signatures', 'maps']
  }
} as const;

// Performance Thresholds
export const PERFORMANCE_THRESHOLDS = {
  FCP: 1800, // First Contentful Paint - 1.8s
  LCP: 2500, // Largest Contentful Paint - 2.5s
  FID: 100,  // First Input Delay - 100ms
  CLS: 0.1,  // Cumulative Layout Shift - 0.1
  TTI: 3500  // Time to Interactive - 3.5s
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',  
  USER_PREFERENCES: 'user_preferences',
  OFFLINE_QUEUE: 'offline_queue',
  CACHED_DATA: 'cached_data',
  INSTALL_PROMPT: 'install_prompt_dismissed',
  THEME_MODE: 'theme_mode'
} as const;