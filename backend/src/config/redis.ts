import { createClient, RedisClientType } from 'redis';
import { config } from './environment';
import { logger } from '../utils/logger';

// Redis client configuration
const redisConfig: any = {
  socket: {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    connectTimeout: 5000,
    lazyConnect: true,
    reconnectStrategy: (retries: number) => {
      // In development, disable reconnection to avoid spam
      if (process.env.NODE_ENV === 'development') {
        return false;
      }
      const delay = Math.min(retries * 100, 2000);
      logger.warn(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
      return delay;
    }
  }
};

// Only add password if it's provided and not empty
if (config.REDIS_PASSWORD && config.REDIS_PASSWORD.trim() !== '') {
  redisConfig.password = config.REDIS_PASSWORD;
}

// Create Redis client
const redisClient: RedisClientType = createClient(redisConfig);

// Redis service class
export class RedisService {
  private client: RedisClientType;
  private connected: boolean = false;

  constructor(client: RedisClientType) {
    this.client = client;
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
        this.connected = true;
        logger.info('Redis connected successfully');
      }
    } catch (error) {
      this.connected = false;
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Redis connection failed in development - continuing without Redis');
      } else {
        throw error;
      }
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.connected && this.client.isOpen;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
      logger.info('Redis disconnected');
    }
  }

  /**
   * Set a key-value pair with optional expiration
   */
  async set(key: string, value: string | number | object, ttl?: number): Promise<void> {
    if (!this.isAvailable()) {
      logger.debug('Redis not available - skipping set operation');
      return;
    }
    
    const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    if (ttl) {
      await this.client.setEx(key, ttl, serializedValue);
    } else {
      await this.client.set(key, serializedValue);
    }
  }

  /**
   * Get a value by key
   */
  async get<T = string>(key: string, parse: boolean = false): Promise<T | null> {
    if (!this.isAvailable()) {
      logger.debug('Redis not available - skipping get operation');
      return null;
    }
    
    const value = await this.client.get(key);
    
    if (value === null) return null;
    
    if (parse) {
      try {
        return JSON.parse(value) as T;
      } catch (error) {
        logger.warn(`Failed to parse Redis value for key ${key}:`, error);
        return value as T;
      }
    }
    
    return value as T;
  }

  /**
   * Delete one or more keys
   */
  async del(...keys: string[]): Promise<number> {
    if (!this.isAvailable()) {
      return 0; // Return 0 when Redis is unavailable
    }
    return this.client.del(keys);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false; // Return false when Redis is unavailable
    }
    const result = await this.client.expire(key, seconds);
    return result;
  }

  /**
   * Get time to live for a key
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string): Promise<number> {
    if (!this.isAvailable()) {
      return 1; // Return 1 as if it's the first increment when Redis is unavailable
    }
    return this.client.incr(key);
  }

  /**
   * Increment by a specific amount
   */
  async incrBy(key: string, increment: number): Promise<number> {
    return this.client.incrBy(key, increment);
  }

  /**
   * Add item to a list (left push)
   */
  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.client.lPush(key, values);
  }

  /**
   * Remove and return item from list (right pop)
   */
  async rpop(key: string): Promise<string | null> {
    return this.client.rPop(key);
  }

  /**
   * Get list length
   */
  async llen(key: string): Promise<number> {
    return this.client.lLen(key);
  }

  /**
   * Get range of items from list
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lRange(key, start, stop);
  }

  /**
   * Add members to a set
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sAdd(key, members);
  }

  /**
   * Remove members from a set
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.sRem(key, members);
  }

  /**
   * Get all members of a set
   */
  async smembers(key: string): Promise<string[]> {
    return this.client.sMembers(key);
  }

  /**
   * Check if member exists in set
   */
  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sIsMember(key, member);
    return result;
  }

  /**
   * Set hash field
   */
  async hset(key: string, field: string, value: string | number): Promise<number> {
    return this.client.hSet(key, field, String(value));
  }

  /**
   * Get hash field
   */
  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hGet(key, field);
  }

  /**
   * Get all hash fields and values
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hGetAll(key);
  }

  /**
   * Delete hash field
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hDel(key, fields);
  }

  /**
   * Publish message to channel
   */
  async publish(channel: string, message: string | object): Promise<number> {
    const serializedMessage = typeof message === 'object' ? JSON.stringify(message) : message;
    return this.client.publish(channel, serializedMessage);
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const subscriber = this.client.duplicate();
    await subscriber.connect();
    
    await subscriber.subscribe(channel, (message) => {
      callback(message);
    });
  }

  /**
   * Execute multiple commands in a pipeline
   */
  async pipeline(commands: Array<() => Promise<any>>): Promise<any[]> {
    const multi = this.client.multi();
    
    commands.forEach(command => {
      command();
    });
    
    return multi.exec();
  }

  /**
   * Get Redis client info
   */
  async info(): Promise<string> {
    return this.client.info();
  }

  /**
   * Ping Redis server
   */
  async ping(): Promise<string> {
    return this.client.ping();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }
}

// Create Redis service instance
export const redis = new RedisService(redisClient);

// Connect to Redis function expected by server
export async function connectRedis(): Promise<void> {
  try {
    // Connect the RedisService instance, not just the raw client
    await redis.connect();
    console.log('Redis connection successful');
  } catch (error) {
    console.warn('Redis connection failed in development - continuing without Redis:', error.message);
    // In development, don't throw error to allow testing without Redis
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
}

// Cache utilities for PWA optimization
export const cacheUtils = {
  // Cache keys
  keys: {
    user: (id: string) => `user:${id}`,
    session: (token: string) => `session:${token}`,
    package: (code: string) => `package:${code}`,
    driver: (id: string) => `driver:${id}`,
    company: (id: string) => `company:${id}`,
    pricing: () => 'pricing:rules',
    settings: () => 'app:settings',
    rateLimit: (ip: string) => `rate_limit:${ip}`,
    offlineQueue: (userId: string) => `offline_queue:${userId}`,
    notification: (userId: string) => `notifications:${userId}`
  },

  // Standard TTL values (in seconds)
  ttl: {
    SHORT: 300,      // 5 minutes
    MEDIUM: 1800,    // 30 minutes  
    LONG: 86400,     // 24 hours
    WEEK: 604800     // 7 days
  },

  /**
   * Cache API response with automatic JSON serialization
   */
  async cacheApiResponse<T>(key: string, data: T, ttl: number = cacheUtils.ttl.MEDIUM): Promise<void> {
    await redis.set(key, data, ttl);
  },

  /**
   * Get cached API response with automatic JSON parsing
   */
  async getCachedApiResponse<T>(key: string): Promise<T | null> {
    return redis.get<T>(key, true);
  },

  /**
   * Cache user session
   */
  async cacheSession(token: string, userData: any, ttl: number = cacheUtils.ttl.LONG): Promise<void> {
    const key = cacheUtils.keys.session(token);
    await redis.set(key, userData, ttl);
  },

  /**
   * Get cached session
   */
  async getSession(token: string): Promise<any | null> {
    const key = cacheUtils.keys.session(token);
    return redis.get(key, true);
  },

  /**
   * Invalidate user-related caches
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      cacheUtils.keys.user(userId),
      cacheUtils.keys.offlineQueue(userId),
      cacheUtils.keys.notification(userId)
    ];
    
    await redis.del(...patterns);
  },

  /**
   * Cache driver location for real-time tracking
   */
  async cacheDriverLocation(driverId: string, location: any): Promise<void> {
    const key = `driver_location:${driverId}`;
    await redis.set(key, location, cacheUtils.ttl.SHORT);
  },

  /**
   * Get cached driver location
   */
  async getDriverLocation(driverId: string): Promise<any | null> {
    const key = `driver_location:${driverId}`;
    return redis.get(key, true);
  }
};

// Event handlers
redisClient.on('connect', () => {
  // Only log in production or when actually connected
  if (process.env.NODE_ENV !== 'development' || redisClient.isOpen) {
    logger.info('Redis connection established');
  }
});

redisClient.on('ready', () => {
  logger.info('Redis ready to accept commands');
});

redisClient.on('error', (error) => {
  // Suppress errors in development mode
  if (process.env.NODE_ENV !== 'development') {
    logger.error('Redis connection error:', error);
  }
});

redisClient.on('end', () => {
  if (process.env.NODE_ENV !== 'development') {
    logger.info('Redis connection closed');
  }
});

// Initialize Redis connection (optional in development)
async function initializeRedis() {
  // In development, check if Redis is available before attempting connection
  if (process.env.NODE_ENV === 'development') {
    try {
      // Test Redis connection availability first
      const testClient = createClient({ 
        socket: { 
          host: config.REDIS_HOST, 
          port: config.REDIS_PORT,
          connectTimeout: 1000
        }
      });
      
      await testClient.connect();
      await testClient.disconnect();
      
      // If test connection succeeds, proceed with main connection
      await redis.connect();
    } catch (error) {
      logger.info('Redis not available in development mode - continuing without caching');
      return;
    }
  } else {
    // In production, attempt connection and fail if it doesn't work
    try {
      await redis.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }
}

// initializeRedis(); // Let server handle connection via connectRedis()

// Graceful shutdown
process.on('SIGINT', async () => {
  await redis.disconnect();
});

process.on('SIGTERM', async () => {
  await redis.disconnect();
});