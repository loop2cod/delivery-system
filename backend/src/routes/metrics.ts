import { FastifyInstance } from 'fastify';
import { requireRoles } from '../middleware/auth';
import { UserRole } from '../models/User';

export async function metricsRoutes(fastify: FastifyInstance) {
  // Metrics endpoint for Prometheus scraping
  fastify.get('/', {
    schema: {
      description: 'Prometheus metrics endpoint',
      tags: ['Metrics'],
      response: {
        200: {
          type: 'string',
          description: 'Prometheus metrics in text format'
        }
      }
    }
  }, async (request, reply) => {
    reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    
    // Basic application metrics
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const timestamp = Date.now();
    
    const metrics = `
# HELP nodejs_process_uptime_seconds Process uptime in seconds
# TYPE nodejs_process_uptime_seconds gauge
nodejs_process_uptime_seconds ${uptime}

# HELP nodejs_memory_usage_bytes Memory usage in bytes
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss"} ${memoryUsage.rss}
nodejs_memory_usage_bytes{type="heapUsed"} ${memoryUsage.heapUsed}
nodejs_memory_usage_bytes{type="heapTotal"} ${memoryUsage.heapTotal}
nodejs_memory_usage_bytes{type="external"} ${memoryUsage.external}

# HELP delivery_system_info System information
# TYPE delivery_system_info gauge
delivery_system_info{version="1.0.0",environment="${process.env.NODE_ENV || 'development'}"} 1
    `.trim();
    
    return metrics;
  });

  // Admin-only detailed metrics
  fastify.get('/admin', {
    schema: {
      description: 'Detailed admin metrics',
      tags: ['Metrics', 'Admin'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            system: {
              type: 'object',
              properties: {
                uptime: { type: 'number' },
                memory: { type: 'object' },
                cpu: { type: 'object' }
              }
            },
            database: {
              type: 'object',
              properties: {
                connected: { type: 'boolean' },
                queries: { type: 'number' }
              }
            },
            redis: {
              type: 'object',
              properties: {
                connected: { type: 'boolean' },
                memory: { type: 'string' }
              }
            }
          }
        }
      }
    },
    preHandler: [requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)]
  }, async (request, reply) => {
    const metrics = {
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      },
      database: {
        connected: true, // TODO: Implement actual DB health check
        queries: 0 // TODO: Implement query counter
      },
      redis: {
        connected: true, // TODO: Implement actual Redis health check
        memory: '0MB' // TODO: Implement Redis memory usage
      },
      timestamp: new Date().toISOString()
    };
    
    return metrics;
  });
}

export default metricsRoutes;