import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// Create axios instance with base configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Debug log to verify configuration (development only)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Public API Configuration:', {
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

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    // Log request for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 Public API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
        data: config.data,
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
      console.log(`✅ Public API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }
    
    return response;
  },
  (error: AxiosError) => {
    const { response, config } = error;
    
    // Log error details
    console.error(`❌ Public API Error: ${config?.method?.toUpperCase()} ${config?.url}`, {
      status: response?.status,
      data: response?.data,
      message: error.message,
    });

    // Handle different error scenarios
    if (response) {
      const status = response.status;
      const errorData = response.data as any;
      
      // For public API, we don't need authentication handling
      // Just pass through the error for component handling
    }

    return Promise.reject(error);
  }
);

// Inquiry interfaces
export interface CreateInquiryData {
  company_name: string;
  industry: string;
  contact_person: string;
  email: string;
  phone: string;
  expected_volume: string;
  special_requirements?: string;
  service_type?: string;
}

export interface TrackingData {
  trackingNumber: string;
  status?: string;
  // Add more tracking fields as needed
}

// Public API client class
class PublicAPI {
  // Submit new inquiry
  async submitInquiry(data: CreateInquiryData): Promise<{
    success: boolean;
    message: string;
    inquiry?: any;
  }> {
    try {
      // Map frontend field names to backend field names
      const backendData = {
        companyName: data.company_name,
        industry: data.industry,
        contactPerson: data.contact_person,
        email: data.email,
        phone: data.phone,
        expectedVolume: data.expected_volume,
        serviceType: data.service_type,
        specialRequirements: data.special_requirements
      };

      // Use public inquiry endpoint (no authentication required)
      const response = await api.post<{
        id: string;
        referenceNumber: string;
        message: string;
        estimatedResponseTime: string;
      }>('/api/public/inquiry', backendData);
      
      return {
        success: true,
        message: response.data.message || 'Inquiry submitted successfully',
        inquiry: {
          id: response.data.id,
          reference_number: response.data.referenceNumber,
          estimated_response_time: response.data.estimatedResponseTime
        }
      };
    } catch (error: any) {
      console.error('Inquiry submission error:', error);
      // Handle API errors gracefully
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.response?.status === 400) {
        throw new Error('Please check your form data and try again.');
      }
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      throw new Error('Failed to submit inquiry. Please try again.');
    }
  }

  // Track package
  async trackPackage(trackingNumber: string): Promise<TrackingData> {
    try {
      const response = await api.get<TrackingData>(`/api/public/track/${trackingNumber}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Tracking number not found');
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to track package. Please try again.');
    }
  }

  // Get available services/industries (if needed)
  async getServices(): Promise<string[]> {
    try {
      const response = await api.get<{ services: string[] }>('/api/public/services');
      return response.data.services;
    } catch (error) {
      // Return fallback services if API fails
      return [
        'E-commerce & Retail',
        'Food & Beverage', 
        'Healthcare & Pharmaceuticals',
        'Logistics & Transportation',
        'Manufacturing',
        'Technology',
        'Other'
      ];
    }
  }
}

// Create and export API instance
export const publicAPI = new PublicAPI();

// Export individual functions for convenience
export const submitInquiry = (data: CreateInquiryData) => publicAPI.submitInquiry(data);
export const trackPackage = (trackingNumber: string) => publicAPI.trackPackage(trackingNumber);
export const getServices = () => publicAPI.getServices();

// Utility functions
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format UAE phone numbers
  if (cleaned.startsWith('971') && cleaned.length === 12) {
    return `+971 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  
  // Format local UAE numbers
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+971 ${cleaned.slice(1, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  return phone; // Return original if no pattern matches
};

export default publicAPI;