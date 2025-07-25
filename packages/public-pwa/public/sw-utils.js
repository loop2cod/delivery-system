// Simplified Service Worker Utilities for browser environment
// This is a browser-compatible version of the service worker utilities

class ServiceWorkerManager {
  constructor(appName, config) {
    this.cacheName = `${appName}-v${config.version}`;
    this.version = config.version;
    this.config = config;
  }

  async handleInstall(event) {
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

  async handleActivate(event) {
    console.log(`[SW] Activating ${this.cacheName}`);
    
    event.waitUntil(
      Promise.all([
        this.cleanupOldCaches(),
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

  async cacheStaticAssets() {
    if (this.config.staticAssets.length === 0) return;

    const cache = await caches.open(this.cacheName);
    
    try {
      await cache.addAll(this.config.staticAssets);
      console.log(`[SW] Cached ${this.config.staticAssets.length} static assets`);
    } catch (error) {
      console.error('[SW] Failed to cache static assets:', error);
      
      for (const asset of this.config.staticAssets) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`[SW] Failed to cache asset: ${asset}`, err);
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
        console.log(`[SW] Cached offline page: ${page}`);
      } catch (error) {
        console.warn(`[SW] Failed to cache offline page: ${page}`, error);
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
        console.log(`[SW] Deleting old cache: ${cacheName}`);
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

  async cacheFirst(request, cacheName, strategy) {
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
      return this.getOfflinePage(request);
    }
  }

  async networkFirst(request, cacheName, strategy) {
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

  async staleWhileRevalidate(request, cacheName, strategy) {
    const cachedResponse = await caches.match(request);
    
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

    if (cachedResponse) {
      networkPromise;
      return cachedResponse;
    }

    try {
      return await networkPromise;
    } catch (error) {
      return this.getOfflinePage(request);
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
    
    return this.getOfflinePage(request);
  }

  async fetchWithTimeout(request, timeoutSeconds) {
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

  async enforceMaxEntries(cache, maxEntries) {
    if (!maxEntries) return;

    const keys = await cache.keys();
    
    if (keys.length > maxEntries) {
      const entriesToDelete = keys.length - maxEntries;
      for (let i = 0; i < entriesToDelete; i++) {
        await cache.delete(keys[i]);
      }
    }
  }

  async getOfflinePage(request) {
    const url = new URL(request.url);
    
    let offlinePage = '/offline.html';
    
    if (url.pathname.includes('/api/')) {
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

    const offlineCache = await caches.open(`${this.cacheName}-offline`);
    const cachedOfflinePage = await offlineCache.match(offlinePage);
    
    if (cachedOfflinePage) {
      return cachedOfflinePage;
    }

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
        console.log(`[SW] Background sync completed: ${syncType}`);
      } catch (error) {
        console.error(`[SW] Background sync failed: ${syncType}`, error);
        throw error;
      }
    }
  }

  async performSync(syncType) {
    switch (syncType) {
      case 'inquiries':
        await this.syncInquiries();
        break;
      case 'tracking':
        await this.syncTrackingRequests();
        break;
      default:
        console.warn(`[SW] Unknown sync type: ${syncType}`);
    }
  }

  async syncInquiries() {
    // Implementation handled in main sw.js file
  }

  async syncTrackingRequests() {
    // Implementation for syncing tracking requests
  }
}

class PushNotificationHandler {
  async handlePushEvent(event) {
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
    
    this.trackNotificationEvent('displayed', data);
  }

  async handleNotificationClick(event) {
    const notification = event.notification;
    const action = event.action;
    const data = notification.data || {};

    notification.close();

    if (action) {
      await this.handleNotificationAction(action, data);
    } else {
      await this.openApp(data);
    }

    this.trackNotificationEvent('clicked', { action, ...data });
  }

  async handleNotificationAction(action, data) {
    switch (action) {
      case 'track':
        await this.openApp({ action: 'track_package', trackingNumber: data.trackingNumber });
        break;
      case 'view':
        await this.openApp({ action: 'view_inquiry', inquiryId: data.inquiryId });
        break;
      default:
        await this.openApp(data);
    }
  }

  async openApp(data = {}) {
    const clients = await self.clients.matchAll({ type: 'window' });
    
    if (clients.length > 0) {
      const client = clients[0];
      client.focus();
      
      client.postMessage({
        type: 'notification_action',
        data
      });
      
      return;
    }

    let url = '/';
    
    if (data.action === 'track_package' && data.trackingNumber) {
      url = `/track?number=${data.trackingNumber}`;
    } else if (data.action === 'view_inquiry' && data.inquiryId) {
      url = `/inquiry/${data.inquiryId}`;
    }

    await self.clients.openWindow(url);
  }

  trackNotificationEvent(event, data) {
    console.log(`[SW] Notification ${event}:`, data);
  }
}