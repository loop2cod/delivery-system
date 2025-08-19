import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, IUser } from '../models/User';
import { cacheUtils, redis } from '../config/redis';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import mongoose from 'mongoose';

// Extend Fastify request interface
declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: {
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
  '/api/driver': [UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPER_ADMIN]
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
      logger.warn('Authentication failed - no token', { ip, userAgent: headers['user-agent'] });
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication token required'
      });
    }

    // Verify JWT token
    let decoded: any;
    try {
      // Use manual verification since request.jwt might not be available in middleware
      const jwt = require('jsonwebtoken');
      const { config } = require('../config/environment');
      decoded = jwt.verify(token, config.JWT_SECRET);
    } catch (error) {
      logger.warn('Authentication failed - invalid token', { ip, userAgent: headers['user-agent'] });
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Check if session exists in Redis (for logout functionality)
    // Temporarily disable session check to isolate JWT verification
    let sessionData = null;
    try {
      const sessionKey = cacheUtils.keys.session(token);
      sessionData = await redis.get(sessionKey, true);
    } catch (error) {
      // Redis might be unavailable, continue without session check
    }
    
    // Session validation (skip if Redis unavailable)
    if (sessionData === null) {
      // Redis failed, continue without session validation for now
    } else if (!sessionData) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Session expired or invalid'
      });
    }

    // Get user data from cache or database
    let user: IUser | null = null;
    let cachedUser: any = null;
    try {
      cachedUser = await redis.get(cacheUtils.keys.user(decoded.userId), true);
      if (cachedUser && typeof cachedUser === 'object') {
        user = cachedUser as IUser;
      }
    } catch (error) {
      // Redis unavailable, will fetch from database
    }
    
    // If user is from cache but missing companyId, populate it
    if (user && user.role === UserRole.BUSINESS && !(user as any).companyId) {
      try {
        const companyUser = await db.findOne('company_users', { 
          user_id: decoded.userId
        });
        
        if (companyUser) {
          (user as any).companyId = (companyUser as any).company_id;
          // Update cache with companyId
          try {
            await redis.set(
              cacheUtils.keys.user((user as any).id),
              user,
              cacheUtils.ttl.MEDIUM
            );
          } catch (error) {
            // Redis unavailable, continuing
          }
        }
      } catch (error) {
        // Continue without companyId if lookup fails
      }
    }
    
    // Null check after cache lookup
    if (!user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'User not found in cache'
      });
    }
    
    if (!user) {
      // User not in cache, fetch from database
      try {
        const dbUser = await User.findById(decoded.userId).select('-password_hash');
        
        if (!dbUser || dbUser.status !== 'ACTIVE') {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'User not found or inactive'
          });
        }

        // Convert to plain object to avoid Mongoose issues
        user = {
          id: dbUser._id.toString(),
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          status: dbUser.status,
          companyId: undefined,
          driverId: undefined
        } as any;

        // For business users, get their company association
        if (user && user.role === UserRole.BUSINESS) {
          const companyUser = await db.findOne('company_users', { 
            user_id: dbUser._id.toString() 
          });
          
          if (companyUser) {
            (user as any).companyId = (companyUser as any).company_id;
          }
        }

        // Cache user data
        if (user) {
          try {
            await redis.set(
              cacheUtils.keys.user(user.id),
              user,
              cacheUtils.ttl.MEDIUM
            );
          } catch (error) {
            // Redis unavailable, continuing without cache
          }
        }
      } catch (error) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'User not found or inactive'
        });
      }
    }

    // Final null check before role access
    if (!user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'User not found'
      });
    }
    
    const hasAccess = checkRouteAccess(url, user.role);
    if (!hasAccess) {
      logger.warn('Unauthorized access attempt', {
        userId: (user as any).id,
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
    request.currentUser = {
      id: (user as any).id,
      email: (user as any).email,
      name: (user as any).name,  
      role: user.role,
      companyId: (user as any).companyId,
      driverId: (user as any).driverId
    };

    // Update session last used time
    try {
      const sessionKey = cacheUtils.keys.session(token);
      await redis.expire(sessionKey, cacheUtils.ttl.LONG);
    } catch (error) {
      // Redis unavailable, continuing
    }

    // Log successful authentication
    logger.info('User authenticated', { userId: (user as any).id, email: (user as any).email, role: user.role });

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
    if (!request.currentUser) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(request.currentUser.role)) {
      logger.warn('Role violation', {
        userId: request.currentUser.id,
        requiredRoles: roles,
        userRole: request.currentUser.role,
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
 * Require specific admin panel section permission
 */
export function requireSectionPermission(section: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.currentUser) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Super admins have access to everything
    if (request.currentUser.role === UserRole.SUPER_ADMIN) {
      return;
    }

    // Check if user has permission for this section
    const dbUser = await User.findById(request.currentUser.id).select('permissions');
    if (!dbUser || !(dbUser as any).permissions || !(dbUser as any).permissions[section]) {
      logger.warn('Section permission violation', {
        userId: request.currentUser.id,
        userRole: request.currentUser.role,
        requiredSection: section,
        route: request.url
      });

      return reply.code(403).send({
        error: 'Forbidden',
        message: `Access denied to ${section} section`
      });
    }
  };
}

/**
 * Require company ownership middleware
 */
export function requireCompanyOwnership() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.currentUser) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Super admins and admins can access any company data
    if ([UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(request.currentUser.role)) {
      return;
    }

    // Business users can only access their own company data
    if (request.currentUser.role === UserRole.BUSINESS) {
      const companyIdFromRoute = (request.params as any)?.companyId;
      
      if (companyIdFromRoute && companyIdFromRoute !== request.currentUser.companyId) {
        logger.warn('Company access violation', {
          userId: request.currentUser.id,
          userCompanyId: request.currentUser.companyId,
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
    if (!request.currentUser) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Admins can access any driver data
    if ([UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(request.currentUser.role)) {
      return;
    }

    // Drivers can only access their own data
    if (request.currentUser.role === UserRole.DRIVER) {
      const driverIdFromRoute = (request.params as any)?.driverId;
      
      if (driverIdFromRoute && driverIdFromRoute !== request.currentUser.driverId) {
        logger.warn('Driver access violation', {
          userId: request.currentUser.id,
          userDriverId: request.currentUser.driverId,
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
    logger.warn('Invalid API key', {
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
  reply: FastifyReply
) {
  const maxRequests = 100;
  const windowMs = 60000; // 1 minute
  if (!request.currentUser) {
    return; // Skip rate limiting for unauthenticated requests
  }

  const key = `rate_limit:user:${request.currentUser.id}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, Math.floor(windowMs / 1000));
  }

  if (current > maxRequests) {
    logger.warn('Rate limit exceeded', {
      userId: request.currentUser.id,
      ip: request.ip,
      url: request.url,
      limit: maxRequests
    });
    
    return reply.code(429).send({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${Math.floor(windowMs / 1000)} seconds.`
    });
  }

  // Add rate limit headers
  reply.header('X-RateLimit-Limit', maxRequests);
  reply.header('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
}