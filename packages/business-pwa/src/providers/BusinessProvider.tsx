'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import axios from 'axios';
import toast from 'react-hot-toast';

interface BusinessUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'manager' | 'employee' | 'admin';
  company: {
    id: string;
    name: string;
    industry: string;
    address: string;
    phone: string;
    email: string;
    website?: string;
    logo?: string;
  };
  permissions: string[];
  avatar?: string;
}

interface BusinessContextType {
  user: BusinessUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (data: Partial<BusinessUser>) => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}

interface BusinessProviderProps {
  children: React.ReactNode;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Configure axios defaults
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;

export function BusinessProvider({ children }: BusinessProviderProps) {
  const [user, setUser] = useState<BusinessUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;

  // Set up axios interceptors
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = Cookies.get('business_token');
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
        if (error.response?.status === 401) {
          try {
            await refreshToken();
            // Retry the original request
            const token = Cookies.get('business_token');
            if (token) {
              error.config.headers.Authorization = `Bearer ${token}`;
              return axios.request(error.config);
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
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = Cookies.get('business_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await axios.get('/api/business/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      Cookies.remove('business_token');
      Cookies.remove('business_refresh_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/api/business/login', {
        email,
        password,
      });

      const { user: userData, accessToken, refreshToken } = response.data;

      // Store tokens
      Cookies.set('business_token', accessToken, { expires: 1 }); // 1 day
      Cookies.set('business_refresh_token', refreshToken, { expires: 7 }); // 7 days

      setUser(userData);
      toast.success(`Welcome back, ${userData.firstName}!`);
      
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
    Cookies.remove('business_token');
    Cookies.remove('business_refresh_token');
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const refreshToken = async () => {
    try {
      const refreshTokenValue = Cookies.get('business_refresh_token');
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post('/api/business/refresh', {
        refreshToken: refreshTokenValue,
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data;

      Cookies.set('business_token', accessToken, { expires: 1 });
      Cookies.set('business_refresh_token', newRefreshToken, { expires: 7 });
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      throw error;
    }
  };

  const updateProfile = async (data: Partial<BusinessUser>) => {
    try {
      const response = await axios.patch('/api/business/profile', data);
      setUser(response.data.user);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
      throw error;
    }
  };

  const value: BusinessContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshToken,
    updateProfile,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}