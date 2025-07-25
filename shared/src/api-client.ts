/**
 * Unified API Client for UAE Delivery Management System
 * Provides consistent API communication across all PWA applications
 */

import { AuthenticatedApiClient, TokenManager } from './auth';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

export class DeliveryApiClient extends AuthenticatedApiClient {
  constructor(baseURL: string) {
    super(baseURL, {
      onTokenRefresh: (tokens) => {
        TokenManager.setTokens(tokens);
      },
      onAuthError: () => {
        TokenManager.clearTokens();
        window.location.href = '/login';
      },
    });
  }

  // Public API endpoints (no auth required)
  public = {
    // Submit inquiry
    submitInquiry: (data: any) => 
      this.post<ApiResponse>('/api/public/inquiries', data),
    
    // Track package
    trackPackage: (trackingNumber: string) =>
      this.get<ApiResponse>(`/api/public/track/${trackingNumber}`),
    
    // Get company info
    getCompanyInfo: () =>
      this.get<ApiResponse>('/api/public/company-info'),
    
    // Get service areas
    getServiceAreas: () =>
      this.get<ApiResponse>('/api/public/service-areas'),
  };

  // Authentication endpoints
  auth = {
    // Login
    login: (credentials: { email: string; password: string; twoFactorCode?: string }) =>
      this.post<ApiResponse>('/api/auth/login', credentials),
    
    // Register
    register: (data: any) =>
      this.post<ApiResponse>('/api/auth/register', data),
    
    // Refresh token
    refreshToken: (refreshToken: string) =>
      this.post<ApiResponse>('/api/auth/refresh', { refreshToken }),
    
    // Logout
    logout: () =>
      this.post<ApiResponse>('/api/auth/logout'),
    
    // Forgot password
    forgotPassword: (email: string) =>
      this.post<ApiResponse>('/api/auth/forgot-password', { email }),
    
    // Reset password
    resetPassword: (token: string, password: string) =>
      this.post<ApiResponse>('/api/auth/reset-password', { token, password }),
    
    // Verify email
    verifyEmail: (token: string) =>
      this.post<ApiResponse>('/api/auth/verify-email', { token }),
    
    // Enable 2FA
    enableTwoFactor: () =>
      this.post<ApiResponse>('/api/auth/2fa/enable'),
    
    // Disable 2FA
    disableTwoFactor: (code: string) =>
      this.post<ApiResponse>('/api/auth/2fa/disable', { code }),
  };

  // Admin API endpoints
  admin = {
    // Dashboard stats
    getDashboardStats: () =>
      this.get<ApiResponse>('/api/admin/dashboard/stats'),
    
    // Inquiries management
    getInquiries: (params?: any) =>
      this.get<ApiResponse>(`/api/admin/inquiries?${new URLSearchParams(params)}`),
    
    updateInquiry: (id: string, data: any) =>
      this.put<ApiResponse>(`/api/admin/inquiries/${id}`, data),
    
    deleteInquiry: (id: string) =>
      this.delete<ApiResponse>(`/api/admin/inquiries/${id}`),
    
    // Users management
    getUsers: (params?: any) =>
      this.get<ApiResponse>(`/api/admin/users?${new URLSearchParams(params)}`),
    
    createUser: (data: any) =>
      this.post<ApiResponse>('/api/admin/users', data),
    
    updateUser: (id: string, data: any) =>
      this.put<ApiResponse>(`/api/admin/users/${id}`, data),
    
    deleteUser: (id: string) =>
      this.delete<ApiResponse>(`/api/admin/users/${id}`),
    
    // Drivers management
    getDrivers: (params?: any) =>
      this.get<ApiResponse>(`/api/admin/drivers?${new URLSearchParams(params)}`),
    
    createDriver: (data: any) =>
      this.post<ApiResponse>('/api/admin/drivers', data),
    
    updateDriver: (id: string, data: any) =>
      this.put<ApiResponse>(`/api/admin/drivers/${id}`, data),
    
    deleteDriver: (id: string) =>
      this.delete<ApiResponse>(`/api/admin/drivers/${id}`),
    
    // Companies management
    getCompanies: (params?: any) =>
      this.get<ApiResponse>(`/api/admin/companies?${new URLSearchParams(params)}`),
    
    updateCompany: (id: string, data: any) =>
      this.put<ApiResponse>(`/api/admin/companies/${id}`, data),
    
    // Packages management
    getPackages: (params?: any) =>
      this.get<ApiResponse>(`/api/admin/packages?${new URLSearchParams(params)}`),
    
    updatePackage: (id: string, data: any) =>
      this.put<ApiResponse>(`/api/admin/packages/${id}`, data),
    
    // System settings
    getSettings: () =>
      this.get<ApiResponse>('/api/admin/settings'),
    
    updateSettings: (data: any) =>
      this.put<ApiResponse>('/api/admin/settings', data),
    
    // Reports
    getReports: (type: string, params?: any) =>
      this.get<ApiResponse>(`/api/admin/reports/${type}?${new URLSearchParams(params)}`),
  };

  // Business API endpoints
  business = {
    // Dashboard
    getDashboard: () =>
      this.get<ApiResponse>('/api/business/dashboard'),
    
    // Delivery requests
    getRequests: (params?: any) =>
      this.get<ApiResponse>(`/api/business/requests?${new URLSearchParams(params)}`),
    
    createRequest: (data: any) =>
      this.post<ApiResponse>('/api/business/requests', data),
    
    updateRequest: (id: string, data: any) =>
      this.put<ApiResponse>(`/api/business/requests/${id}`, data),
    
    cancelRequest: (id: string, reason: string) =>
      this.post<ApiResponse>(`/api/business/requests/${id}/cancel`, { reason }),
    
    // Packages
    getPackages: (params?: any) =>
      this.get<ApiResponse>(`/api/business/packages?${new URLSearchParams(params)}`),
    
    getPackage: (id: string) =>
      this.get<ApiResponse>(`/api/business/packages/${id}`),
    
    // Invoices
    getInvoices: (params?: any) =>
      this.get<ApiResponse>(`/api/business/invoices?${new URLSearchParams(params)}`),
    
    getInvoice: (id: string) =>
      this.get<ApiResponse>(`/api/business/invoices/${id}`),
    
    // Company profile
    getProfile: () =>
      this.get<ApiResponse>('/api/business/profile'),
    
    updateProfile: (data: any) =>
      this.put<ApiResponse>('/api/business/profile', data),
    
    // Team management
    getTeamMembers: () =>
      this.get<ApiResponse>('/api/business/team'),
    
    inviteTeamMember: (data: any) =>
      this.post<ApiResponse>('/api/business/team/invite', data),
    
    removeTeamMember: (id: string) =>
      this.delete<ApiResponse>(`/api/business/team/${id}`),
  };

  // Driver API endpoints
  driver = {
    // Dashboard
    getDashboard: () =>
      this.get<ApiResponse>('/api/driver/dashboard'),
    
    // Assignments
    getAssignments: (status?: string) =>
      this.get<ApiResponse>(`/api/driver/assignments${status ? `?status=${status}` : ''}`),
    
    acceptAssignment: (id: string) =>
      this.post<ApiResponse>(`/api/driver/assignments/${id}/accept`),
    
    rejectAssignment: (id: string, reason: string) =>
      this.post<ApiResponse>(`/api/driver/assignments/${id}/reject`, { reason }),
    
    startDelivery: (id: string) =>
      this.post<ApiResponse>(`/api/driver/assignments/${id}/start`),
    
    completeDelivery: (id: string, data: any) =>
      this.post<ApiResponse>(`/api/driver/assignments/${id}/complete`, data),
    
    // Package operations
    scanPackage: (qrCode: string) =>
      this.post<ApiResponse>('/api/driver/packages/scan', { qrCode }),
    
    updatePackageStatus: (id: string, status: string, location?: any) =>
      this.put<ApiResponse>(`/api/driver/packages/${id}/status`, { status, location }),
    
    uploadDeliveryPhoto: (packageId: string, photo: File) => {
      const formData = new FormData();
      formData.append('photo', photo);
      return this.post<ApiResponse>(`/api/driver/packages/${packageId}/photo`, formData);
    },
    
    captureSignature: (packageId: string, signature: string) =>
      this.post<ApiResponse>(`/api/driver/packages/${packageId}/signature`, { signature }),
    
    // Location updates
    updateLocation: (location: { latitude: number; longitude: number }) =>
      this.post<ApiResponse>('/api/driver/location', location),
    
    // Profile
    getProfile: () =>
      this.get<ApiResponse>('/api/driver/profile'),
    
    updateProfile: (data: any) =>
      this.put<ApiResponse>('/api/driver/profile', data),
    
    // Availability
    updateAvailability: (isAvailable: boolean) =>
      this.put<ApiResponse>('/api/driver/availability', { isAvailable }),
  };

  // File upload utility
  uploadFile = async (file: File, endpoint: string): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = TokenManager.getAccessToken();
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    return response.json();
  };

  // WebSocket connection helper
  createWebSocketConnection = (endpoint: string): WebSocket => {
    const token = TokenManager.getAccessToken();
    const wsUrl = this.baseURL.replace('http', 'ws') + endpoint;
    const ws = new WebSocket(`${wsUrl}?token=${token}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    return ws;
  };
}

// Create singleton instance
const apiClient = new DeliveryApiClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
);

export default apiClient;