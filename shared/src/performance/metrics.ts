/**
 * Performance Metrics Collection
 * Utilities for collecting and reporting performance metrics across all PWAs
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
}

class PerformanceTracker {
  private metrics: PerformanceMetric[] = [];
  private endpoint: string;
  private batchSize: number = 10;
  private flushInterval: number = 30000; // 30 seconds
  private timer: NodeJS.Timeout | null = null;

  constructor(endpoint: string = '/api/metrics') {
    this.endpoint = endpoint;
    this.startBatchReporting();
    this.initializeWebVitals();
  }

  /**
   * Record a custom metric
   */
  record(name: string, value: number, labels?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      labels
    };

    this.metrics.push(metric);

    if (this.metrics.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Record navigation timing metrics
   */
  recordNavigationTiming(): void {
    if (!window.performance || !window.performance.timing) {
      return;
    }

    const timing = window.performance.timing;
    const navigation = window.performance.navigation;

    // Core timing metrics
    this.record('page_load_time', timing.loadEventEnd - timing.navigationStart, {
      type: 'navigation',
      page: window.location.pathname
    });

    this.record('dom_content_loaded', timing.domContentLoadedEventEnd - timing.navigationStart, {
      type: 'navigation',
      page: window.location.pathname
    });

    this.record('time_to_first_byte', timing.responseStart - timing.navigationStart, {
      type: 'navigation',
      page: window.location.pathname
    });

    this.record('dns_lookup_time', timing.domainLookupEnd - timing.domainLookupStart, {
      type: 'network'
    });

    this.record('tcp_connect_time', timing.connectEnd - timing.connectStart, {
      type: 'network'
    });

    this.record('navigation_type', navigation.type, {
      type: 'navigation'
    });
  }

  /**
   * Record resource timing metrics
   */
  recordResourceTiming(): void {
    if (!window.performance || !window.performance.getEntriesByType) {
      return;
    }

    const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    resources.forEach(resource => {
      // Skip data URLs and browser extensions
      if (resource.name.startsWith('data:') || resource.name.startsWith('chrome-extension:')) {
        return;
      }

      this.record('resource_load_time', resource.responseEnd - resource.startTime, {
        type: 'resource',
        resource_type: resource.initiatorType,
        resource_name: this.getResourceName(resource.name)
      });

      if (resource.transferSize > 0) {
        this.record('resource_size', resource.transferSize, {
          type: 'resource',
          resource_type: resource.initiatorType,
          resource_name: this.getResourceName(resource.name)
        });
      }
    });
  }

  /**
   * Initialize Web Vitals collection
   */
  private initializeWebVitals(): void {
    // Use dynamic import for web-vitals if available
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(this.onWebVital.bind(this));
      getFID(this.onWebVital.bind(this));
      getFCP(this.onWebVital.bind(this));
      getLCP(this.onWebVital.bind(this));
      getTTFB(this.onWebVital.bind(this));
    }).catch(() => {
      // web-vitals not available, use fallback
      this.recordNavigationTiming();
    });
  }

  /**
   * Handle Web Vitals metrics
   */
  private onWebVital(metric: any): void {
    const webVitalMetric: WebVitalsMetric = {
      name: metric.name,
      value: metric.value,
      rating: this.getVitalRating(metric.name, metric.value),
      timestamp: Date.now(),
      url: window.location.href
    };

    this.record(`web_vital_${metric.name.toLowerCase()}`, metric.value, {
      type: 'web_vital',
      rating: webVitalMetric.rating,
      page: window.location.pathname
    });
  }

  /**
   * Get Web Vitals rating based on thresholds
   */
  private getVitalRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, [number, number]> = {
      'CLS': [0.1, 0.25],
      'FID': [100, 300],
      'FCP': [1800, 3000],
      'LCP': [2500, 4000],
      'TTFB': [800, 1800]
    };

    const [good, poor] = thresholds[name] || [0, 0];
    
    if (value <= good) return 'good';
    if (value <= poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Record GPS/Location performance metrics
   */
  recordLocationMetrics(accuracy: number, timestamp: number): void {
    this.record('gps_accuracy', accuracy, {
      type: 'location'
    });

    this.record('gps_update_latency', Date.now() - timestamp, {
      type: 'location'
    });
  }

  /**
   * Record PWA-specific metrics
   */
  recordPWAMetrics(): void {
    // Service Worker status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        this.record('service_worker_status', registration ? 1 : 0, {
          type: 'pwa'
        });
      });
    }

    // Cache usage
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        this.record('storage_usage', estimate.usage || 0, {
          type: 'pwa'
        });
        
        this.record('storage_quota', estimate.quota || 0, {
          type: 'pwa'
        });
      });
    }

    // Network status
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.record('network_downlink', connection.downlink, {
          type: 'network',
          effective_type: connection.effectiveType
        });

        this.record('network_rtt', connection.rtt, {
          type: 'network',
          effective_type: connection.effectiveType
        });
      }
    }
  }

  /**
   * Record custom business metrics
   */
  recordBusinessMetric(name: string, value: number, labels?: Record<string, string>): void {
    this.record(name, value, {
      ...labels,
      type: 'business'
    });
  }

  /**
   * Extract resource name from URL
   */
  private getResourceName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const segments = pathname.split('/');
      return segments[segments.length - 1] || 'root';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Start batch reporting timer
   */
  private startBatchReporting(): void {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Send metrics to backend
   */
  private async flush(): void {
    if (this.metrics.length === 0) {
      return;
    }

    const metricsToSend = [...this.metrics];
    this.metrics = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metrics: metricsToSend,
          user_agent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.warn('Failed to send metrics:', error);
      // Re-add failed metrics to queue
      this.metrics.unshift(...metricsToSend);
    }
  }

  /**
   * Stop batch reporting
   */
  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }
}

// Singleton instance
let performanceTracker: PerformanceTracker | null = null;

export function initializePerformanceTracking(endpoint?: string): PerformanceTracker {
  if (!performanceTracker) {
    performanceTracker = new PerformanceTracker(endpoint);
    
    // Auto-record initial metrics
    if (document.readyState === 'complete') {
      performanceTracker.recordNavigationTiming();
      performanceTracker.recordResourceTiming();
      performanceTracker.recordPWAMetrics();
    } else {
      window.addEventListener('load', () => {
        performanceTracker?.recordNavigationTiming();
        performanceTracker?.recordResourceTiming();
        performanceTracker?.recordPWAMetrics();
      });
    }
  }
  
  return performanceTracker;
}

export function getPerformanceTracker(): PerformanceTracker | null {
  return performanceTracker;
}

export { PerformanceTracker, type PerformanceMetric, type WebVitalsMetric };