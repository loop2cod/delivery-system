import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

// Create axios instance with base configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('business_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const { response } = error;
    
    if (response) {
      const status = response.status;
      const errorData = response.data as any;
      
      switch (status) {
        case 401:
          // Unauthorized - handled by BusinessProvider
          break;
        case 403:
          toast.error(errorData?.message || 'Access denied.');
          break;
        case 404:
          // Not found - don't show toast for 404s as they might be expected
          break;
        case 422:
          toast.error(errorData?.message || 'Invalid data provided.');
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          toast.error('Server error. Please try again later.');
          break;
        default:
          if (status >= 400) {
            toast.error(errorData?.message || `Error: ${status}`);
          }
      }
    } else {
      toast.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

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

export interface PriceCalculation {
  weight: number;
  price: number;
  currency: string;
  pricingName: string;
  isCustomPricing: boolean;
  breakdown?: {
    tier: PricingTier;
    calculation: string;
  };
}

// Business API client class
class BusinessAPI {
  // Company/Profile endpoints
  async getProfile(): Promise<{ company: any }> {
    const response = await api.get<{ company: any }>('/api/business/profile');
    return response.data;
  }

  async updateProfile(data: any): Promise<{ message: string; company: any }> {
    const response = await api.put<{ message: string; company: any }>('/api/business/profile', data);
    return response.data;
  }

  // Dashboard endpoints
  async getDashboard(): Promise<any> {
    const response = await api.get('/api/business/dashboard');
    return response.data;
  }

  // Pricing endpoints
  async getCompanyPricing(): Promise<{ pricing: DeliveryPricing; isCustom: boolean }> {
    const response = await api.get<{ pricing: DeliveryPricing; isCustom: boolean }>('/api/business/pricing');
    return response.data;
  }

  async calculatePrice(weight: number): Promise<PriceCalculation> {
    const response = await api.post<PriceCalculation>('/api/business/pricing/calculate', { weight });
    return response.data;
  }

  // Delivery request endpoints
  async getRequests(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}): Promise<{
    requests: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get('/api/business/requests', { params });
    return response.data;
  }

  async createRequest(data: any): Promise<{ message: string; request: any; requestNumber: string }> {
    const response = await api.post<{ message: string; request: any; requestNumber: string }>('/api/business/requests', data);
    return response.data;
  }

  async getRequest(id: string): Promise<{ request: any }> {
    const response = await api.get<{ request: any }>(`/api/business/requests/${id}`);
    return response.data;
  }

  async updateRequest(id: string, data: any): Promise<{ message: string; request: any }> {
    const response = await api.put<{ message: string; request: any }>(`/api/business/requests/${id}`, data);
    return response.data;
  }

  async cancelRequest(id: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/api/business/requests/${id}/cancel`);
    return response.data;
  }
}

// Create API instance
export const businessAPI = new BusinessAPI();

// Utility functions
export const formatPrice = (price: number, currency: string = 'AED') => {
  return `${currency} ${price.toFixed(2)}`;
};

export const calculateTotalWeight = (items: { weight?: number; quantity: number }[]) => {
  return items.reduce((total, item) => {
    const itemWeight = item.weight || 0;
    return total + (itemWeight * item.quantity);
  }, 0);
};

export const formatWeight = (weight: number) => {
  if (weight < 1) {
    return `${(weight * 1000).toFixed(0)}g`;
  }
  return `${weight.toFixed(1)}kg`;
};