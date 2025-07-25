// Service Worker Utilities for UAE Delivery PWAs

export interface CacheStrategy {
  name: string;
  patterns: string[];
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only';
  maxEntries?: number;
  maxAgeSeconds?: number;
  networkTimeoutSeconds?: number;
}

export interface PWACacheConfig {
  version: string;
  cacheStrategies: CacheStrategy[];
  staticAssets: string[];
  runtimeCaching: CacheStrategy[];
  skipWaiting: boolean;
  clientsClaim: boolean;
  offlinePages: string[];
}

export class ServiceWorkerManager {
  private cacheName: string;
  private version: string;
  private config: PWACacheConfig;

  constructor(appName: string, config: PWACacheConfig) {
    this.cacheName = `${appName}-v${config.version}`;
    this.version = config.version;
    this.config = config;
  }

  // Install event - cache static assets
  async handleInstall(event: ExtendableEvent): Promise<void> {
    console.log(`[SW] Installing ${this.cacheName}`);
    
    event.waitUntil(
      Promise.all([
        this.cacheStaticAssets(),
        this.cacheOfflinePages()
      ])
    );

    if (this.config.skipWaiting) {
      self.skipWaiting();
    }
  }

  // Activate event - clean up old caches
  async handleActivate(event: ExtendableEvent): Promise<void> {
    console.log(`[SW] Activating ${this.cacheName}`);
    
    event.waitUntil(
      Promise.all([
        this.cleanupOldCaches(),
        this.config.clientsClaim ? self.clients.claim() : Promise.resolve()
      ])
    );
  }

  // Fetch event - handle network requests with caching strategies
  async handleFetch(event: FetchEvent): Promise<Response> {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-GET requests and chrome-extension requests
    if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
      return fetch(request);
    }

    // Find matching cache strategy
    const strategy = this.findCacheStrategy(request.url);
    
    if (strategy) {
      return this.applyCacheStrategy(request, strategy);
    }

    // Default to network-first for unmatched requests
    return this.networkFirst(request, 'default-cache');
  }

  private async cacheStaticAssets(): Promise<void> {
    if (this.config.staticAssets.length === 0) return;

    const cache = await caches.open(this.cacheName);
    
    try {
      await cache.addAll(this.config.staticAssets);
      console.log(`[SW] Cached ${this.config.staticAssets.length} static assets`);
    } catch (error) {
      console.error('[SW] Failed to cache static assets:', error);
      
      // Try caching assets individually
      for (const asset of this.config.staticAssets) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`[SW] Failed to cache asset: ${asset}`, err);
        }
      }
    }
  }

  private async cacheOfflinePages(): Promise<void> {
    if (this.config.offlinePages.length === 0) return;

    const cache = await caches.open(`${this.cacheName}-offline`);
    
    for (const page of this.config.offlinePages) {
      try {
        await cache.add(page);
        console.log(`[SW] Cached offline page: ${page}`);
      } catch (error) {
        console.warn(`[SW] Failed to cache offline page: ${page}`, error);
      }
    }
  }

  private async cleanupOldCaches(): Promise<void> {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name => 
      name.startsWith(this.cacheName.split('-v')[0]) && name !== this.cacheName
    );

    await Promise.all(
      oldCaches.map(async (cacheName) => {
        console.log(`[SW] Deleting old cache: ${cacheName}`);
        return caches.delete(cacheName);
      })
    );
  }

  private findCacheStrategy(url: string): CacheStrategy | null {
    return this.config.runtimeCaching.find(strategy =>
      strategy.patterns.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(url);
        }
        return url.includes(pattern);
      })
    ) || null;
  }

  private async applyCacheStrategy(request: Request, strategy: CacheStrategy): Promise<Response> {
    const cacheName = `${this.cacheName}-${strategy.name}`;

    switch (strategy.strategy) {
      case 'cache-first':
        return this.cacheFirst(request, cacheName, strategy);
      case 'network-first':
        return this.networkFirst(request, cacheName, strategy);
      case 'stale-while-revalidate':
        return this.staleWhileRevalidate(request, cacheName, strategy);
      case 'network-only':
        return this.networkOnly(request);
      case 'cache-only':
        return this.cacheOnly(request, cacheName);
      default:
        return this.networkFirst(request, cacheName, strategy);
    }
  }

  private async cacheFirst(request: Request, cacheName: string, strategy?: CacheStrategy): Promise<Response> {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const networkResponse = await this.fetchWithTimeout(request, strategy?.networkTimeoutSeconds);
      
      if (networkResponse.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
        await this.enforceMaxEntries(cache, strategy?.maxEntries);
      }
      
      return networkResponse;
    } catch (error) {
      console.warn('[SW] Network request failed in cache-first:', error);
      
      // Return offline page if available
      return this.getOfflinePage(request);
    }
  }

  private async networkFirst(request: Request, cacheName: string, strategy?: CacheStrategy): Promise<Response> {
    try {
      const networkResponse = await this.fetchWithTimeout(request, strategy?.networkTimeoutSeconds);
      
      if (networkResponse.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
        await this.enforceMaxEntries(cache, strategy?.maxEntries);
      }
      
      return networkResponse;
    } catch (error) {
      console.warn('[SW] Network request failed in network-first:', error);
      
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return this.getOfflinePage(request);
    }
  }

  private async staleWhileRevalidate(request: Request, cacheName: string, strategy?: CacheStrategy): Promise<Response> {
    const cachedResponse = await caches.match(request);
    
    // Start network request in background
    const networkPromise = this.fetchWithTimeout(request, strategy?.networkTimeoutSeconds)
      .then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(cacheName);
          cache.put(request, response.clone());
          await this.enforceMaxEntries(cache, strategy?.maxEntries);
        }
        return response;
      })
      .catch((error) => {
        console.warn('[SW] Background network request failed:', error);
      });

    // Return cached response immediately if available
    if (cachedResponse) {
      networkPromise; // Keep promise alive for background update
      return cachedResponse;
    }

    // Wait for network response if no cached version
    try {
      return await networkPromise;
    } catch (error) {
      return this.getOfflinePage(request);
    }
  }

  private async networkOnly(request: Request): Promise<Response> {
    return fetch(request);
  }

  private async cacheOnly(request: Request, cacheName: string): Promise<Response> {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return this.getOfflinePage(request);
  }

  private async fetchWithTimeout(request: Request, timeoutSeconds?: number): Promise<Response> {
    if (!timeoutSeconds) {
      return fetch(request);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

    try {
      const response = await fetch(request, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async enforceMaxEntries(cache: Cache, maxEntries?: number): Promise<void> {
    if (!maxEntries) return;

    const keys = await cache.keys();
    
    if (keys.length > maxEntries) {
      // Remove oldest entries
      const entriesToDelete = keys.length - maxEntries;
      for (let i = 0; i < entriesToDelete; i++) {
        await cache.delete(keys[i]);
      }
    }
  }

  private async getOfflinePage(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Determine offline page based on request type
    let offlinePage = '/offline.html';
    
    if (url.pathname.includes('/api/')) {
      // API request - return JSON error
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'This request requires an internet connection' 
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Try to get cached offline page
    const offlineCache = await caches.open(`${this.cacheName}-offline`);
    const cachedOfflinePage = await offlineCache.match(offlinePage);
    
    if (cachedOfflinePage) {
      return cachedOfflinePage;
    }

    // Fallback offline response
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - UAE Delivery</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              text-align: center; 
              padding: 2rem; 
              background: #f5f5f5;
              color: #333;
            }
            .container {
              max-width: 400px;
              margin: 0 auto;
              background: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .icon { 
              font-size: 4rem; 
              margin-bottom: 1rem;
              color: #142C4F;
            }
            h1 { 
              color: #142C4F; 
              margin-bottom: 1rem;
            }
            p { 
              color: #666; 
              line-height: 1.5;
            }
            .retry-btn {
              background: #142C4F;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 4px;
              cursor: pointer;
              margin-top: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📦</div>
            <h1>You're Offline</h1>
            <p>This page requires an internet connection. Please check your connection and try again.</p>
            <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>
      `,
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Background sync utilities
export class BackgroundSyncManager {
  private syncTagPrefix: string;

  constructor(appName: string) {
    this.syncTagPrefix = `${appName}-sync`;
  }

  async handleBackgroundSync(event: any): Promise<void> {
    const tag = event.tag;
    
    if (tag.startsWith(this.syncTagPrefix)) {
      const syncType = tag.replace(`${this.syncTagPrefix}-`, '');
      
      try {
        await this.performSync(syncType);
        console.log(`[SW] Background sync completed: ${syncType}`);
      } catch (error) {
        console.error(`[SW] Background sync failed: ${syncType}`, error);
        throw error; // This will retry the sync
      }
    }
  }

  private async performSync(syncType: string): Promise<void> {
    switch (syncType) {
      case 'offline-data':
        await this.syncOfflineData();
        break;
      case 'location-updates':
        await this.syncLocationUpdates();
        break;
      case 'photo-uploads':
        await this.syncPhotoUploads();
        break;
      case 'delivery-status':
        await this.syncDeliveryStatus();
        break;
      default:
        console.warn(`[SW] Unknown sync type: ${syncType}`);
    }
  }

  private async syncOfflineData(): Promise<void> {
    // Get pending sync operations from IndexedDB or localStorage
    const operations = this.getPendingSyncOperations();
    
    for (const operation of operations) {
      try {
        await this.syncOperation(operation);
        this.removeSyncOperation(operation.id);
      } catch (error) {
        console.error('[SW] Failed to sync operation:', operation, error);
      }
    }
  }

  private async syncLocationUpdates(): Promise<void> {
    // Implementation for syncing location updates
    const pendingLocations = this.getPendingLocationUpdates();
    
    if (pendingLocations.length > 0) {
      try {
        await fetch('/api/driver/location/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`
          },
          body: JSON.stringify({ locations: pendingLocations })
        });
        
        this.clearPendingLocationUpdates();
      } catch (error) {
        console.error('[SW] Failed to sync location updates:', error);
        throw error;
      }
    }
  }

  private async syncPhotoUploads(): Promise<void> {
    // Implementation for syncing photo uploads
    const pendingPhotos = this.getPendingPhotoUploads();
    
    for (const photoData of pendingPhotos) {
      try {
        const formData = new FormData();
        formData.append('photo', photoData.blob);
        formData.append('deliveryId', photoData.deliveryId);
        formData.append('type', photoData.type);

        await fetch('/api/deliveries/photos', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await this.getAuthToken()}`
          },
          body: formData
        });
        
        this.removePendingPhotoUpload(photoData.id);
      } catch (error) {
        console.error('[SW] Failed to sync photo upload:', photoData, error);
      }
    }
  }

  private async syncDeliveryStatus(): Promise<void> {
    // Implementation for syncing delivery status updates
    const pendingStatusUpdates = this.getPendingStatusUpdates();
    
    for (const update of pendingStatusUpdates) {
      try {
        await fetch(`/api/deliveries/${update.deliveryId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`
          },
          body: JSON.stringify({
            status: update.status,
            timestamp: update.timestamp,
            notes: update.notes
          })
        });
        
        this.removePendingStatusUpdate(update.id);
      } catch (error) {
        console.error('[SW] Failed to sync status update:', update, error);
      }
    }
  }

  // Helper methods for data persistence (implement based on your storage strategy)
  private getPendingSyncOperations(): any[] {
    // Implement: get operations from IndexedDB/localStorage
    return [];
  }

  private removeSyncOperation(id: string): void {
    // Implement: remove operation from storage
  }

  private async syncOperation(operation: any): Promise<void> {
    // Implement: sync individual operation
  }

  private getPendingLocationUpdates(): any[] {
    // Implement: get pending location updates
    return [];
  }

  private clearPendingLocationUpdates(): void {
    // Implement: clear pending location updates
  }

  private getPendingPhotoUploads(): any[] {
    // Implement: get pending photo uploads
    return [];
  }

  private removePendingPhotoUpload(id: string): void {
    // Implement: remove pending photo upload
  }

  private getPendingStatusUpdates(): any[] {
    // Implement: get pending status updates
    return [];
  }

  private removePendingStatusUpdate(id: string): void {
    // Implement: remove pending status update
  }

  private async getAuthToken(): Promise<string> {
    // Implement: get auth token from storage
    return '';
  }
}

// Push notification handler
export class PushNotificationHandler {
  async handlePushEvent(event: any): Promise<void> {
    const data = event.data?.json() || {};
    
    const notification = {
      title: data.title || 'UAE Delivery',
      body: data.body || 'You have a new notification',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/badge-72x72.png',
      tag: data.tag || 'default',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      data: data.data || {}
    };

    await self.registration.showNotification(notification.title, notification);
    
    // Track notification display
    this.trackNotificationEvent('displayed', data);
  }

  async handleNotificationClick(event: any): Promise<void> {
    const notification = event.notification;
    const action = event.action;
    const data = notification.data || {};

    notification.close();

    // Handle notification actions
    if (action) {
      await this.handleNotificationAction(action, data);
    } else {
      // Default click behavior - open app
      await this.openApp(data);
    }

    // Track notification interaction
    this.trackNotificationEvent('clicked', { action, ...data });
  }

  private async handleNotificationAction(action: string, data: any): Promise<void> {
    switch (action) {
      case 'accept':
        await this.openApp({ action: 'accept_delivery', deliveryId: data.deliveryId });
        break;
      case 'view':
        await this.openApp({ action: 'view_details', id: data.deliveryId || data.inquiryId });
        break;
      case 'track':
        await this.openApp({ action: 'track_package', trackingNumber: data.trackingNumber });
        break;
      default:
        await this.openApp(data);
    }
  }

  private async openApp(data: any = {}): Promise<void> {
    const clients = await self.clients.matchAll({ type: 'window' });
    
    // If app is already open, focus it
    if (clients.length > 0) {
      const client = clients[0];
      client.focus();
      
      // Send message to app with notification data
      client.postMessage({
        type: 'notification_action',
        data
      });
      
      return;
    }

    // Open new window/tab
    let url = '/';
    
    // Determine URL based on action
    if (data.action === 'track_package' && data.trackingNumber) {
      url = `/track?number=${data.trackingNumber}`;
    } else if (data.action === 'view_details' && data.deliveryId) {
      url = `/deliveries/${data.deliveryId}`;
    } else if (data.action === 'accept_delivery' && data.deliveryId) {
      url = `/delivery/${data.deliveryId}`;
    }

    await self.clients.openWindow(url);
  }

  private trackNotificationEvent(event: string, data: any): void {
    // Implement notification analytics tracking
    console.log(`[SW] Notification ${event}:`, data);
  }
}

// Utility functions
export function createSWConfig(appType: string, version: string): PWACacheConfig {
  const baseConfig = {
    version,
    skipWaiting: true,
    clientsClaim: true,
    staticAssets: [
      '/',
      '/offline.html',
      '/icons/icon-192x192.png',
      '/icons/icon-512x512.png',
      '/manifest.json'
    ],
    offlinePages: ['/offline.html']
  };

  // App-specific configurations
  switch (appType) {
    case 'public':
      return {
        ...baseConfig,
        cacheStrategies: [],
        runtimeCaching: [
          {
            name: 'api-cache',
            patterns: ['/api/track/*', '/api/inquiries/*'],
            strategy: 'network-first',
            maxEntries: 50,
            maxAgeSeconds: 300 // 5 minutes
          },
          {
            name: 'static-resources',
            patterns: ['*.js', '*.css', '*.png', '*.jpg', '*.svg'],
            strategy: 'cache-first',
            maxEntries: 100,
            maxAgeSeconds: 86400 // 1 day
          }
        ]
      };

    case 'admin':
      return {
        ...baseConfig,
        cacheStrategies: [],
        runtimeCaching: [
          {
            name: 'dashboard-data',
            patterns: ['/api/dashboard/*', '/api/analytics/*'],
            strategy: 'network-first',
            maxEntries: 20,
            maxAgeSeconds: 60 // 1 minute
          },
          {
            name: 'api-cache',
            patterns: ['/api/*'],
            strategy: 'network-first',
            maxEntries: 100,
            maxAgeSeconds: 300
          }
        ]
      };

    case 'business':
      return {
        ...baseConfig,
        cacheStrategies: [],
        runtimeCaching: [
          {
            name: 'delivery-requests',
            patterns: ['/api/delivery-requests/*'],
            strategy: 'network-first',
            maxEntries: 100,
            maxAgeSeconds: 300
          },
          {
            name: 'business-data',
            patterns: ['/api/business/*'],
            strategy: 'stale-while-revalidate',
            maxEntries: 50,
            maxAgeSeconds: 600
          }
        ]
      };

    case 'driver':
      return {
        ...baseConfig,
        cacheStrategies: [],
        runtimeCaching: [
          {
            name: 'driver-deliveries',
            patterns: ['/api/driver/deliveries/*'],
            strategy: 'network-first',
            maxEntries: 50,
            maxAgeSeconds: 180 // 3 minutes
          },
          {
            name: 'maps-data',
            patterns: ['*tile.openstreetmap.org*', '*maps.googleapis.com*'],
            strategy: 'cache-first',
            maxEntries: 200,
            maxAgeSeconds: 86400 // 1 day
          },
          {
            name: 'offline-critical',
            patterns: ['/api/driver/location', '/api/deliveries/*/status'],
            strategy: 'network-first',
            maxEntries: 20,
            maxAgeSeconds: 60
          }
        ]
      };

    default:
      return baseConfig as PWACacheConfig;
  }
}