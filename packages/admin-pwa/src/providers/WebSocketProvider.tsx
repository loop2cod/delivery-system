'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { WebSocketClient, WebSocketEventHandler } from '@delivery-uae/shared/websocket-client';

interface WebSocketContextType {
  client: WebSocketClient | null;
  isConnected: boolean;
  connectionState: string;
  reconnectAttempts: number;
  
  // Real-time data
  deliveryUpdates: any[];
  driverLocations: Map<string, any>;
  driverStatuses: Map<string, string>;
  inquiryUpdates: any[];
  notifications: any[];
  
  // Methods
  connect: () => Promise<void>;
  disconnect: () => void;
  clearNotifications: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [client, setClient] = useState<WebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Real-time data states
  const [deliveryUpdates, setDeliveryUpdates] = useState<any[]>([]);
  const [driverLocations, setDriverLocations] = useState(new Map<string, any>());
  const [driverStatuses, setDriverStatuses] = useState(new Map<string, string>());
  const [inquiryUpdates, setInquiryUpdates] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const wsConfig = {
      url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws',
      token,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      pingInterval: 30000
    };

    const wsClient = new WebSocketClient(wsConfig);

    // Connection event handlers
    wsClient.on('connected', () => {
      console.log('Admin WebSocket connected');
      setIsConnected(true);
      setConnectionState('connected');
      setReconnectAttempts(0);
    });

    wsClient.on('disconnected', () => {
      console.log('Admin WebSocket disconnected');
      setIsConnected(false);
      setConnectionState('disconnected');
    });

    wsClient.on('reconnecting', (attempts) => {
      console.log(`Admin WebSocket reconnecting (attempt ${attempts})`);
      setConnectionState('reconnecting');
      setReconnectAttempts(attempts);
    });

    wsClient.on('error', (error) => {
      console.error('Admin WebSocket error:', error);
      setConnectionState('error');
    });

    // Data event handlers
    wsClient.on('delivery_update', (data) => {
      console.log('Delivery update received:', data);
      setDeliveryUpdates(prev => {
        const filtered = prev.filter(update => update.deliveryId !== data.deliveryId);
        return [data, ...filtered].slice(0, 100); // Keep last 100 updates
      });
    });

    wsClient.on('driver_location', (data) => {
      console.log('Driver location update:', data);
      setDriverLocations(prev => {
        const newMap = new Map(prev);
        newMap.set(data.driverId, {
          ...data,
          timestamp: Date.now()
        });
        return newMap;
      });
    });

    wsClient.on('driver_status', (data) => {
      console.log('Driver status update:', data);
      setDriverStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(data.driverId, data.status);
        return newMap;
      });
    });

    wsClient.on('inquiry_update', (data) => {
      console.log('Inquiry update received:', data);
      setInquiryUpdates(prev => {
        const filtered = prev.filter(update => update.inquiryId !== data.inquiryId);
        return [data, ...filtered].slice(0, 50); // Keep last 50 updates
      });
    });

    wsClient.on('business_notification', (data) => {
      console.log('Business notification:', data);
      addNotification('business', data);
    });

    wsClient.on('driver_notification', (data) => {
      console.log('Driver notification:', data);
      addNotification('driver', data);
    });

    wsClient.on('emergency_broadcast', (data) => {
      console.log('Emergency broadcast:', data);
      addNotification('emergency', data);
    });

    wsClient.on('broadcast', (data) => {
      console.log('General broadcast:', data);
      addNotification('general', data);
    });

    setClient(wsClient);

    // Auto-connect
    wsClient.connect().catch(console.error);

    // Cleanup on unmount
    return () => {
      wsClient.disconnect();
    };
  }, []);

  const addNotification = (type: string, data: any) => {
    const notification = {
      id: `${type}_${Date.now()}`,
      type,
      data,
      timestamp: Date.now(),
      read: false
    };

    setNotifications(prev => [notification, ...prev].slice(0, 100));

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = getNotificationTitle(type, data);
      const body = getNotificationBody(type, data);
      
      new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: notification.id,
        requireInteraction: type === 'emergency'
      });
    }
  };

  const getNotificationTitle = (type: string, data: any): string => {
    switch (type) {
      case 'delivery':
        return 'Delivery Update';
      case 'driver':
        return 'Driver Notification';
      case 'inquiry':
        return 'New Inquiry';
      case 'emergency':
        return 'Emergency Alert';
      default:
        return 'UAE Delivery Notification';
    }
  };

  const getNotificationBody = (type: string, data: any): string => {
    switch (type) {
      case 'delivery':
        return `Delivery ${data.trackingNumber || data.deliveryId} has been updated`;
      case 'driver':
        return data.message || 'Driver status changed';
      case 'inquiry':
        return `New inquiry from ${data.customerName || 'customer'}`;
      case 'emergency':
        return data.message || 'Emergency situation requires attention';
      default:
        return data.message || 'You have a new notification';
    }
  };

  const connect = async (): Promise<void> => {
    if (client && !isConnected) {
      return client.connect();
    }
  };

  const disconnect = (): void => {
    if (client) {
      client.disconnect();
    }
  };

  const clearNotifications = (): void => {
    setNotifications([]);
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const value: WebSocketContextType = {
    client,
    isConnected,
    connectionState,
    reconnectAttempts,
    deliveryUpdates,
    driverLocations,
    driverStatuses,
    inquiryUpdates,
    notifications,
    connect,
    disconnect,
    clearNotifications
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}