'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// TODO: Add shared websocket client when available
// import { WebSocketClient } from '@delivery-uae/shared/websocket-client';
import { useBusiness } from './BusinessProvider';

// Mock WebSocketClient until shared module is available
class MockWebSocketClient {
  connect() { return Promise.resolve(); }
  disconnect() { }
  on() { }
  off() { }
  emit() { }
}

type WebSocketClient = MockWebSocketClient;

interface WebSocketContextType {
  client: WebSocketClient | null;
  isConnected: boolean;
  connectionState: string;
  reconnectAttempts: number;
  
  // Real-time data specific to business
  deliveryUpdates: any[];
  driverUpdates: any[];
  notifications: any[];
  
  // Methods
  connect: () => Promise<void>;
  disconnect: () => void;
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
  const { user } = useBusiness();
  const [client, setClient] = useState<WebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Real-time data states
  const [deliveryUpdates, setDeliveryUpdates] = useState<any[]>([]);
  const [driverUpdates, setDriverUpdates] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const wsConfig = {
      url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws',
      // token: 'mock-token', // TODO: Add token when available
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      pingInterval: 30000
    };

    const wsClient = new MockWebSocketClient();

    // Mock connection event handlers - for now just set connected
    setTimeout(() => {
      console.log('Business WebSocket connected (mock)');
      setIsConnected(true);
      setConnectionState('connected');
      setReconnectAttempts(0);
    }, 100);

    // TODO: Implement event handlers when WebSocket client is available
    /*
    wsClient.on('disconnected', () => {
      console.log('Business WebSocket disconnected');
      setIsConnected(false);
      setConnectionState('disconnected');
    });

    wsClient.on('reconnecting', (attempts) => {
      console.log(`Business WebSocket reconnecting (attempt ${attempts})`);
      setConnectionState('reconnecting');
      setReconnectAttempts(attempts);
    });

    wsClient.on('error', (error) => {
      console.error('Business WebSocket error:', error);
      setConnectionState('error');
    });
    */

    // TODO: Add WebSocket event handlers when client is available
    /*
    // Data event handlers for business-specific updates
    wsClient.on('delivery_update', (data) => {
      // Handle delivery updates
    });
    */

    setClient(wsClient);

    // Mock auto-connect (already connected via setTimeout above)

    // Cleanup on unmount
    return () => {
      // wsClient.disconnect();
    };
  }, [user]);

  const addNotification = (type: string, data: any) => {
    const notification = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
      
      const browserNotification = new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: notification.id,
        requireInteraction: type === 'emergency' || data.priority === 'high',
        data: {
          notificationId: notification.id,
          type,
          ...data
        }
      });

      // Handle notification click
      browserNotification.onclick = () => {
        window.focus();
        
        // Navigate to relevant page based on notification type
        if (type === 'delivery_status' && data.deliveryId) {
          // You can use your router here to navigate
          window.location.hash = `#/deliveries/${data.deliveryId}`;
        }
        
        browserNotification.close();
      };

      // Auto-close after 10 seconds for non-emergency notifications
      if (type !== 'emergency' && data.priority !== 'high') {
        setTimeout(() => {
          browserNotification.close();
        }, 10000);
      }
    }

    // Play notification sound for high priority notifications
    if (data.priority === 'high' || type === 'emergency') {
      playNotificationSound();
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(console.error);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  };

  const getNotificationTitle = (type: string, data: any): string => {
    switch (type) {
      case 'delivery_status':
        return data.title || 'Delivery Update';
      case 'business':
        return data.title || 'Business Notification';
      case 'emergency':
        return '🚨 Emergency Alert';
      default:
        return 'UAE Delivery Notification';
    }
  };

  const getNotificationBody = (type: string, data: any): string => {
    switch (type) {
      case 'delivery_status':
        return data.message || `Delivery status updated`;
      case 'business':
        return data.message || 'You have a new business notification';
      case 'emergency':
        return data.message || 'Emergency situation requires immediate attention';
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

  const markNotificationRead = (id: string): void => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  const value: WebSocketContextType = {
    client,
    isConnected,
    connectionState,
    reconnectAttempts,
    deliveryUpdates,
    driverUpdates,
    notifications,
    connect,
    disconnect,
    clearNotifications,
    markNotificationRead
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}