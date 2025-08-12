// Utility functions for the delivery management system

// Emirate enum
export enum Emirate {
  DUBAI = 'DUBAI',
  ABU_DHABI = 'ABU_DHABI',
  SHARJAH = 'SHARJAH',
  AJMAN = 'AJMAN',
  RAS_AL_KHAIMAH = 'RAS_AL_KHAIMAH',
  FUJAIRAH = 'FUJAIRAH',
  UMM_AL_QUWAIN = 'UMM_AL_QUWAIN'
}

// Package Status enum
export enum PackageStatus {
  PENDING = 'PENDING',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  FAILED_DELIVERY = 'FAILED_DELIVERY'
}

/**
 * Generate a unique inquiry reference number
 * Format: INQ-YYYY-NNNN
 */
export function generateInquiryReference(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `INQ-${year}-${random}`;
}

/**
 * Calculate delivery price based on various factors
 */
export function calculateDeliveryPrice(
  weight: number,
  fromEmirate: Emirate,
  toEmirate: Emirate,
  packageType: string,
  value: number,
  monthlyVolume: number = 0,
  isExpress: boolean = false
): number {
  // Base price calculation
  let basePrice = fromEmirate === toEmirate ? 15 : 25;
  
  // Weight multiplier (price per kg above 1kg)
  if (weight > 1) {
    basePrice += (weight - 1) * 5;
  }
  
  // Package type multiplier
  const typeMultipliers: Record<string, number> = {
    'DOCUMENTS': 1.0,
    'PARCELS': 1.2,
    'FRAGILE': 1.5,
    'ELECTRONICS': 1.4,
    'CLOTHING': 1.1,
    'FOOD': 1.3,
    'OTHER': 1.2
  };
  
  basePrice *= typeMultipliers[packageType] || 1.2;
  
  // Express delivery charge
  if (isExpress) {
    basePrice *= 1.4;
  }
  
  // Volume discount
  let discount = 0;
  if (monthlyVolume >= 200) discount = 0.2;
  else if (monthlyVolume >= 100) discount = 0.15;
  else if (monthlyVolume >= 50) discount = 0.1;
  
  basePrice *= (1 - discount);
  
  // Insurance based on value
  const insurance = Math.max(value * 0.001, 5);
  
  return Math.round((basePrice + insurance) * 100) / 100;
}

/**
 * Get estimated delivery time
 */
export function getEstimatedDeliveryTime(
  fromEmirate: Emirate,
  toEmirate: Emirate,
  isExpress: boolean = false
): Date {
  const now = new Date();
  let hoursToAdd = 24; // Default 24 hours
  
  if (isExpress) {
    hoursToAdd = fromEmirate === toEmirate ? 4 : 8;
  } else {
    hoursToAdd = fromEmirate === toEmirate ? 12 : 24;
  }
  
  // Add business days logic (skip weekends)
  const deliveryDate = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
  
  // If delivery falls on Friday or Saturday (UAE weekend), move to Sunday
  const dayOfWeek = deliveryDate.getDay();
  if (dayOfWeek === 5) { // Friday
    deliveryDate.setDate(deliveryDate.getDate() + 2);
  } else if (dayOfWeek === 6) { // Saturday
    deliveryDate.setDate(deliveryDate.getDate() + 1);
  }
  
  return deliveryDate;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UAE phone number format
 */
export function isValidUAEPhone(phone: string): boolean {
  // UAE phone number patterns:
  // +971XXXXXXXXX, 971XXXXXXXXX, 0XXXXXXXXX, or XXXXXXXXX
  const phoneRegex = /^(\+971|971|0)?[0-9]{8,9}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
}