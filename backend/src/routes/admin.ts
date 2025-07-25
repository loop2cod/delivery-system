import { FastifyInstance } from 'fastify';
import { UserRole } from '@delivery-uae/shared';
import { requireRoles } from '../middleware/auth';

export async function adminRoutes(fastify: FastifyInstance) {
  // All admin routes require ADMIN or SUPER_ADMIN role
  fastify.addHook('preHandler', requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN));

  // Dashboard data
  fastify.get('/dashboard', async (request, reply) => {
    return { message: 'Admin dashboard endpoint - TODO: Implement' };
  });

  // Manage inquiries
  fastify.get('/inquiries', async (request, reply) => {
    return { message: 'Admin inquiries endpoint - TODO: Implement' };
  });

  // Manage drivers
  fastify.get('/drivers', async (request, reply) => {
    return { message: 'Admin drivers endpoint - TODO: Implement' };
  });
}