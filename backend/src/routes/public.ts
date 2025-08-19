import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { InquiryStatus } from '../models/Inquiry';
import { Emirate, PackageStatus } from '../utils/helpers';
import { db } from '../config/database';
import { redis, cacheUtils } from '../config/redis';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { logger, pwaLogger } from '../utils/logger';
import { 
  calculateDeliveryPrice, 
  getEstimatedDeliveryTime,
  isValidEmail,
  isValidUAEPhone 
} from '../utils/helpers';

export async function publicRoutes(fastify: FastifyInstance) {
  
  // Submit inquiry (from public PWA)
  fastify.post('/inquiry', {
    schema: {
      tags: ['Public'],
      description: 'Submit a delivery service inquiry',
      body: {
        type: 'object',
        required: ['companyName', 'industry', 'contactPerson', 'email', 'phone', 'expectedVolume', 'serviceType'],
        properties: {
          companyName: { type: 'string', minLength: 2, maxLength: 255 },
          industry: { type: 'string', minLength: 2, maxLength: 100 },
          contactPerson: { type: 'string', minLength: 2, maxLength: 255 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', pattern: '^(\\+971|971|0)?[0-9]{8,9}$' },
          expectedVolume: { type: 'string', maxLength: 100 },
          serviceType: { type: 'string', maxLength: 100 },
          specialRequirements: { type: 'string', maxLength: 1000 }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            referenceNumber: { type: 'string' },
            message: { type: 'string' },
            estimatedResponseTime: { type: 'string' }
          }
        }
      }
    }
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const inquiryData = request.body as any;

    // Additional validation
    if (!isValidEmail(inquiryData.email)) {
      throw new ValidationError('Invalid email format');
    }

    if (!isValidUAEPhone(inquiryData.phone)) {
      throw new ValidationError('Invalid UAE phone number');
    }

    // Generate proper reference number (same as admin)
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear + 1, 0, 1);
    const countResult = await db.count('inquiries', {
      created_at: { $gte: startOfYear, $lt: endOfYear }
    });
    const sequenceNumber = (countResult + 1).toString().padStart(4, '0');
    const referenceNumber = `INQ-${currentYear}-${sequenceNumber}`;

    // Insert inquiry using the same structure as admin
    const inquiryDoc = {
      reference_number: referenceNumber,
      company_name: inquiryData.companyName,
      industry: inquiryData.industry,
      contact_person: inquiryData.contactPerson,
      email: inquiryData.email,
      phone: inquiryData.phone,
      expected_volume: inquiryData.expectedVolume,
      service_type: inquiryData.serviceType || 'General Delivery',
      special_requirements: inquiryData.specialRequirements || null,
      status: InquiryStatus.NEW
    };

    const inquiry = await db.insertOne('inquiries', inquiryDoc);

    // Log business event
    pwaLogger.businessEvent('INQUIRY_SUBMITTED', 'anonymous', {
      inquiryId: inquiry._id.toString(),
      referenceNumber: inquiry.reference_number,
      companyName: inquiryData.companyName
    });

    // TODO: Send notification to admin team
    // TODO: Send confirmation email to customer

    reply.code(201);
    return {
      id: inquiry._id.toString(),
      referenceNumber: inquiry.reference_number,
      message: 'Inquiry submitted successfully',
      estimatedResponseTime: '4 business hours'
    };
  }));

  // Track inquiry status
  fastify.get('/inquiry/:referenceNumber', {
    schema: {
      tags: ['Public'],
      description: 'Track inquiry status by reference number',
      params: {
        type: 'object',
        required: ['referenceNumber'],
        properties: {
          referenceNumber: { type: 'string', pattern: '^INQ-[0-9]{4}-[0-9]{4}$' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            referenceNumber: { type: 'string' },
            status: { type: 'string' },
            companyName: { type: 'string' },
            submittedAt: { type: 'string' },
            estimatedResponseTime: { type: 'string' },
            assignedStaff: { type: 'string' }
          }
        }
      }
    }
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { referenceNumber } = request.params as any;

    // Check cache first
    const cacheKey = `inquiry_status:${referenceNumber}`;
    let inquiry = await redis.get(cacheKey, true);

    if (!inquiry) {
      // Fetch from database using the reference_number field
      inquiry = await db.findOne('inquiries', { reference_number: referenceNumber });

      if (!inquiry) {
        throw new NotFoundError('Inquiry not found');
      }

      // Get assigned staff info if exists
      if (inquiry.reviewed_by) {
        const staff = await db.findOne('users', { _id: inquiry.reviewed_by });
        inquiry.assigned_staff_name = staff?.name || null;
      }

      // Cache for 5 minutes
      await redis.set(cacheKey, inquiry, cacheUtils.ttl.SHORT);
    }

    return {
      referenceNumber: inquiry.reference_number,
      status: inquiry.status,
      companyName: inquiry.company_name,
      submittedAt: inquiry.created_at,
      estimatedResponseTime: inquiry.status === InquiryStatus.NEW ? '4 business hours' : 'In progress',
      assignedStaff: inquiry.assigned_staff_name || 'Not assigned'
    };
  }));

  // Package tracking (by QR code or package code)
  fastify.get('/track/:packageCode', {
    schema: {
      tags: ['Public'],
      description: 'Track package by code or QR scan',
      params: {
        type: 'object',
        required: ['packageCode'],
        properties: {
          packageCode: { type: 'string', pattern: '^[A-Z]{3}2[A-Z]{3}[0-9]{9}$' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            packageCode: { type: 'string' },
            status: { type: 'string' },
            fromAddress: { type: 'string' },
            toAddress: { type: 'string' },
            recipientName: { type: 'string' },
            estimatedDelivery: { type: 'string' },
            timeline: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  timestamp: { type: 'string' },
                  location: { type: 'string' },
                  notes: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { packageCode } = request.params as any;

    // Check cache first
    const cacheKey = cacheUtils.keys.package(packageCode);
    let packageData = await redis.get(cacheKey, true);

    if (!packageData) {
      // Fetch from database using MongoDB
      packageData = await db.findOne('packages', { package_code: packageCode });

      if (!packageData) {
        throw new NotFoundError('Package not found');
      }

      // Get delivery request info
      if (packageData.request_id) {
        const deliveryRequest = await db.findOne('delivery_requests', { _id: packageData.request_id });
        if (deliveryRequest) {
          packageData.from_address = `${deliveryRequest.pickup_area}, ${deliveryRequest.pickup_city}`;
        }
      }

      packageData.to_address = `${packageData.delivery_area}, ${packageData.delivery_city}`;

      // Get timeline
      const timeline = await db.findMany('package_timeline', 
        { package_id: packageData._id },
        { sort: { timestamp: 1 } }
      );

      packageData.timeline = timeline.map(t => ({
        status: t.status,
        timestamp: t.timestamp,
        location: t.location_name || '',
        notes: t.notes || ''
      }));

      // Cache for 5 minutes (short cache for real-time tracking)
      await redis.set(cacheKey, packageData, cacheUtils.ttl.SHORT);
    }

    // Calculate estimated delivery if not yet delivered
    let estimatedDelivery = 'Delivered';
    if (packageData.status !== PackageStatus.DELIVERED && packageData.status !== PackageStatus.CANCELLED) {
      // This would need more sophisticated logic in production
      estimatedDelivery = 'Within 24 hours';
    }

    return {
      packageCode: packageData.package_code,
      status: packageData.status,
      fromAddress: packageData.from_address,
      toAddress: packageData.to_address,
      recipientName: packageData.recipient_name,
      estimatedDelivery,
      timeline: packageData.timeline || []
    };
  }));

  // Service areas (emirates and coverage)
  fastify.get('/service-areas', {
    schema: {
      tags: ['Public'],
      description: 'Get available service areas and coverage',
      response: {
        200: {
          type: 'object',
          properties: {
            emirates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  name: { type: 'string' },
                  available: { type: 'boolean' },
                  zones: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              }
            },
            coverage: { type: 'string' }
          }
        }
      }
    }
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    // Cache this data as it changes infrequently
    const cacheKey = 'service_areas';
    let serviceAreas = await redis.get(cacheKey, true);

    if (!serviceAreas) {
      // This would normally come from database, but we'll use constants for now
      serviceAreas = {
        emirates: [
          {
            code: 'DXB',
            name: 'Dubai',
            available: true,
            zones: ['Downtown', 'Marina', 'JLT', 'Business Bay', 'DIFC', 'Jumeirah']
          },
          {
            code: 'AUH',
            name: 'Abu Dhabi',
            available: true,
            zones: ['Khalifa City', 'Al Reem', 'Yas Island', 'Saadiyat', 'Downtown']
          },
          {
            code: 'SHJ',
            name: 'Sharjah',
            available: true,
            zones: ['Al Majaz', 'Al Qasba', 'Rolla', 'Industrial Area']
          },
          {
            code: 'AJM',
            name: 'Ajman',
            available: true,
            zones: ['Corniche', 'Industrial', 'Residential']
          },
          {
            code: 'RAK',
            name: 'Ras Al Khaimah',
            available: true,
            zones: ['Al Nakheel', 'Old Town', 'Industrial']
          },
          {
            code: 'FJR',
            name: 'Fujairah',
            available: true,
            zones: ['City Center', 'Port Area', 'Beach Resort']
          },
          {
            code: 'UAQ',
            name: 'Umm Al Quwain',
            available: true,
            zones: ['Old Town', 'Marina', 'Industrial']
          }
        ],
        coverage: 'All 7 Emirates of UAE with same-day and next-day delivery options'
      };

      // Cache for 1 hour
      await redis.set(cacheKey, serviceAreas, 3600);
    }

    return serviceAreas;
  }));

  // Pricing calculator
  fastify.post('/calculate-price', {
    schema: {
      tags: ['Public'],
      description: 'Calculate delivery price estimate',
      body: {
        type: 'object',
        required: ['fromEmirate', 'toEmirate', 'packageType', 'weight', 'value'],
        properties: {
          fromEmirate: { 
            type: 'string', 
            enum: ['DUBAI', 'ABU_DHABI', 'SHARJAH', 'AJMAN', 'RAS_AL_KHAIMAH', 'FUJAIRAH', 'UMM_AL_QUWAIN'] 
          },
          toEmirate: { 
            type: 'string', 
            enum: ['DUBAI', 'ABU_DHABI', 'SHARJAH', 'AJMAN', 'RAS_AL_KHAIMAH', 'FUJAIRAH', 'UMM_AL_QUWAIN'] 
          },
          packageType: {
            type: 'string',
            enum: ['DOCUMENTS', 'PARCELS', 'FRAGILE', 'ELECTRONICS', 'CLOTHING', 'FOOD', 'OTHER']
          },
          weight: { type: 'number', minimum: 0.1, maximum: 50 },
          value: { type: 'number', minimum: 1, maximum: 100000 },
          monthlyVolume: { type: 'number', minimum: 0, default: 0 },
          isExpress: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            basePrice: { type: 'number' },
            insuranceFee: { type: 'number' },
            totalPrice: { type: 'number' },
            estimatedDelivery: { type: 'string' },
            discount: { type: 'number' },
            breakdown: {
              type: 'object',
              properties: {
                baseRate: { type: 'number' },
                typeMultiplier: { type: 'number' },
                insurance: { type: 'number' },
                volumeDiscount: { type: 'number' },
                expressCharge: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const {
      fromEmirate,
      toEmirate,
      packageType,
      weight,
      value,
      monthlyVolume = 0,
      isExpress = false
    } = request.body as any;

    // Calculate price using shared utility
    const totalPrice = calculateDeliveryPrice(
      weight,
      fromEmirate as Emirate,
      toEmirate as Emirate,
      packageType,
      value,
      monthlyVolume,
      isExpress
    );

    // Calculate estimated delivery time
    const estimatedDelivery = getEstimatedDeliveryTime(
      fromEmirate as Emirate,
      toEmirate as Emirate,
      isExpress
    );

    // Build breakdown (simplified version)
    const baseRate = fromEmirate === toEmirate ? 15 : 25;
    const insuranceFee = Math.max(value * 0.001, 5);
    const expressCharge = isExpress ? baseRate * 0.4 : 0;
    
    // Volume discount calculation
    let volumeDiscount = 0;
    if (monthlyVolume >= 200) volumeDiscount = 0.2;
    else if (monthlyVolume >= 100) volumeDiscount = 0.15;
    else if (monthlyVolume >= 50) volumeDiscount = 0.1;

    const breakdown = {
      baseRate,
      typeMultiplier: 1.2, // Example for documents
      insurance: insuranceFee,
      volumeDiscount,
      expressCharge
    };

    return {
      basePrice: totalPrice + insuranceFee - (totalPrice * volumeDiscount),
      insuranceFee,
      totalPrice,
      estimatedDelivery: estimatedDelivery.toISOString(),
      discount: totalPrice * volumeDiscount,
      breakdown
    };
  }));

  // Company information and services
  fastify.get('/company-info', {
    schema: {
      tags: ['Public'],
      description: 'Get company information and services',
      response: {
        200: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            services: {
              type: 'array',
              items: { type: 'string' }
            },
            contact: {
              type: 'object',
              properties: {
                phone: { type: 'string' },
                email: { type: 'string' },
                address: { type: 'string' }
              }
            },
            businessHours: { type: 'string' },
            certifications: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    }
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    // Cache company info as it rarely changes
    const cacheKey = 'company_info';
    let companyInfo = await redis.get(cacheKey, true);

    if (!companyInfo) {
      companyInfo = {
        name: 'UAE Delivery Management',
        description: 'Professional delivery services across all emirates of the UAE with real-time tracking and reliable service.',
        services: [
          'Same-day delivery',
          'Next-day delivery',
          'Express delivery (2-4 hours)',
          'Document handling',
          'Fragile item delivery',
          'Business-to-business delivery',
          'Real-time package tracking',
          'Proof of delivery with photos'
        ],
        contact: {
          phone: '+971-800-123456',
          email: 'info@deliveryuae.com',
          address: 'Business Bay, Dubai, United Arab Emirates'
        },
        businessHours: 'Sunday to Thursday: 8:00 AM - 6:00 PM (UAE Time)',
        certifications: [
          'Dubai Municipality Approved',
          'ISO 9001:2015 Quality Management',
          'UAE Ministry of Economy Licensed'
        ]
      };

      // Cache for 24 hours
      await redis.set(cacheKey, companyInfo, cacheUtils.ttl.LONG);
    }

    return companyInfo;
  }));

  // PWA installation tracking
  fastify.post('/pwa-install', {
    schema: {
      tags: ['Public'],
      description: 'Track PWA installation event',
      body: {
        type: 'object',
        required: ['pwaType'],
        properties: {
          pwaType: { 
            type: 'string',
            enum: ['public', 'admin', 'business', 'driver']
          },
          userAgent: { type: 'string' },
          platform: { type: 'string' },
          installSource: { type: 'string' }
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
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { pwaType, userAgent, platform, installSource } = request.body as any;

    // Log PWA installation
    pwaLogger.pwaInstall(pwaType, userAgent || request.headers['user-agent'] || '');

    // Track installation statistics
    const installKey = `pwa_installs:${pwaType}:${new Date().toISOString().split('T')[0]}`;
    await redis.incr(installKey);
    await redis.expire(installKey, cacheUtils.ttl.WEEK);

    logger.info('PWA Installation tracked', {
      pwaType,
      platform,
      installSource,
      ip: request.ip
    });

    return { message: 'Installation tracked successfully' };
  }));
}