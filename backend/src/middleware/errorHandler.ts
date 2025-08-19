import { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { logger } from '../utils/logger';
import { config } from '../config/environment';

// Custom error types
export class ValidationError extends Error {
  statusCode: number = 400;
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  statusCode: number = 404;
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  statusCode: number = 409;
  
  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class BusinessLogicError extends Error {
  statusCode: number = 422;
  
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'BusinessLogicError';
  }
}

// Error response interface
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
  timestamp: string;
  path: string;
  requestId?: string;
}

/**
 * Global error handler for Fastify
 */
export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { method, url, id: requestId, ip } = request;
  
  // Log error with context
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    method,
    url,
    requestId,
    ip,
    userAgent: request.headers['user-agent'],
    userId: request.currentUser?.id
  });

  // Determine status code and error type
  let statusCode = 500;
  let errorType = 'Internal Server Error';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  // Handle different error types
  if (error.statusCode) {
    statusCode = error.statusCode;
  }

  // Validation errors (Joi, Fastify schema validation)
  if (error.validation) {
    statusCode = 400;
    errorType = 'Validation Error';
    message = 'Request validation failed';
    details = error.validation;
  }

  // Custom error types
  if (error instanceof ValidationError) {
    statusCode = error.statusCode;
    errorType = 'Validation Error';
    message = error.message;
    details = error.details;
  } else if (error instanceof NotFoundError) {
    statusCode = error.statusCode;
    errorType = 'Not Found';
    message = error.message;
  } else if (error instanceof ConflictError) {
    statusCode = error.statusCode;
    errorType = 'Conflict';
    message = error.message;
  } else if (error instanceof BusinessLogicError) {
    statusCode = error.statusCode;
    errorType = 'Business Logic Error';
    message = error.message;
    details = { code: error.code };
  }

  // Database errors
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique violation
        statusCode = 409;
        errorType = 'Conflict';
        message = 'Resource already exists';
        break;
      case '23503': // Foreign key violation
        statusCode = 400;
        errorType = 'Validation Error';
        message = 'Invalid reference to related resource';
        break;
      case '23502': // Not null violation
        statusCode = 400;
        errorType = 'Validation Error';
        message = 'Required field is missing';
        break;
      case '42P01': // Undefined table
        statusCode = 500;
        errorType = 'Database Error';
        message = 'Database schema error';
        break;
    }
  }

  // JWT errors
  if (error.message.includes('jwt')) {
    statusCode = 401;
    errorType = 'Authentication Error';
    message = 'Invalid or expired token';
  }

  // Rate limiting errors
  if (error.statusCode === 429) {
    statusCode = 429;
    errorType = 'Too Many Requests';
    message = error.message || 'Rate limit exceeded';
  }

  // Timeout errors
  if (error.code === 'TIMEOUT' || error.message.includes('timeout')) {
    statusCode = 408;
    errorType = 'Request Timeout';
    message = 'Request timed out';
  }

  // File upload errors
  if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
    statusCode = 413;
    errorType = 'File Too Large';
    message = 'Uploaded file exceeds size limit';
  }

  // Build error response
  const errorResponse: ErrorResponse = {
    error: errorType,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: url,
    requestId
  };

  // Add details for non-production environments or validation errors
  if (config.NODE_ENV !== 'production' || statusCode < 500) {
    if (details) {
      errorResponse.details = details;
    }
  }

  // Add stack trace in development
  if (config.NODE_ENV === 'development') {
    (errorResponse as any).stack = error.stack;
  }

  // Send error response
  return reply.code(statusCode).send(errorResponse);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return (...args: T): Promise<R> => {
    return Promise.resolve(fn(...args)).catch(args[args.length - 1]);
  };
}

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(request: FastifyRequest, reply: FastifyReply) {
  const { method, url } = request;
  
  logger.warn('Route not found', {
    method,
    url,
    ip: request.ip,
    userAgent: request.headers['user-agent']
  });

  return reply.code(404).send({
    error: 'Not Found',
    message: `Route ${method} ${url} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
    path: url
  });
}

/**
 * Validation error helper
 */
export function createValidationError(message: string, details?: any): ValidationError {
  return new ValidationError(message, details);
}

/**
 * Business logic error helper
 */
export function createBusinessError(message: string, code?: string): BusinessLogicError {
  return new BusinessLogicError(message, code);
}

/**
 * Database error parser
 */
export function parseDbError(error: any): Error {
  if (error.code === '23505') {
    // Unique constraint violation
    const match = error.detail?.match(/Key \((.+)\)=/);
    const field = match ? match[1] : 'field';
    return new ConflictError(`${field} already exists`);
  }

  if (error.code === '23503') {
    // Foreign key violation
    return new ValidationError('Invalid reference to related resource');
  }

  if (error.code === '23502') {
    // Not null violation
    const match = error.message?.match(/column "(.+)" violates not-null/);
    const field = match ? match[1] : 'field';
    return new ValidationError(`${field} is required`);
  }

  // Return original error if not a known database error
  return error;
}

/**
 * PWA-specific error responses
 */
export const pwaErrorResponses = {
  /**
   * Offline sync error response
   */
  offlineSyncError: (actions: number, failed: number) => ({
    error: 'Partial Sync Failure',
    message: `${failed} of ${actions} offline actions failed to sync`,
    statusCode: 207, // Multi-status
    details: {
      total: actions,
      failed,
      success: actions - failed
    }
  }),

  /**
   * Push notification error response
   */
  pushNotificationError: (message: string) => ({
    error: 'Push Notification Error',
    message,
    statusCode: 500,
    details: {
      suggestion: 'Check push notification subscription status'
    }
  }),

  /**
   * Cache error response (non-critical)
   */
  cacheError: (message: string) => ({
    warning: 'Cache Error',
    message,
    impact: 'Performance may be reduced, but functionality is not affected'
  })
};

/**
 * Health check error response
 */
export function healthCheckError(services: Record<string, boolean>) {
  const failedServices = Object.entries(services)
    .filter(([_, healthy]) => !healthy)
    .map(([service]) => service);

  return {
    error: 'Service Unavailable',
    message: 'One or more critical services are unavailable',
    statusCode: 503,
    details: {
      failedServices,
      healthStatus: services
    },
    timestamp: new Date().toISOString()
  };
}