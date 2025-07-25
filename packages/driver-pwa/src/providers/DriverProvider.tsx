'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  vehicle: {
    type: string;
    plateNumber: string;
    model: string;
    color: string;
  };
  status: 'available' | 'busy' | 'offline' | 'on_delivery';
  currentLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  rating: number;
  totalDeliveries: number;
  activeDelivery?: string;
}

export interface Delivery {
  id: string;
  trackingNumber: string;
  serviceType: string;
  priority: 'normal' | 'high' | 'urgent';
  status: 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';
  estimatedTime: string;
  actualTime?: string;
  customer: {
    name: string;
    phone: string;
  };
  pickup: {
    address: string;
    coordinates: { lat: number; lng: number };
    contactName: string;
    contactPhone: string;
    instructions?: string;
    scheduledTime: string;
  };
  delivery: {
    address: string;
    coordinates: { lat: number; lng: number };
    contactName: string;
    contactPhone: string;
    instructions?: string;
    scheduledTime: string;
  };
  package: {
    description: string;
    weight: number;
    dimensions: string;
    value: number;
    requiresSignature: boolean;
    fragile: boolean;
  };
  route?: {
    distance: number;
    duration: number;
    steps: Array<{
      instruction: string;
      distance: number;
      duration: number;
    }>;
  };
  photos?: {
    pickup?: string[];
    delivery?: string[];
    signature?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface DriverContextType {
  driver: Driver | null;
  deliveries: Delivery[];
  activeDelivery: Delivery | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateStatus: (status: Driver['status']) => Promise<void>;
  updateLocation: (location: { lat: number; lng: number; address: string }) => Promise<void>;
  acceptDelivery: (deliveryId: string) => Promise<void>;
  startDelivery: (deliveryId: string) => Promise<void>;
  completePickup: (deliveryId: string, photos?: string[]) => Promise<void>;
  completeDelivery: (deliveryId: string, signature?: string, photos?: string[], notes?: string) => Promise<void>;
  markDeliveryFailed: (deliveryId: string, reason: string) => Promise<void>;
  refreshDeliveries: () => Promise<void>;
}

const DriverContext = createContext<DriverContextType | undefined>(undefined);

export function useDriver() {
  const context = useContext(DriverContext);
  if (context === undefined) {
    throw new Error('useDriver must be used within a DriverProvider');
  }
  return context;
}

interface DriverProviderProps {
  children: ReactNode;
}

export function DriverProvider({ children }: DriverProviderProps) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize driver from localStorage on mount
  useEffect(() => {
    const initializeDriver = async () => {
      try {
        const token = localStorage.getItem('driver_token');
        const savedDriver = localStorage.getItem('driver_data');
        
        if (token && savedDriver) {
          const driverData = JSON.parse(savedDriver);
          setDriver(driverData);
          setIsAuthenticated(true);
          await refreshDeliveries();
        }
      } catch (error) {
        console.error('Failed to initialize driver:', error);
        localStorage.removeItem('driver_token');
        localStorage.removeItem('driver_data');
      } finally {
        setIsLoading(false);
      }
    };

    initializeDriver();
  }, []);

  // Update active delivery when deliveries change
  useEffect(() => {
    if (driver?.activeDelivery) {
      const active = deliveries.find(d => d.id === driver.activeDelivery);
      setActiveDelivery(active || null);
    } else {
      setActiveDelivery(null);
    }
  }, [deliveries, driver?.activeDelivery]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Mock login - replace with actual API call
      const response = await fetch('/api/auth/driver/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const { token, driver: driverData } = await response.json();
        
        localStorage.setItem('driver_token', token);
        localStorage.setItem('driver_data', JSON.stringify(driverData));
        
        setDriver(driverData);
        setIsAuthenticated(true);
        await refreshDeliveries();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_data');
    setDriver(null);
    setDeliveries([]);
    setActiveDelivery(null);
    setIsAuthenticated(false);
  };

  const updateStatus = async (status: Driver['status']) => {
    if (!driver) return;

    try {
      const token = localStorage.getItem('driver_token');
      const response = await fetch('/api/driver/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const updatedDriver = { ...driver, status };
        setDriver(updatedDriver);
        localStorage.setItem('driver_data', JSON.stringify(updatedDriver));
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const updateLocation = async (location: { lat: number; lng: number; address: string }) => {
    if (!driver) return;

    try {
      const token = localStorage.getItem('driver_token');
      const response = await fetch('/api/driver/location', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ location }),
      });

      if (response.ok) {
        const updatedDriver = { ...driver, currentLocation: location };
        setDriver(updatedDriver);
        localStorage.setItem('driver_data', JSON.stringify(updatedDriver));
      }
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const acceptDelivery = async (deliveryId: string) => {
    try {
      const token = localStorage.getItem('driver_token');
      const response = await fetch(`/api/deliveries/${deliveryId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await refreshDeliveries();
        if (driver) {
          const updatedDriver = { ...driver, activeDelivery: deliveryId, status: 'on_delivery' as const };
          setDriver(updatedDriver);
          localStorage.setItem('driver_data', JSON.stringify(updatedDriver));
        }
      }
    } catch (error) {
      console.error('Failed to accept delivery:', error);
    }
  };

  const startDelivery = async (deliveryId: string) => {
    try {
      const token = localStorage.getItem('driver_token');
      const response = await fetch(`/api/deliveries/${deliveryId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await refreshDeliveries();
      }
    } catch (error) {
      console.error('Failed to start delivery:', error);
    }
  };

  const completePickup = async (deliveryId: string, photos?: string[]) => {
    try {
      const token = localStorage.getItem('driver_token');
      const response = await fetch(`/api/deliveries/${deliveryId}/pickup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ photos }),
      });

      if (response.ok) {
        await refreshDeliveries();
      }
    } catch (error) {
      console.error('Failed to complete pickup:', error);
    }
  };

  const completeDelivery = async (deliveryId: string, signature?: string, photos?: string[], notes?: string) => {
    try {
      const token = localStorage.getItem('driver_token');
      const response = await fetch(`/api/deliveries/${deliveryId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ signature, photos, notes }),
      });

      if (response.ok) {
        await refreshDeliveries();
        if (driver) {
          const updatedDriver = { 
            ...driver, 
            activeDelivery: undefined, 
            status: 'available' as const,
            totalDeliveries: driver.totalDeliveries + 1
          };
          setDriver(updatedDriver);
          localStorage.setItem('driver_data', JSON.stringify(updatedDriver));
        }
      }
    } catch (error) {
      console.error('Failed to complete delivery:', error);
    }
  };

  const markDeliveryFailed = async (deliveryId: string, reason: string) => {
    try {
      const token = localStorage.getItem('driver_token');
      const response = await fetch(`/api/deliveries/${deliveryId}/fail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        await refreshDeliveries();
        if (driver) {
          const updatedDriver = { 
            ...driver, 
            activeDelivery: undefined, 
            status: 'available' as const
          };
          setDriver(updatedDriver);
          localStorage.setItem('driver_data', JSON.stringify(updatedDriver));
        }
      }
    } catch (error) {
      console.error('Failed to mark delivery as failed:', error);
    }
  };

  const refreshDeliveries = async () => {
    try {
      const token = localStorage.getItem('driver_token');
      const response = await fetch('/api/driver/deliveries', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const deliveriesData = await response.json();
        setDeliveries(deliveriesData);
      }
    } catch (error) {
      console.error('Failed to refresh deliveries:', error);
    }
  };

  const value: DriverContextType = {
    driver,
    deliveries,
    activeDelivery,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateStatus,
    updateLocation,
    acceptDelivery,
    startDelivery,
    completePickup,
    completeDelivery,
    markDeliveryFailed,
    refreshDeliveries,
  };

  return (
    <DriverContext.Provider value={value}>
      {children}
    </DriverContext.Provider>
  );
}