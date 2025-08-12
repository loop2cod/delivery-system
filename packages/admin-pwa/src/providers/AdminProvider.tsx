'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import axios from 'axios';
import toast from 'react-hot-toast';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId?: string;
  driverId?: string;
}

interface AdminContextType {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}

interface AdminProviderProps {
  children: React.ReactNode;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Configure axios defaults
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;

export function AdminProvider({ children }: AdminProviderProps) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const isAuthenticated = !!user;

  // Set up axios interceptors
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = Cookies.get('admin_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Skip refresh for refresh endpoint to prevent loops
        if (originalRequest.url?.includes('/auth/refresh')) {
          return Promise.reject(error);
        }
        
        if (error.response?.status === 401 && !originalRequest._retry && !isRefreshing) {
          originalRequest._retry = true;
          
          try {
            await refreshToken();
            // Retry the original request
            const token = Cookies.get('admin_token');
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return axios.request(originalRequest);
            }
          } catch (refreshError) {
            logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [isRefreshing]);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = Cookies.get('admin_token');
      const refreshTokenValue = Cookies.get('admin_refresh_token');
      
      if (!token && !refreshTokenValue) {
        setIsLoading(false);
        return;
      }

      if (!token && refreshTokenValue) {
        // Try to refresh the token
        try {
          await refreshToken();
          await checkAuth(); // Retry after refresh
          return;
        } catch (error) {
          console.error('Token refresh failed during auth check:', error);
          Cookies.remove('admin_token');
          Cookies.remove('admin_refresh_token');
          setIsLoading(false);
          return;
        }
      }

      // For now, decode token to get user info since we don't have /me endpoint
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Create a user object from stored data or default
        const userData = {
          id: payload.userId,
          email: 'admin@deliveryuae.com', // Default for now
          name: 'System Administrator',
          role: 'SUPER_ADMIN'
        };
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      Cookies.remove('admin_token');
      Cookies.remove('admin_refresh_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password,
      });

      const { user: userData, token, refreshToken } = response.data;

      // Store tokens
      Cookies.set('admin_token', token, { expires: 7 }); // 7 days
      Cookies.set('admin_refresh_token', refreshToken, { expires: 30 }); // 30 days

      setUser(userData);
      toast.success('Login successful');
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    Cookies.remove('admin_token');
    Cookies.remove('admin_refresh_token');
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const refreshToken = async () => {
    if (isRefreshing) {
      throw new Error('Refresh already in progress');
    }
    
    try {
      setIsRefreshing(true);
      const refreshTokenValue = Cookies.get('admin_refresh_token');
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post('/api/auth/refresh', {
        refreshToken: refreshTokenValue,
      });

      const { token, refreshToken: newRefreshToken } = response.data;

      Cookies.set('admin_token', token, { expires: 7 });
      Cookies.set('admin_refresh_token', newRefreshToken, { expires: 30 });
    } catch (error) {
      console.error('Token refresh failed:', error);
      Cookies.remove('admin_token');
      Cookies.remove('admin_refresh_token');
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  };

  const value: AdminContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshToken,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}