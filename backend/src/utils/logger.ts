import winston from 'winston';
import { config } from '../config/environment';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  ),
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
];

// Create logger instance
export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create a stream object for morgan middleware
export const loggerStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// PWA-specific logging utilities
export const pwaLogger = {
  /**
   * Log PWA installation events
   */
  pwaInstall: (pwaType: string, userAgent: string) => {
    logger.info('PWA Installation', {
      type: 'PWA_INSTALL',
      pwaType,
      userAgent,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log offline sync events
   */
  offlineSync: (userId: string, actions: number, success: boolean) => {
    logger.info('Offline Sync', {
      type: 'OFFLINE_SYNC',
      userId,
      actions,
      success,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log push notification events
   */
  pushNotification: (userId: string, type: string, sent: boolean) => {
    logger.info('Push Notification', {
      type: 'PUSH_NOTIFICATION',
      userId,
      notificationType: type,
      sent,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log API caching events
   */
  apiCache: (endpoint: string, hit: boolean, ttl?: number) => {
    logger.debug('API Cache', {
      type: 'API_CACHE',
      endpoint,
      hit,
      ttl,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log performance metrics
   */
  performance: (endpoint: string, method: string, duration: number, status: number) => {
    const level = duration > 1000 ? 'warn' : 'info';
    logger.log(level, 'API Performance', {
      type: 'API_PERFORMANCE',
      endpoint,
      method,
      duration: `${duration}ms`,
      status,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log business events
   */
  businessEvent: (event: string, userId: string, data: any) => {
    logger.info('Business Event', {
      type: 'BUSINESS_EVENT',
      event,
      userId,
      data,
      timestamp: new Date().toISOString()
    });
  }
};

// Security logging
export const securityLogger = {
  /**
   * Log authentication attempts
   */
  auth: (email: string, success: boolean, ip: string, userAgent: string) => {
    const level = success ? 'info' : 'warn';
    logger.log(level, 'Authentication Attempt', {
      type: 'AUTH_ATTEMPT',
      email,
      success,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log suspicious activities
   */
  suspicious: (type: string, ip: string, details: any) => {
    logger.warn('Suspicious Activity', {
      type: 'SUSPICIOUS_ACTIVITY',
      activityType: type,
      ip,
      details,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log rate limit violations
   */
  rateLimit: (ip: string, endpoint: string, limit: number) => {
    logger.warn('Rate Limit Exceeded', {
      type: 'RATE_LIMIT',
      ip,
      endpoint,
      limit,
      timestamp: new Date().toISOString()
    });
  }
};

// Ensure logs directory exists
import { mkdirSync } from 'fs';
import { dirname } from 'path';

try {
  mkdirSync(dirname('logs/combined.log'), { recursive: true });
} catch (error) {
  // Directory already exists or cannot be created
}