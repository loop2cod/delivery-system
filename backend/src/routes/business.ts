import { FastifyInstance } from 'fastify';
import { UserRole } from '../models/User';
import { requireRoles, authenticateToken } from '../middleware/auth';
import { db } from '../config/database';
import { ObjectId } from 'mongodb';
import { config } from '../config/environment';
import bcrypt from 'bcryptjs';
import { DeliveryPricing } from '../models/DeliveryPricing';

export async function businessRoutes(fastify: FastifyInstance) {
  // Apply authentication to all business routes
  fastify.addHook('preHandler', authenticateToken);
  
  // Business routes require BUSINESS, ADMIN, or SUPER_ADMIN role
  fastify.addHook('preHandler', requireRoles(UserRole.BUSINESS, UserRole.ADMIN, UserRole.SUPER_ADMIN));

  // Business dashboard
  fastify.get('/dashboard', async (request, reply) => {
    const user:any = request.currentUser;
    if (!user?.companyId) {
      return reply.code(400).send({ error: 'No company associated with user' });
    }

    try {
      // Get dashboard statistics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get current month requests
      const currentMonthRequests = await db.findMany('delivery_requests', {
        companyId: user.companyId,
        createdAt: { $gte: startOfMonth }
      });

      // Get last month requests for comparison
      const lastMonthRequests = await db.findMany('delivery_requests', {
        companyId: user.companyId,
        createdAt: { 
          $gte: startOfLastMonth,
          $lte: endOfLastMonth
        }
      });

      // Calculate statistics
      const totalRequests = currentMonthRequests.length;
      const lastMonthTotal = lastMonthRequests.length;
      const requestsChange = lastMonthTotal > 0 
        ? ((totalRequests - lastMonthTotal) / lastMonthTotal * 100).toFixed(1)
        : '0';

      const activeDeliveries = currentMonthRequests.filter(
        (req: any) => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(req.status)
      ).length;

      const urgentDeliveries = currentMonthRequests.filter(
        (req: any) => req.priority === 'urgent' && ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(req.status)
      ).length;

      const deliveredRequests = currentMonthRequests.filter(
        (req: any) => req.status === 'DELIVERED'
      );

      const successRate = totalRequests > 0 
        ? ((deliveredRequests.length / totalRequests) * 100).toFixed(1)
        : '0';

      // Calculate total cost
      const totalCost = currentMonthRequests.reduce((sum: number, req: any) => {
        return sum + (req.actualCost || req.estimatedCost || 0);
      }, 0);

      const lastMonthCost = lastMonthRequests.reduce((sum: number, req: any) => {
        return sum + (req.actualCost || req.estimatedCost || 0);
      }, 0);

      const costChange = lastMonthCost > 0 
        ? ((totalCost - lastMonthCost) / lastMonthCost * 100).toFixed(1)
        : '0';

      // Get recent requests
      const recentRequests = await db.findMany(
        'delivery_requests',
        { companyId: user.companyId },
        { 
          sort: { createdAt: -1 },
          limit: 5
        }
      );

      const stats = {
        activeDeliveries: {
          value: activeDeliveries,
          change: `+${Math.max(0, activeDeliveries - Math.floor(lastMonthRequests.filter((req: any) => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(req.status)).length / 2))}`,
          changeType: 'increase'
        },
        totalRequests: {
          value: totalRequests,
          change: `${requestsChange >= '0' ? '+' : ''}${requestsChange}%`,
          changeType: parseFloat(requestsChange) >= 0 ? 'increase' : 'decrease'
        }
      };

      // Calculate monthly cost analysis data (last 5 months)
      const monthlyData = [];
      for (let i = 4; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const monthRequests = await db.findMany('delivery_requests', {
          companyId: user.companyId,
          createdAt: { 
            $gte: monthStart,
            $lte: monthEnd
          }
        });
        
        const monthCosts = monthRequests.reduce((sum: number, req: any) => {
          return sum + (req.actualCost || req.estimatedCost || 0);
        }, 0);
        
        const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' });
        
        monthlyData.push({
          month: monthName,
          requests: monthRequests.length,
          costs: Math.round(monthCosts),
          avgCost: monthRequests.length > 0 ? Math.round(monthCosts / monthRequests.length) : 0
        });
      }

      return {
        stats,
        recentRequests: recentRequests.map((req: any) => ({
          ...req,
          id: req._id.toString(),
          _id: undefined
        })),
        summary: {
          totalRequests,
          activeDeliveries,
          urgentDeliveries,
          monthlySpend: Math.round(totalCost),
          successRate: parseFloat(successRate)
        },
        chartData: {
          monthlyComparison: monthlyData,
          currentMonthStats: {
            avgCost: totalRequests > 0 ? Math.round(totalCost / totalRequests) : 0,
            successRate: parseFloat(successRate),
            avgDeliveryTime: '4.2 hrs',
            totalRequests
          }
        }
      };
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      return reply.code(500).send({ error: 'Failed to get dashboard data' });
    }
  });

  // Create delivery requests
  fastify.post('/requests', {
    schema: {
      body: {
        type: 'object',
        required: ['priority', 'pickupDetails', 'deliveryDetails', 'items', 'schedule'],
        properties: {
          priority: { type: 'string', enum: ['normal', 'high', 'urgent'] },
          pickupDetails: {
            type: 'object',
            required: ['contactName', 'phone', 'address'],
            properties: {
              contactName: { type: 'string' },
              phone: { type: 'string' },
              address: { type: 'string' },
              instructions: { type: 'string' }
            }
          },
          deliveryDetails: {
            type: 'object',
            required: ['contactName', 'phone', 'address'],
            properties: {
              contactName: { type: 'string' },
              phone: { type: 'string' },
              address: { type: 'string' },
              instructions: { type: 'string' }
            }
          },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['description', 'quantity'],
              properties: {
                description: { type: 'string' },
                quantity: { type: 'number', minimum: 1 },
                weight: { type: 'number', minimum: 0 },
                dimensions: { type: 'string' },
                value: { type: 'number', minimum: 0 },
                fragile: { type: 'boolean' },
                paymentType: { type: 'string', enum: ['paid', 'cod'] },
                codAmount: { type: 'number', minimum: 0 }
              }
            }
          },
          schedule: {
            type: 'object',
            required: ['pickupDate', 'pickupTime', 'deliveryDate', 'deliveryTime'],
            properties: {
              pickupDate: { type: 'string' },
              pickupTime: { type: 'string' },
              deliveryDate: { type: 'string' },
              deliveryTime: { type: 'string' }
            }
          },
          specialRequirements: { type: ['string', 'null'] },
          internalReference: { type: ['string', 'null'] },
          estimatedCost: { type: ['number', 'null'] },
          totalWeight: { type: 'number' },
          priceCalculation: { type: ['object', 'null'] }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.currentUser;
    if (!user?.companyId) {
      return reply.code(400).send({ error: 'No company associated with user' });
    }

    const requestData = request.body as any;

    try {
      // Generate request number
      const requestNumber = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      // Calculate total weight from items
      const totalWeight = requestData.items.reduce((total: number, item: any) => {
        return total + ((item.weight || 0) * item.quantity);
      }, 0);

      // Create delivery request document
      const deliveryRequest = {
        requestNumber,
        companyId: user.companyId,
        userId: user.id,
        priority: requestData.priority,
        status: 'PENDING',
        
        // Pickup details
        pickupContactName: requestData.pickupDetails.contactName,
        pickupPhone: requestData.pickupDetails.phone,
        pickupAddress: requestData.pickupDetails.address,
        pickupInstructions: requestData.pickupDetails.instructions,
        
        // Delivery details
        deliveryContactName: requestData.deliveryDetails.contactName,
        deliveryPhone: requestData.deliveryDetails.phone,
        deliveryAddress: requestData.deliveryDetails.address,
        deliveryInstructions: requestData.deliveryDetails.instructions,
        
        // Schedule
        pickupDate: requestData.schedule.pickupDate,
        pickupTime: requestData.schedule.pickupTime,
        deliveryDate: requestData.schedule.deliveryDate,
        deliveryTime: requestData.schedule.deliveryTime,
        
        // Items and pricing
        items: requestData.items,
        totalWeight,
        estimatedCost: requestData.estimatedCost,
        priceCalculation: requestData.priceCalculation,
        
        // Additional details
        specialRequirements: requestData.specialRequirements,
        internalReference: requestData.internalReference,
        
        // Metadata
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Insert into delivery requests collection
      const insertResult = await db.insertOne('delivery_requests', deliveryRequest);
      
      if (!insertResult) {
        return reply.code(500).send({ error: 'Failed to create delivery request' });
      }

      // Return the created request with the MongoDB _id converted to id
      const createdRequest = {
        ...deliveryRequest,
        id: insertResult.toString(),
        _id: undefined
      };
      
      return {
        message: 'Delivery request created successfully',
        request: createdRequest,
        requestNumber
      };
    } catch (error) {
      console.error('Failed to create delivery request:', error);
      return reply.code(500).send({ error: 'Failed to create delivery request' });
    }
  });

  // Get delivery requests
  fastify.get('/requests', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          status: { type: 'string' },
          search: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.currentUser;
    if (!user?.companyId) {
      return reply.code(400).send({ error: 'No company associated with user' });
    }

    const { page = 1, limit = 20, status, search } = request.query as any;
    const skip = (page - 1) * limit;

    try {
      // Build query filter
      const filter: any = { companyId: user.companyId };
      
      if (status) {
        filter.status = status;
      }
      
      if (search) {
        filter.$or = [
          { requestNumber: { $regex: search, $options: 'i' } },
          { pickupAddress: { $regex: search, $options: 'i' } },
          { deliveryAddress: { $regex: search, $options: 'i' } },
          { 'items.description': { $regex: search, $options: 'i' } }
        ];
      }

      // Get total count
      const total = await db.count('delivery_requests', filter);
      
      // Get requests with pagination
      const requests = await db.findMany('delivery_requests', filter, {
        sort: { createdAt: -1 },
        skip,
        limit
      });

      // Convert MongoDB documents to frontend format
      const formattedRequests = requests.map((req: any) => ({
        ...req,
        id: req._id.toString(),
        _id: undefined
      }));

      return {
        requests: formattedRequests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Failed to get delivery requests:', error);
      return reply.code(500).send({ error: 'Failed to get delivery requests' });
    }
  });

  // Get single delivery request
  fastify.get('/requests/:id', async (request, reply) => {
    const user = request.currentUser;
    if (!user?.companyId) {
      return reply.code(400).send({ error: 'No company associated with user' });
    }

    const { id } = request.params as { id: string };

    try {
      const deliveryRequest = await db.findOne('delivery_requests', {
        _id: new ObjectId(id),
        companyId: user.companyId
      });

      if (!deliveryRequest) {
        return reply.code(404).send({ error: 'Delivery request not found' });
      }

      // Convert MongoDB document to frontend format
      const formattedRequest = {
        ...deliveryRequest,
        id: deliveryRequest._id.toString(),
        _id: undefined
      };

      return { request: formattedRequest };
    } catch (error) {
      console.error('Failed to get delivery request:', error);
      return reply.code(500).send({ error: 'Failed to get delivery request' });
    }
  });

  // Get company profile
  fastify.get('/profile', async (request, reply) => {
    const user = request.currentUser;
    if (!user?.companyId) {
      return reply.code(400).send({ error: 'No company associated with user' });
    }

    try {
      const company = await db.findOne('companies', { _id: new ObjectId(user.companyId) });

      if (!company) {
        return reply.code(404).send({ error: 'Company not found' });
      }

      // Convert MongoDB document to frontend format
      const companyData = {
        ...company,
        id: company._id.toString(),
        _id: undefined
      };
      delete companyData._id;

      return { company: companyData };
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
    const user = request.currentUser;
    if (!user?.companyId) {
      return reply.code(400).send({ error: 'No company associated with user' });
    }

    const updates = request.body as any;

    try {
      if (Object.keys(updates).length === 0) {
        return reply.code(400).send({ error: 'No fields to update' });
      }

      // Add updated_at timestamp
      const updateData = {
        ...updates,
        updated_at: new Date()
      };

      const updatedCompany = await db.updateOne(
        'companies', 
        { _id: new ObjectId(user.companyId) },
        { $set: updateData }
      );

      if (!updatedCompany) {
        return reply.code(404).send({ error: 'Company not found' });
      }

      // Convert MongoDB document to frontend format
      const companyData = {
        ...updatedCompany,
        id: updatedCompany._id.toString(),
        _id: undefined
      };
      delete companyData._id;

      return { company: companyData };
    } catch (error) {
      console.error('Failed to update company profile:', error);
      return reply.code(500).send({ error: 'Failed to update company profile' });
    }
  });

  // Get company pricing
  fastify.get('/pricing', async (request, reply) => {
    const user = request.currentUser;
    if (!user?.companyId) {
      return reply.code(400).send({ error: 'No company associated with user' });
    }

    try {
      // First check if company has custom pricing
      const customPricing = await DeliveryPricing.findOne({
        companyId: user.companyId,
        isActive: true
      });

      if (customPricing) {
        const pricingData = {
          ...customPricing.toObject(),
          id: customPricing._id.toString(),
          _id: undefined
        };
        delete pricingData._id;
        return { pricing: pricingData, isCustom: true };
      }

      // Fallback to default pricing
      const defaultPricing = await DeliveryPricing.findOne({
        isDefault: true,
        isActive: true
      });

      if (!defaultPricing) {
        return reply.code(404).send({ error: 'No pricing configuration found' });
      }

      const pricingData = {
        ...defaultPricing.toObject(),
        id: defaultPricing._id.toString(),
        _id: undefined
      };
      delete pricingData._id;

      return { pricing: pricingData, isCustom: false };
    } catch (error) {
      console.error('Failed to get company pricing:', error);
      return reply.code(500).send({ error: 'Failed to get company pricing' });
    }
  });

  // Calculate price based on weight
  fastify.post('/pricing/calculate', {
    schema: {
      body: {
        type: 'object',
        required: ['weight'],
        properties: {
          weight: { type: 'number', minimum: 0.1 }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.currentUser;
    if (!user?.companyId) {
      return reply.code(400).send({ error: 'No company associated with user' });
    }

    const { weight } = request.body as { weight: number };

    try {
      // Get company pricing (custom or default)
      let pricing;
      let isCustomPricing = false;

      // Check for custom pricing first
      const customPricing = await DeliveryPricing.findOne({
        companyId: user.companyId,
        isActive: true
      });

      if (customPricing) {
        pricing = customPricing.toObject();
        isCustomPricing = true;
      } else {
        // Use default pricing
        const defaultPricing = await DeliveryPricing.findOne({
          isDefault: true,
          isActive: true
        });

        if (!defaultPricing) {
          return reply.code(404).send({ error: 'No pricing configuration found' });
        }

        pricing = defaultPricing.toObject();
      }

      // Calculate price using cumulative tier pricing
      let calculatedPrice = 0;
      let calculation = '';
      let usedTiers: any[] = [];

      // Sort tiers by minWeight to ensure correct calculation
      const sortedTiers = pricing.tiers.sort((a: any, b: any) => a.minWeight - b.minWeight);

      for (let i = 0; i < sortedTiers.length; i++) {
        const tier = sortedTiers[i];
        const nextTier = sortedTiers[i + 1];
        
        // Calculate the weight range for this tier
        let tierMinWeight = tier.minWeight;
        let tierMaxWeight = tier.maxWeight;
        
        // If no maxWeight specified and there's a next tier, use next tier's minWeight
        if (!tierMaxWeight && nextTier) {
          tierMaxWeight = nextTier.minWeight;
        }
        
        // Skip if the total weight doesn't reach this tier
        if (weight <= tierMinWeight) {
          break;
        }
        
        // Calculate weight that falls into this tier
        let weightInThisTier = 0;
        
        if (tierMaxWeight) {
          // Tier has a maximum weight
          if (weight <= tierMaxWeight) {
            // All remaining weight fits in this tier
            weightInThisTier = weight - tierMinWeight;
          } else {
            // Only part of the weight fits in this tier
            weightInThisTier = tierMaxWeight - tierMinWeight;
          }
        } else {
          // Tier has no maximum weight (last tier)
          weightInThisTier = weight - tierMinWeight;
        }
        
        // Calculate price for this tier
        if (weightInThisTier > 0) {
          let tierPrice = 0;
          if (tier.type === 'fixed') {
            // Fixed price for this entire tier range
            tierPrice = tier.price;
            usedTiers.push(`Tier ${i + 1}: ${tierMinWeight}${tierMaxWeight ? `-${tierMaxWeight}` : '+'}kg = AED ${tier.price} (fixed)`);
          } else if (tier.type === 'per_kg') {
            // Per kg price for the weight in this tier
            tierPrice = weightInThisTier * tier.price;
            usedTiers.push(`Tier ${i + 1}: ${weightInThisTier}kg × AED ${tier.price}/kg = AED ${tierPrice.toFixed(2)}`);
          }
          calculatedPrice += tierPrice;
        }
        
        // If we've processed all the weight, break
        if (tierMaxWeight && weight <= tierMaxWeight) {
          break;
        }
      }

      if (calculatedPrice === 0) {
        return reply.code(400).send({ error: 'No applicable pricing tier found for the given weight' });
      }

      // Create calculation explanation
      calculation = usedTiers.join(' + ') + ` = AED ${calculatedPrice.toFixed(2)}`;

      return {
        weight,
        price: Math.round(calculatedPrice * 100) / 100, // Round to 2 decimal places
        currency: 'AED',
        pricingName: pricing.name,
        isCustomPricing,
        breakdown: {
          calculation,
          tiers: usedTiers
        }
      };
    } catch (error) {
      console.error('Failed to calculate price:', error);
      return reply.code(500).send({ error: 'Failed to calculate price' });
    }
  });

  // Change password (self-service)
  fastify.post('/change-password', {
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
    const user:any = request.currentUser;
    if (!user?.id) {
      return reply.code(400).send({ error: 'User not found' });
    }

    const { newPassword } = request.body as any;

    try {
      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);

      // Update password in MongoDB
      await db.updateOne('users', 
        { _id: new ObjectId(user.id) },
        { 
          $set: { 
            password_hash: newPasswordHash,
            updated_at: new Date()
          }
        }
      );

      return { 
        message: 'Password changed successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to change password:', error);
      return reply.code(500).send({ error: 'Failed to change password' });
    }
  });
}