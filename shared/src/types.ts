// Common types used across all PWAs

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  DRIVER = 'DRIVER', 
  BUSINESS = 'BUSINESS',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING'
}

export interface Company {
  id: string;
  name: string;
  tradeLicense: string;
  industry: string;
  address: Address;
  contactPerson: string;
  phone: string;
  email: string;
  status: CompanyStatus;
  accountType: AccountType;
  creditTerms: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE', 
  SUSPENDED = 'SUSPENDED',
  PENDING_APPROVAL = 'PENDING_APPROVAL'
}

export enum AccountType {
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE'
}

export interface Address {
  street: string;
  area: string;
  city: string;
  emirate: Emirate;
  postalCode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export enum Emirate {
  DUBAI = 'DUBAI',
  ABU_DHABI = 'ABU_DHABI',
  SHARJAH = 'SHARJAH', 
  AJMAN = 'AJMAN',
  RAS_AL_KHAIMAH = 'RAS_AL_KHAIMAH',
  FUJAIRAH = 'FUJAIRAH',
  UMM_AL_QUWAIN = 'UMM_AL_QUWAIN'
}

export interface DeliveryRequest {
  id: string;
  requestNumber: string;
  companyId: string;
  packages: Package[];
  pickupDetails: PickupDetails;
  totalAmount: number;
  status: RequestStatus;
  assignedDriverId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Package {
  id: string;
  code: string;
  qrCode: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: Address;
  packageType: PackageType;
  weight: number;
  dimensions: Dimensions;
  value: number;
  specialInstructions?: string;
  status: PackageStatus;
  timeline: PackageTimeline[];
}

export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export enum PackageType {
  DOCUMENTS = 'DOCUMENTS',
  PARCELS = 'PARCELS',
  FRAGILE = 'FRAGILE',
  ELECTRONICS = 'ELECTRONICS',
  CLOTHING = 'CLOTHING',
  FOOD = 'FOOD',
  OTHER = 'OTHER'
}

export enum PackageStatus {
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP', 
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED_DELIVERY = 'FAILED_DELIVERY',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED'
}

export interface PackageTimeline {
  id: string;
  packageId: string;
  status: PackageStatus;
  timestamp: Date;
  location?: Address;
  notes?: string;
  driverId?: string;
  photos?: string[];
}

export interface PickupDetails {
  contactName: string;
  contactPhone: string;
  address: Address;
  preferredTime?: Date;
  instructions?: string;
}

export enum RequestStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  licenseNumber: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  currentLocation?: Location;
  status: DriverStatus;
  rating: number;
  totalDeliveries: number;
  specializations: PackageType[];
  createdAt: Date;
  updatedAt: Date;
}

export enum VehicleType {
  MOTORCYCLE = 'MOTORCYCLE',
  SEDAN = 'SEDAN',
  VAN = 'VAN',
  TRUCK = 'TRUCK'
}

export enum DriverStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
  ON_BREAK = 'ON_BREAK'
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

export interface Inquiry {
  id: string;
  referenceNumber: string;
  companyName: string;
  industry: string;
  contactPerson: string;
  email: string;
  phone: string;
  expectedVolume: string;
  serviceType: string;
  specialRequirements?: string;
  status: InquiryStatus;
  assignedStaffId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum InquiryStatus {
  NEW = 'NEW',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CONVERTED = 'CONVERTED'
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// PWA-specific types
export interface PWAInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  vibrate?: number[];
  data?: any;
  actions?: NotificationAction[];
}

export interface OfflineAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retry: number;
  maxRetries: number;
}