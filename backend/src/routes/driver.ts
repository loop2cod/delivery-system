import { FastifyInstance } from 'fastify';
import { UserRole } from '@delivery-uae/shared';
import { requireRoles } from '../middleware/auth';

export async function driverRoutes(fastify: FastifyInstance) {
  // Driver routes require DRIVER, ADMIN, or SUPER_ADMIN role
  fastify.addHook('preHandler', requireRoles(UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPER_ADMIN));

  // Driver assignments
  fastify.get('/assignments', async (request, reply) => {
    return { message: 'Driver assignments endpoint - TODO: Implement' };
  });

  // Update location
  fastify.post('/location', async (request, reply) => {
    return { message: 'Update driver location endpoint - TODO: Implement' };
  });

  // Package actions
  fastify.post('/packages/:packageId/pickup', async (request, reply) => {
    return { message: 'Package pickup endpoint - TODO: Implement' };
  });
}