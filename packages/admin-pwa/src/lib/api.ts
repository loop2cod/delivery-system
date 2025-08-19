import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

// Create axios instance with base configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Debug log to verify configuration (development only)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 API Configuration:', {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    API_BASE_URL,
    timestamp: new Date().toISOString()
  });
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage or cookies
    let token = null;
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('token') || Cookies.get('admin_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // Log request for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
        data: config.data,
        hasToken: !!token,
        timestamp: new Date().toISOString()
      });
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }
    
    return response;
  },
  (error: AxiosError) => {
    const { response, request, config } = error;
    
    // Log error details
    console.error(`❌ API Error: ${config?.method?.toUpperCase()} ${config?.url}`, {
      status: response?.status,
      data: response?.data,
      message: error.message,
    });

    // Handle different error scenarios
    if (response) {
      // Server responded with error status
      const status = response.status;
      const errorData = response.data as any;
      
      switch (status) {
        case 401:
          // Unauthorized - redirect to login
          toast.error('Session expired. Please log in again.');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            Cookies.remove('admin_token');
            window.location.href = '/login';
          }
          break;
          
        case 403:
          // Forbidden
          toast.error(errorData?.message || 'Access denied. Insufficient permissions.');
          break;
          
        case 404:
          // Not found - don't show toast for 404s as they might be expected
          break;
          
        case 422:
          // Validation error
          toast.error(errorData?.message || 'Invalid data provided.');
          break;
          
        case 429:
          // Rate limit
          toast.error('Too many requests. Please try again later.');
          break;
          
        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors
          toast.error('Server error. Please try again later.');
          break;
          
        default:
          if (status >= 400) {
            toast.error(errorData?.message || `Error: ${status}`);
          }
      }
    } else if (request) {
      // Request made but no response received (network error)
      toast.error('Network error. Please check your connection.');
    } else {
      // Something else happened
      toast.error('An unexpected error occurred.');
    }
    
    return Promise.reject(error);
  }
);

// Types matching our backend API
export interface Inquiry {
  id: string;
  reference_number: string;
  company_name: string;
  industry: string;
  contact_person: string;
  email: string;
  phone: string;
  expected_volume: string;
  special_requirements?: string;
  status: 'NEW' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CONVERTED';
  created_at: string;
  updated_at: string;
}

export interface CreateInquiryData {
  company_name: string;
  industry: string;
  contact_person: string;
  email: string;
  phone: string;
  expected_volume: string;
  special_requirements?: string;
  service_type?: string;
  assigned_staff_id?: string;
}

export interface Company {
  id: string;
  name: string;
  trade_license: string;
  industry: string;
  contact_person: string;
  phone: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  account_type: 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  credit_terms?: number;
  monthly_volume_estimate?: number;
  street_address: string;
  area: string;
  city: string;
  emirate: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
  total_requests: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  license_number: string;
  license_expiry: string;
  vehicle_type: 'MOTORCYCLE' | 'SEDAN' | 'VAN' | 'TRUCK';
  vehicle_plate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ON_LEAVE';
  availability_status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  current_location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  rating: number;
  total_deliveries: number;
  completed_deliveries: number;
  joined_date: string;
  last_active: string;
  documents_verified: boolean;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateDriverData {
  name: string;
  email: string;
  phone: string;
  license_number: string;
  license_expiry: string;
  vehicle_type: 'MOTORCYCLE' | 'SEDAN' | 'VAN' | 'TRUCK';
  vehicle_plate: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface DashboardStats {
  stats: {
    totalInquiries: number;
    newInquiries: number;
    totalDrivers: number;
    activeDrivers: number;
    totalCompanies: number;
    activeDeliveries: number;
    todayDeliveries: number;
    totalRevenue: number;
  };
  recentActivity: Array<{
    type: string;
    reference: string;
    title: string;
    created_at: string;
  }>;
}

// Pricing-related interfaces
export interface PricingTier {
  minWeight: number;
  maxWeight?: number;
  type: 'fixed' | 'per_kg';
  price: number;
}

export interface DeliveryPricing {
  _id?: string;
  name: string;
  description?: string;
  tiers: PricingTier[];
  isActive: boolean;
  isDefault: boolean;
  companyId?: string;
  isCustomized?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Delivery Request interfaces
export interface DeliveryRequest {
  id: string;
  requestNumber: string;
  companyId: string;
  userId: string;
  priority: 'normal' | 'high' | 'urgent';
  status: 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  
  // Pickup details
  pickupContactName: string;
  pickupPhone: string;
  pickupAddress: string;
  pickupInstructions?: string;
  
  // Delivery details
  deliveryContactName: string;
  deliveryPhone: string;
  deliveryAddress: string;
  deliveryInstructions?: string;
  
  // Schedule
  pickupDate: string;
  pickupTime: string;
  deliveryDate: string;
  deliveryTime: string;
  
  // Items and pricing
  items: Array<{
    description: string;
    quantity: number;
    weight?: number;
    dimensions?: string;
    value?: number;
    fragile?: boolean;
  }>;
  totalWeight: number;
  estimatedCost?: number;
  actualCost?: number;
  priceCalculation?: any;
  
  // Additional details
  specialRequirements?: string;
  internalReference?: string;
  adminNotes?: string;
  
  // Assignment
  assignedDriverId?: string;
  assignedAt?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  
  // Enriched data from API
  company?: {
    id: string;
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    industry?: string;
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface DeliveryRequestStats {
  totalRequests: number;
  statusBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  topCompanies: Array<{
    company: {
      id: string;
      name: string;
      industry?: string;
    };
    requestCount: number;
  }>;
  revenue: {
    total: number;
    deliveredCount: number;
    averageValue: number;
  };
}

// API client class using axios
class AdminAPI {
  // Auth endpoints
  async login(email: string, password: string, pwaType: string = 'admin') {
    const response = await api.post<{
      user: any;
      token: string;
      refreshToken: string;
      expiresIn: string;
    }>('/api/auth/login', { email, password, pwaType });
    
    return response.data;
  }

  async logout() {
    try {
      await api.post('/api/auth/logout');
    } finally {
      // Token cleanup handled by AdminProvider
    }
  }

  // Dashboard endpoints
  async getDashboard(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/api/admin/dashboard');
    return response.data;
  }

  // Inquiry endpoints
  async getInquiries(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}): Promise<{
    inquiries: Inquiry[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get<{
      inquiries: Inquiry[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>('/api/admin/inquiries', { params });
    
    return response.data;
  }

  async getInquiry(id: string): Promise<Inquiry> {
    const response = await api.get<Inquiry>(`/api/admin/inquiries/${id}`);
    return response.data;
  }

  async createInquiry(data: CreateInquiryData): Promise<Inquiry> {
    const response = await api.post<Inquiry>('/api/admin/inquiries', data);
    return response.data;
  }

  async updateInquiry(
    id: string,
    data: Partial<{
      status: string;
      notes: string;
    }>
  ): Promise<Inquiry> {
    const response = await api.put<Inquiry>(`/api/admin/inquiries/${id}`, data);
    return response.data;
  }

  async deleteInquiry(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/api/admin/inquiries/${id}`);
    return response.data;
  }

  async bulkUpdateInquiries(data: {
    inquiry_ids: string[];
    action: 'approve' | 'reject' | 'convert';
    notes?: string;
  }): Promise<{
    message: string;
    updated_inquiries: Array<{
      id: string;
      reference_number: string;
      status: string;
    }>;
  }> {
    const response = await api.post<{
      message: string;
      updated_inquiries: Array<{
        id: string;
        reference_number: string;
        status: string;
      }>;
    }>('/api/admin/inquiries/bulk-update', data);
    return response.data;
  }

  // Company endpoints
  async getCompanies(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}): Promise<{
    companies: Company[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get<{
      companies: Company[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>('/api/admin/companies', { params });
    return response.data;
  }

  async getCompany(id: string): Promise<Company> {
    const response = await api.get<Company>(`/api/admin/companies/${id}`);
    return response.data;
  }

  async resetCompanyPassword(id: string): Promise<{ message: string; newPassword: string }> {
    const response = await api.post<{ message: string; newPassword: string }>(
      `/api/admin/companies/${id}/reset-password`
    );
    return response.data;
  }

  // Driver endpoints
  async getDrivers(params: {
    page?: number;
    limit?: number;
    status?: string;
    availability?: string;
    search?: string;
  } = {}): Promise<{
    drivers: Driver[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get<{
      drivers: Driver[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>('/api/admin/drivers', { params });
    return response.data;
  }

  async getDriver(id: string): Promise<Driver> {
    const response = await api.get<Driver>(`/api/admin/drivers/${id}`);
    return response.data;
  }

  async createDriver(data: CreateDriverData): Promise<Driver> {
    const response = await api.post<Driver>('/api/admin/drivers', data);
    return response.data;
  }

  async updateDriver(
    id: string,
    data: Partial<Driver>
  ): Promise<Driver> {
    const response = await api.put<Driver>(`/api/admin/drivers/${id}`, data);
    return response.data;
  }

  async deleteDriver(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/api/admin/drivers/${id}`);
    return response.data;
  }

  async updateDriverStatus(
    id: string,
    status: Driver['status']
  ): Promise<Driver> {
    const response = await api.put<Driver>(`/api/admin/drivers/${id}/status`, { status });
    return response.data;
  }

  async updateDriverAvailability(
    id: string,
    availability_status: Driver['availability_status']
  ): Promise<Driver> {
    const response = await api.put<Driver>(`/api/admin/drivers/${id}/availability`, { availability_status });
    return response.data;
  }

  async resetDriverPassword(id: string): Promise<{ message: string; newPassword: string }> {
    const response = await api.post<{ message: string; newPassword: string }>(`/api/admin/drivers/${id}/reset-password`);
    return response.data;
  }

  async assignRequestToDriver(driverId: string, requestId: string): Promise<{ message: string; assignment: any }> {
    const response = await api.post<{ message: string; assignment: any }>(`/api/admin/drivers/${driverId}/assign/${requestId}`);
    return response.data;
  }

  // Staff endpoints
  async getStaff(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  } = {}): Promise<{
    staff: Staff[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get<{
      staff: Staff[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>('/api/admin/staff', { params });
    return response.data;
  }

  async getStaffMember(id: string): Promise<{ staff: Staff }> {
    const response = await api.get<{ staff: Staff }>(`/api/admin/staff/${id}`);
    return response.data;
  }

  async createStaff(staffData: any): Promise<{ message: string; staff: Staff }> {
    const response = await api.post<{ message: string; staff: Staff }>('/api/admin/staff', staffData);
    return response.data;
  }

  async updateStaff(id: string, staffData: any): Promise<{ message: string; staff: Staff }> {
    const response = await api.put<{ message: string; staff: Staff }>(`/api/admin/staff/${id}`, staffData);
    return response.data;
  }

  async deleteStaff(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/api/admin/staff/${id}`);
    return response.data;
  }

  async resetStaffPassword(id: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/api/admin/staff/${id}/reset-password`, { newPassword });
    return response.data;
  }

  // Pricing Management endpoints
  async getPricing(type?: 'all' | 'default' | 'company'): Promise<{ pricing: DeliveryPricing[] }> {
    const response = await api.get<{ pricing: DeliveryPricing[] }>('/api/admin/pricing', { 
      params: type ? { type } : {} 
    });
    return response.data;
  }

  async getDefaultPricing(): Promise<{ pricing: DeliveryPricing }> {
    const response = await api.get<{ pricing: DeliveryPricing }>('/api/admin/pricing/default');
    return response.data;
  }

  async createOrUpdateDefaultPricing(pricingData: {
    name: string;
    description?: string;
    tiers: PricingTier[];
  }): Promise<{ 
    message: string; 
    pricing: DeliveryPricing;
    syncStats?: {
      companiesUpdated: number;
      companiesCreated: number;
      companiesSkipped: number;
      totalCompanies: number;
    }
  }> {
    const response = await api.post<{ 
      message: string; 
      pricing: DeliveryPricing;
      syncStats?: {
        companiesUpdated: number;
        companiesCreated: number;
        companiesSkipped: number;
        totalCompanies: number;
      }
    }>(
      '/api/admin/pricing/default',
      pricingData
    );
    return response.data;
  }

  async getCompanyPricing(companyId: string): Promise<{ pricing: DeliveryPricing; isCustom: boolean }> {
    const response = await api.get<{ pricing: DeliveryPricing; isCustom: boolean }>(
      `/api/admin/pricing/company/${companyId}`
    );
    return response.data;
  }

  async setCompanyPricing(companyId: string, pricingData: {
    name: string;
    description?: string;
    tiers: PricingTier[];
  }): Promise<{ message: string; pricing: DeliveryPricing }> {
    const response = await api.post<{ message: string; pricing: DeliveryPricing }>(
      `/api/admin/pricing/company/${companyId}`,
      pricingData
    );
    return response.data;
  }

  async removeCompanyPricing(companyId: string): Promise<{ message: string; pricing: DeliveryPricing }> {
    const response = await api.delete<{ message: string; pricing: DeliveryPricing }>(
      `/api/admin/pricing/company/${companyId}`
    );
    return response.data;
  }

  async syncAllCompaniesWithDefaultPricing(): Promise<{ 
    message: string; 
    syncStats: {
      companiesCreated: number;
      companiesSkipped: number;
      totalCompanies: number;
    }
  }> {
    const response = await api.post<{ 
      message: string; 
      syncStats: {
        companiesCreated: number;
        companiesSkipped: number;
        totalCompanies: number;
      }
    }>('/api/admin/pricing/sync-all');
    return response.data;
  }

  async calculatePrice(data: { 
    weight: number; 
    companyId?: string 
  }): Promise<{
    weight: number;
    price: number;
    currency: string;
    pricingName: string;
    isCustomPricing: boolean;
  }> {
    const response = await api.post<{
      weight: number;
      price: number;
      currency: string;
      pricingName: string;
      isCustomPricing: boolean;
    }>('/api/admin/pricing/calculate', data);
    return response.data;
  }

  // Delivery Request Management endpoints
  async getDeliveryRequests(params: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    companyId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<{
    requests: DeliveryRequest[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get<{
      requests: DeliveryRequest[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>('/api/admin/requests', { params });
    return response.data;
  }

  async getDeliveryRequest(id: string): Promise<{ request: DeliveryRequest }> {
    const response = await api.get<{ request: DeliveryRequest }>(`/api/admin/requests/${id}`);
    return response.data;
  }

  async updateDeliveryRequestStatus(
    id: string,
    data: {
      status: DeliveryRequest['status'];
      notes?: string;
      driverId?: string;
    }
  ): Promise<DeliveryRequest> {
    const response = await api.put<DeliveryRequest>(`/api/admin/requests/${id}/status`, data);
    return response.data;
  }

  async assignDriverToRequest(
    id: string,
    data: {
      driverId: string;
      notes?: string;
    }
  ): Promise<{
    message: string;
    request: DeliveryRequest;
    driver: Driver;
  }> {
    const response = await api.post<{
      message: string;
      request: DeliveryRequest;
      driver: Driver;
    }>(`/api/admin/requests/${id}/assign-driver`, data);
    return response.data;
  }

  async getDeliveryRequestStats(params: {
    period?: 'today' | 'week' | 'month' | 'all';
    companyId?: string;
  } = {}): Promise<DeliveryRequestStats> {
    const response = await api.get<DeliveryRequestStats>('/api/admin/requests/stats', { params });
    return response.data;
  }
}

// Create API instance
export const adminAPI = new AdminAPI();

// Utility functions
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    relative: getRelativeTime(date),
  };
};

export const getRelativeTime = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return diffMinutes < 1 ? 'Just now' : `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

export const getStatusColor = (status: string) => {
  const colors = {
    NEW: 'bg-blue-100 text-blue-800',
    UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CONVERTED: 'bg-purple-100 text-purple-800',
    // Request statuses
    PENDING: 'bg-yellow-100 text-yellow-800',
    ASSIGNED: 'bg-blue-100 text-blue-800',
    PICKED_UP: 'bg-indigo-100 text-indigo-800',
    IN_TRANSIT: 'bg-purple-100 text-purple-800',
    DELIVERED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

export const getStatusLabel = (status: string) => {
  const labels = {
    NEW: 'New',
    UNDER_REVIEW: 'Under Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CONVERTED: 'Converted',
    // Request statuses
    PENDING: 'Pending',
    ASSIGNED: 'Assigned',
    PICKED_UP: 'Picked Up',
    IN_TRANSIT: 'In Transit',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  };
  return labels[status as keyof typeof labels] || status;
};

export const getPriorityColor = (priority: string) => {
  const colors = {
    normal: 'bg-gray-100 text-gray-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };
  return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

export const getPriorityLabel = (priority: string) => {
  const labels = {
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
  };
  return labels[priority as keyof typeof labels] || priority;
};