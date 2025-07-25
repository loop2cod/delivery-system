/**
 * Metrics endpoint for Prometheus scraping
 * Provides custom business metrics and performance data
 */

import { FastifyPluginCallback } from 'fastify';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Create custom metrics
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status']
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const deliveryOrdersTotal = new Counter({
  name: 'delivery_orders_total',
  help: 'Total number of delivery orders'
});

const deliveryOrdersCompleted = new Counter({
  name: 'delivery_orders_completed_total',
  help: 'Total number of completed delivery orders'
});

const deliveryOrdersPending = new Gauge({
  name: 'delivery_orders_pending',
  help: 'Number of pending delivery orders'
});

const deliverySuccessRate = new Gauge({
  name: 'delivery_success_rate',
  help: 'Delivery success rate as a percentage'
});

const gpsLocationUpdates = new Counter({
  name: 'gps_location_updates_total',
  help: 'Total number of GPS location updates received'
});

const gpsTrackingAccuracy = new Gauge({
  name: 'gps_tracking_accuracy_meters',
  help: 'Average GPS tracking accuracy in meters'
});

const webVitalMetrics = {
  cls: new Histogram({
    name: 'web_vital_cls',
    help: 'Cumulative Layout Shift scores',
    labelNames: ['page', 'rating'],
    buckets: [0.1, 0.25, 0.5, 1]
  }),
  fid: new Histogram({
    name: 'web_vital_fid',
    help: 'First Input Delay in milliseconds',
    labelNames: ['page', 'rating'],
    buckets: [100, 300, 500, 1000]
  }),
  fcp: new Histogram({
    name: 'web_vital_fcp',
    help: 'First Contentful Paint in milliseconds',
    labelNames: ['page', 'rating'],
    buckets: [1800, 3000, 5000, 10000]
  }),
  lcp: new Histogram({
    name: 'web_vital_lcp',
    help: 'Largest Contentful Paint in milliseconds',
    labelNames: ['page', 'rating'],
    buckets: [2500, 4000, 6000, 10000]
  }),
  ttfb: new Histogram({
    name: 'web_vital_ttfb',
    help: 'Time to First Byte in milliseconds',
    labelNames: ['page', 'rating'],
    buckets: [800, 1800, 3000, 5000]
  })
};

const lighthousePerformanceScore = new Gauge({
  name: 'lighthouse_performance_score',
  help: 'Lighthouse performance score',
  labelNames: ['url']
});

// Collect default Node.js metrics
collectDefaultMetrics({ register });

// Middleware to track HTTP requests
export const trackHttpRequest = (method: string, path: string, status: number, duration: number) => {
  httpRequestsTotal.inc({ method, path, status: status.toString() });
  httpRequestDuration.observe({ method, path, status: status.toString() }, duration / 1000);
};

// Business metrics tracking functions
export const trackDeliveryOrder = () => {
  deliveryOrdersTotal.inc();
};

export const trackCompletedDelivery = () => {
  deliveryOrdersCompleted.inc();
};

export const updatePendingOrders = (count: number) => {
  deliveryOrdersPending.set(count);
};

export const updateDeliverySuccessRate = (rate: number) => {
  deliverySuccessRate.set(rate);
};

export const trackGPSUpdate = (accuracy: number) => {
  gpsLocationUpdates.inc();
  gpsTrackingAccuracy.set(accuracy);
};

export const trackWebVital = (name: string, value: number, page: string, rating: string) => {
  const metric = webVitalMetrics[name as keyof typeof webVitalMetrics];
  if (metric) {
    metric.observe({ page, rating }, value);
  }
};

export const updateLighthouseScore = (url: string, score: number) => {
  lighthousePerformanceScore.set({ url }, score);
};

const metricsRoutes: FastifyPluginCallback = async (fastify) => {
  // Prometheus metrics endpoint
  fastify.get('/metrics', async (request, reply) => {
    reply.type('text/plain');
    return register.metrics();
  });

  // Custom metrics endpoint
  fastify.get('/api/metrics/custom', async (request, reply) => {
    reply.type('text/plain');
    return register.getSingleMetricAsString('delivery_orders_total') +
           register.getSingleMetricAsString('delivery_orders_completed_total') +
           register.getSingleMetricAsString('delivery_orders_pending') +
           register.getSingleMetricAsString('delivery_success_rate') +
           register.getSingleMetricAsString('gps_location_updates_total') +
           register.getSingleMetricAsString('gps_tracking_accuracy_meters');
  });

  // Receive performance metrics from PWAs
  fastify.post('/api/metrics', async (request, reply) => {
    try {
      const { metrics, user_agent, url } = request.body as {
        metrics: Array<{
          name: string;
          value: number;
          labels?: Record<string, string>;
        }>;
        user_agent: string;
        url: string;
      };

      // Process each metric
      metrics.forEach(metric => {
        const { name, value, labels = {} } = metric;

        // Handle Web Vitals metrics
        if (name.startsWith('web_vital_')) {
          const vitalName = name.replace('web_vital_', '');
          trackWebVital(vitalName, value, labels.page || 'unknown', labels.rating || 'unknown');
        }

        // Handle GPS metrics
        if (name === 'gps_accuracy') {
          trackGPSUpdate(value);
        }

        // Handle business metrics
        if (name === 'delivery_order_created') {
          trackDeliveryOrder();
        }

        if (name === 'delivery_completed') {
          trackCompletedDelivery();
        }

        // Handle Lighthouse scores
        if (name === 'lighthouse_performance_score') {
          updateLighthouseScore(url, value);
        }
      });

      reply.code(200).send({ success: true });
    } catch (error) {
      request.log.error('Error processing metrics:', error);
      reply.code(500).send({ error: 'Failed to process metrics' });
    }
  });

  // Health check with metrics
  fastify.get('/api/health', async (request, reply) => {
    const startTime = Date.now();
    
    try {
      // Basic health checks can be added here
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      };

      const duration = Date.now() - startTime;
      trackHttpRequest('GET', '/api/health', 200, duration);

      reply.code(200).send(health);
    } catch (error) {
      const duration = Date.now() - startTime;
      trackHttpRequest('GET', '/api/health', 500, duration);
      
      reply.code(500).send({
        status: 'unhealthy',
        error: 'Health check failed'
      });
    }
  });
};

export default metricsRoutes;