import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { config } from './config/environment';
import { logger, pwaLogger } from './utils/logger';
import { db } from './config/database';
import { redis } from './config/redis';

// Route imports
import { authRoutes } from './routes/auth';
import { publicRoutes } from './routes/public';
import { adminRoutes } from './routes/admin';
import { businessRoutes } from './routes/business';
import { driverRoutes } from './routes/driver';
import { webhookRoutes } from './routes/webhooks';
import { wsHandler } from './routes/websockets';
// import { qrRoutes } from './routes/qr'; // Temporarily disabled due to shared module issues
import { gpsTrackingRoutes } from './routes/gps-tracking';
import metricsRoutes, { trackHttpRequest } from './routes/metrics';

// Middleware imports
import { authenticateToken } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

const server = fastify({
  logger: {
    level: config.LOG_LEVEL
  },
  requestTimeout: 30000,
  bodyLimit: 10485760, // 10MB for file uploads
});

async function buildServer() {
  try {
    // Register CORS
    await server.register(cors, {
      origin: (origin, callback) => {
        const allowedOrigins = [
          'http://localhost:3001', // Public PWA
          'http://localhost:3002', // Admin PWA  
          'http://localhost:3003', // Business PWA
          'http://localhost:3004', // Driver PWA
          'https://deliveryuae.com',
          'https://admin.deliveryuae.com',
          'https://business.deliveryuae.com', 
          'https://driver.deliveryuae.com'
        ];
        
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
    });

    // Security headers
    await server.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "ws:"]
        }
      }
    });

    // Rate limiting
    await server.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      errorResponseBuilder: () => ({
        code: 429,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded'
      })
    });

    // JWT authentication
    await server.register(jwt, {
      secret: config.JWT_SECRET,
      cookie: {
        cookieName: 'token',
        signed: false
      }
    });

    // Cookie support
    await server.register(cookie, {
      secret: config.COOKIE_SECRET,
      parseOptions: {}
    });

    // WebSocket support for real-time features
    await server.register(websocket);

    // File upload support
    await server.register(multipart, {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 10
      }
    });

    // API Documentation
    await server.register(swagger, {
      swagger: {
        info: {
          title: 'UAE Delivery Management API',
          description: 'Unified API for all PWA applications',
          version: '1.0.0'
        },
        host: `${config.HOST}:${config.PORT}`,
        schemes: ['http', 'https'],
        consumes: ['application/json', 'multipart/form-data'],
        produces: ['application/json'],
        securityDefinitions: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    });

    await server.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false
      }
    });

    // Global middleware
    server.addHook('preHandler', requestLogger);
    server.addHook('preHandler', authenticateToken);
    
    // Response logging hook
    server.addHook('onResponse', async (request, reply) => {
      const startTime = (request as any).startTime;
      if (startTime) {
        const duration = Date.now() - startTime;
        const { method, url } = request;
        const statusCode = reply.statusCode;
        
        // Log response
        const level = statusCode >= 400 ? 'warn' : 'info';
        logger.log(level, `${method} ${url} ${statusCode}`, {
          requestId: request.id,
          duration: `${duration}ms`,
          statusCode,
          contentLength: reply.getHeader('content-length'),
          userId: (request as any).user?.id
        });

        // Track performance metrics
        if (typeof pwaLogger?.performance === 'function') {
          pwaLogger.performance(url, method, duration, statusCode);
        }

        // Add performance header
        reply.header('X-Response-Time', `${duration}ms`);
      }
    });
    
    server.setErrorHandler(errorHandler);

    // Health check endpoint
    server.get('/health', {
      schema: {
        tags: ['Health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              uptime: { type: 'number' },
              database: { type: 'string' },
              redis: { type: 'string' }
            }
          }
        }
      }
    }, async (request, reply) => {
      const healthCheck = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
        redis: 'connected'
      };

      try {
        // Check database connection
        await db.query('SELECT 1');
      } catch (error) {
        healthCheck.database = 'disconnected';
        healthCheck.status = 'unhealthy';
      }

      try {
        // Check Redis connection
        if (redis.isAvailable()) {
          await redis.ping();
        } else {
          healthCheck.redis = 'unavailable';
          // Don't mark as unhealthy in development when Redis is optional
          if (process.env.NODE_ENV !== 'development') {
            healthCheck.status = 'unhealthy';
          }
        }
      } catch (error) {
        healthCheck.redis = 'disconnected';
        // Don't mark as unhealthy in development when Redis is optional
        if (process.env.NODE_ENV !== 'development') {
          healthCheck.status = 'unhealthy';
        }
      }

      const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
      return reply.code(statusCode).send(healthCheck);
    });

    // API Routes
    await server.register(authRoutes, { prefix: '/api/auth' });
    await server.register(publicRoutes, { prefix: '/api/public' });
    await server.register(adminRoutes, { prefix: '/api/admin' });
    await server.register(businessRoutes, { prefix: '/api/business' });
    await server.register(driverRoutes, { prefix: '/api/driver' });
    await server.register(webhookRoutes, { prefix: '/api/webhooks' });
    // await server.register(qrRoutes, { prefix: '/api' }); // Temporarily disabled
    await server.register(gpsTrackingRoutes, { prefix: '/api' });
    await server.register(metricsRoutes);

    // WebSocket handler
    server.register(wsHandler, { prefix: '/ws' });

    // 404 handler
    server.setNotFoundHandler((request, reply) => {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Route ${request.method}:${request.url} not found`,
        statusCode: 404
      });
    });

    return server;
  } catch (error) {
    logger.error('Error building server:', error);
    throw error;
  }
}

async function startServer() {
  try {
    // Test database connection
    await db.query('SELECT NOW()');
    logger.info('Database connected successfully');

    // Test Redis connection (optional in development)
    try {
      if (redis.isAvailable()) {
        await redis.ping();
        logger.info('Redis connected successfully');
      } else {
        logger.info('Redis not available - running without caching');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.info('Redis not available in development - running without caching');
      } else {
        throw error;
      }
    }

    const server = await buildServer();
    
    await server.listen({
      port: config.PORT,
      host: config.HOST
    });

    logger.info(`🚀 UAE Delivery Management API Server started`);
    logger.info(`📋 API Documentation: http://${config.HOST}:${config.PORT}/docs`);
    logger.info(`🏥 Health Check: http://${config.HOST}:${config.PORT}/health`);
    logger.info(`🔌 WebSocket: ws://${config.HOST}:${config.PORT}/ws`);

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully`);
        try {
          await server.close();
          await db.end();
          await redis.quit();
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

export { buildServer, startServer };