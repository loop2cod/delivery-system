/**
 * Performance tracking initialization for Admin PWA
 */

import { createPWAMetrics, type PWAMetricsConfig } from '@/shared/performance/pwa-metrics';

const config: PWAMetricsConfig = {
  appName: 'admin-pwa',
  version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  endpoint: process.env.NEXT_PUBLIC_API_BASE_URL + '/api/metrics',
  enableAutoTracking: true,
  enableOptimizations: true
};

// Initialize metrics for Admin PWA
export const adminMetrics = createPWAMetrics(config);

// Admin PWA specific tracking functions
export const trackDashboardView = (dashboardType: string) => {
  adminMetrics.trackPageView(`dashboard_${dashboardType}`, {
    user_type: 'admin',
    pwa: 'admin'
  });
  adminMetrics.trackFeatureUsage(`admin_dashboard_${dashboardType}`, true);
};

export const trackUserManagement = (action: string, userType: string) => {
  adminMetrics.trackInteraction('user_management', action);
  adminMetrics.trackDeliveryMetric('user_management_action', 1, {
    action,
    user_type: userType
  });
};

export const trackSystemSettings = (setting: string, action: string) => {
  adminMetrics.trackInteraction('system_settings', action);
  adminMetrics.trackDeliveryMetric('settings_change', 1, {
    setting,
    action
  });
};

export const trackReportGeneration = (reportType: string, format: string) => {
  adminMetrics.trackFeatureUsage('report_generation', true);
  adminMetrics.trackDeliveryMetric('report_generated', 1, {
    type: reportType,
    format
  });
};

export const trackDriverAssignment = (successful: boolean) => {
  adminMetrics.trackDeliveryMetric('driver_assignment', successful ? 1 : 0, {
    status: successful ? 'success' : 'failed'
  });
};

export const trackOrderManagement = (action: string, orderId?: string) => {
  adminMetrics.trackInteraction('order_management', action);
  adminMetrics.trackDeliveryMetric('order_action', 1, {
    action,
    has_order_id: orderId ? 'true' : 'false'
  });
};

export const trackEnquiryManagement = (action: string, enquiryType: string) => {
  adminMetrics.trackInteraction('enquiry_management', action);
  adminMetrics.trackDeliveryMetric('enquiry_management', 1, {
    action,
    type: enquiryType
  });
};

// Page-specific tracking
export const trackPageView = (page: string) => {
  adminMetrics.trackPageView(page, {
    user_type: 'admin',
    pwa: 'admin'
  });
};

export { adminMetrics as default };