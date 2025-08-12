import { FastifyInstance } from 'fastify';
import { UserRole } from '@delivery-uae/shared';
import { requireRoles, authenticateToken } from '../middleware/auth';
import { db } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';

export async function adminRoutes(fastify: FastifyInstance) {
  // Apply authentication to all admin routes
  fastify.addHook('preHandler', authenticateToken);


  // All admin routes require ADMIN or SUPER_ADMIN role
  fastify.addHook('preHandler', requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN));

  // Dashboard data
  fastify.get('/dashboard', asyncHandler(async (request, reply) => {
    // Get dashboard statistics
    const stats = await Promise.all([
      db.queryOne('SELECT COUNT(*) as count FROM inquiries'),
      db.queryOne('SELECT COUNT(*) as count FROM inquiries WHERE status = $1', ['NEW']),
      db.queryOne('SELECT COUNT(*) as count FROM drivers'),
      db.queryOne('SELECT COUNT(*) as count FROM drivers WHERE status = $1', ['AVAILABLE']),
      db.queryOne('SELECT COUNT(*) as count FROM companies WHERE status = $1', ['ACTIVE']),
      db.queryOne('SELECT COUNT(*) as count FROM delivery_requests WHERE status IN ($1, $2)', ['ASSIGNED', 'IN_PROGRESS']),
      db.queryOne('SELECT COUNT(*) as count FROM delivery_requests WHERE DATE(created_at) = CURRENT_DATE'),
      db.queryOne('SELECT COALESCE(SUM(total_amount), 0) as total FROM delivery_requests WHERE status = $1', ['COMPLETED'])
    ]);

    // Get recent activity
    const recentActivity = await db.query(`
      SELECT 'inquiry' as type, reference_number as reference, company_name as title, created_at
      FROM inquiries 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      UNION ALL
      SELECT 'delivery' as type, request_number as reference, 
             CONCAT('Delivery from ', pickup_area, ' to ', (
               SELECT delivery_area FROM packages WHERE request_id = delivery_requests.id LIMIT 1
             )) as title, created_at
      FROM delivery_requests 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    return {
      stats: {
        totalInquiries: parseInt(stats[0].count),
        newInquiries: parseInt(stats[1].count),
        totalDrivers: parseInt(stats[2].count),
        activeDrivers: parseInt(stats[3].count),
        totalCompanies: parseInt(stats[4].count),
        activeDeliveries: parseInt(stats[5].count),
        todayDeliveries: parseInt(stats[6].count),
        totalRevenue: parseFloat(stats[7].total)
      },
      recentActivity: recentActivity.rows || []
    };
  }));

  // Manage inquiries
  fastify.get('/inquiries', {
    schema: {
      description: 'Get all inquiries with pagination',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
          status: { type: 'string' },
          search: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            inquiries: { type: 'array' },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                pages: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { page = 1, limit = 10, status, search } = request.query as any;
    
    // Validate pagination parameters
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.max(1, Math.min(100, parseInt(limit) || 10)); // Max 100 items per page
    const offset = (validPage - 1) * validLimit;

    let whereClause = 'WHERE 1=1 AND status != \'CONVERTED\''; // Exclude converted inquiries
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (company_name ILIKE $${paramCount} OR contact_person ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Get total count
    const countResult = await db.queryOne(`SELECT COUNT(*) as count FROM inquiries ${whereClause}`, params);
    const total = parseInt(countResult.count);

    // Get inquiries
    const inquiriesResult = await db.query(`
      SELECT i.*
      FROM inquiries i
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT ${validLimit} OFFSET ${offset}
    `, params);

    return {
      inquiries: inquiriesResult.rows,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        pages: Math.ceil(total / validLimit)
      }
    };
  }));

  // Update inquiry status
  fastify.put('/inquiries/:id', {
    schema: {
      description: 'Update inquiry status',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['NEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CONVERTED'] },
          notes: { type: 'string' }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params as any;
    const updates = request.body as any;
    const adminId = request.user!.id;

    // Get the current inquiry details
    const currentInquiry = await db.queryOne(`
      SELECT * FROM inquiries WHERE id = $1
    `, [id]);

    if (!currentInquiry) {
      reply.code(404);
      return { error: 'Inquiry not found' };
    }

    // If approving the inquiry, automatically convert it to a company
    if (updates.status === 'APPROVED' && currentInquiry.status !== 'APPROVED') {
      // Check if company already exists with this email
      const existingCompany = await db.queryOne(`
        SELECT id FROM companies WHERE email = $1
      `, [currentInquiry.email]);

      if (!existingCompany) {
        // Generate a unique trade license number
        const tradeLicensePrefix = currentInquiry.industry.substring(0, 2).toUpperCase();
        const licenseNumber = `${tradeLicensePrefix}-${Date.now().toString().slice(-7)}`;
        
        // Create company from inquiry data
        const newCompany = await db.queryOne(`
          INSERT INTO companies (
            name, trade_license, industry, contact_person, phone, email,
            status, account_type, street_address, area, city, emirate, country
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *
        `, [
          currentInquiry.company_name,
          licenseNumber,
          currentInquiry.industry,
          currentInquiry.contact_person,
          currentInquiry.phone,
          currentInquiry.email,
          'ACTIVE',
          'BASIC', // Default account type
          'To be updated', // Placeholder address
          'To be updated', // Placeholder area
          'Dubai', // Default city
          'DUBAI', // Default emirate
          'United Arab Emirates'
        ]);

        // Check if business user already exists with this email
        const existingUser = await db.queryOne(`
          SELECT id FROM users WHERE email = $1
        `, [currentInquiry.email]);

        let businessUserId;
        
        if (!existingUser) {
          // Generate a temporary password for the business user
          const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
          const hashedPassword = await bcrypt.hash(tempPassword, 10);
          
          // Create business user account
          const businessUser = await db.queryOne(`
            INSERT INTO users (
              email, password_hash, name, phone, role, status, email_verified
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `, [
            currentInquiry.email,
            hashedPassword,
            currentInquiry.contact_person,
            currentInquiry.phone,
            'BUSINESS',
            'ACTIVE',
            true
          ]);
          
          businessUserId = businessUser.id;
          
          // TODO: Send email with login credentials
          console.log(`Created business user for ${currentInquiry.email} with temporary password: ${tempPassword}`);
        } else {
          businessUserId = existingUser.id;
        }

        // Link user to company
        await db.query(`
          INSERT INTO company_users (company_id, user_id, is_primary)
          VALUES ($1, $2, $3)
          ON CONFLICT (company_id, user_id) DO NOTHING
        `, [newCompany.id, businessUserId, true]);

        // Update inquiry status to CONVERTED
        updates.status = 'CONVERTED';
      } else {
        // Company already exists, just approve the inquiry
        updates.status = 'APPROVED';
      }
    }

    const updatedInquiry = await db.queryOne(`
      UPDATE inquiries 
      SET status = COALESCE($1, status),
          special_requirements = COALESCE($2, special_requirements),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [updates.status, updates.notes, id]);

    return updatedInquiry;
  }));

  // Manage drivers - routes are defined below after companies section

  // Update driver status
  fastify.put('/drivers/:id', {
    schema: {
      description: 'Update driver status',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['AVAILABLE', 'BUSY', 'OFFLINE', 'SUSPENDED'] }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params as any;
    const { status } = request.body as any;

    const updatedDriver = await db.queryOne(`
      UPDATE drivers 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *, status as status
    `, [status, id]);

    return updatedDriver;
  }));

  // Get all companies
  fastify.get('/companies', {
    schema: {
      description: 'Get all companies with pagination',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
          status: { type: 'string' },
          search: { type: 'string' }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { page = 1, limit = 10, status, search } = request.query as any;
    
    // Validate pagination parameters
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.max(1, Math.min(100, parseInt(limit) || 10)); // Max 100 items per page
    const offset = (validPage - 1) * validLimit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND c.status = $${paramCount}`;
      params.push(status);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (c.name ILIKE $${paramCount} OR c.contact_person ILIKE $${paramCount} OR c.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Get total count
    const countResult = await db.queryOne(`SELECT COUNT(*) as count FROM companies c ${whereClause}`, params);
    const total = parseInt(countResult.count);

    // Get companies
    const companiesResult = await db.query(`
      SELECT c.*, COUNT(dr.id) as total_requests
      FROM companies c
      LEFT JOIN delivery_requests dr ON c.id = dr.company_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT ${validLimit} OFFSET ${offset}
    `, params);

    return {
      companies: companiesResult.rows,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        pages: Math.ceil(total / validLimit)
      }
    };
  }));

  // Get single company by ID
  fastify.get('/companies/:id', {
    schema: {
      description: 'Get company details by ID',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params as { id: string };

    const companyResult = await db.queryOne(`
      SELECT c.*, COUNT(dr.id) as total_requests
      FROM companies c
      LEFT JOIN delivery_requests dr ON c.id = dr.company_id
      WHERE c.id = $1
      GROUP BY c.id
    `, [id]);

    if (!companyResult) {
      return reply.code(404).send({ error: 'Company not found' });
    }

    return companyResult;
  }));

  // Reset password for company user
  fastify.post('/companies/:id/reset-password', {
    schema: {
      description: 'Reset password for company primary user',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            newPassword: { type: 'string' }
          }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params as { id: string };

    // Find the primary company user
    const companyUser = await db.queryOne(`
      SELECT u.id, u.email, u.name, c.name as company_name
      FROM users u
      JOIN company_users cu ON u.id = cu.user_id
      JOIN companies c ON cu.company_id = c.id
      WHERE c.id = $1 AND cu.is_primary = true AND u.role = 'BUSINESS'
    `, [id]);

    if (!companyUser) {
      return reply.code(404).send({ 
        error: 'Company user not found',
        message: 'No primary business user found for this company'
      });
    }

    // Generate a new temporary password (16 characters)
    const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await db.query(`
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [hashedPassword, companyUser.id]);

    // Log the action (in production, this should be logged properly and the password should be sent via email)
    console.log(`Password reset for ${companyUser.email} (${companyUser.company_name}). New password: ${newPassword}`);

    return {
      message: `Password reset successfully for ${companyUser.name} (${companyUser.email})`,
      newPassword: newPassword
    };
  }));

  // Driver management routes
  
  // Get all drivers
  fastify.get('/drivers', {
    schema: {
      description: 'Get all drivers with pagination and filtering',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
          status: { type: 'string' },
          availability: { type: 'string' },
          search: { type: 'string' }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { page = 1, limit = 10, status, availability, search } = request.query as any;
    
    // Validate pagination parameters
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.max(1, Math.min(100, parseInt(limit) || 10));
    const offset = (validPage - 1) * validLimit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND d.status = $${paramCount}`;
      params.push(status);
    }

    if (availability) {
      paramCount++;
      whereClause += ` AND d.status = $${paramCount}`;
      params.push(availability);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (d.name ILIKE $${paramCount} OR d.email ILIKE $${paramCount} OR d.phone ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Get total count
    const countResult = await db.queryOne(`SELECT COUNT(*) as count FROM drivers d ${whereClause}`, params);
    const total = parseInt(countResult.count);

    // Get drivers
    const driversResult = await db.query(`
      SELECT d.*,
             COUNT(dr.id) as total_deliveries,
             COUNT(CASE WHEN dr.status = 'COMPLETED' THEN 1 END) as completed_deliveries
      FROM drivers d
      LEFT JOIN delivery_requests dr ON d.id = dr.assigned_driver_id
      ${whereClause}
      GROUP BY d.id
      ORDER BY d.created_at DESC
      LIMIT ${validLimit} OFFSET ${offset}
    `, params);

    return {
      drivers: driversResult.rows,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        pages: Math.ceil(total / validLimit)
      }
    };
  }));

  // Get single driver by ID
  fastify.get('/drivers/:id', {
    schema: {
      description: 'Get driver details by ID',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params as { id: string };

    const driverResult = await db.queryOne(`
      SELECT d.*, d.status as status,
             COUNT(dr.id) as total_deliveries,
             COUNT(CASE WHEN dr.status = 'COMPLETED' THEN 1 END) as completed_deliveries
      FROM drivers d
      LEFT JOIN delivery_requests dr ON d.id = dr.assigned_driver_id
      WHERE d.id = $1
      GROUP BY d.id
    `, [id]);

    if (!driverResult) {
      return reply.code(404).send({ error: 'Driver not found' });
    }

    return driverResult;
  }));

  // Create new driver
  fastify.post('/drivers', {
    schema: {
      description: 'Create new driver',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'email', 'phone', 'license_number', 'license_expiry', 'vehicle_type', 'vehicle_plate'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 255 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', pattern: '^(\\+971|971|0)?[0-9]{8,9}$' },
          license_number: { type: 'string', minLength: 1, maxLength: 100 },
          license_expiry: { type: 'string', format: 'date' },
          vehicle_type: { type: 'string', enum: ['MOTORCYCLE', 'SEDAN', 'VAN', 'TRUCK'] },
          vehicle_plate: { type: 'string', minLength: 1, maxLength: 20 },
          emergency_contact: {
            type: 'object',
            properties: {
              name: { type: 'string', maxLength: 255 },
              phone: { type: 'string', pattern: '^(\\+971|971|0)?[0-9]{8,9}$' },
              relationship: { type: 'string', maxLength: 100 }
            }
          }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const driverData = request.body as any;

    // TODO: Fix driver creation - needs to create user first then driver
    return reply.code(501).send({
      error: 'Not implemented',
      message: 'Driver creation functionality needs to be implemented properly'
    });

    // Add emergency contact if provided
    if (driverData.emergency_contact && driverData.emergency_contact.name) {
      await db.query(`
        UPDATE drivers 
        SET emergency_contact = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [JSON.stringify(driverData.emergency_contact), newDriverResult.id]);
    }

    reply.code(201).send(newDriverResult);
  }));

  // Update driver status
  fastify.put('/drivers/:id/status', {
    schema: {
      description: 'Update driver status',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ON_LEAVE'] }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    const updatedDriver = await db.queryOne(`
      UPDATE drivers 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *, status as status
    `, [status, id]);

    if (!updatedDriver) {
      return reply.code(404).send({ error: 'Driver not found' });
    }

    return updatedDriver;
  }));

  // Update driver availability
  fastify.put('/drivers/:id/availability', {
    schema: {
      description: 'Update driver availability status',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['AVAILABLE', 'BUSY', 'OFFLINE'] }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    const updatedDriver = await db.queryOne(`
      UPDATE drivers 
      SET status = $1, last_active = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *, status as status
    `, [status, id]);

    if (!updatedDriver) {
      return reply.code(404).send({ error: 'Driver not found' });
    }

    return updatedDriver;
  }));

  // Create new inquiry (admin can create inquiries on behalf of customers)
  fastify.post('/inquiries', {
    schema: {
      description: 'Create new inquiry',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['company_name', 'industry', 'contact_person', 'email', 'phone', 'expected_volume'],
        properties: {
          company_name: { type: 'string', minLength: 2, maxLength: 255 },
          industry: { type: 'string', minLength: 2, maxLength: 100 },
          contact_person: { type: 'string', minLength: 2, maxLength: 255 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', pattern: '^(\\+971|971|0)?[0-9]{8,9}$' },
          expected_volume: { type: 'string', maxLength: 100 },
          special_requirements: { type: 'string' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            reference_number: { type: 'string' },
            company_name: { type: 'string' },
            status: { type: 'string' },
            created_at: { type: 'string' }
          }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const inquiryData = request.body as any;
    const adminId = request.user!.id;

    // Generate reference number
    const currentYear = new Date().getFullYear();
    const countResult = await db.queryOne(
      'SELECT COUNT(*) as count FROM inquiries WHERE EXTRACT(YEAR FROM created_at) = $1',
      [currentYear]
    );
    const sequenceNumber = (parseInt(countResult.count) + 1).toString().padStart(4, '0');
    const referenceNumber = `INQ-${currentYear}-${sequenceNumber}`;

    // Create inquiry
    const newInquiry = await db.queryOne(`
      INSERT INTO inquiries (
        reference_number, company_name, industry, contact_person, 
        email, phone, expected_volume, service_type, special_requirements, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      referenceNumber,
      inquiryData.company_name,
      inquiryData.industry,
      inquiryData.contact_person,
      inquiryData.email,
      inquiryData.phone,
      inquiryData.expected_volume,
      'General Delivery', // Default service type
      inquiryData.special_requirements,
      'NEW'
    ]);

    reply.code(201);
    return newInquiry;
  }));

  // Get single inquiry details
  fastify.get('/inquiries/:id', {
    schema: {
      description: 'Get inquiry details',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            reference_number: { type: 'string' },
            company_name: { type: 'string' },
            industry: { type: 'string' },
            contact_person: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            expected_volume: { type: 'string' },
            special_requirements: { type: 'string' },
            status: { type: 'string' },
            created_at: { type: 'string' },
            updated_at: { type: 'string' }
          }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params as any;

    const inquiry = await db.queryOne(`
      SELECT i.*
      FROM inquiries i
      WHERE i.id = $1
    `, [id]);

    if (!inquiry) {
      reply.code(404);
      return { error: 'Inquiry not found' };
    }

    return inquiry;
  }));

  // Delete inquiry
  fastify.delete('/inquiries/:id', {
    schema: {
      description: 'Delete inquiry',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
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
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params as any;

    const result = await db.query('DELETE FROM inquiries WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      reply.code(404);
      return { error: 'Inquiry not found' };
    }

    return { message: 'Inquiry deleted successfully' };
  }));

  // Get all admin staff for assignment
  fastify.get('/staff', {
    schema: {
      description: 'Get all admin staff for assignment',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            staff: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const staffResult = await db.query(`
      SELECT id, name, email, role
      FROM users 
      WHERE role IN ('ADMIN', 'SUPER_ADMIN') AND status = 'ACTIVE'
      ORDER BY name
    `);

    return { staff: staffResult.rows };
  }));

  // Bulk update inquiry status
  fastify.post('/inquiries/bulk-update', {
    schema: {
      description: 'Bulk update inquiry status',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['inquiry_ids', 'action'],
        properties: {
          inquiry_ids: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1
          },
          action: {
            type: 'string',
            enum: ['approve', 'reject', 'convert']
          },
          notes: { type: 'string' }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { inquiry_ids, action, notes } = request.body as any;
    const adminId = request.user!.id;

    // Handle company conversion for approve action
    if (action === 'approve') {
      // Get all inquiries to be approved
      const inquiriesToApprove = await db.query(`
        SELECT * FROM inquiries WHERE id = ANY($1) AND status != 'APPROVED' AND status != 'CONVERTED'
      `, [inquiry_ids]);

      // Process each inquiry for company conversion
      for (const inquiry of inquiriesToApprove.rows) {
        // Check if company already exists with this email
        const existingCompany = await db.queryOne(`
          SELECT id FROM companies WHERE email = $1
        `, [inquiry.email]);

        if (!existingCompany) {
          // Generate a unique trade license number
          const tradeLicensePrefix = inquiry.industry.substring(0, 2).toUpperCase();
          const licenseNumber = `${tradeLicensePrefix}-${Date.now().toString().slice(-7)}`;
          
          // Create company from inquiry data
          const newCompany = await db.queryOne(`
            INSERT INTO companies (
              name, trade_license, industry, contact_person, phone, email,
              status, account_type, street_address, area, city, emirate, country
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
          `, [
            inquiry.company_name,
            licenseNumber,
            inquiry.industry,
            inquiry.contact_person,
            inquiry.phone,
            inquiry.email,
            'ACTIVE',
            'BASIC', // Default account type
            'To be updated', // Placeholder address
            'To be updated', // Placeholder area
            'Dubai', // Default city
            'DUBAI', // Default emirate
            'United Arab Emirates'
          ]);

          // Check if business user already exists with this email
          const existingUser = await db.queryOne(`
            SELECT id FROM users WHERE email = $1
          `, [inquiry.email]);

          let businessUserId;
          
          if (!existingUser) {
            // Generate a temporary password for the business user
            const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(tempPassword, 10);
            
            // Create business user account
            const businessUser = await db.queryOne(`
              INSERT INTO users (
                email, password_hash, name, phone, role, status, email_verified
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING *
            `, [
              inquiry.email,
              hashedPassword,
              inquiry.contact_person,
              inquiry.phone,
              'BUSINESS',
              'ACTIVE',
              true
            ]);
            
            businessUserId = businessUser.id;
            
            // TODO: Send email with login credentials
            console.log(`Created business user for ${inquiry.email} with temporary password: ${tempPassword}`);
          } else {
            businessUserId = existingUser.id;
          }

          // Link user to company
          await db.query(`
            INSERT INTO company_users (company_id, user_id, is_primary)
            VALUES ($1, $2, $3)
            ON CONFLICT (company_id, user_id) DO NOTHING
          `, [newCompany.id, businessUserId, true]);
        }
      }
    }

    let status: string;
    let updateFields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    let params: any[] = [];

    switch (action) {
      case 'approve':
        status = 'CONVERTED'; // Mark as converted when approved (companies created)
        updateFields.push('status = $1');
        params.push(status);
        break;
      case 'reject':
        status = 'REJECTED';
        updateFields.push('status = $1');
        params.push(status);
        break;
      case 'convert':
        status = 'CONVERTED';
        updateFields.push('status = $1');
        params.push(status);
        break;
    }

    if (notes) {
      updateFields.push(`special_requirements = $${params.length + 1}`);
      params.push(notes);
    }

    // Build query for multiple IDs
    const placeholders = inquiry_ids.map((_, index) => `$${params.length + index + 1}`).join(',');
    params.push(...inquiry_ids);

    const query = `
      UPDATE inquiries 
      SET ${updateFields.join(', ')}
      WHERE id IN (${placeholders})
      RETURNING id, reference_number, status
    `;

    const updatedInquiriesResult = await db.query(query, params);

    return {
      message: `Successfully updated ${updatedInquiriesResult.rows.length} inquiries`,
      updated_inquiries: updatedInquiriesResult.rows
    };
  }));
}

export default adminRoutes;