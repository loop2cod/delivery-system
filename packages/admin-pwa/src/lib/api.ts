import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

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

// API client class
class AdminAPI {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getToken(): string | null {
    return Cookies.get('admin_token') || null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options, 
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'An error occurred',
      }));
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string, pwaType: string = 'admin') {
    const response = await this.request<{
      user: any;
      token: string;
      refreshToken: string;
      expiresIn: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, pwaType }),
    });
    
    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      // Token cleanup handled by AdminProvider
    }
  }

  // Dashboard endpoints
  async getDashboard(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/api/admin/dashboard');
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
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return this.request<{
      inquiries: Inquiry[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/api/admin/inquiries${queryString ? `?${queryString}` : ''}`);
  }

  async getInquiry(id: string): Promise<Inquiry> {
    return this.request<Inquiry>(`/api/admin/inquiries/${id}`);
  }

  async createInquiry(data: CreateInquiryData): Promise<Inquiry> {
    return this.request<Inquiry>('/api/admin/inquiries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInquiry(
    id: string,
    data: Partial<{
      status: string;
      notes: string;
    }>
  ): Promise<Inquiry> {
    return this.request<Inquiry>(`/api/admin/inquiries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInquiry(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/admin/inquiries/${id}`, {
      method: 'DELETE',
    });
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
    return this.request<{
      message: string;
      updated_inquiries: Array<{
        id: string;
        reference_number: string;
        status: string;
      }>;
    }>('/api/admin/inquiries/bulk-update', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return this.request<{
      companies: Company[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/api/admin/companies${queryString ? `?${queryString}` : ''}`);
  }

  async getCompany(id: string): Promise<Company> {
    return this.request<Company>(`/api/admin/companies/${id}`);
  }

  async resetCompanyPassword(id: string): Promise<{ message: string; newPassword: string }> {
    const token = this.getToken();
    const headers: any = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    // Make direct fetch call to avoid automatic Content-Type header
    const response = await fetch(`${this.baseURL}/api/admin/companies/${id}/reset-password`, {
      method: 'POST',
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'An error occurred',
      }));
      throw new Error(error.message || 'API request failed');
    }
    
    return response.json();
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
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return this.request<{
      drivers: Driver[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/api/admin/drivers${queryString ? `?${queryString}` : ''}`);
  }

  async getDriver(id: string): Promise<Driver> {
    return this.request<Driver>(`/api/admin/drivers/${id}`);
  }

  async createDriver(data: CreateDriverData): Promise<Driver> {
    return this.request<Driver>('/api/admin/drivers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDriver(
    id: string,
    data: Partial<Driver>
  ): Promise<Driver> {
    return this.request<Driver>(`/api/admin/drivers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDriver(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/admin/drivers/${id}`, {
      method: 'DELETE',
    });
  }

  async updateDriverStatus(
    id: string,
    status: Driver['status']
  ): Promise<Driver> {
    return this.request<Driver>(`/api/admin/drivers/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async updateDriverAvailability(
    id: string,
    availability_status: Driver['availability_status']
  ): Promise<Driver> {
    return this.request<Driver>(`/api/admin/drivers/${id}/availability`, {
      method: 'PUT',
      body: JSON.stringify({ availability_status }),
    });
  }

  // Staff endpoints
  async getStaff(): Promise<{ staff: Staff[] }> {
    return this.request<{ staff: Staff[] }>('/api/admin/staff');
  }
}

// Create API instance
export const adminAPI = new AdminAPI(API_BASE_URL);

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
  };
  return labels[status as keyof typeof labels] || status;
};