import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';
import { UserRole } from '../models/User';
import { requireRoles, authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../config/database';
import { RequestStatus } from '../models/DeliveryRequest';
import { DriverStatus } from '../models/Driver';

export async function driverRoutes(fastify: FastifyInstance) {
  // Apply authentication to all driver routes
  fastify.addHook('preHandler', authenticateToken);
  
  // Driver routes require DRIVER, ADMIN, or SUPER_ADMIN role
  fastify.addHook('preHandler', requireRoles(UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPER_ADMIN));

  // Get driver profile
  fastify.get('/profile', asyncHandler(async (request, reply) => {
    const userId = request.currentUser!.id;
    
    // Find driver by user_id
    const driver = await db.findOne('drivers', { user_id: new ObjectId(userId) });
    
    if (!driver) {
      return reply.code(404).send({ error: 'Driver profile not found' });
    }

    // Get user details
    const user = await db.findOne('users', { _id: new ObjectId(userId) });
    
    return {
      id: driver._id.toString(),
      name: user?.name || driver.name,
      email: user?.email || driver.email,
      phone: user?.phone || driver.phone,
      license_number: driver.license_number,
      vehicle_type: driver.vehicle_type,
      vehicle_plate: driver.vehicle_plate,
      status: driver.status,
      rating: driver.rating || 5.0,
      total_deliveries: driver.total_deliveries || 0,
      current_location: driver.current_location
    };
  }));

  // Get assigned deliveries
  fastify.get('/assignments', asyncHandler(async (request, reply) => {
    const userId = request.currentUser!.id;
    
    // Find driver by user_id
    const driver = await db.findOne('drivers', { user_id: new ObjectId(userId) });
    
    if (!driver) {
      return reply.code(404).send({ error: 'Driver profile not found' });
    }

    // Get assigned delivery requests
    const assignments = await db.findMany('delivery_requests', {
      assigned_driver_id: driver._id,
      status: { $in: [RequestStatus.ASSIGNED, RequestStatus.IN_PROGRESS] }
    }, {
      sort: { created_at: -1 }
    });

    // Format assignments for frontend
    const formattedAssignments = assignments.map(assignment => ({
      id: assignment._id.toString(),
      tracking_number: assignment.tracking_number,
      status: assignment.status,
      pickup_location: assignment.pickup_location,
      delivery_location: assignment.delivery_location,
      package_details: assignment.package_details,
      special_instructions: assignment.special_instructions,
      estimated_cost: assignment.estimated_cost,
      estimated_delivery: assignment.estimated_delivery,
      created_at: assignment.created_at
    }));

    return { assignments: formattedAssignments };
  }));

  // Accept delivery assignment
  fastify.post('/assignments/:id/accept', asyncHandler(async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.currentUser!.id;
    
    // Find driver by user_id
    const driver = await db.findOne('drivers', { user_id: new ObjectId(userId) });
    
    if (!driver) {
      return reply.code(404).send({ error: 'Driver profile not found' });
    }

    // Check if driver is available
    if (driver.status !== DriverStatus.AVAILABLE) {
      return reply.code(400).send({ error: 'Driver is not available' });
    }

    // Find the delivery request
    const deliveryRequest = await db.findOne('delivery_requests', {
      _id: new ObjectId(id),
      assigned_driver_id: driver._id,
      status: RequestStatus.ASSIGNED
    });

    if (!deliveryRequest) {
      return reply.code(404).send({ error: 'Assignment not found or already accepted' });
    }

    // Update delivery request status
    const updatedRequest = await db.updateOne('delivery_requests',
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: RequestStatus.IN_PROGRESS,
          pickup_time: new Date(),
          updated_at: new Date()
        }
      }
    );

    // Update driver status to busy
    await db.updateOne('drivers',
      { _id: driver._id },
      { 
        $set: { 
          status: DriverStatus.BUSY,
          updated_at: new Date()
        }
      }
    );

    return {
      id: updatedRequest._id.toString(),
      status: updatedRequest.status,
      message: 'Assignment accepted successfully'
    };
  }));

  // Complete delivery
  fastify.post('/assignments/:id/complete', asyncHandler(async (request, reply) => {
    const { id } = request.params as { id: string };
    const { delivery_notes, recipient_signature } = request.body as any;
    const userId = request.currentUser!.id;
    
    // Find driver by user_id
    const driver = await db.findOne('drivers', { user_id: new ObjectId(userId) });
    
    if (!driver) {
      return reply.code(404).send({ error: 'Driver profile not found' });
    }

    // Find the delivery request
    const deliveryRequest = await db.findOne('delivery_requests', {
      _id: new ObjectId(id),
      assigned_driver_id: driver._id,
      status: RequestStatus.IN_PROGRESS
    });

    if (!deliveryRequest) {
      return reply.code(404).send({ error: 'Assignment not found or not in progress' });
    }

    // Update delivery request status
    const updatedRequest = await db.updateOne('delivery_requests',
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: RequestStatus.COMPLETED,
          delivery_time: new Date(),
          delivery_notes,
          recipient_signature,
          updated_at: new Date()
        }
      }
    );

    // Update driver stats and status
    await db.updateOne('drivers',
      { _id: driver._id },
      { 
        $set: { 
          status: DriverStatus.AVAILABLE,
          updated_at: new Date()
        },
        $inc: {
          total_deliveries: 1
        }
      }
    );

    return {
      id: updatedRequest._id.toString(),
      status: updatedRequest.status,
      message: 'Delivery completed successfully'
    };
  }));

  // Update driver location
  fastify.post('/location', asyncHandler(async (request, reply) => {
    const { latitude, longitude, accuracy } = request.body as any;
    const userId = request.currentUser!.id;
    
    if (!latitude || !longitude) {
      return reply.code(400).send({ error: 'Latitude and longitude are required' });
    }

    // Find driver by user_id
    const driver = await db.findOne('drivers', { user_id: new ObjectId(userId) });
    
    if (!driver) {
      return reply.code(404).send({ error: 'Driver profile not found' });
    }

    // Update driver location
    await db.updateOne('drivers',
      { _id: driver._id },
      { 
        $set: { 
          current_location: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            accuracy: accuracy || null,
            updated_at: new Date()
          },
          updated_at: new Date()
        }
      }
    );

    return { message: 'Location updated successfully' };
  }));

  // Update driver status
  fastify.put('/status', asyncHandler(async (request, reply) => {
    const { status } = request.body as { status: DriverStatus };
    const userId = request.currentUser!.id;
    
    if (!Object.values(DriverStatus).includes(status)) {
      return reply.code(400).send({ error: 'Invalid status' });
    }

    // Find driver by user_id
    const driver = await db.findOne('drivers', { user_id: new ObjectId(userId) });
    
    if (!driver) {
      return reply.code(404).send({ error: 'Driver profile not found' });
    }

    // Update driver status
    const updatedDriver = await db.updateOne('drivers',
      { _id: driver._id },
      { 
        $set: { 
          status,
          updated_at: new Date()
        }
      }
    );

    return {
      id: updatedDriver._id.toString(),
      status: updatedDriver.status,
      message: 'Status updated successfully'
    };
  }));

  // Upload delivery photos
  fastify.post('/photos/upload', asyncHandler(async (request, reply) => {
    const userId = request.currentUser!.id;
    
    // Find driver by user_id
    const driver = await db.findOne('drivers', { user_id: new ObjectId(userId) });
    
    if (!driver) {
      return reply.code(404).send({ error: 'Driver profile not found' });
    }

    // Handle multipart form data
    const data = await request.file();
    
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const { assignment_id, photo_type } = data.fields as any;
    
    if (!assignment_id || !photo_type) {
      return reply.code(400).send({ error: 'Assignment ID and photo type are required' });
    }

    // Verify assignment belongs to driver
    const assignment = await db.findOne('delivery_requests', {
      _id: new ObjectId(assignment_id.value),
      assigned_driver_id: driver._id
    });

    if (!assignment) {
      return reply.code(404).send({ error: 'Assignment not found' });
    }

    // For now, just store photo metadata (in production, upload to cloud storage)
    const photoRecord = {
      assignment_id: new ObjectId(assignment_id.value),
      driver_id: driver._id,
      photo_type: photo_type.value,
      filename: data.filename,
      mimetype: data.mimetype,
      size: data.file.bytesRead,
      uploaded_at: new Date(),
      // In production, store cloud storage URL here
      storage_url: `/uploads/photos/${assignment_id.value}_${Date.now()}_${data.filename}`
    };

    const result = await db.insertOne('delivery_photos', photoRecord);

    return {
      id: result.insertedId.toString(),
      message: 'Photo uploaded successfully',
      photo_type: photo_type.value
    };
  }));
}