/**
 * PWA-specific performance metrics integration
 * Provides easy integration for PWA applications to report metrics
 */

import { PerformanceTracker, initializePerformanceTracking } from './metrics';
import { initializePerformanceOptimizations } from './optimization';

interface PWAMetricsConfig {
  endpoint?: string;
  appName: string;
  version: string;
  enableAutoTracking?: boolean;
  enableOptimizations?: boolean;
}

export class PWAMetrics {
  private tracker: PerformanceTracker;
  private config: PWAMetricsConfig;
  private visibilityObserver?: IntersectionObserver;

  constructor(config: PWAMetricsConfig) {
    this.config = {
      enableAutoTracking: true,
      enableOptimizations: true,
      ...config
    };

    this.tracker = initializePerformanceTracking(config.endpoint);
    
    if (this.config.enableOptimizations) {
      initializePerformanceOptimizations();
    }

    if (this.config.enableAutoTracking) {
      this.setupAutoTracking();
    }
  }

  /**
   * Track page view with custom labels
   */
  trackPageView(page: string, additionalLabels?: Record<string, string>): void {
    this.tracker.record('page_view', 1, {
      page,
      app: this.config.appName,
      version: this.config.version,
      ...additionalLabels
    });
  }

  /**
   * Track user interaction
   */
  trackInteraction(element: string, action: string, value: number = 1): void {
    this.tracker.record('user_interaction', value, {
      element,
      action,
      app: this.config.appName,
      page: window.location.pathname
    });
  }

  /**
   * Track form submission
   */
  trackFormSubmission(formName: string, success: boolean, validationErrors?: string[]): void {
    this.tracker.record('form_submission', success ? 1 : 0, {
      form: formName,
      status: success ? 'success' : 'error',
      app: this.config.appName,
      page: window.location.pathname
    });

    if (validationErrors && validationErrors.length > 0) {
      this.tracker.record('form_validation_errors', validationErrors.length, {
        form: formName,
        app: this.config.appName
      });
    }
  }

  /**
   * Track API call performance
   */
  trackAPICall(endpoint: string, method: string, status: number, duration: number): void {
    this.tracker.record('api_call_duration', duration, {
      endpoint,
      method,
      status: status.toString(),
      app: this.config.appName
    });

    this.tracker.record('api_call_count', 1, {
      endpoint,
      method,
      status: status >= 200 && status < 300 ? 'success' : 'error',
      app: this.config.appName
    });
  }

  /**
   * Track offline/online state changes
   */
  trackConnectivityChange(isOnline: boolean): void {
    this.tracker.record('connectivity_change', isOnline ? 1 : 0, {
      state: isOnline ? 'online' : 'offline',
      app: this.config.appName
    });
  }

  /**
   * Track service worker events
   */
  trackServiceWorkerEvent(event: string, success: boolean = true): void {
    this.tracker.record('service_worker_event', success ? 1 : 0, {
      event,
      status: success ? 'success' : 'error',
      app: this.config.appName
    });
  }

  /**
   * Track push notification interactions
   */
  trackPushNotification(action: string, notificationType?: string): void {
    this.tracker.record('push_notification', 1, {
      action,
      type: notificationType || 'unknown',
      app: this.config.appName
    });
  }

  /**
   * Track GPS/location metrics
   */
  trackLocationUpdate(accuracy: number, timestamp: number): void {
    this.tracker.recordLocationMetrics(accuracy, timestamp);
    
    this.tracker.record('location_update', 1, {
      app: this.config.appName,
      accuracy_level: this.getAccuracyLevel(accuracy)
    });
  }

  /**
   * Track delivery-specific business metrics
   */
  trackDeliveryMetric(metric: string, value: number, labels?: Record<string, string>): void {
    this.tracker.recordBusinessMetric(`delivery_${metric}`, value, {
      app: this.config.appName,
      ...labels
    });
  }

  /**
   * Track error occurrences
   */
  trackError(error: Error, context?: string): void {
    this.tracker.record('javascript_error', 1, {
      error_name: error.name,
      error_message: error.message.substring(0, 100), // Limit message length
      context: context || 'unknown',
      app: this.config.appName,
      page: window.location.pathname
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: string, used: boolean = true): void {
    this.tracker.record('feature_usage', used ? 1 : 0, {
      feature,
      app: this.config.appName,
      page: window.location.pathname
    });
  }

  /**
   * Track resource loading times
   */
  trackResourceLoad(resourceType: string, url: string, loadTime: number, size?: number): void {
    this.tracker.record('resource_load_time', loadTime, {
      resource_type: resourceType,
      resource_url: this.sanitizeUrl(url),
      app: this.config.appName
    });

    if (size) {
      this.tracker.record('resource_size', size, {
        resource_type: resourceType,
        app: this.config.appName
      });
    }
  }

  /**
   * Setup automatic tracking for common events
   */
  private setupAutoTracking(): void {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.tracker.record('page_visibility', document.hidden ? 0 : 1, {
        app: this.config.appName,
        page: window.location.pathname
      });
    });

    // Track online/offline changes
    window.addEventListener('online', () => this.trackConnectivityChange(true));
    window.addEventListener('offline', () => this.trackConnectivityChange(false));

    // Track unhandled errors
    window.addEventListener('error', (event) => {
      this.trackError(event.error, 'unhandled_error');
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(new Error(event.reason), 'unhandled_promise_rejection');
    });

    // Track service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type) {
          this.trackServiceWorkerEvent(event.data.type, event.data.success !== false);
        }
      });
    }

    // Set up intersection observer for viewport tracking
    this.setupViewportTracking();
  }

  /**
   * Setup viewport tracking for elements
   */
  private setupViewportTracking(): void {
    this.visibilityObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const elementId = element.id || element.className || 'unknown';
            
            this.tracker.record('element_viewed', 1, {
              element: elementId,
              app: this.config.appName,
              page: window.location.pathname
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    // Auto-observe elements with data-track-view attribute
    document.querySelectorAll('[data-track-view]').forEach(element => {
      this.visibilityObserver?.observe(element);
    });
  }

  /**
   * Get accuracy level based on GPS accuracy
   */
  private getAccuracyLevel(accuracy: number): string {
    if (accuracy <= 5) return 'high';
    if (accuracy <= 10) return 'medium';
    if (accuracy <= 50) return 'low';
    return 'very_low';
  }

  /**
   * Sanitize URL for metrics (remove sensitive params)
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove potentially sensitive query parameters
      urlObj.searchParams.delete('token');
      urlObj.searchParams.delete('key');
      urlObj.searchParams.delete('auth');
      return urlObj.pathname;
    } catch {
      return 'invalid_url';
    }
  }

  /**
   * Add element to viewport tracking
   */
  addToViewportTracking(element: Element): void {
    this.visibilityObserver?.observe(element);
  }

  /**
   * Remove element from viewport tracking
   */
  removeFromViewportTracking(element: Element): void {
    this.visibilityObserver?.unobserve(element);
  }

  /**
   * Cleanup and destroy metrics tracking
   */
  destroy(): void {
    this.tracker.destroy();
    this.visibilityObserver?.disconnect();
  }
}

// Helper function to create PWA metrics instance
export function createPWAMetrics(config: PWAMetricsConfig): PWAMetrics {
  return new PWAMetrics(config);
}

// React hook for PWA metrics (if using React)
export function usePWAMetrics(config: PWAMetricsConfig) {
  const metricsRef = React.useRef<PWAMetrics | null>(null);

  React.useEffect(() => {
    metricsRef.current = new PWAMetrics(config);
    
    return () => {
      metricsRef.current?.destroy();
    };
  }, []);

  return metricsRef.current;
}

// Export types
export type { PWAMetricsConfig };