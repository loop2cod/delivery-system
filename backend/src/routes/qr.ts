// QR Code management endpoints for package tracking
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { QRCodeManager, QRCodeData } from '../utils/qr-utils';

interface QRGenerationRequest {
  type: 'package' | 'delivery' | 'inquiry' | 'tracking';
  id: string;
  metadata?: Record<string, any>;
  options?: {
    size?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  };
}

interface BatchQRRequest {
  items: Array<{
    type: 'package' | 'delivery' | 'inquiry' | 'tracking';
    id: string;
    metadata?: Record<string, any>;
  }>;
  options?: {
    size?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  };
}

interface QRScanRequest {
  content: string;
  scannerId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface QRTrackingRequest {
  qrData: string;
}

export async function qrRoutes(fastify: FastifyInstance) {
  const qrManager = new QRCodeManager(process.env.BASE_URL || 'https://delivery.uae.com');

  // Generate single QR code
  fastify.post<{ Body: QRGenerationRequest }>('/qr/generate', {
    preHandler: [authenticateToken],
    schema: {
      body: {
        type: 'object',
        required: ['type', 'id'],
        properties: {
          type: { type: 'string', enum: ['package', 'delivery', 'inquiry', 'tracking'] },
          id: { type: 'string', minLength: 1 },
          metadata: { type: 'object' },
          options: {
            type: 'object',
            properties: {
              size: { type: 'number', minimum: 64, maximum: 2048 },
              margin: { type: 'number', minimum: 0, maximum: 10 },
              errorCorrectionLevel: { type: 'string', enum: ['L', 'M', 'Q', 'H'] }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: QRGenerationRequest }>, reply: FastifyReply) => {
    try {
      const { type, id, metadata = {}, options = {} } = request.body;
      const user = request.currentUser as any;

      // Validate access permissions
      if (!await validateQRAccess(user, type, id)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Insufficient permissions to generate QR code for this item'
        });
      }

      // Generate QR code based on type
      let qrCodeUrl: string;
      let trackingUrl: string;

      const enhancedMetadata = {
        ...metadata,
        generatedBy: user.id,
        generatedAt: new Date().toISOString(),
        userRole: user.role
      };

      switch (type) {
        case 'package':
          qrCodeUrl = await qrManager.generatePackageQR(id, enhancedMetadata, options);
          trackingUrl = `${process.env.BASE_URL}/track/${id}`;
          break;
        case 'delivery':
          qrCodeUrl = await qrManager.generateDeliveryQR(id, enhancedMetadata, options);
          trackingUrl = `${process.env.BASE_URL}/confirm/${id}`;
          break;
        case 'inquiry':
          qrCodeUrl = await qrManager.generateInquiryQR(id, enhancedMetadata, options);
          trackingUrl = `${process.env.BASE_URL}/inquiry/${id}`;
          break;
        case 'tracking':
        default:
          qrCodeUrl = await qrManager.generateTrackingQR(id, enhancedMetadata, options);
          trackingUrl = `${process.env.BASE_URL}/track?id=${id}`;
          break;
      }

      // Log QR generation for audit
      await logQRGeneration(user.id, type, id, enhancedMetadata);

      reply.send({
        success: true,
        qrCode: qrCodeUrl,
        trackingUrl,
        type,
        id,
        metadata: enhancedMetadata,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('[QR Routes] Generate QR failed:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate QR code'
      });
    }
  });

  // Generate batch QR codes
  fastify.post<{ Body: BatchQRRequest }>('/qr/generate/batch', {
    preHandler: [authenticateToken],
    schema: {
      body: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            minItems: 1,
            maxItems: 100,
            items: {
              type: 'object',
              required: ['type', 'id'],
              properties: {
                type: { type: 'string', enum: ['package', 'delivery', 'inquiry', 'tracking'] },
                id: { type: 'string', minLength: 1 },
                metadata: { type: 'object' }
              }
            }
          },
          options: {
            type: 'object',
            properties: {
              size: { type: 'number', minimum: 64, maximum: 2048 },
              margin: { type: 'number', minimum: 0, maximum: 10 },
              errorCorrectionLevel: { type: 'string', enum: ['L', 'M', 'Q', 'H'] }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: BatchQRRequest }>, reply: FastifyReply) => {
    try {
      const { items, options = {} } = request.body;
      const user = request.currentUser as any;

      // Validate access for all items
      for (const item of items) {
        if (!await validateQRAccess(user, item.type, item.id)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: `Insufficient permissions for ${item.type}: ${item.id}`
          });
        }
      }

      // Enhance metadata for all items
      const enhancedItems = items.map(item => ({
        ...item,
        metadata: {
          ...item.metadata,
          generatedBy: user.id,
          generatedAt: new Date().toISOString(),
          userRole: user.role
        }
      }));

      // Generate batch QR codes
      const results = await qrManager.generateBatchQRCodes(enhancedItems, options);

      // Log batch generation
      await Promise.all(
        enhancedItems.map(item => 
          logQRGeneration(user.id, item.type, item.id, item.metadata)
        )
      );

      reply.send({
        success: true,
        results,
        count: results.length,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('[QR Routes] Batch generate QR failed:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate batch QR codes'
      });
    }
  });

  // Scan QR code
  fastify.post<{ Body: QRScanRequest }>('/qr/scan', {
    preHandler: [authenticateToken],
    schema: {
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', minLength: 1 },
          scannerId: { type: 'string' },
          location: {
            type: 'object',
            properties: {
              latitude: { type: 'number', minimum: -90, maximum: 90 },
              longitude: { type: 'number', minimum: -180, maximum: 180 }
            },
            required: ['latitude', 'longitude']
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: QRScanRequest }>, reply: FastifyReply) => {
    try {
      const { content, scannerId, location } = request.body;
      const user = request.currentUser as any;

      // Parse QR code content
      const qrData = qrManager.parseQRData(content);

      if (!qrData) {
        return reply.status(400).send({
          error: 'Invalid QR Code',
          message: 'QR code content is not valid or not from our system'
        });
      }

      // Validate scan permissions
      if (!await validateQRScanAccess(user, qrData)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Insufficient permissions to scan this QR code'
        });
      }

      // Get detailed information based on QR type
      const itemDetails = await getItemDetails(qrData);

      if (!itemDetails) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Item referenced by QR code not found'
        });
      }

      // Log scan event
      await logQRScan(user.id, qrData, scannerId, location);

      // Update item status if applicable (e.g., mark as scanned)
      await updateItemOnScan(qrData, user, location);

      reply.send({
        success: true,
        qrData,
        itemDetails,
        scannedBy: {
          userId: user.id,
          userName: user.name,
          role: user.role
        },
        scannedAt: new Date().toISOString(),
        location
      });
    } catch (error) {
      console.error('[QR Routes] Scan QR failed:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to process QR scan'
      });
    }
  });

  // Track item from QR data
  fastify.post<{ Body: QRTrackingRequest }>('/qr/track', {
    schema: {
      body: {
        type: 'object',
        required: ['qrData'],
        properties: {
          qrData: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: QRTrackingRequest }>, reply: FastifyReply) => {
    try {
      const { qrData: qrContent } = request.body;

      // Parse QR code content
      const qrData = qrManager.parseQRData(qrContent);

      if (!qrData) {
        return reply.status(400).send({
          error: 'Invalid QR Code',
          message: 'QR code content is not valid'
        });
      }

      // Get tracking information
      const trackingInfo = await getTrackingInfo(qrData);

      if (!trackingInfo) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'No tracking information found for this item'
        });
      }

      reply.send({
        success: true,
        qrData,
        trackingInfo,
        lastUpdate: new Date().toISOString()
      });
    } catch (error) {
      console.error('[QR Routes] Track QR failed:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get tracking information'
      });
    }
  });

  // Get QR generation history
  fastify.get('/qr/history', {
    preHandler: [authenticateToken]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.currentUser as any;
      
      // Only admin and business users can view QR history
      if (!['admin', 'business'].includes(user.role)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Insufficient permissions to view QR history'
        });
      }

      const history = await getQRHistory(user);

      reply.send({
        success: true,
        history,
        count: history.length
      });
    } catch (error) {
      console.error('[QR Routes] Get QR history failed:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get QR history'
      });
    }
  });

  // Get QR scan analytics
  fastify.get('/qr/analytics', {
    preHandler: [authenticateToken]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.currentUser as any;
      
      // Only admin users can view QR analytics
      if (user.role !== 'admin') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Admin access required for QR analytics'
        });
      }

      const analytics = await getQRAnalytics();

      reply.send({
        success: true,
        analytics
      });
    } catch (error) {
      console.error('[QR Routes] Get QR analytics failed:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get QR analytics'
      });
    }
  });
}

// Helper functions
async function validateQRAccess(user: any, type: string, id: string): Promise<boolean> {
  try {
    switch (user.role) {
      case 'admin':
        return true; // Admin can generate QR for anything
      
      case 'business':
        // Business users can only generate QR for their own items
        if (type === 'package' || type === 'delivery') {
          const delivery = await db.findOne('deliveries', { id });
          return !!(delivery && (delivery as any).business_id === user.businessId);
        }
        if (type === 'inquiry') {
          const inquiry = await db.findOne('inquiries', { id });
          return !!(inquiry && (inquiry as any).business_id === user.businessId);
        }
        return false;
      
      case 'driver':
        // Drivers can generate QR for deliveries assigned to them
        if (type === 'delivery') {
          const delivery = await db.findOne('deliveries', { id });
          return !!(delivery && (delivery as any).driver_id === user.id);
        }
        return false;
      
      default:
        return false;
    }
  } catch (error) {
    console.error('[QR Routes] Validate access failed:', error);
    return false;
  }
}

async function validateQRScanAccess(user: any, qrData: QRCodeData): Promise<boolean> {
  // All authenticated users can scan QR codes
  // Additional validation can be added based on business rules
  return true;
}

async function logQRGeneration(userId: string, type: string, itemId: string, metadata: any): Promise<void> {
  try {
    await db.insertOne('qr_generations', {
      user_id: userId,
      qr_type: type,
      item_id: itemId,
      metadata: JSON.stringify(metadata),
      created_at: new Date()
    } as any);
  } catch (error) {
    console.error('[QR Routes] Log generation failed:', error);
  }
}

async function logQRScan(
  userId: string, 
  qrData: QRCodeData, 
  scannerId?: string, 
  location?: { latitude: number; longitude: number }
): Promise<void> {
  try {
    await db.insertOne('qr_scans', {
      user_id: userId,
      qr_type: qrData.type,
      item_id: qrData.id,
      scanner_id: scannerId || null,
      location: location ? JSON.stringify(location) : null,
      metadata: JSON.stringify(qrData.metadata),
      scanned_at: new Date()
    } as any);
  } catch (error) {
    console.error('[QR Routes] Log scan failed:', error);
  }
}

async function getItemDetails(qrData: QRCodeData): Promise<any> {
  try {
    switch (qrData.type) {
      case 'package':
      case 'delivery':
        const delivery = await db.findOne('deliveries', { id: qrData.id });
        if (delivery) {
          // Add related business and customer data if needed
          const business = await db.findOne('businesses', { id: (delivery as any).business_id });
          const customer = await db.findOne('customers', { id: (delivery as any).customer_id });
          return {
            ...delivery,
            company_name: business ? (business as any).company_name : null,
            customer_name: customer ? (customer as any).name : null
          };
        }
        return null;
      
      case 'inquiry':
        const inquiry = await db.findOne('inquiries', { id: qrData.id });
        if (inquiry) {
          const customer = await db.findOne('customers', { id: (inquiry as any).customer_id });
          return {
            ...inquiry,
            customer_name: customer ? (customer as any).name : null,
            customer_email: customer ? (customer as any).email : null,
            customer_phone: customer ? (customer as any).phone : null
          };
        }
        return null;
      
      case 'tracking':
        // Try to find in deliveries first, then inquiries
        const trackingDelivery = await db.findOne('deliveries', { tracking_number: qrData.id });
        if (trackingDelivery) {
          return trackingDelivery;
        }
        
        const trackingInquiry = await db.findOne('inquiries', { id: qrData.id });
        return trackingInquiry || null;
      
      default:
        return null;
    }
  } catch (error) {
    console.error('[QR Routes] Get item details failed:', error);
    return null;
  }
}

async function updateItemOnScan(
  qrData: QRCodeData, 
  user: any, 
  location?: { latitude: number; longitude: number }
): Promise<void> {
  try {
    const updateData = {
      last_scanned_by: user.id,
      last_scanned_at: new Date(),
      last_scan_location: location ? JSON.stringify(location) : null
    };

    switch (qrData.type) {
      case 'package':
      case 'delivery':
        await db.updateOne('deliveries', 
          { id: qrData.id },
          { $set: updateData }
        );
        break;
      
      case 'inquiry':
        await db.updateOne('inquiries',
          { id: qrData.id },
          { $set: {
            last_scanned_by: updateData.last_scanned_by,
            last_scanned_at: updateData.last_scanned_at
          }}
        );
        break;
    }
  } catch (error) {
    console.error('[QR Routes] Update item on scan failed:', error);
  }
}

async function getTrackingInfo(qrData: QRCodeData): Promise<any> {
  try {
    switch (qrData.type) {
      case 'package':
      case 'delivery':
        const delivery = await db.findOne('deliveries', { id: qrData.id });
        if (delivery) {
          const business = await db.findOne('businesses', { id: (delivery as any).business_id });
          const driver = await db.findOne('drivers', { id: (delivery as any).driver_id });
          const statusHistory = await db.findMany('delivery_status', 
            { delivery_id: qrData.id },
            { sort: { created_at: -1 } }
          );
          
          return {
            ...delivery,
            company_name: business ? (business as any).company_name : null,
            driver_name: driver ? (driver as any).name : null,
            status_history: statusHistory.map(s => ({
              status: (s as any).status,
              timestamp: (s as any).created_at,
              location: (s as any).location,
              notes: (s as any).notes
            }))
          };
        }
        return null;
      
      case 'inquiry':
        const inquiry = await db.findOne('inquiries', { id: qrData.id });
        if (inquiry) {
          const customer = await db.findOne('customers', { id: (inquiry as any).customer_id });
          const inquiryHistory = await db.findMany('inquiry_history',
            { inquiry_id: qrData.id },
            { sort: { created_at: -1 } }
          );
          
          return {
            ...inquiry,
            customer_name: customer ? (customer as any).name : null,
            status_history: inquiryHistory.map(h => ({
              status: (h as any).status,
              timestamp: (h as any).created_at,
              notes: (h as any).notes
            }))
          };
        }
        return null;
      
      default:
        return null;
    }
  } catch (error) {
    console.error('[QR Routes] Get tracking info failed:', error);
    return null;
  }
}

async function getQRHistory(user: any): Promise<any[]> {
  try {
    const filter = user.role === 'business' ? { user_id: user.id } : {};
    
    const qrGenerations = await db.findMany('qr_generations', filter, {
      sort: { created_at: -1 },
      limit: 100
    });
    
    // Add user names
    const enrichedHistory = await Promise.all(
      qrGenerations.map(async (qg) => {
        const generatedByUser = await db.findOne('users', { id: (qg as any).user_id });
        return {
          ...qg,
          generated_by_name: generatedByUser ? (generatedByUser as any).name : 'Unknown'
        };
      })
    );
    
    return enrichedHistory;
  } catch (error) {
    console.error('[QR Routes] Get QR history failed:', error);
    return [];
  }
}

async function getQRAnalytics(): Promise<any> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const [
      recentGenerations,
      recentScans,
      allGenerations,
      recentGenerationsActivity,
      recentScansActivity
    ] = await Promise.all([
      db.findMany('qr_generations', {
        created_at: { $gte: thirtyDaysAgo }
      }),
      db.findMany('qr_scans', {
        scanned_at: { $gte: thirtyDaysAgo }
      }),
      db.findMany('qr_generations', {}),
      db.findMany('qr_generations', {
        created_at: { $gte: sevenDaysAgo }
      }, { sort: { created_at: -1 }, limit: 25 }),
      db.findMany('qr_scans', {
        scanned_at: { $gte: sevenDaysAgo }
      }, { sort: { scanned_at: -1 }, limit: 25 })
    ]);

    // Calculate type distribution
    const typeDistribution: Record<string, number> = {};
    allGenerations.forEach(gen => {
      const type = (gen as any).qr_type;
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });
    
    const totalGenerations = allGenerations.length;
    const typeDistributionArray = Object.entries(typeDistribution).map(([type, count]) => ({
      qr_type: type,
      count,
      percentage: totalGenerations > 0 ? Math.round((count / totalGenerations) * 100 * 100) / 100 : 0
    }));

    // Combine recent activity
    const recentActivity = [
      ...recentGenerationsActivity.map(g => ({
        activity_type: 'generation',
        qr_type: (g as any).qr_type,
        item_id: (g as any).item_id,
        timestamp: (g as any).created_at,
        user_name: 'Unknown' // Would need to lookup user
      })),
      ...recentScansActivity.map(s => ({
        activity_type: 'scan',
        qr_type: (s as any).qr_type,
        item_id: (s as any).item_id,
        timestamp: (s as any).scanned_at,
        user_name: 'Unknown' // Would need to lookup user
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);

    return {
      generation: {
        stats: [], // Simplified - would need daily grouping
        total: recentGenerations.length
      },
      scans: {
        stats: [], // Simplified - would need daily grouping
        total: recentScans.length
      },
      typeDistribution: typeDistributionArray,
      recentActivity
    };
  } catch (error) {
    console.error('[QR Routes] Get QR analytics failed:', error);
    return {
      generation: { stats: [], total: 0 },
      scans: { stats: [], total: 0 },
      typeDistribution: [],
      recentActivity: []
    };
  }
}

export default qrRoutes;