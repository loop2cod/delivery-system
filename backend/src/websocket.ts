import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { redis } from './config/redis';

interface AuthenticatedWebSocket {
  userId?: string;
  userType?: 'customer' | 'admin' | 'business' | 'driver';
  businessId?: string;
  driverId?: string;
  channels: Set<string>;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  on(event: string, callback: Function): void;
  readyState: number;
}

interface WebSocketMessage {
  type: string;
  channel?: string;
  data: any;
  timestamp: number;
}

export class WebSocketManager {
  private clients = new Map<string, AuthenticatedWebSocket>();
  private channels = new Map<string, Set<string>>();
  private redisClient: any;

  constructor(redisClient: any) {
    this.redisClient = redisClient;
    this.setupRedisSubscriber();
  }

  private setupRedisSubscriber() {
    // Subscribe to Redis pub/sub for cross-instance communication
    const subscriber = this.redisClient.duplicate();
    
    subscriber.on('message', (channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        this.broadcastToChannel(channel, data);
      } catch (error) {
        console.error('Error parsing Redis message:', error);
      }
    });

    // Subscribe to all delivery-related channels
    subscriber.subscribe(
      'delivery:updates',
      'driver:location',
      'driver:status',
      'inquiry:updates',
      'business:notifications',
      'admin:notifications'
    );
  }

  async authenticateConnection(ws: AuthenticatedWebSocket, token: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      ws.userId = decoded.userId;
      ws.userType = decoded.userType;
      ws.businessId = decoded.businessId;
      ws.driverId = decoded.driverId;
      ws.channels = new Set();

      // Store connection
      const connectionId = `${decoded.userType}_${decoded.userId}_${Date.now()}`;
      this.clients.set(connectionId, ws);

      // Auto-subscribe to relevant channels based on user type
      await this.autoSubscribeUser(ws, decoded);

      ws.on('close', () => {
        this.handleDisconnect(connectionId, ws);
      });

      return true;
    } catch (error) {
      console.error('WebSocket authentication failed:', error);
      return false;
    }
  }

  private async autoSubscribeUser(ws: AuthenticatedWebSocket, user: any) {
    switch (user.userType) {
      case 'admin':
        // Admins get all updates
        await this.subscribeToChannel(ws, 'delivery:updates');
        await this.subscribeToChannel(ws, 'driver:location');
        await this.subscribeToChannel(ws, 'driver:status');
        await this.subscribeToChannel(ws, 'inquiry:updates');
        await this.subscribeToChannel(ws, 'admin:notifications');
        break;

      case 'business':
        // Business users get their own delivery updates
        await this.subscribeToChannel(ws, `business:${user.businessId}:deliveries`);
        await this.subscribeToChannel(ws, `business:${user.businessId}:notifications`);
        break;

      case 'driver':
        // Drivers get their assigned deliveries and location requests
        await this.subscribeToChannel(ws, `driver:${user.driverId}:deliveries`);
        await this.subscribeToChannel(ws, `driver:${user.driverId}:location`);
        await this.subscribeToChannel(ws, 'driver:broadcasts');
        break;

      case 'customer':
        // Customers get updates for their inquiries and deliveries
        await this.subscribeToChannel(ws, `customer:${user.userId}:updates`);
        break;
    }
  }

  private async subscribeToChannel(ws: AuthenticatedWebSocket, channel: string) {
    ws.channels.add(channel);
    
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(ws.userId!);
  }

  private async unsubscribeFromChannel(ws: AuthenticatedWebSocket, channel: string) {
    ws.channels.delete(channel);
    
    const channelClients = this.channels.get(channel);
    if (channelClients) {
      channelClients.delete(ws.userId!);
      if (channelClients.size === 0) {
        this.channels.delete(channel);
      }
    }
  }

  private handleDisconnect(connectionId: string, ws: AuthenticatedWebSocket) {
    // Remove from all channels
    ws.channels.forEach(channel => {
      this.unsubscribeFromChannel(ws, channel);
    });

    // Remove connection
    this.clients.delete(connectionId);

    console.log(`WebSocket client disconnected: ${ws.userType}_${ws.userId}`);
  }

  private broadcastToChannel(channel: string, data: any) {
    const message: WebSocketMessage = {
      type: 'broadcast',
      channel,
      data,
      timestamp: Date.now()
    };

    this.clients.forEach((ws) => {
      if (ws.channels.has(channel) && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  // Public methods for sending specific types of updates

  async broadcastDeliveryUpdate(deliveryId: string, update: any) {
    const message = {
      type: 'delivery_update',
      deliveryId,
      data: update,
      timestamp: Date.now()
    };

    // Broadcast to Redis for cross-instance communication
    await this.redisClient.publish('delivery:updates', JSON.stringify(message));
  }

  async broadcastDriverLocation(driverId: string, location: any) {
    const message = {
      type: 'driver_location',
      driverId,
      data: location,
      timestamp: Date.now()
    };

    await this.redisClient.publish('driver:location', JSON.stringify(message));
  }

  async broadcastDriverStatus(driverId: string, status: string) {
    const message = {
      type: 'driver_status',
      driverId,
      data: { status },
      timestamp: Date.now()
    };

    await this.redisClient.publish('driver:status', JSON.stringify(message));
  }

  async notifyInquiryUpdate(inquiryId: string, update: any) {
    const message = {
      type: 'inquiry_update',
      inquiryId,
      data: update,
      timestamp: Date.now()
    };

    await this.redisClient.publish('inquiry:updates', JSON.stringify(message));
  }

  async notifyBusiness(businessId: string, notification: any) {
    const message = {
      type: 'business_notification',
      data: notification,
      timestamp: Date.now()
    };

    await this.redisClient.publish(`business:${businessId}:notifications`, JSON.stringify(message));
  }

  async notifyCustomer(customerId: string, notification: any) {
    const message = {
      type: 'customer_notification',
      data: notification,
      timestamp: Date.now()
    };

    await this.redisClient.publish(`customer:${customerId}:updates`, JSON.stringify(message));
  }

  async notifyDriver(driverId: string, notification: any) {
    const message = {
      type: 'driver_notification',
      data: notification,
      timestamp: Date.now()
    };

    await this.redisClient.publish(`driver:${driverId}:deliveries`, JSON.stringify(message));
  }

  // Real-time tracking updates
  async updateDeliveryTracking(trackingNumber: string, update: any) {
    const message = {
      type: 'tracking_update',
      trackingNumber,
      data: update,
      timestamp: Date.now()
    };

    await this.redisClient.publish(`tracking:${trackingNumber}`, JSON.stringify(message));
  }

  // Emergency broadcasts
  async broadcastEmergency(message: string, userTypes: string[] = ['driver']) {
    const emergencyMessage = {
      type: 'emergency_broadcast',
      data: { message, priority: 'high' },
      timestamp: Date.now()
    };

    for (const userType of userTypes) {
      await this.redisClient.publish(`${userType}:broadcasts`, JSON.stringify(emergencyMessage));
    }
  }

  // Analytics and monitoring
  getConnectionStats() {
    const stats = {
      totalConnections: this.clients.size,
      channelCounts: {} as Record<string, number>,
      userTypeCounts: {} as Record<string, number>
    };

    // Count connections by channel
    this.channels.forEach((clients, channel) => {
      stats.channelCounts[channel] = clients.size;
    });

    // Count connections by user type
    this.clients.forEach((ws) => {
      const userType = ws.userType || 'unknown';
      stats.userTypeCounts[userType] = (stats.userTypeCounts[userType] || 0) + 1;
    });

    return stats;
  }
}

export async function setupWebSocket(fastify: FastifyInstance) {
  // Register WebSocket support
  await fastify.register(require('@fastify/websocket'));

  const redisClient = redis; // Use existing redis service
  const wsManager = new WebSocketManager(redisClient);

  // WebSocket route for real-time connections
  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
      const ws = connection.socket as AuthenticatedWebSocket;

      // Extract token from query parameters or headers
      const token = (req.query as any)?.token as string || req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }

      // Authenticate the connection
      wsManager.authenticateConnection(ws, token).then((authenticated) => {
        if (!authenticated) {
          ws.close(1008, 'Authentication failed');
          return;
        }

        console.log(`WebSocket client connected: ${ws.userType}_${ws.userId}`);

        // Handle incoming messages
        ws.on('message', async (data: any) => {
          try {
            const message = JSON.parse(data.toString()) as WebSocketMessage;
            await handleWebSocketMessage(ws, message, wsManager);
          } catch (error) {
            console.error('Error handling WebSocket message:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Invalid message format',
              timestamp: Date.now()
            }));
          }
        });

        // Send welcome message
        ws.send(JSON.stringify({
          type: 'connected',
          data: { userType: ws.userType, userId: ws.userId },
          timestamp: Date.now()
        }));
      });
    });
  });

  // REST endpoint for connection statistics (admin only)
  fastify.get('/api/websocket/stats', {
    // Admin endpoint for monitoring connections - authentication handled by middleware
  }, async (request, reply) => {
    return wsManager.getConnectionStats();
  });

  // Store wsManager in fastify instance for use in other routes
  fastify.decorate('wsManager', wsManager);
}

async function handleWebSocketMessage(
  ws: AuthenticatedWebSocket, 
  message: WebSocketMessage, 
  wsManager: WebSocketManager
) {
  switch (message.type) {
    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: Date.now()
      }));
      break;

    case 'subscribe':
      if (message.channel && canSubscribeToChannel(ws, message.channel)) {
        // Handle manual channel subscription
        ws.channels.add(message.channel);
      }
      break;

    case 'unsubscribe':
      if (message.channel) {
        ws.channels.delete(message.channel);
      }
      break;

    case 'driver_location_update':
      if (ws.userType === 'driver' && message.data) {
        await wsManager.broadcastDriverLocation(ws.driverId!, message.data);
      }
      break;

    case 'delivery_status_update':
      if ((ws.userType === 'driver' || ws.userType === 'admin') && message.data) {
        await wsManager.broadcastDeliveryUpdate(message.data.deliveryId, message.data);
      }
      break;

    default:
      console.log('Unknown WebSocket message type:', message.type);
  }
}

function canSubscribeToChannel(ws: AuthenticatedWebSocket, channel: string): boolean {
  // Implement channel access control based on user type and permissions
  const [channelType, ...channelParts] = channel.split(':');

  switch (ws.userType) {
    case 'admin':
      return true; // Admins can subscribe to any channel

    case 'business':
      return channelType === 'business' && channelParts[0] === ws.businessId;

    case 'driver':
      return (channelType === 'driver' && channelParts[0] === ws.driverId) ||
             channelType === 'driver' && channelParts[0] === 'broadcasts';

    case 'customer':
      return channelType === 'customer' && channelParts[0] === ws.userId ||
             channelType === 'tracking';

    default:
      return false;
  }
}