import { FastifyInstance } from 'fastify';
import { UserRole } from '@delivery-uae/shared';
import { requireRoles } from '../middleware/auth';

export async function businessRoutes(fastify: FastifyInstance) {
  // Business routes require BUSINESS, ADMIN, or SUPER_ADMIN role
  fastify.addHook('preHandler', requireRoles(UserRole.BUSINESS, UserRole.ADMIN, UserRole.SUPER_ADMIN));

  // Business dashboard
  fastify.get('/dashboard', async (request, reply) => {
    return { message: 'Business dashboard endpoint - TODO: Implement' };
  });

  // Create delivery requests
  fastify.post('/requests', async (request, reply) => {
    return { message: 'Create delivery request endpoint - TODO: Implement' };
  });

  // Get delivery requests
  fastify.get('/requests', async (request, reply) => {
    return { message: 'Get delivery requests endpoint - TODO: Implement' };
  });
}