import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { UserRole, UserStatus } from '@delivery-uae/shared';
import { db } from '../config/database';
import { redis, cacheUtils } from '../config/redis';
import { config } from '../config/environment';
import { logger, securityLogger } from '../utils/logger';
import { ValidationError, ConflictError, NotFoundError } from '../middleware/errorHandler';

export interface LoginRequest {
  email: string;
  password: string;
  pwaType?: string;
  deviceInfo?: any;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    companyId?: string;
    driverId?: string;
  };
  token: string;
  refreshToken: string;
  expiresIn: string;
}

export class AuthService {
  /**
   * User login
   */
  static async login(
    loginData: LoginRequest,
    ip: string,
    userAgent: string
  ): Promise<AuthResponse> {
    const { email, password, pwaType, deviceInfo } = loginData;

    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Check rate limiting for failed login attempts
    const failedKey = `failed_login:${ip}`;
    const failedAttempts = await redis.get(failedKey);
    
    if (failedAttempts && parseInt(failedAttempts) >= 5) {
      securityLogger.suspicious('BRUTE_FORCE_LOGIN', ip, { email });
      throw new ValidationError('Too many failed login attempts. Try again later.');
    }

    // Find user with company and driver info
    const userQuery = `
      SELECT u.id, u.email, u.password_hash, u.name, u.role, u.status,
             cu.company_id, d.id as driver_id
      FROM users u
      LEFT JOIN company_users cu ON u.id = cu.user_id AND cu.is_primary = true
      LEFT JOIN drivers d ON u.id = d.user_id
      WHERE LOWER(u.email) = LOWER($1)
    `;

    const user = await db.queryOne(userQuery, [email]);

    if (!user) {
      // Increment failed attempts
      await redis.incr(failedKey);
      await redis.expire(failedKey, 900); // 15 minutes
      
      securityLogger.auth(email, false, ip, userAgent);
      throw new ValidationError('Invalid email or password');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      securityLogger.auth(email, false, ip, userAgent);
      throw new ValidationError('Account is not active. Please contact support.');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      // Increment failed attempts
      await redis.incr(failedKey);
      await redis.expire(failedKey, 900); // 15 minutes
      
      securityLogger.auth(email, false, ip, userAgent);
      throw new ValidationError('Invalid email or password');
    }

    // Clear failed attempts on successful login
    await redis.del(failedKey);

    // Generate tokens
    const { token, refreshToken } = await this.generateTokens(user.id);

    // Create session
    await this.createSession(token, user, pwaType, deviceInfo, ip);

    // Update last login
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Cache user data
    await redis.set(
      cacheUtils.keys.user(user.id),
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company_id: user.company_id,
        driver_id: user.driver_id
      },
      cacheUtils.ttl.MEDIUM
    );

    securityLogger.auth(email, true, ip, userAgent);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.company_id,
        driverId: user.driver_id
      },
      token,
      refreshToken,
      expiresIn: config.JWT_EXPIRES_IN
    };
  }

  /**
   * User registration
   */
  static async register(registerData: RegisterRequest): Promise<AuthResponse> {
    const { email, password, name, phone, role = UserRole.CUSTOMER } = registerData;

    // Validate input
    if (!email || !password || !name || !phone) {
      throw new ValidationError('All fields are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    // Validate UAE phone number
    const phoneRegex = /^(\+971|971|0)?[0-9]{8,9}$/;
    if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
      throw new ValidationError('Invalid UAE phone number');
    }

    // Check if user already exists
    const existingUser = await db.queryOne(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);

    // Create user
    const newUser = await db.queryOne(`
      INSERT INTO users (email, password_hash, name, phone, role, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, name, role
    `, [email, passwordHash, name, phone, role, UserStatus.ACTIVE]);

    // Generate tokens
    const { token, refreshToken } = await this.generateTokens(newUser.id);

    // Create session
    await this.createSession(token, newUser, 'public', {}, '');

    logger.info('User registered', {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      },
      token,
      refreshToken,
      expiresIn: config.JWT_EXPIRES_IN
    };
  }

  /**
   * Refresh authentication token
   */
  static async refreshToken(refreshTokenValue: string): Promise<AuthResponse> {
    if (!refreshTokenValue) {
      throw new ValidationError('Refresh token is required');
    }

    // Find session by refresh token
    const sessionQuery = `
      SELECT s.user_id, s.token_hash, u.email, u.name, u.role, u.status,
             cu.company_id, d.id as driver_id
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN company_users cu ON u.id = cu.user_id AND cu.is_primary = true
      LEFT JOIN drivers d ON u.id = d.user_id
      WHERE s.refresh_token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP
    `;

    const session = await db.queryOne(sessionQuery, [
      await bcrypt.hash(refreshTokenValue, 10)
    ]);

    if (!session) {
      throw new ValidationError('Invalid or expired refresh token');
    }

    // Check if user is still active
    if (session.status !== UserStatus.ACTIVE) {
      throw new ValidationError('Account is not active');
    }

    // Generate new tokens
    const { token, refreshToken } = await this.generateTokens(session.user_id);

    // Update session
    await db.query(`
      UPDATE user_sessions 
      SET token_hash = $1, refresh_token_hash = $2, last_used_at = CURRENT_TIMESTAMP
      WHERE user_id = $3 AND refresh_token_hash = $4
    `, [
      await bcrypt.hash(token, 10),
      await bcrypt.hash(refreshToken, 10),
      session.user_id,
      await bcrypt.hash(refreshTokenValue, 10)
    ]);

    // Update session cache
    await redis.set(
      cacheUtils.keys.session(token),
      { userId: session.user_id, refreshToken },
      cacheUtils.ttl.LONG
    );

    return {
      user: {
        id: session.user_id,
        email: session.email,
        name: session.name,
        role: session.role,
        companyId: session.company_id,
        driverId: session.driver_id
      },
      token,
      refreshToken,
      expiresIn: config.JWT_EXPIRES_IN
    };
  }

  /**
   * User logout
   */
  static async logout(token: string, userId?: string): Promise<void> {
    // Remove session from cache
    await redis.del(cacheUtils.keys.session(token));

    // Remove session from database
    if (userId) {
      await db.query(
        'DELETE FROM user_sessions WHERE user_id = $1 AND token_hash = $2',
        [userId, await bcrypt.hash(token, 10)]
      );

      // Clear user cache
      await cacheUtils.invalidateUserCache(userId);
    }

    logger.info('User logged out', { userId, token: token.substring(0, 10) + '...' });
  }

  /**
   * Logout from all devices
   */
  static async logoutAll(userId: string): Promise<void> {
    // Remove all sessions for user
    await db.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);

    // Clear user cache
    await cacheUtils.invalidateUserCache(userId);

    // Remove all session caches (this is less efficient but ensures cleanup)
    // In production, consider using Redis patterns for better performance
    
    logger.info('User logged out from all devices', { userId });
  }

  /**
   * Generate JWT and refresh tokens
   */
  private static async generateTokens(userId: string): Promise<{
    token: string;
    refreshToken: string;
  }> {
    // Generate JWT token
    const payload = { userId, iat: Math.floor(Date.now() / 1000) };
    const token = await new Promise<string>((resolve, reject) => {
      // Note: This would need to be implemented with the Fastify instance
      // For now, we'll use a placeholder
      resolve('jwt-token-placeholder');
    });

    // Generate refresh token
    const refreshToken = randomBytes(32).toString('hex');

    return { token, refreshToken };
  }

  /**
   * Create user session
   */
  private static async createSession(
    token: string,
    user: any,
    pwaType?: string,
    deviceInfo?: any,
    ip?: string
  ): Promise<void> {
    const tokenHash = await bcrypt.hash(token, 10);
    const refreshToken = randomBytes(32).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // Store session in database
    await db.query(`
      INSERT INTO user_sessions (
        user_id, token_hash, refresh_token_hash, pwa_type, 
        device_info, ip_address, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      user.id,
      tokenHash,
      refreshTokenHash,
      pwaType || 'unknown',
      JSON.stringify(deviceInfo || {}),
      ip,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    ]);

    // Cache session
    await redis.set(
      cacheUtils.keys.session(token),
      { userId: user.id, refreshToken },
      cacheUtils.ttl.LONG
    );
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<any> {
    // Try cache first
    let user = await redis.get(cacheUtils.keys.user(userId), true);

    if (!user) {
      // Fetch from database
      const userQuery = `
        SELECT u.id, u.email, u.name, u.role, u.status, 
               u.created_at, u.last_login,
               cu.company_id, c.name as company_name,
               d.id as driver_id, d.rating, d.total_deliveries
        FROM users u
        LEFT JOIN company_users cu ON u.id = cu.user_id AND cu.is_primary = true
        LEFT JOIN companies c ON cu.company_id = c.id
        LEFT JOIN drivers d ON u.id = d.user_id
        WHERE u.id = $1
      `;

      user = await db.queryOne(userQuery, [userId]);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Cache user data
      await redis.set(
        cacheUtils.keys.user(userId),
        user,
        cacheUtils.ttl.MEDIUM
      );
    }

    return user;
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    updates: { name?: string; phone?: string; email?: string }
  ): Promise<any> {
    const { name, phone, email } = updates;

    // Validate updates
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ValidationError('Invalid email format');
      }

      // Check if email is already taken
      const existingUser = await db.queryOne(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2',
        [email, userId]
      );

      if (existingUser) {
        throw new ConflictError('Email is already taken');
      }
    }

    if (phone) {
      const phoneRegex = /^(\+971|971|0)?[0-9]{8,9}$/;
      if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
        throw new ValidationError('Invalid UAE phone number');
      }
    }

    // Update user
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(name);
    }
    if (phone) {
      updateFields.push(`phone = $${paramIndex++}`);
      updateValues.push(phone);
    }
    if (email) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(email);
    }

    if (updateFields.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    updateValues.push(userId);

    const updatedUser = await db.queryOne(`
      UPDATE users 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, email, name, phone, role
    `, updateValues);

    // Clear user cache
    await cacheUtils.invalidateUserCache(userId);

    logger.info('User profile updated', { userId, updates: Object.keys(updates) });

    return updatedUser;
  }

  /**
   * Change password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get current password hash
    const user = await db.queryOne(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new ValidationError('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters long');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    // Invalidate all sessions (force re-login)
    await this.logoutAll(userId);

    logger.info('Password changed', { userId });
  }
}