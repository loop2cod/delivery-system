import { Emirate, PackageType } from './types';
import { PRICING_CONFIG, EMIRATES_DATA } from './constants';

// Generate unique identifiers
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const generatePackageCode = (fromEmirate: Emirate, toEmirate: Emirate): string => {
  const fromCode = EMIRATES_DATA[fromEmirate].code;
  const toCode = EMIRATES_DATA[toEmirate].code;
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${fromCode}2${toCode}${timestamp}${random}`;
};

export const generateRequestNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `REQ-${year}${month}${day}-${random}`;
};

export const generateInquiryReference = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INQ-${year}-${random}`;
};

// Pricing calculations
export const calculateDeliveryPrice = (
  weight: number,
  fromEmirate: Emirate,
  toEmirate: Emirate,
  packageType: PackageType,
  packageValue: number,
  monthlyVolume: number = 0,
  isExpress: boolean = false
): number => {
  // Determine base rate
  let baseRate: number;
  if (isExpress) {
    baseRate = PRICING_CONFIG.BASE_RATES.EXPRESS;
  } else if (fromEmirate === toEmirate) {
    baseRate = PRICING_CONFIG.BASE_RATES.SAME_EMIRATE;
  } else {
    baseRate = PRICING_CONFIG.BASE_RATES.DIFFERENT_EMIRATE;
  }

  // Calculate base price
  let price = weight * baseRate;

  // Apply package type multiplier
  const typeMultiplier = PRICING_CONFIG.PACKAGE_TYPE_MULTIPLIERS[packageType] || 1.0;
  price *= typeMultiplier;

  // Add insurance
  const insurance = Math.max(packageValue * PRICING_CONFIG.INSURANCE_RATE, 5);
  price += insurance;

  // Apply volume discount
  let discount = 0;
  for (const [volume, discountRate] of Object.entries(PRICING_CONFIG.VOLUME_DISCOUNTS)) {
    if (monthlyVolume >= parseInt(volume)) {
      discount = discountRate;
    }
  }
  price = price * (1 - discount);

  // Ensure minimum charge
  price = Math.max(price, PRICING_CONFIG.MIN_CHARGE);

  return Math.round(price * 100) / 100; // Round to 2 decimal places
};

// Distance calculations
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const getEmirateDistance = (from: Emirate, to: Emirate): number => {
  const fromCoords = EMIRATES_DATA[from].coordinates;
  const toCoords = EMIRATES_DATA[to].coordinates;
  return calculateDistance(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng);
};

// Time and date utilities
export const formatDeliveryTime = (date: Date): string => {
  return new Intl.DateTimeFormat('en-AE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Dubai'
  }).format(date);
};

export const getEstimatedDeliveryTime = (
  fromEmirate: Emirate,
  toEmirate: Emirate,
  isExpress: boolean = false
): Date => {
  const now = new Date();
  const distance = getEmirateDistance(fromEmirate, toEmirate);
  
  // Base delivery time calculation (in hours)
  let deliveryHours: number;
  if (isExpress) {
    deliveryHours = Math.max(2, distance * 0.3); // Express: 2+ hours
  } else if (fromEmirate === toEmirate) {
    deliveryHours = Math.max(4, distance * 0.5); // Same emirate: 4+ hours
  } else {
    deliveryHours = Math.max(6, distance * 0.8); // Different emirate: 6+ hours
  }

  // Add pickup time (1-2 hours)
  deliveryHours += 1.5;

  // Add buffer for business hours
  const currentHour = now.getHours();
  if (currentHour >= 18 || currentHour < 8) {
    // After hours - add time until next business day
    const nextBusinessDay = new Date(now);
    nextBusinessDay.setDate(now.getDate() + 1);
    nextBusinessDay.setHours(9, 0, 0, 0);
    return new Date(nextBusinessDay.getTime() + (deliveryHours * 60 * 60 * 1000));
  }

  return new Date(now.getTime() + (deliveryHours * 60 * 60 * 1000));
};

// Validation utilities
export const isValidUAEPhone = (phone: string): boolean => {
  const uaePhoneRegex = /^(\+971|971|0)?[0-9]{8,9}$/;
  return uaePhoneRegex.test(phone.replace(/\s+/g, ''));
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidTradeLicense = (license: string): boolean => {
  // UAE trade license format validation
  const licenseRegex = /^[A-Z]{2,3}[-\s]?\d{6,10}$/;
  return licenseRegex.test(license.replace(/\s+/g, ''));
};

// PWA utilities
export const isStandalone = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

export const isOnline = (): boolean => {
  return navigator.onLine;
};

export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
  
  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
};

// Local storage utilities with error handling
export const setStorageItem = (key: string, value: any): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
};

export const getStorageItem = <T>(key: string, defaultValue?: T): T | null => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue || null;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue || null;
  }
};

export const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};

// URL utilities
export const buildApiUrl = (endpoint: string, params?: Record<string, string>): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const url = new URL(endpoint, baseUrl);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  return url.toString();
};

// Error handling utilities
export const isNetworkError = (error: any): boolean => {
  return error.name === 'NetworkError' || 
         error.message === 'Failed to fetch' ||
         error.code === 'NETWORK_ERROR';
};

export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  return 'An unexpected error occurred';
};

// Performance utilities
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};