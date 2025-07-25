import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from './environment';
import { logger } from '../utils/logger';

// Database connection pool
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  max: config.DB_MAX_CONNECTIONS,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Database query interface
export class DatabaseService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Execute a query with optional parameters
   */
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        logger.warn('Slow query detected', {
          query: text.substring(0, 100),
          duration: `${duration}ms`,
          rows: result.rowCount
        });
      }
      
      return result;
    } catch (error) {
      logger.error('Database query error', {
        query: text.substring(0, 100),
        params: params?.slice(0, 5),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute a query and return the first row
   */
  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] || null;
  }

  /**
   * Execute a query and return all rows
   */
  async queryMany<T = any>(text: string, params?: any[]): Promise<T[]> {
    const result = await this.query<T>(text, params);
    return result.rows;
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if database connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  /**
   * Close all connections
   */
  async end(): Promise<void> {
    await this.pool.end();
    logger.info('Database connections closed');
  }
}

// Create database service instance
export const db = new DatabaseService(pool);

// Database helper functions
export const dbHelpers = {
  /**
   * Build WHERE clause with pagination
   */
  buildPaginationQuery(
    baseQuery: string,
    page: number = 1,
    limit: number = 10,
    orderBy: string = 'created_at DESC'
  ): { query: string; offset: number } {
    const offset = (page - 1) * limit;
    const query = `
      ${baseQuery}
      ORDER BY ${orderBy}
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    return { query, offset };
  },

  /**
   * Build search query with ILIKE
   */
  buildSearchQuery(fields: string[], searchTerm: string): string {
    if (!searchTerm) return '';
    
    const conditions = fields.map(field => 
      `${field} ILIKE $1`
    ).join(' OR ');
    
    return `(${conditions})`;
  },

  /**
   * Build filter query from object
   */
  buildFiltersQuery(
    filters: Record<string, any>,
    paramOffset: number = 0
  ): { conditions: string[]; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = paramOffset + 1;

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          conditions.push(`${key} = ANY($${paramIndex})`);
          params.push(value);
        } else {
          conditions.push(`${key} = $${paramIndex}`);
          params.push(value);
        }
        paramIndex++;
      }
    });

    return { conditions, params };
  },

  /**
   * Build INSERT query with RETURNING
   */
  buildInsertQuery(
    table: string,
    data: Record<string, any>,
    returning: string = '*'
  ): { query: string; params: any[] } {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`);

    const query = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING ${returning}
    `;

    return { query, params: values };
  },

  /**
   * Build UPDATE query with WHERE clause
   */
  buildUpdateQuery(
    table: string,
    data: Record<string, any>,
    whereClause: string,
    whereParams: any[] = [],
    returning: string = '*'
  ): { query: string; params: any[] } {
    const updates = Object.keys(data).map((key, index) => 
      `${key} = $${index + 1}`
    );
    
    const query = `
      UPDATE ${table}
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE ${whereClause}
      RETURNING ${returning}
    `;

    const params = [...Object.values(data), ...whereParams];
    return { query, params };
  }
};

// Initialize database connection and handle errors
pool.on('connect', () => {
  logger.info('Database connection established');
});

pool.on('error', (error) => {
  logger.error('Database connection error:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down database connections...');
  await db.end();
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down database connections...');
  await db.end();
});