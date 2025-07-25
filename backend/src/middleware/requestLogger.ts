import { FastifyRequest, FastifyReply } from 'fastify';
import { logger, pwaLogger } from '../utils/logger';

/**
 * Request logging middleware
 */
export async function requestLogger(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const start = Date.now();
  const { method, url, ip, headers } = request;
  const userAgent = headers['user-agent'] || '';
  const requestId = request.id;

  // Store start time for response logging
  (request as any).startTime = start;

  // Log request start
  logger.http(`${method} ${url}`, {
    requestId,
    ip,
    userAgent: userAgent.substring(0, 100), // Truncate long user agents
    contentLength: headers['content-length'],
    origin: headers.origin,
    referer: headers.referer
  });

  // Track PWA-specific metrics
  const isPWA = headers['sec-fetch-site'] === 'same-origin' || 
                headers['x-pwa-type'] || 
                userAgent.includes('PWA');

  if (isPWA) {
    const pwaType = headers['x-pwa-type'] as string || 'unknown';
    logger.info('PWA Request', {
      type: 'PWA_REQUEST',
      pwaType,
      endpoint: url,
      method,
      requestId
    });
  }

  // Add performance headers
  reply.header('X-Request-ID', requestId);
}