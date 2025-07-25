/**
 * Shared Utility Functions for UAE Delivery Management System
 * Common utilities used across all PWA applications
 */

import { UAE_COLORS } from './theme';

// Date and Time Utilities
export const dateUtils = {
  // Format date for display
  formatDate: (date: Date | string, locale: string = 'en-AE'): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },

  // Format time for display
  formatTime: (date: Date | string, locale: string = 'en-AE'): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  },

  // Format date and time
  formatDateTime: (date: Date | string, locale: string = 'en-AE'): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  },

  // Get relative time (e.g., "2 hours ago")
  getRelativeTime: (date: Date | string, locale: string = 'en'): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return dateUtils.formatDate(d, locale);
  },

  // Check if date is today
  isToday: (date: Date | string): boolean => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return d.toDateString() === today.toDateString();
  },

  // Add days to date
  addDays: (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  // Get business hours check
  isBusinessHours: (date: Date = new Date()): boolean => {
    const hour = date.getHours();
    const day = date.getDay();
    // Business hours: 8 AM - 6 PM, Sunday to Thursday (UAE working days)
    return day >= 0 && day <= 4 && hour >= 8 && hour < 18;
  },
};

// String Utilities
export const stringUtils = {
  // Capitalize first letter
  capitalize: (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  // Convert to title case
  toTitleCase: (str: string): string => {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  },

  // Truncate string with ellipsis
  truncate: (str: string, length: number): string => {
    return str.length > length ? str.substring(0, length) + '...' : str;
  },

  // Generate slug from string
  slugify: (str: string): string => {
    return str
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  },

  // Format phone number for UAE
  formatPhoneUAE: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('971')) {
      return `+971 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    }
    if (cleaned.startsWith('0')) {
      return `+971 ${cleaned.slice(1, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
    return phone;
  },

  // Mask sensitive data
  maskEmail: (email: string): string => {
    const [username, domain] = email.split('@');
    const maskedUsername = username.slice(0, 2) + '*'.repeat(username.length - 2);
    return `${maskedUsername}@${domain}`;
  },

  maskPhone: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.slice(0, -4).replace(/\d/g, '*') + cleaned.slice(-4);
  },
};

// Number and Currency Utilities
export const numberUtils = {
  // Format currency for UAE (AED)
  formatCurrency: (amount: number, currency: string = 'AED'): string => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  },

  // Format number with commas
  formatNumber: (num: number): string => {
    return new Intl.NumberFormat('en-AE').format(num);
  },

  // Calculate percentage
  calculatePercentage: (value: number, total: number): number => {
    return total === 0 ? 0 : Math.round((value / total) * 100);
  },

  // Generate random number in range
  randomInRange: (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Round to decimal places
  roundTo: (num: number, decimals: number): number => {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },
};

// Array Utilities
export const arrayUtils = {
  // Remove duplicates from array
  unique: <T>(array: T[]): T[] => {
    return [...new Set(array)];
  },

  // Group array by key
  groupBy: <T>(array: T[], key: keyof T): Record<string, T[]> => {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },

  // Sort array by key
  sortBy: <T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  },

  // Chunk array into smaller arrays
  chunk: <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  // Get random item from array
  randomItem: <T>(array: T[]): T => {
    return array[Math.floor(Math.random() * array.length)];
  },
};

// Object Utilities
export const objectUtils = {
  // Deep clone object
  deepClone: <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  },

  // Check if object is empty
  isEmpty: (obj: object): boolean => {
    return Object.keys(obj).length === 0;
  },

  // Pick specific keys from object
  pick: <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  },

  // Omit specific keys from object
  omit: <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const result = { ...obj };
    keys.forEach(key => {
      delete result[key];
    });
    return result;
  },
};

// Validation Utilities
export const validationUtils = {
  // Email validation
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // UAE phone number validation
  isValidUAEPhone: (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    // UAE numbers: +971 followed by 8-9 digits
    return /^(971|0)[0-9]{8,9}$/.test(cleaned);
  },

  // Password strength validation
  validatePassword: (password: string): {
    isValid: boolean;
    errors: string[];
  } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // UAE Emirates validation
  isValidEmirate: (emirate: string): boolean => {
    const emirates = [
      'Abu Dhabi',
      'Dubai',
      'Sharjah',
      'Ajman',
      'Umm Al Quwain',
      'Ras Al Khaimah',
      'Fujairah',
    ];
    return emirates.includes(emirate);
  },
};

// URL and File Utilities
export const urlUtils = {
  // Build query string from object
  buildQueryString: (params: Record<string, any>): string => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    return searchParams.toString();
  },

  // Parse query string to object
  parseQueryString: (queryString: string): Record<string, string> => {
    const params = new URLSearchParams(queryString);
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  },

  // Get file extension
  getFileExtension: (filename: string): string => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  },

  // Format file size
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
};

// Color Utilities
export const colorUtils = {
  // Get status color based on delivery status
  getStatusColor: (status: string): string => {
    const statusColors: Record<string, string> = {
      pending: UAE_COLORS.warning,
      picked_up: UAE_COLORS.info,
      in_transit: UAE_COLORS.info,
      out_for_delivery: UAE_COLORS.warning,
      delivered: UAE_COLORS.success,
      failed_delivery: UAE_COLORS.error,
      returned: UAE_COLORS.error,
      cancelled: UAE_COLORS.gray[500],
    };
    
    return statusColors[status] || UAE_COLORS.gray[500];
  },

  // Get priority color
  getPriorityColor: (priority: string): string => {
    const priorityColors: Record<string, string> = {
      low: UAE_COLORS.success,
      medium: UAE_COLORS.warning,
      high: UAE_COLORS.error,
      urgent: UAE_COLORS.red,
    };
    
    return priorityColors[priority] || UAE_COLORS.gray[500];
  },

  // Generate random color
  randomColor: (): string => {
    const colors = [
      UAE_COLORS.navy,
      UAE_COLORS.red,
      UAE_COLORS.success,
      UAE_COLORS.warning,
      UAE_COLORS.info,
    ];
    return arrayUtils.randomItem(colors);
  },
};

// Local Storage Utilities
export const storageUtils = {
  // Set item in localStorage with expiration
  setItem: (key: string, value: any, expirationHours?: number): void => {
    const item = {
      value,
      timestamp: Date.now(),
      expiration: expirationHours ? Date.now() + (expirationHours * 60 * 60 * 1000) : null,
    };
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(item));
    }
  },

  // Get item from localStorage with expiration check
  getItem: <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null;
    
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    
    try {
      const item = JSON.parse(itemStr);
      
      // Check expiration
      if (item.expiration && Date.now() > item.expiration) {
        localStorage.removeItem(key);
        return null;
      }
      
      return item.value;
    } catch {
      return null;
    }
  },

  // Remove item from localStorage
  removeItem: (key: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  },

  // Clear all items from localStorage
  clear: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  },
};

// Error Handling Utilities
export const errorUtils = {
  // Format error message for display
  formatError: (error: any): string => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    return 'An unexpected error occurred';
  },

  // Check if error is network related
  isNetworkError: (error: any): boolean => {
    return error?.code === 'NETWORK_ERROR' || 
           error?.message?.includes('fetch') ||
           error?.message?.includes('network');
  },

  // Retry function with exponential backoff
  retry: async <T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          throw error;
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  },
};

// Export all utilities
export default {
  dateUtils,
  stringUtils,
  numberUtils,
  arrayUtils,
  objectUtils,
  validationUtils,
  urlUtils,
  colorUtils,
  storageUtils,
  errorUtils,
};