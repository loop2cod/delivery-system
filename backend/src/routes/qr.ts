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
      const user = request.user as any;

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
      const user = request.user as any;

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
      const user = request.user as any;

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
      const user = request.user as any;
      
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
      const user = request.user as any;
      
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
          const delivery = await db.query(
            'SELECT business_id FROM deliveries WHERE id = $1',
            [id]
          );
          return delivery.rows.length > 0 && delivery.rows[0].business_id === user.businessId;
        }
        if (type === 'inquiry') {
          const inquiry = await db.query(
            'SELECT business_id FROM inquiries WHERE id = $1',
            [id]
          );
          return inquiry.rows.length > 0 && inquiry.rows[0].business_id === user.businessId;
        }
        return false;
      
      case 'driver':
        // Drivers can generate QR for deliveries assigned to them
        if (type === 'delivery') {
          const delivery = await db.query(
            'SELECT driver_id FROM deliveries WHERE id = $1',
            [id]
          );
          return delivery.rows.length > 0 && delivery.rows[0].driver_id === user.id;
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
    await db.query(`
      INSERT INTO qr_generations (user_id, qr_type, item_id, metadata, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [userId, type, itemId, JSON.stringify(metadata)]);
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
    await db.query(`
      INSERT INTO qr_scans (user_id, qr_type, item_id, scanner_id, location, metadata, scanned_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      userId,
      qrData.type,
      qrData.id,
      scannerId,
      location ? JSON.stringify(location) : null,
      JSON.stringify(qrData.metadata)
    ]);
  } catch (error) {
    console.error('[QR Routes] Log scan failed:', error);
  }
}

async function getItemDetails(qrData: QRCodeData): Promise<any> {
  try {
    switch (qrData.type) {
      case 'package':
      case 'delivery':
        const delivery = await db.query(`
          SELECT d.*, b.company_name, c.name as customer_name
          FROM deliveries d
          LEFT JOIN businesses b ON d.business_id = b.id
          LEFT JOIN customers c ON d.customer_id = c.id
          WHERE d.id = $1
        `, [qrData.id]);
        return delivery.rows[0] || null;
      
      case 'inquiry':
        const inquiry = await db.query(`
          SELECT i.*, c.name as customer_name, c.email, c.phone
          FROM inquiries i
          LEFT JOIN customers c ON i.customer_id = c.id
          WHERE i.id = $1
        `, [qrData.id]);
        return inquiry.rows[0] || null;
      
      case 'tracking':
        // Try to find in deliveries first, then inquiries
        const trackingDelivery = await db.query(
          'SELECT * FROM deliveries WHERE tracking_number = $1',
          [qrData.id]
        );
        if (trackingDelivery.rows.length > 0) {
          return trackingDelivery.rows[0];
        }
        
        const trackingInquiry = await db.query(
          'SELECT * FROM inquiries WHERE id = $1',
          [qrData.id]
        );
        return trackingInquiry.rows[0] || null;
      
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
      scanned_by: user.id,
      scanned_at: new Date(),
      scan_location: location ? JSON.stringify(location) : null
    };

    switch (qrData.type) {
      case 'package':
      case 'delivery':
        await db.query(`
          UPDATE deliveries 
          SET last_scanned_by = $1, last_scanned_at = $2, last_scan_location = $3
          WHERE id = $4
        `, [updateData.scanned_by, updateData.scanned_at, updateData.scan_location, qrData.id]);
        break;
      
      case 'inquiry':
        await db.query(`
          UPDATE inquiries 
          SET last_scanned_by = $1, last_scanned_at = $2
          WHERE id = $4
        `, [updateData.scanned_by, updateData.scanned_at, qrData.id]);
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
        const delivery = await db.query(`
          SELECT 
            d.*,
            b.company_name,
            dr.name as driver_name,
            ARRAY_AGG(
              JSON_BUILD_OBJECT(
                'status', ds.status,
                'timestamp', ds.created_at,
                'location', ds.location,
                'notes', ds.notes
              ) ORDER BY ds.created_at DESC
            ) as status_history
          FROM deliveries d
          LEFT JOIN businesses b ON d.business_id = b.id
          LEFT JOIN drivers dr ON d.driver_id = dr.id
          LEFT JOIN delivery_status ds ON d.id = ds.delivery_id
          WHERE d.id = $1
          GROUP BY d.id, b.company_name, dr.name
        `, [qrData.id]);
        return delivery.rows[0] || null;
      
      case 'inquiry':
        const inquiry = await db.query(`
          SELECT 
            i.*,
            c.name as customer_name,
            ARRAY_AGG(
              JSON_BUILD_OBJECT(
                'status', ih.status,
                'timestamp', ih.created_at,
                'notes', ih.notes
              ) ORDER BY ih.created_at DESC
            ) as status_history
          FROM inquiries i
          LEFT JOIN customers c ON i.customer_id = c.id
          LEFT JOIN inquiry_history ih ON i.id = ih.inquiry_id
          WHERE i.id = $1
          GROUP BY i.id, c.name
        `, [qrData.id]);
        return inquiry.rows[0] || null;
      
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
    let query = `
      SELECT 
        qg.*,
        u.name as generated_by_name
      FROM qr_generations qg
      LEFT JOIN users u ON qg.user_id = u.id
    `;
    
    const params: any[] = [];
    
    if (user.role === 'business') {
      query += ' WHERE qg.user_id = $1';
      params.push(user.id);
    }
    
    query += ' ORDER BY qg.created_at DESC LIMIT 100';
    
    const result = await db.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[QR Routes] Get QR history failed:', error);
    return [];
  }
}

async function getQRAnalytics(): Promise<any> {
  try {
    const [
      generationStats,
      scanStats,
      typeDistribution,
      recentActivity
    ] = await Promise.all([
      db.query(`
        SELECT 
          COUNT(*) as total_generated,
          COUNT(DISTINCT user_id) as unique_generators,
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as daily_count
        FROM qr_generations
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
      `),
      db.query(`
        SELECT 
          COUNT(*) as total_scans,
          COUNT(DISTINCT user_id) as unique_scanners,
          DATE_TRUNC('day', scanned_at) as date,
          COUNT(*) as daily_scans
        FROM qr_scans
        WHERE scanned_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', scanned_at)
        ORDER BY date DESC
      `),
      db.query(`
        SELECT 
          qr_type,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
        FROM qr_generations
        GROUP BY qr_type
        ORDER BY count DESC
      `),
      db.query(`
        SELECT 
          'generation' as activity_type,
          qr_type,
          item_id,
          created_at as timestamp,
          u.name as user_name
        FROM qr_generations qg
        LEFT JOIN users u ON qg.user_id = u.id
        WHERE qg.created_at >= NOW() - INTERVAL '7 days'
        
        UNION ALL
        
        SELECT 
          'scan' as activity_type,
          qr_type,
          item_id,
          scanned_at as timestamp,
          u.name as user_name
        FROM qr_scans qs
        LEFT JOIN users u ON qs.user_id = u.id
        WHERE qs.scanned_at >= NOW() - INTERVAL '7 days'
        
        ORDER BY timestamp DESC
        LIMIT 50
      `)
    ]);

    return {
      generation: {
        stats: generationStats.rows,
        total: generationStats.rows.reduce((sum, row) => sum + parseInt(row.daily_count), 0)
      },
      scans: {
        stats: scanStats.rows,
        total: scanStats.rows.reduce((sum, row) => sum + parseInt(row.daily_scans), 0)
      },
      typeDistribution: typeDistribution.rows,
      recentActivity: recentActivity.rows
    };
  } catch (error) {
    console.error('[QR Routes] Get QR analytics failed:', error);
    return {};
  }
}

export default qrRoutes;