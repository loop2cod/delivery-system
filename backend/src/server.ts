/**
 * UAE Delivery Management System - Backend Server
 * Main server entry point with Fastify framework
 */

import Fastify, { FastifyInstance } from 'fastify';
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
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authenticateToken } from './middleware/auth';

// Import models to register them with mongoose
import './models';

// Import routes
import { authRoutes } from './routes/auth';
import { publicRoutes } from './routes/public';
import { adminRoutes } from './routes/admin';
import { businessRoutes } from './routes/business';
import { driverRoutes } from './routes/driver';
import { qrRoutes } from './routes/qr';
import { gpsTrackingRoutes } from './routes/gps-tracking';
import { webhookRoutes } from './routes/webhooks';
import { wsHandler as websocketRoutes } from './routes/websockets';
import { metricsRoutes } from './routes/metrics';

class DeliveryServer {
  private server: FastifyInstance;

  constructor() {
    this.server = Fastify({
      logger: {
        level: config.LOG_LEVEL,
        transport: config.NODE_ENV === 'development' ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        } : undefined,
      },
      trustProxy: config.TRUST_PROXY,
      bodyLimit: 10 * 1024 * 1024, // 10MB
    });

    this.setupPlugins();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private async setupPlugins(): Promise<void> {
    // Security plugins
    await this.server.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'ws:', 'wss:'],
        },
      },
    });

    // CORS configuration
    await this.server.register(cors, {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control'],
    });

    // Rate limiting
    await this.server.register(rateLimit, {
      max: config.RATE_LIMIT_MAX_REQUESTS,
      timeWindow: config.RATE_LIMIT_WINDOW,
      errorResponseBuilder: (request, context) => ({
        code: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds`,
        expiresIn: Math.round(context.ttl / 1000),
      }),
    });

    // JWT authentication
    await this.server.register(jwt, {
      secret: config.JWT_SECRET,
      cookie: {
        cookieName: 'token',
        signed: false,
      },
    });

    // Cookie support
    await this.server.register(cookie, {
      secret: config.COOKIE_SECRET,
      parseOptions: {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
      },
    });

    // WebSocket support
    await this.server.register(websocket);

    // File upload support
    await this.server.register(multipart, {
      limits: {
        fieldNameSize: 100,
        fieldSize: 100,
        fields: 10,
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 5,
        headerPairs: 2000,
      },
    });

    // API documentation
    if (config.ENABLE_SWAGGER) {
      await this.server.register(swagger, {
        swagger: {
          info: {
            title: 'UAE Delivery Management API',
            description: 'Comprehensive API for UAE Delivery Management System',
            version: '1.0.0',
            contact: {
              name: 'UAE Delivery Team',
              email: 'api@deliveryuae.com',
            },
          },
          host: `${config.API_HOST}:${config.API_PORT}`,
          schemes: ['http', 'https'],
          consumes: ['application/json', 'multipart/form-data'],
          produces: ['application/json'],
          securityDefinitions: {
            Bearer: {
              type: 'apiKey',
              name: 'Authorization',
              in: 'header',
              description: 'Enter: Bearer {token}',
            },
          },
          security: [{ Bearer: [] }],
        },
      });

      await this.server.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
          docExpansion: 'list',
          deepLinking: false,
        },
        staticCSP: true,
        transformStaticCSP: (header) => header,
      });
    }

    // Request logging middleware
    if (config.ENABLE_REQUEST_LOGGING) {
      this.server.addHook('onRequest', requestLogger);
    }

    // Authentication middleware
    this.server.decorate('authenticate', authenticateToken);
    this.server.addHook('preHandler', authenticateToken);
  }

  private setupRoutes(): void {
    // Health check
    this.server.get('/health', {
      schema: {
        description: 'Health check endpoint',
        tags: ['Health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              uptime: { type: 'number' },
              version: { type: 'string' },
            },
          },
        },
      },
    }, async (request, reply) => {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
      };
    });

    // API routes
    this.server.register(authRoutes, { prefix: '/api/auth' });
    this.server.register(publicRoutes, { prefix: '/api/public' });
    this.server.register(adminRoutes, { prefix: '/api/admin' });
    this.server.register(businessRoutes, { prefix: '/api/business' });
    this.server.register(driverRoutes, { prefix: '/api/driver' });
    this.server.register(qrRoutes, { prefix: '/api/qr' });
    this.server.register(gpsTrackingRoutes, { prefix: '/api/gps' });
    this.server.register(webhookRoutes, { prefix: '/api/webhooks' });
    this.server.register(websocketRoutes, { prefix: '/ws' });

    // Metrics endpoint
    if (config.ENABLE_METRICS) {
      this.server.register(metricsRoutes, { prefix: '/metrics' });
    }

    // 404 handler
    this.server.setNotFoundHandler((request, reply) => {
      reply.code(404).send({
        error: 'Not Found',
        message: `Route ${request.method}:${request.url} not found`,
        statusCode: 404,
      });
    });
  }

  private setupErrorHandling(): void {
    this.server.setErrorHandler(errorHandler);

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      
      try {
        await this.server.close();
        logger.info('Server closed successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', {
        promise: promise,
        reason: reason,
        stack: reason instanceof Error ? reason.stack : 'No stack trace available'
      });
      // Don't exit immediately in development to help with debugging
      if (config.NODE_ENV === 'production') {
        process.exit(1);
      }
    });
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await connectDatabase();
      logger.info('Database connected successfully');

      // Connect to Redis
      await connectRedis();
      logger.info('Redis connected successfully');

      // Start server
      await this.server.listen({
        port: config.API_PORT,
        host: config.API_HOST,
      });

      logger.info(`Server started on ${config.API_HOST}:${config.API_PORT}`);
      
      if (config.ENABLE_SWAGGER) {
        logger.info(`API Documentation available at http://${config.API_HOST}:${config.API_PORT}/docs`);
      }

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public getServer(): FastifyInstance {
    return this.server;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new DeliveryServer();
  server.start();
}

export default DeliveryServer;