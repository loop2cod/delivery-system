import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { UserRole, UserStatus } from '@delivery-uae/shared';
import { db } from '../config/database';
import { redis, cacheUtils } from '../config/redis';
import { config } from '../config/environment';
import { logger, securityLogger } from '../utils/logger';
import { ValidationError, ConflictError, NotFoundError } from '../middleware/errorHandler';
import { User, CompanyUser, Driver, UserSession } from '../models';
import mongoose from 'mongoose';

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
    const user = await User.findOne({ 
      email: email.toLowerCase() 
    }).lean();

    if (!user) {
      // Increment failed attempts
      await redis.incr(failedKey);
      await redis.expire(failedKey, 900); // 15 minutes
      
      securityLogger.auth(email, false, ip, userAgent);
      throw new ValidationError('Invalid email or password');
    }

    // Get company and driver info separately
    const companyUser = await CompanyUser.findOne({ 
      user_id: user._id, 
      is_primary: true 
    }).lean();
    
    const driver = await Driver.findOne({ 
      user_id: user._id 
    }).lean();

    const userWithRelations = {
      ...user,
      id: user._id.toString(),
      company_id: companyUser?.company_id?.toString() || null,
      driver_id: driver?._id?.toString() || null
    };

    // Check if user is active
    if (userWithRelations.status !== UserStatus.ACTIVE) {
      securityLogger.auth(email, false, ip, userAgent);
      throw new ValidationError('Account is not active. Please contact support.');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userWithRelations.password_hash);
    
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
    const { token, refreshToken } = await this.generateTokens(userWithRelations.id);

    // Create session
    await this.createSession(token, userWithRelations, refreshToken, pwaType, deviceInfo, ip);

    // Update last login
    await User.findByIdAndUpdate(userWithRelations._id, {
      last_login: new Date()
    });

    // Cache user data
    await redis.set(
      cacheUtils.keys.user(userWithRelations.id),
      {
        id: userWithRelations.id,
        email: userWithRelations.email,
        name: userWithRelations.name,
        role: userWithRelations.role,
        company_id: userWithRelations.company_id,
        driver_id: userWithRelations.driver_id
      },
      cacheUtils.ttl.MEDIUM
    );

    securityLogger.auth(email, true, ip, userAgent);

    return {
      user: {
        id: userWithRelations.id,
        email: userWithRelations.email,
        name: userWithRelations.name,
        role: userWithRelations.role,
        companyId: userWithRelations.company_id,
        driverId: userWithRelations.driver_id
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
    const existingUser = await User.findOne({
      email: email.toLowerCase()
    }).lean();

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);

    // Create user
    const newUser = await User.create({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      name,
      phone,
      role,
      status: UserStatus.ACTIVE
    });

    // Generate tokens
    const { token, refreshToken } = await this.generateTokens(newUser.id);

    // Create session
    await this.createSession(token, newUser, refreshToken, 'public', {}, '');

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

    // Find sessions that haven't expired
    const sessionQuery = `
      SELECT s.user_id, s.token_hash, s.refresh_token_hash, u.email, u.name, u.role, u.status,
             cu.company_id, d.id as driver_id
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN company_users cu ON u.id = cu.user_id AND cu.is_primary = true
      LEFT JOIN drivers d ON u.id = d.user_id
      WHERE s.expires_at > CURRENT_TIMESTAMP
    `;

    const sessionsResult = await db.query(sessionQuery);
    const sessions = sessionsResult.rows;
    
    // Find the session with matching refresh token
    let session = null;
    for (const s of sessions) {
      if (await bcrypt.compare(refreshTokenValue, s.refresh_token_hash)) {
        session = s;
        break;
      }
    }

    if (!session) {
      throw new ValidationError('Invalid or expired refresh token');
    }

    // Check if user is still active
    if (session.status !== UserStatus.ACTIVE) {
      throw new ValidationError('Account is not active');
    }

    // Generate new tokens
    const { token, refreshToken } = await this.generateTokens(session.user_id);

    // Update session with new token hashes
    await db.query(`
      UPDATE user_sessions 
      SET token_hash = $1, refresh_token_hash = $2, last_used_at = CURRENT_TIMESTAMP
      WHERE user_id = $3 AND refresh_token_hash = $4
    `, [
      await bcrypt.hash(token, 10),
      await bcrypt.hash(refreshToken, 10),
      session.user_id,
      session.refresh_token_hash // Use the existing hash to identify the session
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
  private static async generateTokens(userId: string, fastifyInstance?: any): Promise<{
    token: string;
    refreshToken: string;
  }> {
    // Generate JWT token using same method as Fastify JWT
    const payload = { userId };
    const token = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN
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
    refreshToken: string,
    pwaType?: string,
    deviceInfo?: any,
    ip?: string
  ): Promise<void> {
    const tokenHash = await bcrypt.hash(token, 10);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // Store session in database
    await UserSession.create({
      user_id: user._id || user.id,
      token_hash: tokenHash,
      refresh_token_hash: refreshTokenHash,
      pwa_type: pwaType || 'unknown',
      device_info: deviceInfo || {},
      ip_address: ip,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    // Cache session
    await redis.set(
      cacheUtils.keys.session(token),
      { userId: user.id || user._id.toString(), refreshToken },
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
      // Fetch from database with populate
      const userDoc = await User.findById(userId).lean();

      if (!userDoc) {
        throw new NotFoundError('User not found');
      }

      // Get company and driver info
      const companyUser = await CompanyUser.findOne({ 
        user_id: userDoc._id, 
        is_primary: true 
      }).populate('company_id', 'name').lean();
      
      const driver = await Driver.findOne({ 
        user_id: userDoc._id 
      }).lean();

      user = {
        ...userDoc,
        id: userDoc._id.toString(),
        company_id: companyUser?.company_id?._id?.toString() || null,
        company_name: companyUser?.company_id?.name || null,
        driver_id: driver?._id?.toString() || null,
        rating: driver?.rating || null,
        total_deliveries: driver?.total_deliveries || null
      };

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