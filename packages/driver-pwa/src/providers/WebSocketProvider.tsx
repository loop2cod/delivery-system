'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { WebSocketClient } from '@delivery-uae/shared/websocket-client';
import { useDriver } from './DriverProvider';
import { useLocation } from './LocationProvider';

interface WebSocketContextType {
  client: WebSocketClient | null;
  isConnected: boolean;
  connectionState: string;
  reconnectAttempts: number;
  
  // Real-time data specific to driver
  deliveryAssignments: any[];
  locationRequests: any[];
  notifications: any[];
  emergencyAlerts: any[];
  
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
  const { driver, isAuthenticated } = useDriver();
  const { currentLocation } = useLocation();
  const [client, setClient] = useState<WebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Real-time data states
  const [deliveryAssignments, setDeliveryAssignments] = useState<any[]>([]);
  const [locationRequests, setLocationRequests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('driver_token');
    if (!token || !isAuthenticated || !driver) return;

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
      console.log('Driver WebSocket connected');
      setIsConnected(true);
      setConnectionState('connected');
      setReconnectAttempts(0);
    });

    wsClient.on('disconnected', () => {
      console.log('Driver WebSocket disconnected');
      setIsConnected(false);
      setConnectionState('disconnected');
    });

    wsClient.on('reconnecting', (attempts) => {
      console.log(`Driver WebSocket reconnecting (attempt ${attempts})`);
      setConnectionState('reconnecting');
      setReconnectAttempts(attempts);
    });

    wsClient.on('error', (error) => {
      console.error('Driver WebSocket error:', error);
      setConnectionState('error');
    });

    // Data event handlers for driver-specific updates
    wsClient.on('delivery_update', (data) => {
      console.log('Driver delivery update received:', data);
      
      // Only handle deliveries assigned to this driver
      if (data.driverId === driver.id) {
        setDeliveryAssignments(prev => {
          const filtered = prev.filter(update => update.deliveryId !== data.deliveryId);
          return [data, ...filtered].slice(0, 20);
        });

        // Show notification for new assignments or important updates
        if (data.status === 'assigned' && data.isNewAssignment) {
          addNotification('new_delivery', {
            title: 'New Delivery Assignment',
            message: `New delivery ${data.trackingNumber} has been assigned to you`,
            deliveryId: data.deliveryId,
            trackingNumber: data.trackingNumber,
            priority: 'high',
            actions: [
              { text: 'Accept', action: 'accept_delivery' },
              { text: 'View Details', action: 'view_delivery' }
            ]
          });

          // Vibrate to alert driver
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        }
      }
    });

    wsClient.on('driver_notification', (data) => {
      console.log('Driver notification:', data);
      addNotification('driver', data);
    });

    wsClient.on('emergency_broadcast', (data) => {
      console.log('Emergency broadcast:', data);
      
      const alert = {
        id: `emergency_${Date.now()}`,
        type: 'emergency',
        data,
        timestamp: Date.now(),
        acknowledged: false
      };

      setEmergencyAlerts(prev => [alert, ...prev]);
      addNotification('emergency', {
        ...data,
        title: '🚨 EMERGENCY ALERT',
        priority: 'critical'
      });

      // Play emergency sound and vibration
      playEmergencyAlert();
    });

    // Handle location requests from dispatch
    wsClient.on('broadcast', (data) => {
      if (data.type === 'location_request' && data.driverId === driver.id) {
        setLocationRequests(prev => [data, ...prev].slice(0, 10));
        
        // Automatically send location if driver is available
        if (driver.status === 'available' && currentLocation) {
          wsClient.updateDriverLocation(currentLocation);
        }
      }
    });

    setClient(wsClient);

    // Auto-connect
    wsClient.connect().catch(console.error);

    // Cleanup on unmount
    return () => {
      wsClient.disconnect();
    };
  }, [isAuthenticated, driver, currentLocation]);

  // Auto-send location updates when location changes
  useEffect(() => {
    if (client && isConnected && currentLocation && driver?.status === 'on_delivery') {
      const throttledLocationUpdate = debounce(() => {
        client.updateDriverLocation({
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          accuracy: currentLocation.accuracy,
          timestamp: currentLocation.timestamp
        });
      }, 5000); // Send location updates every 5 seconds max

      throttledLocationUpdate();
    }
  }, [client, isConnected, currentLocation, driver?.status]);

  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const playEmergencyAlert = () => {
    // Play emergency sound
    try {
      const audio = new Audio('/sounds/emergency.mp3');
      audio.volume = 1.0;
      audio.loop = false;
      audio.play().catch(console.error);
    } catch (error) {
      console.error('Failed to play emergency sound:', error);
    }

    // Emergency vibration pattern
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }

    // Flash screen effect
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: red;
      z-index: 9999;
      opacity: 0.8;
      pointer-events: none;
      animation: flash 0.5s ease-in-out 3;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes flash {
        0%, 100% { opacity: 0; }
        50% { opacity: 0.8; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(flash);
    
    setTimeout(() => {
      document.body.removeChild(flash);
      document.head.removeChild(style);
    }, 1500);
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
        requireInteraction: type === 'emergency' || data.priority === 'critical',
        actions: data.actions?.map((action: any) => ({
          action: action.action,
          title: action.text
        })) || [],
        data: {
          notificationId: notification.id,
          type,
          ...data
        }
      });

      // Handle notification click
      browserNotification.onclick = () => {
        window.focus();
        
        // Handle different notification types
        if (type === 'new_delivery' && data.deliveryId) {
          // Navigate to delivery details
          window.location.hash = `#/delivery/${data.deliveryId}`;
        }
        
        browserNotification.close();
      };
    }

    // Play sound for high priority notifications
    if (data.priority === 'high' || data.priority === 'critical') {
      playNotificationSound(data.priority);
    }

    // Vibrate for mobile alerts
    if ('vibrate' in navigator) {
      const vibrationPattern = data.priority === 'critical' ? [300, 100, 300] : [100];
      navigator.vibrate(vibrationPattern);
    }
  };

  const playNotificationSound = (priority: string) => {
    try {
      const soundFile = priority === 'critical' ? '/sounds/alert-high.mp3' : '/sounds/notification.mp3';
      const audio = new Audio(soundFile);
      audio.volume = priority === 'critical' ? 0.8 : 0.5;
      audio.play().catch(console.error);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  };

  const getNotificationTitle = (type: string, data: any): string => {
    switch (type) {
      case 'new_delivery':
        return data.title || 'New Delivery Assignment';
      case 'delivery_update':
        return data.title || 'Delivery Update';
      case 'driver':
        return data.title || 'Driver Notification';
      case 'emergency':
        return '🚨 EMERGENCY ALERT';
      default:
        return 'UAE Delivery Driver';
    }
  };

  const getNotificationBody = (type: string, data: any): string => {
    switch (type) {
      case 'new_delivery':
        return data.message || 'You have been assigned a new delivery';
      case 'delivery_update':
        return data.message || 'Delivery information has been updated';
      case 'driver':
        return data.message || 'You have a new driver notification';
      case 'emergency':
        return data.message || 'Emergency situation - check your app immediately';
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
        console.log('Driver notification permission:', permission);
      });
    }
  }, []);

  const value: WebSocketContextType = {
    client,
    isConnected,
    connectionState,
    reconnectAttempts,
    deliveryAssignments,
    locationRequests,
    notifications,
    emergencyAlerts,
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