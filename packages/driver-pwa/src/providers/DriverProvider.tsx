'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  license_number: string;
  vehicle_type: string;
  vehicle_plate: string;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE' | 'ON_BREAK';
  rating: number;
  total_deliveries: number;
  current_location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    updated_at: string;
  };
}

interface DeliveryAssignment {
  id: string;
  tracking_number: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  pickup_location: {
    address: string;
    latitude?: number;
    longitude?: number;
    contact_name?: string;
    contact_phone?: string;
  };
  delivery_location: {
    address: string;
    latitude?: number;
    longitude?: number;
    contact_name?: string;
    contact_phone?: string;
  };
  package_details: {
    description: string;
    weight?: number;
    dimensions?: string;
    value?: number;
  };
  special_instructions?: string;
  estimated_cost?: number;
  estimated_delivery?: string;
  created_at: string;
}

interface DriverContextType {
  // Auth state
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Driver data
  driver: Driver | null;
  assignments: DeliveryAssignment[];
  
  // Auth methods
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  
  // Driver methods
  updateStatus: (status: Driver['status']) => Promise<void>;
  updateLocation: (latitude: number, longitude: number, accuracy?: number) => Promise<void>;
  
  // Assignment methods
  refreshAssignments: () => Promise<void>;
  acceptAssignment: (assignmentId: string) => Promise<void>;
  completeAssignment: (assignmentId: string, notes?: string, signature?: string) => Promise<void>;
}

const DriverContext = createContext<DriverContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);

  // Initialize auth state
  useEffect(() => {
    const token = localStorage.getItem('driver_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      loadDriverProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Load driver profile
  const loadDriverProfile = async () => {
    try {
      const response = await axios.get('/driver/profile');
      setDriver(response.data);
      setIsAuthenticated(true);
      await refreshAssignments();
    } catch (error) {
      console.error('Failed to load driver profile:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  // Login
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response = await axios.post('/auth/login', {
        email,
        password,
        pwaType: 'driver'
      });

      const { token, user } = response.data;
      
      // Check if user is a driver
      if (user.role !== 'DRIVER') {
        toast.error('Access denied. Driver account required.');
        return false;
      }

      // Store token
      localStorage.setItem('driver_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Load driver profile
      await loadDriverProfile();
      
      toast.success('Login successful!');
      return true;
    } catch (error: any) {
      console.error('Login failed:', error);
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('driver_token');
    delete axios.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
    setDriver(null);
    setAssignments([]);
    toast.success('Logged out successfully');
  };

  // Update driver status
  const updateStatus = async (status: Driver['status']) => {
    try {
      await axios.put('/driver/status', { status });
      
      setDriver(prev => prev ? { ...prev, status } : null);
      toast.success(`Status updated to ${status.toLowerCase()}`);
    } catch (error: any) {
      console.error('Failed to update status:', error);
      const message = error.response?.data?.message || 'Failed to update status';
      toast.error(message);
    }
  };

  // Update location
  const updateLocation = async (latitude: number, longitude: number, accuracy?: number) => {
    try {
      await axios.post('/driver/location', {
        latitude,
        longitude,
        accuracy
      });

      setDriver(prev => prev ? {
        ...prev,
        current_location: {
          latitude,
          longitude,
          accuracy,
          updated_at: new Date().toISOString()
        }
      } : null);
    } catch (error: any) {
      console.error('Failed to update location:', error);
      // Don't show toast for location errors as they happen frequently
    }
  };

  // Refresh assignments
  const refreshAssignments = async () => {
    try {
      const response = await axios.get('/driver/assignments');
      setAssignments(response.data.assignments || []);
    } catch (error: any) {
      console.error('Failed to refresh assignments:', error);
      // Don't show toast for background refresh errors
    }
  };

  // Accept assignment
  const acceptAssignment = async (assignmentId: string) => {
    try {
      await axios.post(`/driver/assignments/${assignmentId}/accept`);
      
      // Update assignment status locally
      setAssignments(prev => prev.map(assignment => 
        assignment.id === assignmentId 
          ? { ...assignment, status: 'IN_PROGRESS' as const }
          : assignment
      ));

      // Update driver status to busy
      setDriver(prev => prev ? { ...prev, status: 'BUSY' } : null);
      
      toast.success('Assignment accepted!');
    } catch (error: any) {
      console.error('Failed to accept assignment:', error);
      const message = error.response?.data?.message || 'Failed to accept assignment';
      toast.error(message);
    }
  };

  // Complete assignment
  const completeAssignment = async (assignmentId: string, notes?: string, signature?: string) => {
    try {
      await axios.post(`/driver/assignments/${assignmentId}/complete`, {
        delivery_notes: notes,
        recipient_signature: signature
      });
      
      // Remove completed assignment from list
      setAssignments(prev => prev.filter(assignment => assignment.id !== assignmentId));

      // Update driver status to available and increment deliveries
      setDriver(prev => prev ? { 
        ...prev, 
        status: 'AVAILABLE',
        total_deliveries: prev.total_deliveries + 1
      } : null);
      
      toast.success('Delivery completed!');
    } catch (error: any) {
      console.error('Failed to complete assignment:', error);
      const message = error.response?.data?.message || 'Failed to complete delivery';
      toast.error(message);
    }
  };

  const value: DriverContextType = {
    // Auth state
    isAuthenticated,
    isLoading,
    
    // Driver data
    driver,
    assignments,
    
    // Auth methods
    login,
    logout,
    
    // Driver methods
    updateStatus,
    updateLocation,
    
    // Assignment methods
    refreshAssignments,
    acceptAssignment,
    completeAssignment
  };

  return (
    <DriverContext.Provider value={value}>
      {children}
    </DriverContext.Provider>
  );
}

export function useDriver() {
  const context = useContext(DriverContext);
  if (context === undefined) {
    throw new Error('useDriver must be used within a DriverProvider');
  }
  return context;
}