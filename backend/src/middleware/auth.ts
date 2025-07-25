import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@delivery-uae/shared';
import { cacheUtils, redis } from '../config/redis';
import { db } from '../config/database';
import { logger, securityLogger } from '../utils/logger';

// Extend Fastify request interface
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      companyId?: string;
      driverId?: string;
    };
  }
}

// Public routes that don't require authentication
const publicRoutes = [
  '/health',
  '/docs',
  '/api/public',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/webhooks'
];

// Role-based route access control
const roleRouteMap: Record<string, UserRole[]> = {
  '/api/admin': [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  '/api/business': [UserRole.BUSINESS, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  '/api/driver': [UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  '/api/public': [UserRole.CUSTOMER, UserRole.BUSINESS, UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPER_ADMIN]
};

/**
 * Authentication middleware
 */
export async function authenticateToken(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { url, method, ip, headers } = request;
  
  // Skip authentication for public routes
  if (publicRoutes.some(route => url.startsWith(route))) {
    return;
  }

  try {
    // Extract token from Authorization header or cookie
    let token: string | undefined;
    
    const authHeader = headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (request.cookies?.token) {
      token = request.cookies.token;
    }

    if (!token) {
      securityLogger.auth('unknown', false, ip, headers['user-agent'] || '');
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication token required'
      });
    }

    // Verify JWT token
    let decoded: any;
    try {
      decoded = request.jwt.verify(token);
    } catch (error) {
      securityLogger.auth('unknown', false, ip, headers['user-agent'] || '');
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Check if session exists in Redis (for logout functionality)
    const sessionKey = cacheUtils.keys.session(token);
    const sessionData = await redis.get(sessionKey, true);
    
    if (!sessionData) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Session expired or invalid'
      });
    }

    // Get user data from cache or database
    let user = await redis.get(cacheUtils.keys.user(decoded.userId), true);
    
    if (!user) {
      // User not in cache, fetch from database
      const userQuery = `
        SELECT u.id, u.email, u.name, u.role, u.status,
               cu.company_id, d.id as driver_id
        FROM users u
        LEFT JOIN company_users cu ON u.id = cu.user_id AND cu.is_primary = true
        LEFT JOIN drivers d ON u.id = d.user_id
        WHERE u.id = $1 AND u.status = 'ACTIVE'
      `;
      
      user = await db.queryOne(userQuery, [decoded.userId]);
      
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'User not found or inactive'
        });
      }

      // Cache user data
      await redis.set(
        cacheUtils.keys.user(user.id),
        user,
        cacheUtils.ttl.MEDIUM
      );
    }

    // Check role-based access
    const hasAccess = checkRouteAccess(url, user.role);
    if (!hasAccess) {
      securityLogger.suspicious('UNAUTHORIZED_ACCESS', ip, {
        userId: user.id,
        role: user.role,
        route: url,
        method
      });
      
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    // Attach user to request
    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,  
      role: user.role,
      companyId: user.company_id,
      driverId: user.driver_id
    };

    // Update session last used time
    await redis.expire(sessionKey, cacheUtils.ttl.LONG);

    // Log successful authentication
    securityLogger.auth(user.email, true, ip, headers['user-agent'] || '');

  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
}

/**
 * Check if user role has access to route
 */
function checkRouteAccess(route: string, userRole: UserRole): boolean {
  // Find matching route pattern
  const matchingRoute = Object.keys(roleRouteMap).find(pattern => 
    route.startsWith(pattern)
  );

  if (!matchingRoute) {
    // Default to requiring authentication but allowing all roles
    return true;
  }

  const allowedRoles = roleRouteMap[matchingRoute];
  return allowedRoles.includes(userRole);
}

/**
 * Require specific roles middleware
 */
export function requireRoles(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(request.user.role)) {
      securityLogger.suspicious('ROLE_VIOLATION', request.ip, {
        userId: request.user.id,
        requiredRoles: roles,
        userRole: request.user.role,
        route: request.url
      });

      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }
  };
}

/**
 * Require company ownership middleware
 */
export function requireCompanyOwnership() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Super admins and admins can access any company data
    if ([UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(request.user.role)) {
      return;
    }

    // Business users can only access their own company data
    if (request.user.role === UserRole.BUSINESS) {
      const companyIdFromRoute = (request.params as any)?.companyId;
      
      if (companyIdFromRoute && companyIdFromRoute !== request.user.companyId) {
        securityLogger.suspicious('COMPANY_ACCESS_VIOLATION', request.ip, {
          userId: request.user.id,
          userCompanyId: request.user.companyId,
          requestedCompanyId: companyIdFromRoute
        });

        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Cannot access other company data'
        });
      }
    }
  };
}

/**
 * Require driver ownership middleware
 */
export function requireDriverOwnership() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Admins can access any driver data
    if ([UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(request.user.role)) {
      return;
    }

    // Drivers can only access their own data
    if (request.user.role === UserRole.DRIVER) {
      const driverIdFromRoute = (request.params as any)?.driverId;
      
      if (driverIdFromRoute && driverIdFromRoute !== request.user.driverId) {
        securityLogger.suspicious('DRIVER_ACCESS_VIOLATION', request.ip, {
          userId: request.user.id,
          userDriverId: request.user.driverId,
          requestedDriverId: driverIdFromRoute
        });

        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Cannot access other driver data'
        });
      }
    }
  };
}

/**
 * API key authentication for webhooks
 */
export async function authenticateApiKey(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const apiKey = request.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'API key required'
    });
  }

  // In production, this should check against a database of valid API keys
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    securityLogger.suspicious('INVALID_API_KEY', request.ip, {
      apiKey: apiKey.substring(0, 8) + '...',
      route: request.url
    });

    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid API key'
    });
  }
}

/**
 * Rate limiting by user ID
 */
export async function rateLimitByUser(
  request: FastifyRequest,
  reply: FastifyReply,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
) {
  if (!request.user) {
    return; // Skip rate limiting for unauthenticated requests
  }

  const key = `rate_limit:user:${request.user.id}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, Math.floor(windowMs / 1000));
  }

  if (current > maxRequests) {
    securityLogger.rateLimit(request.ip, request.url, maxRequests);
    
    return reply.code(429).send({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${Math.floor(windowMs / 1000)} seconds.`
    });
  }

  // Add rate limit headers
  reply.header('X-RateLimit-Limit', maxRequests);
  reply.header('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
}