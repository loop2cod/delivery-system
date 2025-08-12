import { FastifyInstance } from 'fastify';
import { UserRole } from '../models/User';
import { requireRoles, authenticateToken } from '../middleware/auth';
import { db } from '../config/database';
import { config } from '../config/environment';
import bcrypt from 'bcryptjs';

export async function businessRoutes(fastify: FastifyInstance) {
  // Apply authentication to all business routes
  fastify.addHook('preHandler', authenticateToken);
  
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

  // Get company profile
  fastify.get('/profile', async (request, reply) => {
    const user = request.user;
    if (!user?.companyId) {
      return reply.code(400).send({ error: 'No company associated with user' });
    }

    try {
      const company = await db.queryOne(`
        SELECT * FROM companies WHERE id = $1
      `, [user.companyId]);

      if (!company) {
        return reply.code(404).send({ error: 'Company not found' });
      }

      return { company };
    } catch (error) {
      console.error('Failed to get company profile:', error);
      return reply.code(500).send({ error: 'Failed to get company profile' });
    }
  });

  // Update company profile
  fastify.put('/profile', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          contact_person: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string', format: 'email' },
          street_address: { type: 'string' },
          area: { type: 'string' },
          city: { type: 'string' },
          emirate: { type: 'string' },
          postal_code: { type: 'string' },
          country: { type: 'string' },
          industry: { type: 'string' },
          monthly_volume_estimate: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user;
    if (!user?.companyId) {
      return reply.code(400).send({ error: 'No company associated with user' });
    }

    const updates = request.body as any;

    try {
      // Build dynamic update query
      const fields = Object.keys(updates);
      const values = Object.values(updates);
      
      if (fields.length === 0) {
        return reply.code(400).send({ error: 'No fields to update' });
      }

      const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      values.push(user.companyId); // Add company ID as last parameter

      const updatedCompany = await db.queryOne(`
        UPDATE companies 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${values.length}
        RETURNING *
      `, values);

      return { company: updatedCompany };
    } catch (error) {
      console.error('Failed to update company profile:', error);
      return reply.code(500).send({ error: 'Failed to update company profile' });
    }
  });

  // Reset password (self-service)
  fastify.post('/reset-password', {
    schema: {
      body: {
        type: 'object',
        required: ['newPassword'],
        properties: {
          newPassword: { type: 'string', minLength: 8 }
        }
      }
    }
  }, async (request, reply) => {
    const user:any = request.user;
    if (!user?.id) {
      return reply.code(400).send({ error: 'User not found' });
    }

    const { newPassword } = request.body as any;

    try {
      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);

      // Update password
      await db.query(`
        UPDATE users 
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newPasswordHash, user.id]);

      return { 
        message: 'Password reset successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to reset password:', error);
      return reply.code(500).send({ error: 'Failed to reset password' });
    }
  });
}