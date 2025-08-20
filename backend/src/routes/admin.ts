import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';
import { UserRole } from '../models/User';
import { requireRoles, authenticateToken } from '../middleware/auth';
import { db } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import { DeliveryPricing } from '../models/DeliveryPricing';

// Helper function to format dates for frontend compatibility
function formatDatesForFrontend(obj: any): any {
  if (!obj) return obj;
  
  const result = { ...obj };
  
  // Convert common date fields to ISO strings
  const dateFields = ['license_expiry', 'joined_date', 'last_active', 'created_at', 'updated_at'];
  
  dateFields.forEach(field => {
    if (result[field] && result[field] instanceof Date) {
      result[field] = result[field].toISOString();
    } else if (result[field] && typeof result[field] === 'string') {
      // Try to parse and reformat if it's a date string
      const date = new Date(result[field]);
      if (!isNaN(date.getTime())) {
        result[field] = date.toISOString();
      }
    }
  });
  
  return result;
}

// Helper function to convert MongoDB document to frontend format
function convertMongoDocToFrontend(doc: any): any {
  if (!doc) return doc;
  
  const result = formatDatesForFrontend({
    ...doc,
    id: doc._id?.toString(),
    _id: undefined
  });
  
  delete result._id;
  return result;
}

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
        totalRevenue: (stats[7][0] as any)?.total || 0
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
    const adminId = request.currentUser!.id;

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
          company_id: newCompany._id.toString(),
          user_id: businessUserId.toString(),
          is_primary: true,
          created_at: new Date(),
          updated_at: new Date()
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
      id: (rawUpdatedInquiry._id as any).toString(),
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

    // Convert MongoDB _id to id for frontend compatibility and format dates
    const result = {
      ...updatedDriver,
      id: (updatedDriver._id as any).toString(),
      license_expiry: (updatedDriver as any).license_expiry?.toISOString(),
      joined_date: (updatedDriver as any).joined_date?.toISOString(),
      last_active: (updatedDriver as any).last_active?.toISOString(),
      created_at: (updatedDriver as any).created_at?.toISOString(),
      updated_at: (updatedDriver as any).updated_at?.toISOString(),
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
      company_id: id,
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
      _id: new ObjectId(companyUserRelation.user_id),
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
      filter.availability_status = availability;
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
      ...convertMongoDocToFrontend(driver),
      total_deliveries: 0, // TODO: Calculate actual delivery count
      completed_deliveries: 0, // TODO: Calculate actual completed delivery count
    }));

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
      ...convertMongoDocToFrontend(driver),
      total_deliveries: 0, // TODO: Calculate actual delivery count
      completed_deliveries: 0, // TODO: Calculate actual completed delivery count
    };

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
      const now = new Date();
      const newDriverData = {
        user_id: driverUser._id,
        name: driverData.name,
        email: driverData.email,
        phone: driverData.phone,
        license_number: driverData.license_number,
        license_expiry: new Date(driverData.license_expiry),
        vehicle_type: driverData.vehicle_type,
        vehicle_plate: driverData.vehicle_plate,
        status: 'ACTIVE', // Employment status
        availability_status: 'AVAILABLE', // Current availability
        rating: 5.0, // Default rating
        total_deliveries: 0,
        completed_deliveries: 0,
        documents_verified: false,
        emergency_contact: driverData.emergency_contact || null,
        joined_date: now,
        last_active: now
      };

      const newDriver = await db.insertOne('drivers', newDriverData);

      // Convert MongoDB _id to id for frontend compatibility and format dates
      const result = convertMongoDocToFrontend(newDriver);

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

    // Convert MongoDB _id to id for frontend compatibility and format dates
    const result = {
      ...updatedDriver,
      id: (updatedDriver._id as any).toString(),
      license_expiry: (updatedDriver as any).license_expiry?.toISOString(),
      joined_date: (updatedDriver as any).joined_date?.toISOString(),
      last_active: (updatedDriver as any).last_active?.toISOString(),
      created_at: (updatedDriver as any).created_at?.toISOString(),
      updated_at: (updatedDriver as any).updated_at?.toISOString(),
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
        required: ['availability_status'],
        properties: {
          availability_status: { type: 'string', enum: ['AVAILABLE', 'BUSY', 'OFFLINE'] }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params as { id: string };
    const { availability_status } = request.body as { availability_status: string };

    const updatedDriver = await db.updateOne('drivers', 
      { _id: new ObjectId(id) }, 
      { $set: { availability_status, last_active: new Date(), updated_at: new Date() } }
    );

    if (!updatedDriver) {
      return reply.code(404).send({ error: 'Driver not found' });
    }

    // Convert MongoDB _id to id for frontend compatibility and format dates
    const result = {
      ...updatedDriver,
      id: (updatedDriver._id as any).toString(),
      license_expiry: (updatedDriver as any).license_expiry?.toISOString(),
      joined_date: (updatedDriver as any).joined_date?.toISOString(),
      last_active: (updatedDriver as any).last_active?.toISOString(),
      created_at: (updatedDriver as any).created_at?.toISOString(),
      updated_at: (updatedDriver as any).updated_at?.toISOString(),
      _id: undefined
    };
    delete result._id;

    return result;
  }));

  // Reset password for driver
  fastify.post('/drivers/:id/reset-password', {
    schema: {
      description: 'Reset password for driver',
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

    // Find the driver first
    const driver = await db.findOne('drivers', { _id: new ObjectId(id) });

    if (!driver) {
      return reply.code(404).send({
        error: 'Driver not found',
        message: 'Driver not found'
      });
    }

    // Find the user associated with this driver
    const user = await db.findOne('users', {
      _id: driver.user_id,
      role: 'DRIVER'
    });

    if (!user) {
      return reply.code(404).send({
        error: 'Driver user not found',
        message: 'No user account found for this driver'
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
    console.log(`Password reset for driver ${user.email} (${driver.name || user.name}). New password: ${newPassword}`);

    return {
      message: `Password reset successfully for ${driver.name || user.name} (${user.email})`,
      newPassword: newPassword
    };
  }));

  // Assign delivery request to driver
  fastify.post('/drivers/:driverId/assign/:requestId', {
    schema: {
      description: 'Assign delivery request to driver',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          driverId: { type: 'string' },
          requestId: { type: 'string' }
        },
        required: ['driverId', 'requestId']
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { driverId, requestId } = request.params as { driverId: string; requestId: string };

    // Find the driver
    const driver = await db.findOne('drivers', { _id: new ObjectId(driverId) });
    if (!driver) {
      return reply.code(404).send({ error: 'Driver not found' });
    }

    // Find the delivery request
    const deliveryRequest = await db.findOne('delivery_requests', { _id: new ObjectId(requestId) });
    if (!deliveryRequest) {
      return reply.code(404).send({ error: 'Delivery request not found' });
    }

    // Check if request is already assigned
    if (deliveryRequest.status !== 'PENDING') {
      return reply.code(400).send({ error: 'Delivery request is not available for assignment' });
    }

    // Assign the request to the driver
    const updatedRequest = await db.updateOne('delivery_requests',
      { _id: new ObjectId(requestId) },
      { 
        $set: { 
          assigned_driver_id: new ObjectId(driverId),
          status: 'ASSIGNED',
          updated_at: new Date()
        }
      }
    );

    return {
      message: 'Delivery request assigned successfully',
      assignment: {
        driver_id: driverId,
        request_id: requestId,
        status: 'ASSIGNED'
      }
    };
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
    const adminId = request.currentUser!.id;

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
    const adminId = request.currentUser!.id;

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

  // Get all staff members
  fastify.get('/staff', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', default: '1' },
          limit: { type: 'string', default: '10' },
          search: { type: 'string' },
          role: { type: 'string' }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { page = '1', limit = '10', search, role } = request.query as any;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter
    const filter: any = {
      role: { $in: ['STAFF', 'ADMIN', 'SUPER_ADMIN'] }
    };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      filter.role = role;
    }

    const staff = await db.findMany('users', filter, {
      skip,
      limit: parseInt(limit),
      sort: { created_at: -1 }
    });

    const total = await db.count('users', filter);

    // Convert to frontend format
    const formattedStaff = staff.map(convertMongoDocToFrontend);

    return {
      staff: formattedStaff,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }));

  // Create new staff member
  fastify.post('/staff', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'email', 'password', 'role'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          role: { type: 'string', enum: ['STAFF', 'ADMIN'] },
          permissions: {
            type: 'object',
            properties: {
              dashboard: { type: 'boolean' },
              companies: { type: 'boolean' },
              drivers: { type: 'boolean' },
              inquiries: { type: 'boolean' },
              qr_management: { type: 'boolean' },
              settings: { type: 'boolean' }
            }
          }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { name, email, password, role, permissions } = request.body as any;

    // Check if email already exists
    const existingUser = await db.findOne('users', { email: email.toLowerCase() });
    if (existingUser) {
      return reply.code(409).send({ error: 'Email already in use' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Default permissions based on role
    const defaultPermissions = {
      dashboard: true,
      companies: role === 'ADMIN',
      drivers: role === 'ADMIN',
      inquiries: role === 'ADMIN',
      qr_management: true,
      settings: role === 'ADMIN'
    };

    const staffData = {
      name,
      email: email.toLowerCase(),
      password_hash,
      role,
      permissions: permissions || defaultPermissions,
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date()
    };

    const newStaff = await db.insertOne('users', staffData);

    return {
      message: 'Staff member created successfully',
      staff: convertMongoDocToFrontend(newStaff)
    };
  }));

  // Get single staff member
  fastify.get('/staff/:id', asyncHandler(async (request, reply) => {
    const { id } = request.params as any;

    if (!ObjectId.isValid(id)) {
      return reply.code(400).send({ error: 'Invalid staff ID' });
    }

    const staff = await db.findOne('users', { _id: new ObjectId(id) });

    if (!staff) {
      return reply.code(404).send({ error: 'Staff member not found' });
    }

    return {
      staff: convertMongoDocToFrontend(staff)
    };
  }));

  // Update staff member
  fastify.put('/staff/:id', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['STAFF', 'ADMIN'] },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
          permissions: {
            type: 'object',
            properties: {
              dashboard: { type: 'boolean' },
              companies: { type: 'boolean' },
              drivers: { type: 'boolean' },
              inquiries: { type: 'boolean' },
              qr_management: { type: 'boolean' },
              settings: { type: 'boolean' }
            }
          }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params as any;
    const updates = request.body as any;

    if (!ObjectId.isValid(id)) {
      return reply.code(400).send({ error: 'Invalid staff ID' });
    }

    // Prevent editing super admin
    const existingStaff = await db.findOne('users', { _id: new ObjectId(id) });
    if (!existingStaff) {
      return reply.code(404).send({ error: 'Staff member not found' });
    }

    if (existingStaff.role === 'SUPER_ADMIN') {
      return reply.code(403).send({ error: 'Cannot edit super admin account' });
    }

    // Check email uniqueness if email is being updated
    if (updates.email && updates.email !== existingStaff.email) {
      const emailExists = await db.findOne('users', { 
        email: updates.email.toLowerCase(),
        _id: { $ne: new ObjectId(id) }
      });
      
      if (emailExists) {
        return reply.code(409).send({ error: 'Email already in use' });
      }
    }

    const updateData = {
      ...updates,
      updated_at: new Date()
    };

    if (updates.email) {
      updateData.email = updates.email.toLowerCase();
    }

    const updatedStaff = await db.updateOne('users', 
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (!updatedStaff) {
      return reply.code(404).send({ error: 'Staff member not found' });
    }

    return {
      message: 'Staff member updated successfully',
      staff: convertMongoDocToFrontend(updatedStaff)
    };
  }));

  // Delete staff member
  fastify.delete('/staff/:id', asyncHandler(async (request, reply) => {
    const { id } = request.params as any;

    if (!ObjectId.isValid(id)) {
      return reply.code(400).send({ error: 'Invalid staff ID' });
    }

    // Check if it's a super admin
    const staff = await db.findOne('users', { _id: new ObjectId(id) });
    if (!staff) {
      return reply.code(404).send({ error: 'Staff member not found' });
    }

    if (staff.role === 'SUPER_ADMIN') {
      return reply.code(403).send({ error: 'Cannot delete super admin account' });
    }

    const deleted = await db.deleteOne('users', { _id: new ObjectId(id) });

    if (!deleted) {
      return reply.code(404).send({ error: 'Staff member not found' });
    }

    return {
      message: 'Staff member deleted successfully'
    };
  }));

  // Reset staff password
  fastify.post('/staff/:id/reset-password', {
    schema: {
      body: {
        type: 'object',
        required: ['newPassword'],
        properties: {
          newPassword: { type: 'string', minLength: 8 }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params as any;
    const { newPassword } = request.body as any;

    if (!ObjectId.isValid(id)) {
      return reply.code(400).send({ error: 'Invalid staff ID' });
    }

    // Hash new password
    const password_hash = await bcrypt.hash(newPassword, 10);

    const updatedStaff = await db.updateOne('users',
      { _id: new ObjectId(id) },
      { 
        $set: { 
          password_hash,
          updated_at: new Date()
        }
      }
    );

    if (!updatedStaff) {
      return reply.code(404).send({ error: 'Staff member not found' });
    }

    return {
      message: 'Password reset successfully'
    };
  }));

  // Delivery Pricing Management Endpoints

  // Get all pricing configurations
  fastify.get('/pricing', asyncHandler(async (request, reply) => {
    const { type = 'all' } = request.query as any;
    
    let filter: any = {};
    
    if (type === 'default') {
      filter = { isDefault: true, companyId: { $exists: false } };
    } else if (type === 'company') {
      filter = { companyId: { $exists: true } };
    }

    const pricingConfigs = await DeliveryPricing.find(filter)
      .sort({ isDefault: -1, createdAt: -1 });

    return {
      pricing: pricingConfigs
    };
  }));

  // Get default pricing
  fastify.get('/pricing/default', asyncHandler(async (request, reply) => {
    const defaultPricing = await DeliveryPricing.findOne({ 
      isDefault: true, 
      companyId: { $exists: false } 
    });

    if (!defaultPricing) {
      return reply.code(404).send({ error: 'Default pricing not found' });
    }

    return {
      pricing: defaultPricing
    };
  }));

  // Create or update default pricing
  fastify.post('/pricing/default', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'tiers'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          tiers: {
            type: 'array',
            items: {
              type: 'object',
              required: ['minWeight', 'type', 'price'],
              properties: {
                minWeight: { type: 'number', minimum: 0 },
                maxWeight: { type: 'number', minimum: 0 },
                type: { type: 'string', enum: ['fixed', 'per_kg'] },
                price: { type: 'number', minimum: 0 }
              }
            }
          }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { name, description, tiers } = request.body as any;

    // Validate tiers
    if (!tiers || tiers.length === 0) {
      return reply.code(400).send({ error: 'At least one pricing tier is required' });
    }

    // Sort tiers by minWeight and validate
    const sortedTiers = [...tiers].sort((a, b) => a.minWeight - b.minWeight);
    
    // Validate tier structure
    for (let i = 0; i < sortedTiers.length; i++) {
      const current = sortedTiers[i];
      const next = sortedTiers[i + 1];
      
      if (current.maxWeight && current.maxWeight <= current.minWeight) {
        return reply.code(400).send({ 
          error: `Invalid tier: maxWeight must be greater than minWeight for tier ${i + 1}` 
        });
      }
      
      if (next && current.maxWeight && current.maxWeight < next.minWeight) {
        return reply.code(400).send({ 
          error: `Gap detected between tier ${i + 1} and tier ${i + 2}` 
        });
      }
    }

    try {
      // Get all companies to sync pricing
      const companies = await db.findMany('companies', {});
      
      // Remove existing default pricing
      await DeliveryPricing.deleteMany({ 
        isDefault: true, 
        companyId: { $exists: false } 
      });

      // Create new default pricing
      const defaultPricingData = {
        name,
        description,
        tiers: sortedTiers,
        isActive: true,
        isDefault: true
      };

      const newDefaultPricing = new DeliveryPricing(defaultPricingData);
      await newDefaultPricing.save();

      // Sync default pricing to all companies that don't have custom pricing
      // or create company-specific pricing for companies that don't have any
      let syncedCount = 0;
      let createdCount = 0;
      let skippedCount = 0;

      for (const company of companies) {
        const existingPricing = await DeliveryPricing.findOne({ 
          companyId: company._id.toString() 
        });

        if (!existingPricing) {
          // Create company-specific pricing based on default
          const companyPricingData = {
            name: `${name} - ${company.name}`,
            description: description || `Delivery pricing for ${company.name}`,
            tiers: sortedTiers,
            isActive: true,
            isDefault: false,
            companyId: company._id.toString(),
            isCustomized: false // Mark as not customized, synced with default
          };

          const companyPricing = new DeliveryPricing(companyPricingData);
          await companyPricing.save();
          createdCount++;
        } else if (!existingPricing.isCustomized) {
          // Update existing company pricing with new default values
          // Only if it hasn't been manually customized
          existingPricing.name = `${name} - ${company.name}`;
          existingPricing.description = description || `Delivery pricing for ${company.name}`;
          existingPricing.tiers = sortedTiers;
          await existingPricing.save();
          syncedCount++;
        } else {
          // Skip companies with customized pricing
          skippedCount++;
        }
      }

      return {
        message: 'Default pricing updated and synced to companies successfully',
        pricing: newDefaultPricing,
        syncStats: {
          companiesUpdated: syncedCount,
          companiesCreated: createdCount,
          companiesSkipped: skippedCount,
          totalCompanies: companies.length
        }
      };
    } catch (error: any) {
      return reply.code(500).send({ 
        error: 'Failed to update pricing',
        details: error.message 
      });
    }
  }));

  // Get pricing for a specific company
  fastify.get('/pricing/company/:companyId', asyncHandler(async (request, reply) => {
    const { companyId } = request.params as any;

    if (!ObjectId.isValid(companyId)) {
      return reply.code(400).send({ error: 'Invalid company ID' });
    }

    // Check if company exists
    const company = await db.findOne('companies', { _id: new ObjectId(companyId) });
    if (!company) {
      return reply.code(404).send({ error: 'Company not found' });
    }

    // First try to get company-specific pricing
    let pricing = await DeliveryPricing.findOne({ 
      companyId, 
      isActive: true 
    });

    if (pricing) {
      return {
        pricing,
        isCustom: !!pricing.companyId
      };
    }

    // If no company-specific pricing exists, check for default pricing
    const defaultPricing = await DeliveryPricing.findOne({ 
      isDefault: true, 
      isActive: true,
      companyId: { $exists: false }
    });

    if (!defaultPricing) {
      return reply.code(404).send({ error: 'No pricing configuration found. Please set up default pricing first.' });
    }

    // Create company-specific pricing based on default
    const companyPricingData = {
      name: `${defaultPricing.name} - ${company.name}`,
      description: defaultPricing.description || `Delivery pricing for ${company.name}`,
      tiers: defaultPricing.tiers,
      isActive: true,
      isDefault: false,
      companyId,
      isCustomized: false // Mark as synced with default
    };

    pricing = new DeliveryPricing(companyPricingData);
    await pricing.save();

    return {
      pricing,
      isCustom: false // It's synced with default, not custom
    };
  }));

  // Set custom pricing for a company
  fastify.post('/pricing/company/:companyId', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'tiers'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          tiers: {
            type: 'array',
            items: {
              type: 'object',
              required: ['minWeight', 'type', 'price'],
              properties: {
                minWeight: { type: 'number', minimum: 0 },
                maxWeight: { type: 'number', minimum: 0 },
                type: { type: 'string', enum: ['fixed', 'per_kg'] },
                price: { type: 'number', minimum: 0 }
              }
            }
          }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { companyId } = request.params as any;
    const { name, description, tiers } = request.body as any;

    if (!ObjectId.isValid(companyId)) {
      return reply.code(400).send({ error: 'Invalid company ID' });
    }

    // Check if company exists
    const company = await db.findOne('companies', { _id: new ObjectId(companyId) });
    if (!company) {
      return reply.code(404).send({ error: 'Company not found' });
    }

    // Validate tiers (same validation as default pricing)
    if (!tiers || tiers.length === 0) {
      return reply.code(400).send({ error: 'At least one pricing tier is required' });
    }

    const sortedTiers = [...tiers].sort((a, b) => a.minWeight - b.minWeight);

    try {
      // Remove existing company-specific pricing
      await DeliveryPricing.deleteMany({ companyId });

      // Create new company-specific pricing
      const pricingData = {
        name,
        description,
        tiers: sortedTiers,
        isActive: true,
        isDefault: false,
        companyId,
        isCustomized: true // Mark as customized since it's manually set
      };

      const newPricing = new DeliveryPricing(pricingData);
      await newPricing.save();

      return {
        message: 'Company pricing updated successfully',
        pricing: newPricing
      };
    } catch (error: any) {
      return reply.code(500).send({ 
        error: 'Failed to update company pricing',
        details: error.message 
      });
    }
  }));

  // Remove custom pricing for a company (revert to default)
  fastify.delete('/pricing/company/:companyId', asyncHandler(async (request, reply) => {
    const { companyId } = request.params as any;

    if (!ObjectId.isValid(companyId)) {
      return reply.code(400).send({ error: 'Invalid company ID' });
    }

    // Check if company exists
    const company = await db.findOne('companies', { _id: new ObjectId(companyId) });
    if (!company) {
      return reply.code(404).send({ error: 'Company not found' });
    }

    // Get default pricing to sync with
    const defaultPricing = await DeliveryPricing.findOne({ 
      isDefault: true, 
      companyId: { $exists: false } 
    });

    if (!defaultPricing) {
      return reply.code(404).send({ error: 'No default pricing found to sync with' });
    }

    // Remove existing company-specific pricing
    await DeliveryPricing.deleteMany({ companyId });

    // Create new company pricing based on default (not customized)
    const companyPricingData = {
      name: `${defaultPricing.name} - ${company.name}`,
      description: defaultPricing.description || `Delivery pricing for ${company.name}`,
      tiers: defaultPricing.tiers,
      isActive: true,
      isDefault: false,
      companyId,
      isCustomized: false // Mark as synced with default
    };

    const newPricing = new DeliveryPricing(companyPricingData);
    await newPricing.save();

    return {
      message: 'Company pricing reset to default successfully',
      pricing: newPricing
    };
  }));

  // Sync all companies with default pricing (utility endpoint)
  fastify.post('/pricing/sync-all', asyncHandler(async (request, reply) => {
    try {
      // Get default pricing
      const defaultPricing = await DeliveryPricing.findOne({ 
        isDefault: true, 
        isActive: true,
        companyId: { $exists: false }
      });

      if (!defaultPricing) {
        return reply.code(404).send({ error: 'No default pricing found. Please set up default pricing first.' });
      }

      // Get all companies
      const companies = await db.findMany('companies', {});
      
      let syncedCount = 0;
      let skippedCount = 0;

      for (const company of companies) {
        const existingPricing = await DeliveryPricing.findOne({ 
          companyId: company._id.toString() 
        });

        if (!existingPricing) {
          // Create company-specific pricing based on default
          const companyPricingData = {
            name: `${defaultPricing.name} - ${company.name}`,
            description: defaultPricing.description || `Delivery pricing for ${company.name}`,
            tiers: defaultPricing.tiers,
            isActive: true,
            isDefault: false,
            companyId: company._id.toString(),
            isCustomized: false // Mark as synced with default
          };

          const companyPricing = new DeliveryPricing(companyPricingData);
          await companyPricing.save();
          syncedCount++;
        } else {
          skippedCount++;
        }
      }

      return {
        message: 'Companies synced with default pricing successfully',
        syncStats: {
          companiesCreated: syncedCount,
          companiesSkipped: skippedCount,
          totalCompanies: companies.length
        }
      };
    } catch (error: any) {
      return reply.code(500).send({ 
        error: 'Failed to sync companies with default pricing',
        details: error.message 
      });
    }
  }));

  // Calculate price for a given weight and company
  fastify.post('/pricing/calculate', {
    schema: {
      body: {
        type: 'object',
        required: ['weight'],
        properties: {
          weight: { type: 'number', minimum: 0.1 },
          companyId: { type: 'string' }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { weight, companyId } = request.body as any;

    if (companyId && !ObjectId.isValid(companyId)) {
      return reply.code(400).send({ error: 'Invalid company ID' });
    }

    const pricing = await DeliveryPricing.getPricingForCompany(companyId);

    if (!pricing) {
      return reply.code(404).send({ error: 'No pricing configuration found' });
    }

    const calculatedPrice = pricing.calculatePrice(weight);

    return {
      weight,
      price: calculatedPrice,
      currency: 'AED',
      pricingName: pricing.name,
      isCustomPricing: !!pricing.companyId
    };
  }));

  // Business Delivery Requests Management

  // Get all delivery requests from businesses
  fastify.get('/requests', {
    schema: {
      description: 'Get all delivery requests from businesses with pagination and filtering',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
          status: { type: 'string' },
          priority: { type: 'string' },
          companyId: { type: 'string' },
          search: { type: 'string' },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      priority, 
      companyId, 
      search, 
      dateFrom, 
      dateTo 
    } = request.query as any;

    // Validate pagination parameters
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.max(1, Math.min(100, parseInt(limit) || 20));

    // Build MongoDB filter
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (companyId && ObjectId.isValid(companyId)) {
      filter.companyId = companyId;
    }

    if (search) {
      filter.$or = [
        { requestNumber: { $regex: search, $options: 'i' } },
        { pickupContactName: { $regex: search, $options: 'i' } },
        { deliveryContactName: { $regex: search, $options: 'i' } },
        { pickupAddress: { $regex: search, $options: 'i' } },
        { deliveryAddress: { $regex: search, $options: 'i' } }
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.createdAt.$lte = new Date(dateTo);
      }
    }

    // Get total count
    const total = await db.count('delivery_requests', filter);

    // Get requests with pagination
    const rawRequests = await db.findMany('delivery_requests', filter, {
      sort: { createdAt: -1 },
      skip: (validPage - 1) * validLimit,
      limit: validLimit
    });

    // Enrich requests with company information
    const enrichedRequests = await Promise.all(
      rawRequests.map(async (request: any) => {
        // Get company details
        let company = null;
        if (request.companyId) {
          company = await db.findOne('companies', { _id: new ObjectId(request.companyId) });
        }

        return {
          ...request,
          id: request._id.toString(),
          _id: undefined,
          company: company ? {
            id: company._id.toString(),
            name: company.name,
            contactPerson: company.contact_person,
            email: company.email,
            phone: company.phone
          } : null
        };
      })
    );

    return {
      requests: enrichedRequests,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        pages: Math.ceil(total / validLimit)
      }
    };
  }));

  // Get single delivery request details
  fastify.get('/requests/:id', {
    schema: {
      description: 'Get delivery request details by ID',
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

    if (!ObjectId.isValid(id)) {
      return reply.code(400).send({ error: 'Invalid request ID' });
    }

    const deliveryRequest = await db.findOne('delivery_requests', { _id: new ObjectId(id) });

    if (!deliveryRequest) {
      return reply.code(404).send({ error: 'Delivery request not found' });
    }

    // Get company details
    let company = null;
    if (deliveryRequest.companyId) {
      company = await db.findOne('companies', { _id: new ObjectId(deliveryRequest.companyId) });
    }

    // Get user who created the request
    let user = null;
    if (deliveryRequest.userId) {
      user = await db.findOne('users', { _id: new ObjectId(deliveryRequest.userId) });
    }

    const enrichedRequest = {
      ...deliveryRequest,
      id: deliveryRequest._id.toString(),
      _id: undefined,
      company: company ? {
        id: company._id.toString(),
        name: company.name,
        contactPerson: company.contact_person,
        email: company.email,
        phone: company.phone,
        industry: company.industry
      } : null,
      createdBy: user ? {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      } : null
    };

    return { request: enrichedRequest };
  }));

  // Update delivery request status
  fastify.put('/requests/:id/status', {
    schema: {
      description: 'Update delivery request status',
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
          status: { 
            type: 'string', 
            enum: ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'] 
          },
          notes: { type: 'string' },
          driverId: { type: 'string' }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status, notes, driverId } = request.body as any;

    if (!ObjectId.isValid(id)) {
      return reply.code(400).send({ error: 'Invalid request ID' });
    }

    // Validate driver if provided
    if (driverId && !ObjectId.isValid(driverId)) {
      return reply.code(400).send({ error: 'Invalid driver ID' });
    }

    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (notes) {
      updateData.adminNotes = notes;
    }

    if (driverId) {
      // Verify driver exists and is available
      const driver = await db.findOne('drivers', { _id: new ObjectId(driverId) });
      if (!driver) {
        return reply.code(404).send({ error: 'Driver not found' });
      }
      
      updateData.assignedDriverId = driverId;
      updateData.assignedAt = new Date();
    }

    const updatedRequest = await db.updateOne('delivery_requests', 
      { _id: new ObjectId(id) }, 
      { $set: updateData }
    );

    if (!updatedRequest) {
      return reply.code(404).send({ error: 'Delivery request not found' });
    }

    // If assigning to driver, update driver availability
    if (driverId && status === 'ASSIGNED') {
      await db.updateOne('drivers', 
        { _id: new ObjectId(driverId) }, 
        { $set: { availability_status: 'BUSY', last_active: new Date() } }
      );
    }

    return {
      ...updatedRequest,
      id: (updatedRequest._id as any).toString(),
      _id: undefined
    };
  }));

  // Assign driver to delivery request
  fastify.post('/requests/:id/assign-driver', {
    schema: {
      description: 'Assign driver to delivery request',
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
        required: ['driverId'],
        properties: {
          driverId: { type: 'string' },
          notes: { type: 'string' }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params as { id: string };
    const { driverId, notes } = request.body as any;

    if (!ObjectId.isValid(id) || !ObjectId.isValid(driverId)) {
      return reply.code(400).send({ error: 'Invalid request or driver ID' });
    }

    // Verify request exists and is assignable
    const deliveryRequest = await db.findOne('delivery_requests', { _id: new ObjectId(id) });
    if (!deliveryRequest) {
      return reply.code(404).send({ error: 'Delivery request not found' });
    }

    if (!['PENDING', 'ASSIGNED'].includes(deliveryRequest.status)) {
      return reply.code(400).send({ error: 'Request cannot be assigned in current status' });
    }

    // Verify driver exists and is available
    const driver = await db.findOne('drivers', { _id: new ObjectId(driverId) });
    if (!driver) {
      return reply.code(404).send({ error: 'Driver not found' });
    }

    if (driver.availability_status !== 'AVAILABLE') {
      return reply.code(400).send({ error: 'Driver is not available' });
    }

    // Update request
    const updateData = {
      status: 'ASSIGNED',
      assignedDriverId: driverId,
      assignedAt: new Date(),
      adminNotes: notes || '',
      updatedAt: new Date()
    };

    const updatedRequest = await db.updateOne('delivery_requests',
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    // Update driver availability
    await db.updateOne('drivers',
      { _id: new ObjectId(driverId) },
      { $set: { availability_status: 'BUSY', last_active: new Date() } }
    );

    return {
      message: 'Driver assigned successfully',
      request: {
        ...updatedRequest,
        id: (updatedRequest._id as any).toString(),
        _id: undefined
      },
      driver: {
        ...convertMongoDocToFrontend(driver)
      }
    };
  }));

  // Get delivery requests statistics for admin dashboard
  fastify.get('/requests/stats', {
    schema: {
      description: 'Get delivery requests statistics',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['today', 'week', 'month', 'all'], default: 'all' },
          companyId: { type: 'string' }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { period = 'all', companyId } = request.query as any;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case 'today':
        dateFilter = { createdAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) } };
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: weekAgo } };
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: monthAgo } };
        break;
    }

    const filter: any = { ...dateFilter };
    if (companyId && ObjectId.isValid(companyId)) {
      filter.companyId = companyId;
    }

    // Get status breakdown
    const statusStats = await db.aggregate('delivery_requests', [
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get priority breakdown
    const priorityStats = await db.aggregate('delivery_requests', [
      { $match: filter },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Get top companies by request volume
    const topCompanies = await db.aggregate('delivery_requests', [
      { $match: filter },
      { $group: { _id: '$companyId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Enrich top companies with company details
    const enrichedTopCompanies = await Promise.all(
      topCompanies.map(async (item: any) => {
        if (item._id) {
          const company = await db.findOne('companies', { _id: new ObjectId(item._id) });
          return {
            company: company ? {
              id: company._id.toString(),
              name: company.name,
              industry: company.industry
            } : { id: item._id, name: 'Unknown Company' },
            requestCount: item.count
          };
        }
        return null;
      })
    );

    // Calculate total revenue
    const revenueStats = await db.aggregate('delivery_requests', [
      { $match: { ...filter, status: 'DELIVERED' } },
      { 
        $group: { 
          _id: null, 
          totalRevenue: { 
            $sum: { 
              $ifNull: ['$actualCost', '$estimatedCost'] 
            } 
          },
          count: { $sum: 1 }
        } 
      }
    ]);

    return {
      totalRequests: await db.count('delivery_requests', filter),
      statusBreakdown: statusStats.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      priorityBreakdown: priorityStats.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topCompanies: enrichedTopCompanies.filter(Boolean),
      revenue: {
        total: (revenueStats[0] as any)?.totalRevenue || 0,
        deliveredCount: (revenueStats[0] as any)?.count || 0,
        averageValue: (revenueStats[0] as any)?.count > 0 
          ? Math.round(((revenueStats[0] as any).totalRevenue || 0) / (revenueStats[0] as any).count) 
          : 0
      }
    };
  }));
}

export default adminRoutes;