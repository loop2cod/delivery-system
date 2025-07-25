import { FastifyInstance } from 'fastify';
import { authenticateApiKey } from '../middleware/auth';

export async function webhookRoutes(fastify: FastifyInstance) {
  // Webhooks use API key authentication
  fastify.addHook('preHandler', authenticateApiKey);

  // External service webhooks
  fastify.post('/payment', async (request, reply) => {
    return { message: 'Payment webhook endpoint - TODO: Implement' };
  });

  fastify.post('/sms', async (request, reply) => {
    return { message: 'SMS webhook endpoint - TODO: Implement' };
  });
}