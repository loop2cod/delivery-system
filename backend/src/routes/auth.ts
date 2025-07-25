import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/authService';
import { asyncHandler } from '../middleware/errorHandler';
import { rateLimitByUser } from '../middleware/auth';

export async function authRoutes(fastify: FastifyInstance) {
  // Login endpoint
  fastify.post('/login', {
    schema: {
      tags: ['Authentication'],
      description: 'User login',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          pwaType: { 
            type: 'string', 
            enum: ['public', 'admin', 'business', 'driver'] 
          },
          deviceInfo: {
            type: 'object',
            properties: {
              userAgent: { type: 'string' },
              platform: { type: 'string' },
              language: { type: 'string' }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
                companyId: { type: 'string' },
                driverId: { type: 'string' }
              }
            },
            token: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'string' }
          }
        }
      }
    }
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const loginData = request.body as any;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'] || '';

    const result = await AuthService.login(loginData, ip, userAgent);

    // Set HTTP-only cookie for web clients
    reply.setCookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return result;
  }));

  // Register endpoint
  fastify.post('/register', {
    schema: {
      tags: ['Authentication'],
      description: 'User registration',
      body: {
        type: 'object',
        required: ['email', 'password', 'name', 'phone'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string', minLength: 2 },
          phone: { type: 'string', pattern: '^(\\+971|971|0)?[0-9]{8,9}$' },
          role: {
            type: 'string',
            enum: ['CUSTOMER', 'BUSINESS', 'DRIVER'],
            default: 'CUSTOMER'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' }
              }
            },
            token: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'string' }
          }
        }
      }
    }
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const registerData = request.body as any;

    const result = await AuthService.register(registerData);

    // Set HTTP-only cookie for web clients
    reply.setCookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return result;
  }));

  // Refresh token endpoint
  fastify.post('/refresh', {
    schema: {
      tags: ['Authentication'],
      description: 'Refresh authentication token',
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
                companyId: { type: 'string' },
                driverId: { type: 'string' }
              }
            },
            token: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'string' }
          }
        }
      }
    }
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as any;

    const result = await AuthService.refreshToken(refreshToken);

    // Update HTTP-only cookie
    reply.setCookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return result;
  }));

  // Logout endpoint
  fastify.post('/logout', {
    schema: {
      tags: ['Authentication'],
      description: 'User logout',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    },
    preHandler: [rateLimitByUser]
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.headers.authorization?.replace('Bearer ', '') || 
                  request.cookies?.token;
    const userId = request.user?.id;

    if (token) {
      await AuthService.logout(token, userId);
    }

    // Clear cookie
    reply.clearCookie('token');

    return { message: 'Logged out successfully' };
  }));

  // Logout from all devices endpoint
  fastify.post('/logout-all', {
    schema: {
      tags: ['Authentication'],
      description: 'Logout from all devices',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    },
    preHandler: [rateLimitByUser]
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;

    await AuthService.logoutAll(userId);

    // Clear cookie
    reply.clearCookie('token');

    return { message: 'Logged out from all devices successfully' };
  }));

  // Get current user profile
  fastify.get('/profile', {
    schema: {
      tags: ['Authentication'],
      description: 'Get current user profile',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string' },
            status: { type: 'string' },
            createdAt: { type: 'string' },
            lastLogin: { type: 'string' },
            companyId: { type: 'string' },
            companyName: { type: 'string' },
            driverId: { type: 'string' },
            rating: { type: 'number' },
            totalDeliveries: { type: 'number' }
          }
        }
      }
    }
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const user = await AuthService.getUserById(userId);
    return user;
  }));

  // Update user profile
  fastify.put('/profile', {
    schema: {
      tags: ['Authentication'],
      description: 'Update user profile',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2 },
          phone: { type: 'string', pattern: '^(\\+971|971|0)?[0-9]{8,9}$' },
          email: { type: 'string', format: 'email' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string' }
          }
        }
      }
    },
    preHandler: [rateLimitByUser]
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const updates = request.body as any;

    const updatedUser = await AuthService.updateProfile(userId, updates);
    return updatedUser;
  }));

  // Change password
  fastify.post('/change-password', {
    schema: {
      tags: ['Authentication'],
      description: 'Change user password',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    },
    preHandler: [rateLimitByUser]
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const { currentPassword, newPassword } = request.body as any;

    await AuthService.changePassword(userId, currentPassword, newPassword);

    // Clear cookie since all sessions are invalidated
    reply.clearCookie('token');

    return { message: 'Password changed successfully. Please login again.' };
  }));

  // Verify token endpoint (for PWA token validation)
  fastify.get('/verify', {
    schema: {
      tags: ['Authentication'],
      description: 'Verify authentication token',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    // If we reach here, the token is valid (passed through auth middleware)
    return {
      valid: true,
      user: {
        id: request.user!.id,
        email: request.user!.email,
        name: request.user!.name,
        role: request.user!.role
      }
    };
  }));
}