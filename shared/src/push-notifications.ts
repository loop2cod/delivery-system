export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  data?: any;
  actions?: PushNotificationAction[];
  timestamp?: number;
  vibrate?: number[];
}

export interface PushNotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userType: 'customer' | 'admin' | 'business' | 'driver';
  userId: string;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    vendor: string;
  };
}

export class PushNotificationManager {
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private vapidPublicKey: string;

  constructor(vapidPublicKey: string) {
    this.vapidPublicKey = vapidPublicKey;
  }

  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported');
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered for push notifications');

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      return true;
    } catch (error) {
      console.error('Failed to register service worker:', error);
      return false;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    return permission;
  }

  async subscribe(userType: string, userId: string): Promise<PushSubscriptionData | null> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Push notification permission denied');
    }

    try {
      // Convert VAPID key to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);

      // Subscribe to push notifications
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      const subscriptionData: PushSubscriptionData = {
        endpoint: this.subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(this.subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(this.subscription.getKey('auth')!)
        },
        userType: userType as any,
        userId,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          vendor: navigator.vendor
        }
      };

      // Send subscription to server
      await this.sendSubscriptionToServer(subscriptionData);

      return subscriptionData;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      return true;
    }

    try {
      const success = await this.subscription.unsubscribe();
      
      if (success) {
        // Notify server about unsubscription
        await this.sendUnsubscriptionToServer(this.subscription.endpoint);
        this.subscription = null;
      }

      return success;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  async getExistingSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      return null;
    }

    try {
      this.subscription = await this.registration.pushManager.getSubscription();
      return this.subscription;
    } catch (error) {
      console.error('Failed to get existing subscription:', error);
      return null;
    }
  }

  isSubscribed(): boolean {
    return this.subscription !== null;
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return window.btoa(binary);
  }

  private async sendSubscriptionToServer(subscriptionData: PushSubscriptionData): Promise<void> {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('driver_token')}`
        },
        body: JSON.stringify(subscriptionData)
      });

      if (!response.ok) {
        throw new Error('Failed to send subscription to server');
      }

      console.log('Push subscription sent to server successfully');
    } catch (error) {
      console.error('Error sending subscription to server:', error);
      throw error;
    }
  }

  private async sendUnsubscriptionToServer(endpoint: string): Promise<void> {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('driver_token')}`
        },
        body: JSON.stringify({ endpoint })
      });

      if (!response.ok) {
        throw new Error('Failed to send unsubscription to server');
      }

      console.log('Push unsubscription sent to server successfully');
    } catch (error) {
      console.error('Error sending unsubscription to server:', error);
    }
  }
}

// Predefined notification templates for different PWAs
export const NotificationTemplates = {
  // Admin PWA Templates
  admin: {
    newInquiry: (data: any): PushNotificationPayload => ({
      title: 'New Customer Inquiry',
      body: `New inquiry from ${data.customerName} - ${data.serviceType}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `inquiry_${data.inquiryId}`,
      data: { type: 'inquiry', inquiryId: data.inquiryId },
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'assign', title: 'Assign Driver' }
      ]
    }),

    driverOffline: (data: any): PushNotificationPayload => ({
      title: 'Driver Offline Alert',
      body: `Driver ${data.driverName} has gone offline unexpectedly`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `driver_offline_${data.driverId}`,
      requireInteraction: true,
      data: { type: 'driver_alert', driverId: data.driverId }
    }),

    emergencyAlert: (data: any): PushNotificationPayload => ({
      title: '🚨 Emergency Alert',
      body: data.message,
      icon: '/icons/emergency-icon.png',
      badge: '/icons/emergency-badge.png',
      tag: 'emergency',
      requireInteraction: true,
      vibrate: [500, 200, 500],
      data: { type: 'emergency', priority: 'critical' }
    })
  },

  // Business PWA Templates
  business: {
    deliveryUpdate: (data: any): PushNotificationPayload => ({
      title: 'Delivery Status Update',
      body: `Delivery ${data.trackingNumber} is now ${data.status}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `delivery_${data.deliveryId}`,
      data: { type: 'delivery', deliveryId: data.deliveryId, trackingNumber: data.trackingNumber },
      actions: [
        { action: 'track', title: 'Track Package' },
        { action: 'details', title: 'View Details' }
      ]
    }),

    deliveryCompleted: (data: any): PushNotificationPayload => ({
      title: '✅ Delivery Completed',
      body: `Package ${data.trackingNumber} has been successfully delivered`,
      icon: '/icons/success-icon.png',
      badge: '/icons/badge-72x72.png',
      tag: `completed_${data.deliveryId}`,
      data: { type: 'delivery_completed', deliveryId: data.deliveryId }
    }),

    deliveryFailed: (data: any): PushNotificationPayload => ({
      title: '❌ Delivery Failed',
      body: `Delivery attempt for ${data.trackingNumber} failed: ${data.reason}`,
      icon: '/icons/error-icon.png',
      badge: '/icons/badge-72x72.png',
      tag: `failed_${data.deliveryId}`,
      requireInteraction: true,
      data: { type: 'delivery_failed', deliveryId: data.deliveryId },
      actions: [
        { action: 'reschedule', title: 'Reschedule' },
        { action: 'contact', title: 'Contact Customer' }
      ]
    })
  },

  // Driver PWA Templates
  driver: {
    newAssignment: (data: any): PushNotificationPayload => ({
      title: 'New Delivery Assignment',
      body: `New delivery ${data.trackingNumber} assigned to you`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `assignment_${data.deliveryId}`,
      vibrate: [200, 100, 200],
      data: { type: 'new_assignment', deliveryId: data.deliveryId },
      actions: [
        { action: 'accept', title: 'Accept' },
        { action: 'view', title: 'View Details' }
      ]
    }),

    urgentDelivery: (data: any): PushNotificationPayload => ({
      title: '⚡ Urgent Delivery',
      body: `High priority delivery ${data.trackingNumber} needs immediate attention`,
      icon: '/icons/urgent-icon.png',
      badge: '/icons/badge-72x72.png',
      tag: `urgent_${data.deliveryId}`,
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 300],
      data: { type: 'urgent_delivery', deliveryId: data.deliveryId, priority: 'urgent' }
    }),

    routeOptimization: (data: any): PushNotificationPayload => ({
      title: 'Route Updated',
      body: `Your delivery route has been optimized. New ETA: ${data.eta}`,
      icon: '/icons/route-icon.png',
      badge: '/icons/badge-72x72.png',
      tag: 'route_update',
      data: { type: 'route_update', routeData: data.routeData }
    })
  },

  // Public PWA Templates
  public: {
    inquiryUpdate: (data: any): PushNotificationPayload => ({
      title: 'Inquiry Status Update',
      body: `Your inquiry #${data.inquiryId} status: ${data.status}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `inquiry_${data.inquiryId}`,
      data: { type: 'inquiry_update', inquiryId: data.inquiryId }
    }),

    packageTracking: (data: any): PushNotificationPayload => ({
      title: 'Package Update',
      body: `Your package ${data.trackingNumber} is ${data.status}`,
      icon: '/icons/package-icon.png',
      badge: '/icons/badge-72x72.png',
      tag: `tracking_${data.trackingNumber}`,
      data: { type: 'tracking', trackingNumber: data.trackingNumber },
      actions: [
        { action: 'track', title: 'Track Package' }
      ]
    }),

    deliveryArriving: (data: any): PushNotificationPayload => ({
      title: '📦 Package Arriving Soon',
      body: `Your delivery ${data.trackingNumber} will arrive in ${data.eta} minutes`,
      icon: '/icons/delivery-icon.png',
      badge: '/icons/badge-72x72.png',
      tag: `arriving_${data.trackingNumber}`,
      vibrate: [100, 50, 100],
      data: { type: 'delivery_arriving', trackingNumber: data.trackingNumber, eta: data.eta }
    })
  }
};

// Utility function to get template by PWA type and template name
export function getNotificationTemplate(
  pwaType: keyof typeof NotificationTemplates,
  templateName: string,
  data: any
): PushNotificationPayload | null {
  const templates = NotificationTemplates[pwaType] as any;
  const template = templates?.[templateName];
  
  if (typeof template === 'function') {
    return template(data);
  }
  
  return null;
}

// Offline notification queue for PWA
export class OfflineNotificationQueue {
  private queue: PushNotificationPayload[] = [];
  private storageKey = 'offline_notifications';

  constructor() {
    this.loadFromStorage();
    this.setupOnlineListener();
  }

  add(notification: PushNotificationPayload): void {
    this.queue.push({
      ...notification,
      timestamp: Date.now()
    });
    this.saveToStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline notifications:', error);
      this.queue = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline notifications:', error);
    }
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    const notifications = [...this.queue];
    this.queue = [];
    this.saveToStorage();

    for (const notification of notifications) {
      try {
        // Show local notification for queued items
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.body,
            icon: notification.icon,
            badge: notification.badge,
            tag: notification.tag,
            data: notification.data
          });
        }
      } catch (error) {
        console.error('Failed to show queued notification:', error);
      }
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  clearQueue(): void {
    this.queue = [];
    this.saveToStorage();
  }
}