/**
 * Unified Authentication System for UAE Delivery Management PWAs
 * Provides JWT token management, role-based access control, and session handling
 */

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: string;
  companyId?: string;
  permissions?: string[];
}

export type UserRole = 'admin' | 'business' | 'driver' | 'customer';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  companyId?: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  verifyPhone: (code: string) => Promise<void>;
  enableTwoFactor: () => Promise<{ secret: string; qrCode: string }>;
  disableTwoFactor: (code: string) => Promise<void>;
  checkPermission: (permission: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

// JWT Token utilities
export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'delivery_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'delivery_refresh_token';
  private static readonly USER_KEY = 'delivery_user';

  static setTokens(tokens: AuthTokens): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
  }

  static getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }
    return null;
  }

  static getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return null;
  }

  static clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  static setUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  static getUser(): User | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }

  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  static getTokenPayload(token: string): any {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }
}

// Permission utilities
export class PermissionManager {
  private static readonly ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    admin: [
      'admin:*',
      'users:*',
      'companies:*',
      'drivers:*',
      'packages:*',
      'inquiries:*',
      'settings:*',
      'reports:*',
      'analytics:*'
    ],
    business: [
      'company:read',
      'company:update',
      'packages:create',
      'packages:read',
      'packages:update',
      'requests:*',
      'tracking:read',
      'invoices:read',
      'team:manage'
    ],
    driver: [
      'driver:read',
      'driver:update',
      'assignments:read',
      'assignments:update',
      'packages:scan',
      'packages:update_status',
      'deliveries:confirm',
      'location:update'
    ],
    customer: [
      'tracking:read',
      'inquiries:create',
      'profile:read',
      'profile:update'
    ]
  };

  static hasPermission(user: User, permission: string): boolean {
    if (!user || !user.isActive) return false;

    // Check role-based permissions
    const rolePermissions = this.ROLE_PERMISSIONS[user.role] || [];
    
    // Check for wildcard permissions
    const hasWildcard = rolePermissions.some(p => {
      if (p.endsWith(':*')) {
        const prefix = p.slice(0, -2);
        return permission.startsWith(prefix);
      }
      return p === permission;
    });

    if (hasWildcard) return true;

    // Check user-specific permissions
    const userPermissions = user.permissions || [];
    return userPermissions.includes(permission);
  }

  static hasRole(user: User, roles: UserRole | UserRole[]): boolean {
    if (!user || !user.isActive) return false;
    
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  }

  static canAccessPWA(user: User, pwa: 'public' | 'admin' | 'business' | 'driver'): boolean {
    if (!user || !user.isActive) {
      return pwa === 'public';
    }

    switch (pwa) {
      case 'public':
        return true;
      case 'admin':
        return user.role === 'admin';
      case 'business':
        return user.role === 'business' || user.role === 'admin';
      case 'driver':
        return user.role === 'driver' || user.role === 'admin';
      default:
        return false;
    }
  }
}

// Session management
export class SessionManager {
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static sessionTimer: NodeJS.Timeout | null = null;

  static startSession(onExpire: () => void): void {
    this.clearSession();
    
    this.sessionTimer = setTimeout(() => {
      onExpire();
    }, this.SESSION_TIMEOUT);
  }

  static extendSession(onExpire: () => void): void {
    this.startSession(onExpire);
  }

  static clearSession(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  static isSessionActive(): boolean {
    return this.sessionTimer !== null;
  }
}

// API client with authentication
export class AuthenticatedApiClient {
  private baseURL: string;
  private onTokenRefresh?: (tokens: AuthTokens) => void;
  private onAuthError?: () => void;

  constructor(
    baseURL: string,
    options?: {
      onTokenRefresh?: (tokens: AuthTokens) => void;
      onAuthError?: () => void;
    }
  ) {
    this.baseURL = baseURL;
    this.onTokenRefresh = options?.onTokenRefresh;
    this.onAuthError = options?.onAuthError;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = TokenManager.getAccessToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle token refresh
    if (response.status === 401 && token) {
      const refreshToken = TokenManager.getRefreshToken();
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(`${this.baseURL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshResponse.ok) {
            const tokens: AuthTokens = await refreshResponse.json();
            TokenManager.setTokens(tokens);
            this.onTokenRefresh?.(tokens);

            // Retry original request
            headers.Authorization = `Bearer ${tokens.accessToken}`;
            response = await fetch(url, { ...options, headers });
          } else {
            this.onAuthError?.();
            throw new Error('Authentication failed');
          }
        } catch (error) {
          this.onAuthError?.();
          throw error;
        }
      } else {
        this.onAuthError?.();
        throw new Error('No refresh token available');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Auth utilities
export const authUtils = {
  TokenManager,
  PermissionManager,
  SessionManager,
  AuthenticatedApiClient,
};

export default authUtils;