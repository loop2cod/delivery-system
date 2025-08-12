import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';
import { UserRole } from '../models/User';
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
      db.count('inquiries'),
      db.count('inquiries', { status: 'NEW' }),
      db.count('drivers'),
      db.count('drivers', { status: 'AVAILABLE' }),
      db.count('companies', { status: 'ACTIVE' }),
      db.count('delivery_requests', { status: { $in: ['ASSIGNED', 'IN_PROGRESS'] } }),
      db.count('delivery_requests', { created_at: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      db.aggregate('delivery_requests', [{ $match: { status: 'COMPLETED' } }, { $group: { _id: null, total: { $sum: '$total_amount' } } }])
    ]);

    // Get recent activity
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentInquiries = await db.findMany('inquiries',
      { created_at: { $gte: sevenDaysAgo } },
      { sort: { created_at: -1 }, limit: 5, projection: { reference_number: 1, company_name: 1, created_at: 1 } }
    );
    const recentDeliveries = await db.findMany('delivery_requests',
      { created_at: { $gte: sevenDaysAgo } },
      { sort: { created_at: -1 }, limit: 5, projection: { request_number: 1, pickup_area: 1, created_at: 1 } }
    );

    const recentActivity = [
      ...recentInquiries.map(item => ({ type: 'inquiry', reference: item.reference_number, title: item.company_name, created_at: item.created_at })),
      ...recentDeliveries.map(item => ({ type: 'delivery', reference: item.request_number, title: `Delivery from ${item.pickup_area}`, created_at: item.created_at }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

    return {
      stats: {
        totalInquiries: stats[0],
        newInquiries: stats[1],
        totalDrivers: stats[2],
        activeDrivers: stats[3],
        totalCompanies: stats[4],
        activeDeliveries: stats[5],
        todayDeliveries: stats[6],
        totalRevenue: stats[7][0]?.total || 0
      },
      recentActivity
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

    // Build MongoDB filter
    const filter: any = { status: { $ne: 'CONVERTED' } }; // Exclude converted inquiries

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { company_name: { $regex: search, $options: 'i' } },
        { contact_person: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count
    const total = await db.count('inquiries', filter);

    // Get inquiries with pagination
    const rawInquiries = await db.findMany('inquiries', filter, {
      sort: { created_at: -1 },
      skip: (validPage - 1) * validLimit,
      limit: validLimit
    });

    // Convert MongoDB _id to id for frontend compatibility
    const inquiries = rawInquiries.map(inquiry => ({
      ...inquiry,
      id: inquiry._id.toString(),
      _id: undefined
    })).map(inquiry => {
      delete inquiry._id;
      return inquiry;
    });

    return {
      inquiries,
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
    const currentInquiry = await db.findOne('inquiries', { _id: new ObjectId(id) });

    if (!currentInquiry) {
      reply.code(404);
      return { error: 'Inquiry not found' };
    }

    // If approving the inquiry, automatically convert it to a company
    if (updates.status === 'APPROVED' && currentInquiry.status !== 'APPROVED') {
      // Check if company already exists with this email
      const existingCompany = await db.findOne('companies', { email: currentInquiry.email });

      if (!existingCompany) {
        // Generate a unique trade license number
        const tradeLicensePrefix = currentInquiry.industry.substring(0, 2).toUpperCase();
        const licenseNumber = `${tradeLicensePrefix}-${Date.now().toString().slice(-7)}`;

        // Create company from inquiry data
        const newCompany = await db.insertOne('companies', {
          name: currentInquiry.company_name,
          trade_license: licenseNumber,
          industry: currentInquiry.industry,
          contact_person: currentInquiry.contact_person,
          phone: currentInquiry.phone,
          email: currentInquiry.email,
          status: 'ACTIVE',
          account_type: 'BASIC', // Default account type
          street_address: 'To be updated', // Placeholder address
          area: 'To be updated', // Placeholder area
          city: 'Dubai', // Default city
          emirate: 'DUBAI', // Default emirate
          country: 'United Arab Emirates'
        });

        // Check if business user already exists with this email
        const existingUser = await db.findOne('users', { email: currentInquiry.email });

        let businessUserId;

        if (!existingUser) {
          // Generate a temporary password for the business user
          const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
          const hashedPassword = await bcrypt.hash(tempPassword, 10);

          // Create business user account
          const businessUser = await db.insertOne('users', {
            email: currentInquiry.email,
            password_hash: hashedPassword,
            name: currentInquiry.contact_person,
            phone: currentInquiry.phone,
            role: 'BUSINESS',
            status: 'ACTIVE',
            email_verified: true
          });

          businessUserId = businessUser._id;

          // TODO: Send email with login credentials
          console.log(`Created business user for ${currentInquiry.email} with temporary password: ${tempPassword}`);
        } else {
          businessUserId = existingUser._id;
        }

        // Link user to company
        await db.insertOne('company_users', {
          company_id: newCompany._id,
          user_id: businessUserId,
          is_primary: true
        });

        // Update inquiry status to CONVERTED
        updates.status = 'CONVERTED';
      } else {
        // Company already exists, just approve the inquiry
        updates.status = 'APPROVED';
      }
    }

    const updateData: any = {};
    if (updates.status) updateData.status = updates.status;
    if (updates.notes) updateData.special_requirements = updates.notes;

    const rawUpdatedInquiry = await db.updateOne('inquiries', { _id: new ObjectId(id) }, { $set: updateData });

    if (!rawUpdatedInquiry) {
      reply.code(404);
      return { error: 'Inquiry not found' };
    }

    // Convert MongoDB _id to id for frontend compatibility
    const updatedInquiry = {
      ...rawUpdatedInquiry,
      id: rawUpdatedInquiry._id.toString(),
      _id: undefined
    };
    delete updatedInquiry._id;

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

    const updatedDriver = await db.updateOne('drivers', 
      { _id: new ObjectId(id) }, 
      { $set: { status, updated_at: new Date() } }
    );

    if (!updatedDriver) {
      return reply.code(404).send({ error: 'Driver not found' });
    }

    // Convert MongoDB _id to id for frontend compatibility
    const result = {
      ...updatedDriver,
      id: updatedDriver._id.toString(),
      _id: undefined
    };
    delete result._id;

    return result;
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

    // Build MongoDB filter
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contact_person: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count
    const total = await db.count('companies', filter);

    // Get companies with pagination
    const rawCompanies = await db.findMany('companies', filter, {
      sort: { created_at: -1 },
      skip: (validPage - 1) * validLimit,
      limit: validLimit
    });

    // Convert MongoDB _id to id for frontend compatibility and add total_requests placeholder
    const companies = rawCompanies.map(company => ({
      ...company,
      id: company._id.toString(),
      total_requests: 0, // TODO: Calculate actual delivery requests count
      _id: undefined
    })).map(company => {
      delete company._id;
      return company;
    });

    return {
      companies,
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
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params as { id: string };

    const company = await db.findOne('companies', { _id: new ObjectId(id) });

    if (!company) {
      return reply.code(404).send({ error: 'Company not found' });
    }

    // Convert MongoDB _id to id for frontend compatibility and add total_requests placeholder
    const result = {
      ...company,
      id: company._id.toString(),
      total_requests: 0, // TODO: Calculate actual delivery requests count
      _id: undefined
    };
    delete result._id;

    return result;
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
          id: { type: 'string' }
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

    // Find the company first
    const company = await db.findOne('companies', { _id: new ObjectId(id) });

    if (!company) {
      return reply.code(404).send({
        error: 'Company not found',
        message: 'Company not found'
      });
    }

    // Find the company_user relationship for this company where is_primary = true
    const companyUserRelation = await db.findOne('company_users', {
      company_id: new ObjectId(id),
      is_primary: true
    });

    if (!companyUserRelation) {
      return reply.code(404).send({
        error: 'Company user not found',
        message: 'No primary business user found for this company'
      });
    }

    // Find the actual user
    const user = await db.findOne('users', {
      _id: companyUserRelation.user_id,
      role: 'BUSINESS'
    });

    if (!user) {
      return reply.code(404).send({
        error: 'Company user not found',
        message: 'No primary business user found for this company'
      });
    }

    // Generate a new temporary password (16 characters)
    const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await db.updateOne('users',
      { _id: user._id },
      { $set: { password_hash: hashedPassword, updated_at: new Date() } }
    );

    // Log the action (in production, this should be logged properly and the password should be sent via email)
    console.log(`Password reset for ${user.email} (${company.name}). New password: ${newPassword}`);

    return {
      message: `Password reset successfully for ${user.name} (${user.email})`,
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

    // Build MongoDB filter
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (availability) {
      filter.status = availability; // availability and status are the same field
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count
    const total = await db.count('drivers', filter);

    // Get drivers with pagination
    const rawDrivers = await db.findMany('drivers', filter, {
      sort: { created_at: -1 },
      skip: (validPage - 1) * validLimit,
      limit: validLimit
    });

    // Convert MongoDB _id to id for frontend compatibility and add delivery stats placeholder
    const drivers = rawDrivers.map(driver => ({
      ...driver,
      id: driver._id.toString(),
      total_deliveries: 0, // TODO: Calculate actual delivery count
      completed_deliveries: 0, // TODO: Calculate actual completed delivery count
      _id: undefined
    })).map(driver => {
      delete driver._id;
      return driver;
    });

    return {
      drivers,
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
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params as { id: string };

    const driver = await db.findOne('drivers', { _id: new ObjectId(id) });

    if (!driver) {
      return reply.code(404).send({ error: 'Driver not found' });
    }

    // Convert MongoDB _id to id for frontend compatibility and add delivery stats placeholder
    const result = {
      ...driver,
      id: driver._id.toString(),
      total_deliveries: 0, // TODO: Calculate actual delivery count
      completed_deliveries: 0, // TODO: Calculate actual completed delivery count
      _id: undefined
    };
    delete result._id;

    return result;
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

    try {
      // Check if driver with this email already exists
      const existingDriver = await db.findOne('drivers', { email: driverData.email });
      if (existingDriver) {
        return reply.code(400).send({
          error: 'Driver already exists',
          message: 'A driver with this email already exists'
        });
      }

      // Check if user with this email already exists
      const existingUser = await db.findOne('users', { email: driverData.email });
      if (existingUser) {
        return reply.code(400).send({
          error: 'Email already in use',
          message: 'A user with this email already exists in the system'
        });
      }

      // Generate a temporary password for the driver
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Create user account for the driver
      const driverUser = await db.insertOne('users', {
        email: driverData.email,
        password_hash: hashedPassword,
        name: driverData.name,
        phone: driverData.phone,
        role: 'DRIVER',
        status: 'ACTIVE',
        email_verified: true
      });

      // Create driver record
      const newDriverData = {
        user_id: driverUser._id,
        name: driverData.name,
        email: driverData.email,
        phone: driverData.phone,
        license_number: driverData.license_number,
        license_expiry: new Date(driverData.license_expiry),
        vehicle_type: driverData.vehicle_type,
        vehicle_plate: driverData.vehicle_plate,
        status: 'AVAILABLE',
        emergency_contact: driverData.emergency_contact || null
      };

      const newDriver = await db.insertOne('drivers', newDriverData);

      // Convert MongoDB _id to id for frontend compatibility
      const result = {
        ...newDriver,
        id: newDriver._id.toString(),
        _id: undefined
      };
      delete result._id;

      // Log the temporary password (in production, this should be sent via email)
      console.log(`Created driver account for ${driverData.email} with temporary password: ${tempPassword}`);

      reply.code(201);
      return result;
    } catch (error: any) {
      console.error('Error creating driver:', error);
      
      // Handle specific MongoDB errors
      if (error.code === 11000) {
        // Duplicate key error
        if (error.keyPattern?.email) {
          return reply.code(400).send({
            error: 'Email already exists',
            message: 'A user with this email already exists in the system'
          });
        }
        if (error.keyPattern?.license_number) {
          return reply.code(400).send({
            error: 'License number already exists',
            message: 'A driver with this license number already exists'
          });
        }
      }
      
      return reply.code(500).send({
        error: 'Failed to create driver',
        message: 'An error occurred while creating the driver account'
      });
    }
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
          id: { type: 'string' }
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

    const updatedDriver = await db.updateOne('drivers', 
      { _id: new ObjectId(id) }, 
      { $set: { status, updated_at: new Date() } }
    );

    if (!updatedDriver) {
      return reply.code(404).send({ error: 'Driver not found' });
    }

    // Convert MongoDB _id to id for frontend compatibility
    const result = {
      ...updatedDriver,
      id: updatedDriver._id.toString(),
      _id: undefined
    };
    delete result._id;

    return result;
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
          id: { type: 'string' }
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

    const updatedDriver = await db.updateOne('drivers', 
      { _id: new ObjectId(id) }, 
      { $set: { status, last_active: new Date(), updated_at: new Date() } }
    );

    if (!updatedDriver) {
      return reply.code(404).send({ error: 'Driver not found' });
    }

    // Convert MongoDB _id to id for frontend compatibility
    const result = {
      ...updatedDriver,
      id: updatedDriver._id.toString(),
      _id: undefined
    };
    delete result._id;

    return result;
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
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear + 1, 0, 1);
    const countResult = await db.count('inquiries', {
      created_at: { $gte: startOfYear, $lt: endOfYear }
    });
    const sequenceNumber = (countResult + 1).toString().padStart(4, '0');
    const referenceNumber = `INQ-${currentYear}-${sequenceNumber}`;

    // Create inquiry
    const rawInquiry = await db.insertOne('inquiries', {
      reference_number: referenceNumber,
      company_name: inquiryData.company_name,
      industry: inquiryData.industry,
      contact_person: inquiryData.contact_person,
      email: inquiryData.email,
      phone: inquiryData.phone,
      expected_volume: inquiryData.expected_volume,
      service_type: 'General Delivery', // Default service type
      special_requirements: inquiryData.special_requirements,
      status: 'NEW'
    });

    // Convert MongoDB _id to id for frontend compatibility
    const newInquiry = {
      ...rawInquiry,
      id: rawInquiry._id.toString(),
      _id: undefined
    };
    delete newInquiry._id;

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

    // Use MongoDB ObjectId for the query
    const inquiry = await db.findOne('inquiries', { _id: new ObjectId(id) });

    if (!inquiry) {
      reply.code(404);
      return { error: 'Inquiry not found' };
    }

    // Convert MongoDB _id to id for frontend compatibility
    const result = {
      ...inquiry,
      id: inquiry._id.toString(),
      _id: undefined
    };
    delete result._id;

    return result;
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

    const deleted = await db.deleteOne('inquiries', { _id: new ObjectId(id) });

    if (!deleted) {
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
    const rawStaff = await db.findMany('users', 
      { 
        role: { $in: ['ADMIN', 'SUPER_ADMIN'] }, 
        status: 'ACTIVE' 
      },
      { 
        sort: { name: 1 },
        projection: { name: 1, email: 1, role: 1 }
      }
    );

    // Convert MongoDB _id to id for frontend compatibility
    const staff = rawStaff.map(member => ({
      ...member,
      id: member._id.toString(),
      _id: undefined
    })).map(member => {
      delete member._id;
      return member;
    });

    return { staff };
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