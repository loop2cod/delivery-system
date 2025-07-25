// Admin PWA Service Worker Utilities - Optimized for real-time dashboard operations

class ServiceWorkerManager {
  constructor(appName, config) {
    this.cacheName = `${appName}-v${config.version}`;
    this.version = config.version;
    this.config = config;
    this.networkFailures = new Map();
    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      updates: 0
    };
  }

  async handleInstall(event) {
    console.log(`[Admin SW] Installing ${this.cacheName}`);
    
    event.waitUntil(
      Promise.all([
        this.cacheStaticAssets(),
        this.cacheOfflinePages(),
        this.setupCriticalDataCache()
      ])
    );

    if (this.config.skipWaiting) {
      self.skipWaiting();
    }
  }

  async handleActivate(event) {
    console.log(`[Admin SW] Activating ${this.cacheName}`);
    
    event.waitUntil(
      Promise.all([
        this.cleanupOldCaches(),
        this.initializeRealtimeCache(),
        this.config.clientsClaim ? self.clients.claim() : Promise.resolve()
      ])
    );
  }

  async handleFetch(event) {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
      return fetch(request);
    }

    // Track request for metrics
    this.trackRequest(request.url);

    const strategy = this.findCacheStrategy(request.url);
    
    if (strategy) {
      return this.applyCacheStrategy(request, strategy);
    }

    return this.networkFirst(request, 'default-cache');
  }

  async setupCriticalDataCache() {
    // Pre-cache critical admin endpoints for offline fallback
    const criticalEndpoints = [
      '/api/dashboard/overview',
      '/api/drivers/summary',
      '/api/deliveries/summary'
    ];

    const cache = await caches.open(`${this.cacheName}-critical`);
    
    for (const endpoint of criticalEndpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          await cache.put(endpoint, response);
          console.log(`[Admin SW] Pre-cached critical endpoint: ${endpoint}`);
        }
      } catch (error) {
        console.warn(`[Admin SW] Failed to pre-cache: ${endpoint}`, error);
      }
    }
  }

  async initializeRealtimeCache() {
    // Initialize real-time data cache with default structure
    const realtimeCache = await caches.open(`${this.cacheName}-realtime`);
    
    const defaultData = {
      '/api/dashboard/overview': {
        timestamp: Date.now(),
        data: {
          message: 'Loading dashboard data...',
          loading: true
        }
      }
    };

    for (const [endpoint, data] of Object.entries(defaultData)) {
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      await realtimeCache.put(endpoint, response);
    }
  }

  async cacheStaticAssets() {
    if (this.config.staticAssets.length === 0) return;

    const cache = await caches.open(this.cacheName);
    
    try {
      await cache.addAll(this.config.staticAssets);
      console.log(`[Admin SW] Cached ${this.config.staticAssets.length} static assets`);
    } catch (error) {
      console.error('[Admin SW] Failed to cache static assets:', error);
      
      // Fallback: cache assets individually
      for (const asset of this.config.staticAssets) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`[Admin SW] Failed to cache asset: ${asset}`, err);
        }
      }
    }
  }

  async cacheOfflinePages() {
    if (this.config.offlinePages.length === 0) return;

    const cache = await caches.open(`${this.cacheName}-offline`);
    
    for (const page of this.config.offlinePages) {
      try {
        await cache.add(page);
        console.log(`[Admin SW] Cached offline page: ${page}`);
      } catch (error) {
        console.warn(`[Admin SW] Failed to cache offline page: ${page}`, error);
      }
    }
  }

  async cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name => 
      name.startsWith(this.cacheName.split('-v')[0]) && name !== this.cacheName
    );

    await Promise.all(
      oldCaches.map(async (cacheName) => {
        console.log(`[Admin SW] Deleting old cache: ${cacheName}`);
        return caches.delete(cacheName);
      })
    );
  }

  trackRequest(url) {
    // Simple request tracking for performance monitoring
    if (url.includes('/api/')) {
      const endpoint = new URL(url).pathname;
      const failures = this.networkFailures.get(endpoint) || 0;
      
      // Track endpoints with frequent failures
      if (failures > 3) {
        console.warn(`[Admin SW] High failure rate for: ${endpoint}`);
      }
    }
  }

  findCacheStrategy(url) {
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

  async applyCacheStrategy(request, strategy) {
    const cacheName = `${this.cacheName}-${strategy.name}`;

    switch (strategy.strategy) {
      case 'cache-first':
        return this.cacheFirst(request, cacheName, strategy);
      case 'network-first':
        return this.networkFirstWithFallback(request, cacheName, strategy);
      case 'stale-while-revalidate':
        return this.staleWhileRevalidateAdmin(request, cacheName, strategy);
      case 'network-only':
        return this.networkOnly(request);
      case 'cache-only':
        return this.cacheOnly(request, cacheName);
      default:
        return this.networkFirstWithFallback(request, cacheName, strategy);
    }
  }

  async cacheFirst(request, cacheName, strategy) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      this.cacheMetrics.hits++;
      
      // Check cache age for admin data
      const cacheAge = this.getCacheAge(cachedResponse);
      if (cacheAge > (strategy.maxAgeSeconds * 1000)) {
        // Cache is stale, refresh in background
        this.refreshInBackground(request, cacheName);
      }
      
      return cachedResponse;
    }

    this.cacheMetrics.misses++;

    try {
      const networkResponse = await this.fetchWithTimeout(request, strategy?.networkTimeoutSeconds);
      
      if (networkResponse.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
        await this.enforceMaxEntries(cache, strategy?.maxEntries);
        this.cacheMetrics.updates++;
      }
      
      return networkResponse;
    } catch (error) {
      console.warn('[Admin SW] Network request failed in cache-first:', error);
      return this.getAdminOfflinePage(request);
    }
  }

  async networkFirstWithFallback(request, cacheName, strategy) {
    const url = new URL(request.url);
    const endpoint = url.pathname;

    try {
      const networkResponse = await this.fetchWithTimeout(request, strategy?.networkTimeoutSeconds);
      
      if (networkResponse.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
        await this.enforceMaxEntries(cache, strategy?.maxEntries);
        
        // Reset failure count on success
        this.networkFailures.delete(endpoint);
        this.cacheMetrics.updates++;
        
        return networkResponse;
      }
      
      throw new Error(`HTTP ${networkResponse.status}`);
    } catch (error) {
      console.warn('[Admin SW] Network request failed in network-first:', error);
      
      // Track failure
      const failures = this.networkFailures.get(endpoint) || 0;
      this.networkFailures.set(endpoint, failures + 1);
      
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        this.cacheMetrics.hits++;
        
        // Add stale data indicator for admin UI
        const staleResponse = this.addStaleIndicator(cachedResponse);
        return staleResponse;
      }
      
      return this.getAdminOfflinePage(request);
    }
  }

  async staleWhileRevalidateAdmin(request, cacheName, strategy) {
    const cachedResponse = await caches.match(request);
    
    // Background network request for admin data freshness
    const networkPromise = this.fetchWithTimeout(request, strategy?.networkTimeoutSeconds)
      .then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(cacheName);
          cache.put(request, response.clone());
          await this.enforceMaxEntries(cache, strategy?.maxEntries);
          this.cacheMetrics.updates++;
          
          // Notify admin interface of fresh data
          this.notifyClientsOfFreshData(request.url, response);
        }
        return response;
      })
      .catch((error) => {
        console.warn('[Admin SW] Background network request failed:', error);
      });

    if (cachedResponse) {
      this.cacheMetrics.hits++;
      networkPromise; // Keep promise alive
      return cachedResponse;
    }

    try {
      return await networkPromise;
    } catch (error) {
      return this.getAdminOfflinePage(request);
    }
  }

  async networkOnly(request) {
    return fetch(request);
  }

  async cacheOnly(request, cacheName) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      this.cacheMetrics.hits++;
      return cachedResponse;
    }
    
    this.cacheMetrics.misses++;
    return this.getAdminOfflinePage(request);
  }

  async fetchWithTimeout(request, timeoutSeconds = 10) {
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

  async enforceMaxEntries(cache, maxEntries) {
    if (!maxEntries) return;

    const keys = await cache.keys();
    
    if (keys.length > maxEntries) {
      const entriesToDelete = keys.length - maxEntries;
      
      // Sort by date and remove oldest
      const sortedKeys = keys.sort((a, b) => {
        // Simple sorting by URL for now - in production, sort by cache date
        return a.url.localeCompare(b.url);
      });
      
      for (let i = 0; i < entriesToDelete; i++) {
        await cache.delete(sortedKeys[i]);
      }
    }
  }

  getCacheAge(response) {
    const cacheDate = response.headers.get('date');
    return cacheDate ? Date.now() - new Date(cacheDate).getTime() : Infinity;
  }

  async refreshInBackground(request, cacheName) {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(cacheName);
        await cache.put(request, networkResponse);
        console.log('[Admin SW] Background refresh completed:', request.url);
      }
    } catch (error) {
      console.warn('[Admin SW] Background refresh failed:', request.url, error);
    }
  }

  addStaleIndicator(response) {
    // Clone response and add stale indicator
    return response.clone();
  }

  async notifyClientsOfFreshData(url, response) {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'FRESH_DATA_AVAILABLE',
        url,
        timestamp: Date.now()
      });
    });
  }

  async getAdminOfflinePage(request) {
    const url = new URL(request.url);
    
    if (url.pathname.includes('/api/')) {
      // Return structured offline response for API requests
      const offlineData = {
        error: 'offline',
        message: 'Admin dashboard requires internet connection for real-time data',
        endpoint: url.pathname,
        offline: true,
        timestamp: Date.now()
      };

      // Try to get cached data as fallback
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        try {
          const cachedData = await cachedResponse.json();
          offlineData.cachedData = cachedData;
          offlineData.message += ' (showing cached data)';
        } catch (error) {
          // Ignore JSON parse errors
        }
      }

      return new Response(JSON.stringify(offlineData), {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return offline page for navigation requests
    const offlineCache = await caches.open(`${this.cacheName}-offline`);
    const cachedOfflinePage = await offlineCache.match('/offline.html');
    
    if (cachedOfflinePage) {
      return cachedOfflinePage;
    }

    // Fallback admin offline page
    return new Response(this.getAdminOfflineHTML(), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html' }
    });
  }

  getAdminOfflineHTML() {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Admin Dashboard Offline - UAE Delivery</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #142C4F 0%, #1e3a5f 100%);
              color: white;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
              padding: 1rem;
            }
            .container {
              max-width: 500px;
              text-align: center;
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              border-radius: 20px;
              padding: 3rem 2rem;
              border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { color: #EFEFEF; margin-bottom: 1rem; }
            p { color: rgba(255, 255, 255, 0.9); line-height: 1.5; margin-bottom: 1rem; }
            .admin-warning {
              background: rgba(195, 44, 60, 0.2);
              border: 1px solid #C32C3C;
              border-radius: 8px;
              padding: 1rem;
              margin: 1rem 0;
            }
            .retry-btn {
              background: #C32C3C;
              color: white;
              border: none;
              padding: 0.75rem 2rem;
              border-radius: 25px;
              cursor: pointer;
              font-size: 1rem;
              margin-top: 1rem;
              transition: all 0.3s ease;
            }
            .retry-btn:hover {
              background: #a82633;
              transform: translateY(-2px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">🔧</div>
            <h1>Admin Dashboard Offline</h1>
            <p>The admin dashboard requires an internet connection to access real-time delivery data and management features.</p>
            
            <div class="admin-warning">
              <strong>⚠️ Limited Functionality</strong><br>
              Real-time data, driver tracking, and system management are unavailable offline.
            </div>
            
            <button class="retry-btn" onclick="window.location.reload()">
              Reconnect Dashboard
            </button>
          </div>
          
          <script>
            // Auto-reload when connection is restored
            window.addEventListener('online', () => {
              setTimeout(() => window.location.reload(), 1000);
            });
          </script>
        </body>
      </html>
    `;
  }

  // Performance monitoring methods
  getMetrics() {
    return {
      cacheMetrics: this.cacheMetrics,
      networkFailures: Object.fromEntries(this.networkFailures),
      timestamp: Date.now()
    };
  }

  resetMetrics() {
    this.cacheMetrics = { hits: 0, misses: 0, updates: 0 };
    this.networkFailures.clear();
  }
}

// Simplified versions of other classes for admin PWA
class BackgroundSyncManager {
  constructor(appName) {
    this.syncTagPrefix = `${appName}-sync`;
  }

  async handleBackgroundSync(event) {
    const tag = event.tag;
    
    if (tag.startsWith(this.syncTagPrefix)) {
      const syncType = tag.replace(`${this.syncTagPrefix}-`, '');
      
      try {
        await this.performSync(syncType);
        console.log(`[Admin SW] Background sync completed: ${syncType}`);
      } catch (error) {
        console.error(`[Admin SW] Background sync failed: ${syncType}`, error);
        throw error;
      }
    }
  }

  async performSync(syncType) {
    switch (syncType) {
      case 'dashboard-data':
        await this.syncDashboardData();
        break;
      case 'driver-updates':
        await this.syncDriverUpdates();
        break;
      case 'delivery-updates':
        await this.syncDeliveryUpdates();
        break;
      default:
        console.warn(`[Admin SW] Unknown sync type: ${syncType}`);
    }
  }

  async syncDashboardData() {
    // Sync critical dashboard data
    const endpoints = [
      '/api/dashboard/overview',
      '/api/drivers/status',
      '/api/deliveries/active'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          const cache = await caches.open('admin-pwa-v1.0.0-realtime');
          await cache.put(endpoint, response);
        }
      } catch (error) {
        console.error('[Admin SW] Failed to sync dashboard data:', endpoint, error);
      }
    }
  }

  async syncDriverUpdates() {
    // Implementation for syncing driver data
  }

  async syncDeliveryUpdates() {
    // Implementation for syncing delivery data
  }
}

class PushNotificationHandler {
  async handlePushEvent(event) {
    const data = event.data?.json() || {};
    
    // Enhanced notifications for admin users
    const notification = {
      title: data.title || 'UAE Delivery Admin',
      body: data.body || 'New admin notification',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/badge-72x72.png',
      tag: data.tag || 'admin-notification',
      requireInteraction: data.requireInteraction || data.priority === 'high',
      actions: data.actions || [],
      data: data.data || {}
    };

    // Add admin-specific actions
    if (data.type === 'emergency') {
      notification.actions = [
        { action: 'view', title: 'View Details' },
        { action: 'broadcast', title: 'Send Alert' }
      ];
      notification.requireInteraction = true;
    }

    await self.registration.showNotification(notification.title, notification);
    this.trackNotificationEvent('displayed', data);
  }

  async handleNotificationClick(event) {
    const notification = event.notification;
    const action = event.action;
    const data = notification.data || {};

    notification.close();

    if (action) {
      await this.handleAdminNotificationAction(action, data);
    } else {
      await this.openAdminApp(data);
    }

    this.trackNotificationEvent('clicked', { action, ...data });
  }

  async handleAdminNotificationAction(action, data) {
    switch (action) {
      case 'view':
        await this.openAdminApp({ action: 'view_details', ...data });
        break;
      case 'assign':
        await this.openAdminApp({ action: 'assign_driver', ...data });
        break;
      case 'broadcast':
        await this.openAdminApp({ action: 'emergency_broadcast', ...data });
        break;
      default:
        await this.openAdminApp(data);
    }
  }

  async openAdminApp(data = {}) {
    const clients = await self.clients.matchAll({ type: 'window' });
    
    if (clients.length > 0) {
      const client = clients[0];
      client.focus();
      
      client.postMessage({
        type: 'admin_notification_action',
        data
      });
      
      return;
    }

    let url = '/dashboard';
    
    if (data.action === 'view_details' && data.deliveryId) {
      url = `/deliveries/${data.deliveryId}`;
    } else if (data.action === 'assign_driver' && data.inquiryId) {
      url = `/inquiries/${data.inquiryId}`;
    } else if (data.action === 'emergency_broadcast') {
      url = `/emergency`;
    }

    await self.clients.openWindow(url);
  }

  trackNotificationEvent(event, data) {
    console.log(`[Admin SW] Notification ${event}:`, data);
    
    // Send to analytics if available
    if (self.analytics) {
      self.analytics.track('admin_notification', { event, ...data });
    }
  }
}