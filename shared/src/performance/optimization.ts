/**
 * Performance Optimization Utilities
 * Collection of utilities to optimize PWA performance
 */

// Image optimization utilities
export class ImageOptimizer {
  /**
   * Convert image to WebP format if supported
   */
  static async convertToWebP(blob: Blob, quality: number = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        canvas.toBlob(
          (webpBlob) => {
            if (webpBlob) {
              resolve(webpBlob);
            } else {
              resolve(blob); // Fallback to original
            }
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => resolve(blob);
      img.src = URL.createObjectURL(blob);
    });
  }

  /**
   * Resize image to target dimensions
   */
  static async resizeImage(
    blob: Blob,
    maxWidth: number,
    maxHeight: number,
    quality: number = 0.8
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (resizedBlob) => {
            resolve(resizedBlob || blob);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => resolve(blob);
      img.src = URL.createObjectURL(blob);
    });
  }

  /**
   * Generate responsive image sizes
   */
  static async generateResponsiveImages(blob: Blob): Promise<{
    thumbnail: Blob;
    medium: Blob;
    large: Blob;
  }> {
    const [thumbnail, medium, large] = await Promise.all([
      this.resizeImage(blob, 150, 150, 0.7),
      this.resizeImage(blob, 600, 600, 0.8),
      this.resizeImage(blob, 1200, 1200, 0.9)
    ]);

    return { thumbnail, medium, large };
  }
}

// Bundle splitting and lazy loading utilities
export class LazyLoader {
  private static loadedChunks = new Set<string>();
  private static loadingChunks = new Map<string, Promise<any>>();

  /**
   * Dynamically import component with retry logic
   */
  static async loadComponent<T>(
    importFn: () => Promise<T>,
    chunkName: string,
    retries: number = 3
  ): Promise<T> {
    if (this.loadedChunks.has(chunkName)) {
      return importFn();
    }

    if (this.loadingChunks.has(chunkName)) {
      return this.loadingChunks.get(chunkName)!;
    }

    const loadPromise = this.tryLoadWithRetry(importFn, retries);
    this.loadingChunks.set(chunkName, loadPromise);

    try {
      const result = await loadPromise;
      this.loadedChunks.add(chunkName);
      this.loadingChunks.delete(chunkName);
      return result;
    } catch (error) {
      this.loadingChunks.delete(chunkName);
      throw error;
    }
  }

  /**
   * Load component with retry logic
   */
  private static async tryLoadWithRetry<T>(
    importFn: () => Promise<T>,
    retries: number
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await importFn();
      } catch (error) {
        if (i === retries - 1) throw error;
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Preload critical components
   */
  static preloadComponents(importFns: Array<() => Promise<any>>): void {
    // Use requestIdleCallback if available
    const preload = () => {
      importFns.forEach((importFn, index) => {
        setTimeout(() => {
          importFn().catch(() => {
            // Ignore preload errors
          });
        }, index * 100);
      });
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(preload, { timeout: 5000 });
    } else {
      setTimeout(preload, 0);
    }
  }
}

// Memory management utilities
export class MemoryManager {
  private static observers = new Set<IntersectionObserver>();
  private static imageCache = new Map<string, HTMLImageElement>();
  private static maxCacheSize = 50;

  /**
   * Clean up unused images from cache
   */
  static cleanupImageCache(): void {
    if (this.imageCache.size > this.maxCacheSize) {
      const entries = Array.from(this.imageCache.entries());
      const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
      
      toRemove.forEach(([key, img]) => {
        if (img.src.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
        }
        this.imageCache.delete(key);
      });
    }
  }

  /**
   * Cache image with cleanup
   */
  static cacheImage(key: string, img: HTMLImageElement): void {
    this.imageCache.set(key, img);
    this.cleanupImageCache();
  }

  /**
   * Get cached image
   */
  static getCachedImage(key: string): HTMLImageElement | undefined {
    return this.imageCache.get(key);
  }

  /**
   * Clean up all observers
   */
  static cleanupObservers(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }

  /**
   * Add observer for cleanup tracking
   */
  static addObserver(observer: IntersectionObserver): void {
    this.observers.add(observer);
  }

  /**
   * Force garbage collection if available
   */
  static forceGarbageCollection(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }
}

// Network optimization utilities
export class NetworkOptimizer {
  private static requestCache = new Map<string, Promise<Response>>();
  private static pendingRequests = new Map<string, AbortController>();

  /**
   * Debounced fetch with caching
   */
  static async fetch(
    url: string,
    options: RequestInit = {},
    cacheTime: number = 60000
  ): Promise<Response> {
    const cacheKey = `${url}_${JSON.stringify(options)}`;
    
    // Return cached promise if exists and not expired
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey)!;
    }

    // Cancel previous request if exists
    if (this.pendingRequests.has(url)) {
      this.pendingRequests.get(url)!.abort();
    }

    // Create new abort controller
    const controller = new AbortController();
    this.pendingRequests.set(url, controller);

    // Create fetch promise
    const fetchPromise = fetch(url, {
      ...options,
      signal: controller.signal
    });

    // Cache the promise
    this.requestCache.set(cacheKey, fetchPromise);

    // Clean up after completion
    fetchPromise.finally(() => {
      this.pendingRequests.delete(url);
      
      // Remove from cache after cache time
      setTimeout(() => {
        this.requestCache.delete(cacheKey);
      }, cacheTime);
    });

    return fetchPromise;
  }

  /**
   * Batch multiple requests
   */
  static async batchRequests<T>(
    requests: Array<() => Promise<T>>,
    batchSize: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(req => req()));
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Prefetch resources
   */
  static prefetchResources(urls: string[]): void {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  }
}

// Database/Storage optimization utilities
export class StorageOptimizer {
  private static readonly STORAGE_QUOTA_THRESHOLD = 0.8; // 80%
  private static readonly CLEANUP_BATCH_SIZE = 100;

  /**
   * Check storage usage and cleanup if needed
   */
  static async manageStorage(): Promise<void> {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      return;
    }

    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      
      if (quota > 0 && usage / quota > this.STORAGE_QUOTA_THRESHOLD) {
        await this.cleanupOldData();
      }
    } catch (error) {
      console.warn('Storage management failed:', error);
    }
  }

  /**
   * Clean up old cached data
   */
  private static async cleanupOldData(): Promise<void> {
    try {
      // Clean up IndexedDB
      await this.cleanupIndexedDB();
      
      // Clean up Cache API
      await this.cleanupCacheAPI();
      
      // Clean up localStorage
      this.cleanupLocalStorage();
    } catch (error) {
      console.warn('Data cleanup failed:', error);
    }
  }

  /**
   * Clean up IndexedDB old entries
   */
  private static async cleanupIndexedDB(): Promise<void> {
    const dbName = 'DeliveryCache';
    const storeName = 'locationUpdates';
    
    return new Promise((resolve) => {
      const deleteReq = indexedDB.open(dbName);
      
      deleteReq.onsuccess = () => {
        const db = deleteReq.result;
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        // Delete entries older than 7 days
        const cutoffDate = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const range = IDBKeyRange.upperBound(cutoffDate);
        
        const deleteRequest = store.delete(range);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => resolve();
      };
      
      deleteReq.onerror = () => resolve();
    });
  }

  /**
   * Clean up Cache API entries
   */
  private static async cleanupCacheAPI(): Promise<void> {
    if (!('caches' in window)) return;

    try {
      const cacheNames = await caches.keys();
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        // Remove old cached responses (older than 24 hours)
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
        
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const dateHeader = response.headers.get('date');
            if (dateHeader) {
              const responseDate = new Date(dateHeader).getTime();
              if (responseDate < cutoffTime) {
                await cache.delete(request);
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('Cache cleanup failed:', error);
    }
  }

  /**
   * Clean up localStorage old entries
   */
  private static cleanupLocalStorage(): void {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        // Remove temporary tracking data older than 1 day
        if (key.startsWith('temp_') || key.startsWith('cache_')) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              const data = JSON.parse(item);
              if (data.timestamp && Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
                keysToRemove.push(key);
              }
            } catch {
              // Invalid JSON, remove it
              keysToRemove.push(key);
            }
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('localStorage cleanup failed:', error);
    }
  }
}

// Initialize performance optimizations
export function initializePerformanceOptimizations(): void {
  // Set up periodic storage management
  setInterval(() => {
    StorageOptimizer.manageStorage();
  }, 5 * 60 * 1000); // Every 5 minutes

  // Clean up memory on page visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      MemoryManager.cleanupObservers();
      MemoryManager.forceGarbageCollection();
    }
  });

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    MemoryManager.cleanupObservers();
  });
}