import mongoose from 'mongoose';
import { MongoClient, Db, Collection, ClientSession } from 'mongodb';
import { config } from './environment';
import { logger } from '../utils/logger';

// MongoDB connection
let client: MongoClient;
let database: Db;

// Database connection interface
export class DatabaseService {
  private db: Db;
  private client: MongoClient;

  constructor(client: MongoClient, database: Db) {
    this.client = client;
    this.db = database;
  }

  /**
   * Get a collection
   */
  collection<T = any>(name: string): Collection<T> {
    return this.db.collection<T>(name);
  }

  /**
   * Find a single document
   */
  async findOne<T = any>(
    collection: string,
    filter: Record<string, any> = {},
    options?: any
  ): Promise<T | null> {
    const start = Date.now();
    
    try {
      const result = await this.collection<T>(collection).findOne(filter, options);
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        logger.warn('Slow query detected', {
          collection,
          operation: 'findOne',
          duration: `${duration}ms`,
          filter: JSON.stringify(filter).substring(0, 100)
        });
      }
      
      return result;
    } catch (error) {
      logger.error('Database findOne error', {
        collection,
        filter: JSON.stringify(filter).substring(0, 100),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Find multiple documents
   */
  async findMany<T = any>(
    collection: string,
    filter: Record<string, any> = {},
    options?: any
  ): Promise<T[]> {
    const start = Date.now();
    
    try {
      const result = await this.collection<T>(collection).find(filter, options).toArray();
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        logger.warn('Slow query detected', {
          collection,
          operation: 'find',
          duration: `${duration}ms`,
          filter: JSON.stringify(filter).substring(0, 100),
          count: result.length
        });
      }
      
      return result;
    } catch (error) {
      logger.error('Database find error', {
        collection,
        filter: JSON.stringify(filter).substring(0, 100),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Insert a single document
   */
  async insertOne<T = any>(
    collection: string,
    document: Record<string, any>,
    options?: any
  ): Promise<any> {
    try {
      // Add timestamps
      const now = new Date();
      const docWithTimestamps = {
        ...document,
        created_at: document.created_at || now,
        updated_at: document.updated_at || now
      };

      const result = await this.collection<T>(collection).insertOne(docWithTimestamps, options);
      return { ...docWithTimestamps, _id: result.insertedId };
    } catch (error) {
      logger.error('Database insertOne error', {
        collection,
        document: JSON.stringify(document).substring(0, 100),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Insert multiple documents
   */
  async insertMany<T = any>(
    collection: string,
    documents: Record<string, any>[],
    options?: any
  ): Promise<any[]> {
    try {
      const now = new Date();
      const docsWithTimestamps = documents.map(doc => ({
        ...doc,
        created_at: doc.created_at || now,
        updated_at: doc.updated_at || now
      }));

      const result = await this.collection<T>(collection).insertMany(docsWithTimestamps, options);
      return docsWithTimestamps.map((doc, index) => ({
        ...doc,
        _id: result.insertedIds[index]
      }));
    } catch (error) {
      logger.error('Database insertMany error', {
        collection,
        count: documents.length,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update a single document
   */
  async updateOne<T = any>(
    collection: string,
    filter: Record<string, any>,
    update: Record<string, any>,
    options?: any
  ): Promise<T | null> {
    try {
      // Add updated timestamp
      const updateWithTimestamp = {
        ...update,
        $set: {
          ...update.$set,
          updated_at: new Date()
        }
      };

      const result = await this.collection<T>(collection).findOneAndUpdate(
        filter,
        updateWithTimestamp,
        { returnDocument: 'after', ...options }
      );
      
      return result;
    } catch (error) {
      logger.error('Database updateOne error', {
        collection,
        filter: JSON.stringify(filter).substring(0, 100),
        update: JSON.stringify(update).substring(0, 100),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update multiple documents
   */
  async updateMany<T = any>(
    collection: string,
    filter: Record<string, any>,
    update: Record<string, any>,
    options?: any
  ): Promise<any> {
    try {
      // Add updated timestamp
      const updateWithTimestamp = {
        ...update,
        $set: {
          ...update.$set,
          updated_at: new Date()
        }
      };

      const result = await this.collection<T>(collection).updateMany(
        filter,
        updateWithTimestamp,
        options
      );
      
      return result;
    } catch (error) {
      logger.error('Database updateMany error', {
        collection,
        filter: JSON.stringify(filter).substring(0, 100),
        update: JSON.stringify(update).substring(0, 100),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete a single document
   */
  async deleteOne<T = any>(
    collection: string,
    filter: Record<string, any>,
    options?: any
  ): Promise<boolean> {
    try {
      const result = await this.collection<T>(collection).deleteOne(filter, options);
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Database deleteOne error', {
        collection,
        filter: JSON.stringify(filter).substring(0, 100),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete multiple documents
   */
  async deleteMany<T = any>(
    collection: string,
    filter: Record<string, any>,
    options?: any
  ): Promise<number> {
    try {
      const result = await this.collection<T>(collection).deleteMany(filter, options);
      return result.deletedCount;
    } catch (error) {
      logger.error('Database deleteMany error', {
        collection,
        filter: JSON.stringify(filter).substring(0, 100),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Count documents
   */
  async count<T = any>(
    collection: string,
    filter: Record<string, any> = {},
    options?: any
  ): Promise<number> {
    try {
      return await this.collection<T>(collection).countDocuments(filter, options);
    } catch (error) {
      logger.error('Database count error', {
        collection,
        filter: JSON.stringify(filter).substring(0, 100),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute aggregation pipeline
   */
  async aggregate<T = any>(
    collection: string,
    pipeline: Record<string, any>[],
    options?: any
  ): Promise<T[]> {
    try {
      return await this.collection<T>(collection).aggregate(pipeline, options).toArray();
    } catch (error) {
      logger.error('Database aggregate error', {
        collection,
        pipeline: JSON.stringify(pipeline).substring(0, 100),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Start a transaction session
   */
  async startSession(): Promise<ClientSession> {
    return this.client.startSession();
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await this.startSession();
    
    try {
      session.startTransaction();
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Check if database connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.db.admin().ping();
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const stats = await this.db.stats();
      return {
        collections: stats.collections,
        objects: stats.objects,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes
      };
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      return null;
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.client.close();
    logger.info('Database connections closed');
  }
}

// Create database service instance
export let db: DatabaseService;

// Connect to database function
export async function connectDatabase(): Promise<void> {
  try {
    // Initialize Mongoose connection
    await mongoose.connect(config.MONGODB_URL, {
      maxPoolSize: config.MONGODB_MAX_POOL_SIZE,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });

    // Initialize native MongoDB client for advanced operations
    client = new MongoClient(config.MONGODB_URL, {
      maxPoolSize: config.MONGODB_MAX_POOL_SIZE,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });

    await client.connect();
    database = client.db(config.MONGODB_DB_NAME);

    // Create database service instance
    db = new DatabaseService(client, database);

    // Test the connection
    await db.healthCheck();
    
    logger.info('Database connection successful', {
      database: config.MONGODB_DB_NAME,
      host: config.MONGODB_HOST,
      port: config.MONGODB_PORT
    });
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

// Database helper functions
export const dbHelpers = {
  /**
   * Build pagination options
   */
  buildPaginationOptions(
    page: number = 1,
    limit: number = 10,
    sort: Record<string, 1 | -1> = { created_at: -1 }
  ): { skip: number; limit: number; sort: Record<string, 1 | -1> } {
    const skip = (page - 1) * limit;
    return { skip, limit, sort };
  },

  /**
   * Build search filter with regex
   */
  buildSearchFilter(fields: string[], searchTerm: string): Record<string, any> {
    if (!searchTerm) return {};
    
    const conditions = fields.map(field => ({
      [field]: { $regex: searchTerm, $options: 'i' }
    }));
    
    return { $or: conditions };
  },

  /**
   * Build filters from object
   */
  buildFilters(filters: Record<string, any>): Record<string, any> {
    const mongoFilters: Record<string, any> = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          mongoFilters[key] = { $in: value };
        } else if (typeof value === 'string' && value.includes(',')) {
          mongoFilters[key] = { $in: value.split(',') };
        } else {
          mongoFilters[key] = value;
        }
      }
    });

    return mongoFilters;
  },

  /**
   * Convert PostgreSQL-style results to MongoDB format
   */
  formatResults<T>(results: T[]): { rows: T[]; rowCount: number } {
    return {
      rows: results,
      rowCount: results.length
    };
  },

  /**
   * Generate ObjectId
   */
  generateId(): string {
    return new mongoose.Types.ObjectId().toString();
  },

  /**
   * Validate ObjectId
   */
  isValidId(id: string): boolean {
    return mongoose.Types.ObjectId.isValid(id);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (error) => {
  logger.error('Mongoose connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down database connections...');
  if (db) await db.close();
  await mongoose.disconnect();
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down database connections...');
  if (db) await db.close();
  await mongoose.disconnect();
});