// Business PWA Service Worker Utilities - Optimized for delivery request management

class ServiceWorkerManager {
  constructor(appName, config) {
    this.cacheName = `${appName}-v${config.version}`;
    this.version = config.version;
    this.config = config;
    this.requestQueue = new Map();
    this.syncMetrics = {
      successful: 0,
      failed: 0,
      pending: 0
    };
  }

  async handleInstall(event) {
    console.log(`[Business SW] Installing ${this.cacheName}`);
    
    event.waitUntil(
      Promise.all([
        this.cacheStaticAssets(),
        this.cacheOfflinePages(),
        this.setupBusinessCache()
      ])
    );

    if (this.config.skipWaiting) {
      self.skipWaiting();
    }
  }

  async handleActivate(event) {
    console.log(`[Business SW] Activating ${this.cacheName}`);
    
    event.waitUntil(
      Promise.all([
        this.cleanupOldCaches(),
        this.initializeBusinessData(),
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

    const strategy = this.findCacheStrategy(request.url);
    
    if (strategy) {
      return this.applyCacheStrategy(request, strategy);
    }

    return this.networkFirst(request, 'default-cache');
  }

  async setupBusinessCache() {
    // Pre-cache essential business data
    const businessEndpoints = [
      '/api/business/profile',
      '/api/pricing/standard',
      '/api/estimate/default'
    ];

    const cache = await caches.open(`${this.cacheName}-business`);
    
    for (const endpoint of businessEndpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          await cache.put(endpoint, response);
          console.log(`[Business SW] Pre-cached business endpoint: ${endpoint}`);
        }
      } catch (error) {
        console.warn(`[Business SW] Failed to pre-cache: ${endpoint}`, error);
      }
    }
  }

  async initializeBusinessData() {
    // Initialize default business data structure
    const cache = await caches.open(`${this.cacheName}-requests`);
    
    const defaultRequestData = {
      templates: [],
      drafts: [],
      recentRequests: [],
      lastSync: Date.now()
    };

    const response = new Response(JSON.stringify(defaultRequestData), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    await cache.put('/api/business/data/init', response);
  }

  async cacheStaticAssets() {
    if (this.config.staticAssets.length === 0) return;

    const cache = await caches.open(this.cacheName);
    
    try {
      await cache.addAll(this.config.staticAssets);
      console.log(`[Business SW] Cached ${this.config.staticAssets.length} static assets`);
    } catch (error) {
      console.error('[Business SW] Failed to cache static assets:', error);
      
      for (const asset of this.config.staticAssets) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`[Business SW] Failed to cache asset: ${asset}`, err);
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
        console.log(`[Business SW] Cached offline page: ${page}`);
      } catch (error) {
        console.warn(`[Business SW] Failed to cache offline page: ${page}`, error);
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
        console.log(`[Business SW] Deleting old cache: ${cacheName}`);
        return caches.delete(cacheName);
      })
    );
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
        return this.networkFirstBusiness(request, cacheName, strategy);
      case 'stale-while-revalidate':
        return this.staleWhileRevalidateBusiness(request, cacheName, strategy);
      case 'network-only':
        return this.networkOnly(request);
      case 'cache-only':
        return this.cacheOnly(request, cacheName);
      default:
        return this.networkFirstBusiness(request, cacheName, strategy);
    }
  }

  async cacheFirst(request, cacheName, strategy) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Check if business data is stale
      const cacheAge = this.getCacheAge(cachedResponse);
      if (cacheAge > (strategy.maxAgeSeconds * 1000)) {
        this.refreshBusinessDataInBackground(request, cacheName);
      }
      
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
      console.warn('[Business SW] Network request failed in cache-first:', error);
      return this.getBusinessOfflinePage(request);
    }
  }

  async networkFirstBusiness(request, cacheName, strategy) {
    try {
      const networkResponse = await this.fetchWithTimeout(request, strategy?.networkTimeoutSeconds);
      
      if (networkResponse.ok) {
        const cache = await caches.open(cacheName);
        
        // Add business-specific metadata
        const responseData = await networkResponse.clone().json();
        const enhancedData = {
          ...responseData,
          _cached: Date.now(),
          _strategy: strategy.name
        };
        
        const enhancedResponse = new Response(JSON.stringify(enhancedData), {
          headers: { 'Content-Type': 'application/json' }
        });
        
        cache.put(request, enhancedResponse);
        await this.enforceMaxEntries(cache, strategy?.maxEntries);
        
        return networkResponse;
      }
      
      throw new Error(`HTTP ${networkResponse.status}`);
    } catch (error) {
      console.warn('[Business SW] Network request failed in network-first:', error);
      
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return this.addBusinessStaleIndicator(cachedResponse);
      }
      
      return this.getBusinessOfflinePage(request);
    }
  }

  async staleWhileRevalidateBusiness(request, cacheName, strategy) {
    const cachedResponse = await caches.match(request);
    
    // Background network request with business-specific handling
    const networkPromise = this.fetchWithTimeout(request, strategy?.networkTimeoutSeconds)
      .then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(cacheName);
          const responseData = await response.clone().json();
          
          // Add business metadata
          const enhancedData = {
            ...responseData,
            _updated: Date.now(),
            _businessCache: true
          };
          
          const enhancedResponse = new Response(JSON.stringify(enhancedData), {
            headers: { 'Content-Type': 'application/json' }
          });
          
          cache.put(request, enhancedResponse);
          await this.enforceMaxEntries(cache, strategy?.maxEntries);
          
          // Notify business clients of fresh data
          this.notifyBusinessClientsOfUpdate(request.url, responseData);
        }
        return response;
      })
      .catch((error) => {
        console.warn('[Business SW] Background request failed:', error);
      });

    if (cachedResponse) {
      networkPromise; // Keep promise alive
      return cachedResponse;
    }

    try {
      return await networkPromise;
    } catch (error) {
      return this.getBusinessOfflinePage(request);
    }
  }

  async networkOnly(request) {
    return fetch(request);
  }

  async cacheOnly(request, cacheName) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return this.getBusinessOfflinePage(request);
  }

  async fetchWithTimeout(request, timeoutSeconds = 8) {
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
      
      // Sort by business priority (requests > analytics > others)
      const sortedKeys = keys.sort((a, b) => {
        const aPriority = this.getBusinessCachePriority(a.url);
        const bPriority = this.getBusinessCachePriority(b.url);
        return bPriority - aPriority;
      });
      
      for (let i = sortedKeys.length - entriesToDelete; i < sortedKeys.length; i++) {
        await cache.delete(sortedKeys[i]);
      }
    }
  }

  getBusinessCachePriority(url) {
    if (url.includes('delivery-requests')) return 10;
    if (url.includes('estimate') || url.includes('pricing')) return 8;
    if (url.includes('business/profile')) return 6;
    if (url.includes('analytics')) return 4;
    return 1;
  }

  getCacheAge(response) {
    const cacheDate = response.headers.get('date');
    return cacheDate ? Date.now() - new Date(cacheDate).getTime() : Infinity;
  }

  async refreshBusinessDataInBackground(request, cacheName) {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(cacheName);
        await cache.put(request, networkResponse);
        console.log('[Business SW] Background refresh completed:', request.url);
        
        // Notify clients of updated business data
        this.notifyBusinessClientsOfUpdate(request.url, await networkResponse.clone().json());
      }
    } catch (error) {
      console.warn('[Business SW] Background refresh failed:', request.url, error);
    }
  }

  addBusinessStaleIndicator(response) {
    // Clone response and add business-specific stale indicators
    return response.clone();
  }

  async notifyBusinessClientsOfUpdate(url, data) {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BUSINESS_DATA_UPDATED',
        url,
        data,
        timestamp: Date.now()
      });
    });
  }

  async getBusinessOfflinePage(request) {
    const url = new URL(request.url);
    
    if (url.pathname.includes('/api/')) {
      return this.getBusinessAPIOfflineResponse(url);
    }

    // Return offline page for navigation requests
    const offlineCache = await caches.open(`${this.cacheName}-offline`);
    const cachedOfflinePage = await offlineCache.match('/offline.html');
    
    if (cachedOfflinePage) {
      return cachedOfflinePage;
    }

    return new Response(this.getBusinessOfflineHTML(), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html' }
    });
  }

  async getBusinessAPIOfflineResponse(url) {
    // Business-specific offline API responses
    const offlineResponses = {
      '/api/delivery-requests': {
        error: 'offline',
        message: 'Cannot submit delivery requests while offline. Your request will be queued.',
        canQueue: true,
        estimatedSync: '2-5 minutes when connection returns'
      },
      '/api/estimate': {
        error: 'pricing_offline',
        message: 'Pricing estimates require internet connection',
        suggestion: 'Use standard rates as reference',
        fallbackRates: await this.getFallbackPricing()
      },
      '/api/business/analytics': {
        error: 'analytics_offline',
        message: 'Analytics data requires internet connection',
        data: [],
        lastUpdate: 'Unknown'
      }
    };

    // Try to match specific endpoint
    const endpoint = Object.keys(offlineResponses).find(key => 
      url.pathname.includes(key.replace('/api/', ''))
    );

    const responseData = endpoint ? offlineResponses[endpoint] : {
      error: 'offline',
      message: 'This feature requires an internet connection',
      endpoint: url.pathname,
      offline: true
    };

    // Try to get cached data as fallback
    const cachedResponse = await caches.match(url.href);
    if (cachedResponse) {
      try {
        const cachedData = await cachedResponse.json();
        responseData.cachedData = cachedData;
        responseData.message += ' (cached data available)';
      } catch (error) {
        // Ignore JSON parse errors
      }
    }

    return new Response(JSON.stringify(responseData), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getFallbackPricing() {
    // Return basic fallback pricing structure
    try {
      const cache = await caches.open(`${this.cacheName}-business`);
      const cachedPricing = await cache.match('/api/pricing/standard');
      
      if (cachedPricing) {
        const data = await cachedPricing.json();
        return data;
      }
    } catch (error) {
      // Ignore cache errors
    }

    return {
      standard: { base: 25, perKm: 2.5 },
      express: { base: 45, perKm: 4.0 },
      same_day: { base: 35, perKm: 3.0 },
      note: 'Cached rates - contact for current pricing'
    };
  }

  getBusinessOfflineHTML() {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Business Portal Offline - UAE Delivery</title>
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
              max-width: 600px;
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
            .business-features {
              background: rgba(255, 255, 255, 0.05);
              border-radius: 10px;
              padding: 1.5rem;
              margin: 2rem 0;
              text-align: left;
            }
            .business-features h3 {
              color: #C32C3C;
              margin-bottom: 1rem;
              text-align: center;
            }
            .feature-list {
              list-style: none;
              padding: 0;
            }
            .feature-list li {
              padding: 0.5rem 0;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            .feature-list li:last-child {
              border-bottom: none;
            }
            .feature-list li::before {
              content: "📋 ";
              margin-right: 0.5rem;
            }
            .actions {
              display: flex;
              gap: 1rem;
              justify-content: center;
              margin-top: 2rem;
            }
            .btn {
              padding: 0.75rem 2rem;
              border: none;
              border-radius: 25px;
              cursor: pointer;
              font-size: 1rem;
              transition: all 0.3s ease;
              text-decoration: none;
              display: inline-block;
            }
            .btn-primary {
              background: #C32C3C;
              color: white;
            }
            .btn-primary:hover {
              background: #a82633;
              transform: translateY(-2px);
            }
            .btn-secondary {
              background: rgba(255, 255, 255, 0.1);
              color: white;
              border: 1px solid rgba(255, 255, 255, 0.3);
            }
            .btn-secondary:hover {
              background: rgba(255, 255, 255, 0.2);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">🏢</div>
            <h1>Business Portal Offline</h1>
            <p>Your business portal requires an internet connection for delivery request management and real-time features.</p>
            
            <div class="business-features">
              <h3>Limited Offline Features</h3>
              <ul class="feature-list">
                <li>View cached delivery requests</li>
                <li>Access saved cost estimates</li>
                <li>Create draft requests (will sync when online)</li>
                <li>View business profile information</li>
              </ul>
            </div>
            
            <div class="actions">
              <button class="btn btn-primary" onclick="window.location.reload()">
                Reconnect Portal
              </button>
              <button class="btn btn-secondary" onclick="viewCachedData()">
                View Cached Data
              </button>
            </div>
          </div>
          
          <script>
            function viewCachedData() {
              // Try to navigate to cached dashboard
              try {
                window.location.href = '/dashboard?offline=true';
              } catch (error) {
                alert('Cached data not available. Please connect to the internet.');
              }
            }

            // Auto-reload when connection is restored
            window.addEventListener('online', () => {
              setTimeout(() => window.location.reload(), 1000);
            });

            // Check for service worker messages
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'CONNECTION_RESTORED') {
                  window.location.reload();
                }
              });
            }
          </script>
        </body>
      </html>
    `;
  }

  // Performance and sync metrics
  updateSyncMetrics(type) {
    this.syncMetrics[type]++;
  }

  getSyncMetrics() {
    return {
      ...this.syncMetrics,
      timestamp: Date.now(),
      queueSize: this.requestQueue.size
    };
  }

  resetSyncMetrics() {
    this.syncMetrics = { successful: 0, failed: 0, pending: 0 };
  }
}

// Simplified BackgroundSyncManager for Business PWA
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
        console.log(`[Business SW] Background sync completed: ${syncType}`);
      } catch (error) {
        console.error(`[Business SW] Background sync failed: ${syncType}`, error);
        throw error;
      }
    }
  }

  async performSync(syncType) {
    switch (syncType) {
      case 'requests':
        await this.syncDeliveryRequests();
        break;
      case 'estimates':
        await this.syncCostEstimates();
        break;
      case 'analytics':
        await this.syncBusinessAnalytics();
        break;
      default:
        console.warn(`[Business SW] Unknown sync type: ${syncType}`);
    }
  }

  async syncDeliveryRequests() {
    // Implementation handled in main sw.js
  }

  async syncCostEstimates() {
    // Sync cached cost estimates
    const cache = await caches.open('business-pwa-v1.0.0-cost-estimation');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response);
        }
      } catch (error) {
        console.error('[Business SW] Failed to sync cost estimate:', request.url, error);
      }
    }
  }

  async syncBusinessAnalytics() {
    // Sync business analytics data
    const analyticsEndpoints = [
      '/api/business/analytics/overview',
      '/api/business/analytics/deliveries',
      '/api/business/analytics/costs'
    ];

    for (const endpoint of analyticsEndpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          const cache = await caches.open('business-pwa-v1.0.0-business-analytics');
          await cache.put(endpoint, response);
        }
      } catch (error) {
        console.error('[Business SW] Failed to sync analytics:', endpoint, error);
      }
    }
  }
}

// PushNotificationHandler for Business PWA
class PushNotificationHandler {
  async handlePushEvent(event) {
    const data = event.data?.json() || {};
    
    const notification = {
      title: data.title || 'UAE Delivery Business',
      body: data.body || 'New business notification',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/badge-72x72.png',
      tag: data.tag || 'business-notification',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      data: data.data || {}
    };

    // Add business-specific actions based on notification type
    if (data.type === 'delivery_update') {
      notification.actions = [
        { action: 'view', title: 'View Details' },
        { action: 'track', title: 'Track Delivery' }
      ];
    } else if (data.type === 'cost_estimate') {
      notification.actions = [
        { action: 'view', title: 'View Estimate' },
        { action: 'request', title: 'Create Request' }
      ];
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
      await this.handleBusinessNotificationAction(action, data);
    } else {
      await this.openBusinessApp(data);
    }

    this.trackNotificationEvent('clicked', { action, ...data });
  }

  async handleBusinessNotificationAction(action, data) {
    switch (action) {
      case 'view':
        await this.openBusinessApp({ action: 'view_details', ...data });
        break;
      case 'track':
        await this.openBusinessApp({ action: 'track_delivery', deliveryId: data.deliveryId });
        break;
      case 'request':
        await this.openBusinessApp({ action: 'new_request', estimateId: data.estimateId });
        break;
      default:
        await this.openBusinessApp(data);
    }
  }

  async openBusinessApp(data = {}) {
    const clients = await self.clients.matchAll({ type: 'window' });
    
    if (clients.length > 0) {
      const client = clients[0];
      client.focus();
      
      client.postMessage({
        type: 'business_notification_action',
        data
      });
      
      return;
    }

    let url = '/dashboard';
    
    if (data.action === 'view_details' && data.deliveryId) {
      url = `/deliveries/${data.deliveryId}`;
    } else if (data.action === 'track_delivery' && data.deliveryId) {
      url = `/track/${data.deliveryId}`;
    } else if (data.action === 'new_request') {
      url = '/new-request';
    }

    await self.clients.openWindow(url);
  }

  trackNotificationEvent(event, data) {
    console.log(`[Business SW] Notification ${event}:`, data);
  }
}