'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { WebSocketClient } from '@delivery-uae/shared';

interface WebSocketContextType {
  client: WebSocketClient | null;
  isConnected: boolean;
  connectionState: string;
  reconnectAttempts: number;
  
  // Real-time data for customers
  inquiryUpdates: any[];
  trackingUpdates: Map<string, any>;
  notifications: any[];
  
  // Methods
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribeToTracking: (trackingNumber: string) => void;
  unsubscribeFromTracking: (trackingNumber: string) => void;
  clearNotifications: () => void;
  markNotificationRead: (id: string) => void;
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
  const [inquiryUpdates, setInquiryUpdates] = useState<any[]>([]);
  const [trackingUpdates, setTrackingUpdates] = useState(new Map<string, any>());
  const [notifications, setNotifications] = useState<any[]>([]);
  const [subscribedTrackingNumbers, setSubscribedTrackingNumbers] = useState(new Set<string>());

  useEffect(() => {
    // For public PWA, we can connect without authentication for tracking purposes
    // Or with guest token for basic functionality
    const guestToken = localStorage.getItem('guest_token') || 'guest_user';
    
    const wsConfig = {
      url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws',
      token: guestToken,
      reconnectInterval: 5000,
      maxReconnectAttempts: 5, // Less aggressive reconnection for public users
      pingInterval: 60000 // Longer ping interval for public users
    };

    const wsClient = new WebSocketClient(wsConfig);

    // Connection event handlers
    wsClient.on('connected', () => {
      console.log('Public WebSocket connected');
      setIsConnected(true);
      setConnectionState('connected');
      setReconnectAttempts(0);
      
      // Re-subscribe to tracking numbers after reconnection
      subscribedTrackingNumbers.forEach(trackingNumber => {
        wsClient.subscribeToChannel(`tracking:${trackingNumber}`);
      });
    });

    wsClient.on('disconnected', () => {
      console.log('Public WebSocket disconnected');
      setIsConnected(false);
      setConnectionState('disconnected');
    });

    wsClient.on('reconnecting', (attempts) => {
      console.log(`Public WebSocket reconnecting (attempt ${attempts})`);
      setConnectionState('reconnecting');
      setReconnectAttempts(attempts);
    });

    wsClient.on('error', (error) => {
      console.error('Public WebSocket error:', error);
      setConnectionState('error');
    });

    // Data event handlers for public users
    wsClient.on('inquiry_update', (data) => {
      console.log('Inquiry update received:', data);
      setInquiryUpdates(prev => {
        const filtered = prev.filter(update => update.inquiryId !== data.inquiryId);
        return [data, ...filtered].slice(0, 20);
      });

      // Notify user about inquiry status changes
      if (data.status) {
        addNotification('inquiry_status', {
          title: 'Inquiry Update',
          message: `Your inquiry #${data.inquiryId} status: ${data.status}`,
          inquiryId: data.inquiryId,
          status: data.status
        });
      }
    });

    wsClient.on('tracking_update', (data) => {
      console.log('Tracking update received:', data);
      
      if (data.trackingNumber) {
        setTrackingUpdates(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(data.trackingNumber) || { updates: [] };
          
          newMap.set(data.trackingNumber, {
            ...data,
            updates: [data, ...existing.updates].slice(0, 10),
            lastUpdate: Date.now()
          });
          
          return newMap;
        });

        // Show notification for important tracking updates
        if (['picked_up', 'out_for_delivery', 'delivered', 'attempted_delivery'].includes(data.status)) {
          addNotification('tracking_update', {
            title: 'Package Update',
            message: `Your package ${data.trackingNumber} is ${getStatusDisplayText(data.status)}`,
            trackingNumber: data.trackingNumber,
            status: data.status,
            estimatedDelivery: data.estimatedDelivery
          });
        }
      }
    });

    wsClient.on('customer_notification', (data) => {
      console.log('Customer notification:', data);
      addNotification('customer', data);
    });

    // Handle general broadcasts that might be relevant to customers
    wsClient.on('broadcast', (data) => {
      if (data.type === 'service_announcement' || data.type === 'system_maintenance') {
        addNotification('system', {
          title: data.title || 'Service Announcement',
          message: data.message,
          type: data.type,
          priority: data.priority || 'normal'
        });
      }
    });

    setClient(wsClient);

    // Auto-connect with a slight delay for public users
    setTimeout(() => {
      wsClient.connect().catch(console.error);
    }, 1000);

    // Cleanup on unmount
    return () => {
      wsClient.disconnect();
    };
  }, []);

  const getStatusDisplayText = (status: string): string => {
    switch (status) {
      case 'picked_up': return 'picked up';
      case 'out_for_delivery': return 'out for delivery';
      case 'delivered': return 'delivered';
      case 'attempted_delivery': return 'delivery attempted';
      case 'in_transit': return 'in transit';
      default: return status.replace('_', ' ');
    }
  };

  const addNotification = (type: string, data: any) => {
    const notification = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      read: false
    };

    setNotifications(prev => [notification, ...prev].slice(0, 50));

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = getNotificationTitle(type, data);
      const body = getNotificationBody(type, data);
      
      const browserNotification = new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: notification.id,
        data: {
          notificationId: notification.id,
          type,
          ...data
        }
      });

      // Handle notification click
      browserNotification.onclick = () => {
        window.focus();
        
        // Navigate based on notification type
        if (type === 'tracking_update' && data.trackingNumber) {
          window.location.hash = `#/track?number=${data.trackingNumber}`;
        } else if (type === 'inquiry_status' && data.inquiryId) {
          window.location.hash = `#/inquiry/${data.inquiryId}`;
        }
        
        browserNotification.close();
      };

      // Auto-close after 8 seconds
      setTimeout(() => {
        browserNotification.close();
      }, 8000);
    }
  };

  const getNotificationTitle = (type: string, data: any): string => {
    switch (type) {
      case 'tracking_update':
        return data.title || 'Package Update';
      case 'inquiry_status':
        return data.title || 'Inquiry Update';
      case 'customer':
        return data.title || 'UAE Delivery';
      case 'system':
        return data.title || 'Service Announcement';
      default:
        return 'UAE Delivery Notification';
    }
  };

  const getNotificationBody = (type: string, data: any): string => {
    switch (type) {
      case 'tracking_update':
        return data.message || 'Your package status has been updated';
      case 'inquiry_status':
        return data.message || 'Your inquiry status has changed';
      case 'customer':
        return data.message || 'You have a new notification';
      case 'system':
        return data.message || 'System announcement';
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

  const subscribeToTracking = (trackingNumber: string): void => {
    if (client && isConnected) {
      client.subscribeToChannel(`tracking:${trackingNumber}`);
      setSubscribedTrackingNumbers(prev => new Set(Array.from(prev).concat(trackingNumber)));
    }
  };

  const unsubscribeFromTracking = (trackingNumber: string): void => {
    if (client && isConnected) {
      client.unsubscribeFromChannel(`tracking:${trackingNumber}`);
      setSubscribedTrackingNumbers(prev => {
        const newSet = new Set(prev);
        newSet.delete(trackingNumber);
        return newSet;
      });
    }
  };

  const clearNotifications = (): void => {
    setNotifications([]);
  };

  const markNotificationRead = (id: string): void => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  // Request notification permission on user interaction
  const requestNotificationPermission = async (): Promise<boolean> => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  // Expose permission request for UI components to use
  useEffect(() => {
    (window as any).requestNotificationPermission = requestNotificationPermission;
  }, []);

  const value: WebSocketContextType = {
    client,
    isConnected,
    connectionState,
    reconnectAttempts,
    inquiryUpdates,
    trackingUpdates,
    notifications,
    connect,
    disconnect,
    subscribeToTracking,
    unsubscribeFromTracking,
    clearNotifications,
    markNotificationRead
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}