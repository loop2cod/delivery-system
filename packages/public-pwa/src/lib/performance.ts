/**
 * Performance tracking initialization for Public PWA
 */

import { createPWAMetrics, type PWAMetricsConfig } from '@/shared/performance/pwa-metrics';

const config: PWAMetricsConfig = {
  appName: 'public-pwa',
  version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  endpoint: process.env.NEXT_PUBLIC_API_BASE_URL + '/api/metrics',
  enableAutoTracking: true,
  enableOptimizations: true
};

// Initialize metrics for Public PWA
export const publicMetrics = createPWAMetrics(config);

// Public PWA specific tracking functions
export const trackEnquirySubmission = (success: boolean, formType: string) => {
  publicMetrics.trackFormSubmission(`enquiry_${formType}`, success);
  publicMetrics.trackDeliveryMetric('enquiry_submitted', 1, { 
    form_type: formType,
    success: success.toString()
  });
};

export const trackPackageTracking = (packageId: string, found: boolean) => {
  publicMetrics.trackFeatureUsage('package_tracking', true);
  publicMetrics.trackDeliveryMetric('package_lookup', 1, {
    found: found.toString()
  });
};

export const trackSolutionView = (section: string) => {
  publicMetrics.trackInteraction('solution_section', 'view');
  publicMetrics.trackFeatureUsage(`solution_${section}`, true);
};

export const trackContactInteraction = (method: string) => {
  publicMetrics.trackInteraction('contact', method);
  publicMetrics.trackDeliveryMetric('contact_interaction', 1, { method });
};

// Page-specific tracking
export const trackPageView = (page: string) => {
  publicMetrics.trackPageView(page, {
    user_type: 'visitor',
    pwa: 'public'
  });
};

export { publicMetrics as default };