/**
 * Performance tracking initialization for Driver PWA
 */

import { createPWAMetrics, type PWAMetricsConfig } from '@/shared/performance/pwa-metrics';

const config: PWAMetricsConfig = {
  appName: 'driver-pwa',
  version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  endpoint: process.env.NEXT_PUBLIC_API_BASE_URL + '/api/metrics',
  enableAutoTracking: true,
  enableOptimizations: true
};

// Initialize metrics for Driver PWA
export const driverMetrics = createPWAMetrics(config);

// Driver PWA specific tracking functions
export const trackDeliveryAction = (action: string, deliveryId: string) => {
  driverMetrics.trackInteraction('delivery', action);
  driverMetrics.trackDeliveryMetric(`delivery_${action}`, 1, {
    delivery_id: deliveryId
  });
};

export const trackGPSTracking = (accuracy: number, speed?: number) => {
  driverMetrics.trackLocationUpdate(accuracy, Date.now());
  
  if (speed !== undefined) {
    driverMetrics.trackDeliveryMetric('driver_speed', speed, {
      accuracy_level: accuracy <= 5 ? 'high' : accuracy <= 10 ? 'medium' : 'low'
    });
  }
};

export const trackNavigationUsage = (action: string, destination?: string) => {
  driverMetrics.trackFeatureUsage('navigation', true);
  driverMetrics.trackDeliveryMetric('navigation_usage', 1, {
    action,
    has_destination: destination ? 'true' : 'false'
  });
};

export const trackPackageScanning = (scanType: string, successful: boolean) => {
  driverMetrics.trackFeatureUsage('qr_scanning', true);
  driverMetrics.trackDeliveryMetric('package_scan', successful ? 1 : 0, {
    type: scanType,
    status: successful ? 'success' : 'failed'
  });
};

export const trackOfflineMode = (enabled: boolean, duration?: number) => {
  driverMetrics.trackFeatureUsage('offline_mode', enabled);
  driverMetrics.trackDeliveryMetric('offline_usage', enabled ? 1 : 0, {
    duration: duration ? duration.toString() : 'unknown'
  });
};

export const trackRouteOptimization = (routeCount: number, optimizationTime: number) => {
  driverMetrics.trackFeatureUsage('route_optimization', true);
  driverMetrics.trackDeliveryMetric('route_optimization', 1, {
    route_count: routeCount.toString(),
    optimization_time: optimizationTime.toString()
  });
};

export const trackDeliveryCompletion = (deliveryId: string, duration: number, success: boolean) => {
  const status = success ? 'completed' : 'failed';
  driverMetrics.trackDeliveryMetric('delivery_completion', success ? 1 : 0, {
    delivery_id: deliveryId,
    duration: duration.toString(),
    status
  });
};

export const trackPhotoCapture = (photoType: string, successful: boolean) => {
  driverMetrics.trackFeatureUsage('photo_capture', true);
  driverMetrics.trackDeliveryMetric('photo_captured', successful ? 1 : 0, {
    type: photoType,
    status: successful ? 'success' : 'failed'
  });
};

export const trackDriverAvailability = (available: boolean) => {
  driverMetrics.trackDeliveryMetric('driver_availability', available ? 1 : 0, {
    status: available ? 'available' : 'unavailable'
  });
};

export const trackBatteryOptimization = (batteryLevel: number, optimizationsActive: boolean) => {
  driverMetrics.trackDeliveryMetric('battery_level', batteryLevel);
  driverMetrics.trackDeliveryMetric('battery_optimization', optimizationsActive ? 1 : 0, {
    battery_level: batteryLevel.toString(),
    optimizations: optimizationsActive ? 'active' : 'inactive'
  });
};

// Page-specific tracking
export const trackPageView = (page: string) => {
  driverMetrics.trackPageView(page, {
    user_type: 'driver',
    pwa: 'driver'
  });
};

export { driverMetrics as default };