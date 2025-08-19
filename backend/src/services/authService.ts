import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { UserRole, UserStatus } from '../models/User';
import { redis, cacheUtils } from '../config/redis';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { User } from '../models/User';
import { ValidationError, ConflictError, NotFoundError } from '../middleware/errorHandler';
import { db } from '../config/database';

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
    try {
      const failedAttempts = await redis.get(failedKey);
      if (failedAttempts && parseInt(failedAttempts) >= 5) {
        logger.warn('Brute force login attempt', { ip, email });
        throw new ValidationError('Too many failed login attempts. Try again later.');
      }
    } catch (error) {
      // Redis unavailable, continue without rate limiting
    }

    // Find user
    const user = await User.findOne({ 
      email: email.toLowerCase() 
    }).lean();

    if (!user) {
      // Increment failed attempts
      try {
        await redis.incr(failedKey);
        await redis.expire(failedKey, 900); // 15 minutes
      } catch (error) {
        // Redis unavailable
      }
      
      logger.warn('Login failed - user not found', { email, ip });
      throw new ValidationError('Invalid email or password');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      logger.warn('Login failed - user inactive', { email, ip });
      throw new ValidationError('Account is not active. Please contact support.');
    }

    // For business users, get their company association
    let companyId: string | undefined = undefined;
    if (user.role === UserRole.BUSINESS) {
      const companyUser = await db.findOne('company_users', { 
        user_id: user._id.toString() 
      });
      
      if (companyUser) {
        companyId = companyUser.company_id;
      }
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      // Increment failed attempts
      try {
        await redis.incr(failedKey);
        await redis.expire(failedKey, 900); // 15 minutes
      } catch (error) {
        // Redis unavailable
      }
      
      logger.warn('Login failed - invalid password', { email, ip });
      throw new ValidationError('Invalid email or password');
    }

    // Clear failed attempts on successful login
    try {
      await redis.del(failedKey);
    } catch (error) {
      // Redis unavailable
    }

    // Generate tokens
    const { token, refreshToken } = await this.generateTokens(user._id.toString());

    // Create session
    await this.createSession(token, user, refreshToken, pwaType, deviceInfo, ip);

    // Update last login
    await User.findByIdAndUpdate(user._id, {
      last_login: new Date()
    });

    // Cache user data
    try {
      await redis.set(
        cacheUtils.keys.user(user._id.toString()),
        {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: companyId,
          driverId: user.driverId
        },
        cacheUtils.ttl.MEDIUM
      );
    } catch (error) {
      // Redis unavailable
    }

    logger.info('User logged in successfully', { 
      userId: user._id.toString(), 
      email: user.email, 
      role: user.role,
      companyId: companyId
    });

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: companyId,
        driverId: user.driverId
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
    const { email, password, name, phone, role = UserRole.BUSINESS } = registerData;

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
      status: UserStatus.ACTIVE,
      email_verified: true
    });

    // Generate tokens
    const { token, refreshToken } = await this.generateTokens(newUser._id.toString());

    // Create session
    await this.createSession(token, newUser, refreshToken, 'public', {}, '');

    logger.info('User registered', {
      userId: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role
    });

    return {
      user: {
        id: newUser._id.toString(),
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
   * User logout
   */
  static async logout(token: string, userId?: string): Promise<void> {
    // Remove session from cache
    try {
      await redis.del(cacheUtils.keys.session(token));
    } catch (error) {
      // Redis unavailable
    }

    // Clear user cache
    if (userId) {
      try {
        await redis.del(cacheUtils.keys.user(userId));
      } catch (error) {
        // Redis unavailable
      }
    }

    logger.info('User logged out', { userId, token: token.substring(0, 10) + '...' });
  }

  /**
   * Generate JWT and refresh tokens
   */
  private static async generateTokens(userId: string): Promise<{
    token: string;
    refreshToken: string;
  }> {
    // Generate JWT token
    const payload = { userId };
    const token = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN as string
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
    // Cache session
    try {
      await redis.set(
        cacheUtils.keys.session(token),
        { userId: user._id.toString(), refreshToken },
        cacheUtils.ttl.LONG
      );
    } catch (error) {
      // Redis unavailable
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<any> {
    // Try cache first
    let user = null;
    try {
      user = await redis.get(cacheUtils.keys.user(userId), true);
    } catch (error) {
      // Redis unavailable
    }

    if (!user) {
      // Fetch from database
      const userDoc = await User.findById(userId).select('-password_hash').lean();

      if (!userDoc) {
        throw new NotFoundError('User not found');
      }

      user = {
        ...userDoc,
        id: userDoc._id.toString()
      };

      // Cache user data
      try {
        await redis.set(
          cacheUtils.keys.user(userId),
          user,
          cacheUtils.ttl.MEDIUM
        );
      } catch (error) {
        // Redis unavailable
      }
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
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId }
      }).lean();

      if (existingUser) {
        throw new ConflictError('Email is already taken');
      }
    }

    // Build update object
    const updateObj: any = {};
    if (name) updateObj.name = name;
    if (phone) updateObj.phone = phone;
    if (email) updateObj.email = email.toLowerCase();

    if (Object.keys(updateObj).length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateObj,
      { new: true, select: '-password_hash' }
    ).lean();

    // Clear user cache
    try {
      await redis.del(cacheUtils.keys.user(userId));
    } catch (error) {
      // Redis unavailable
    }

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
    // Get current user
    const user = await User.findById(userId).select('password_hash').lean();

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
    await User.findByIdAndUpdate(userId, {
      password_hash: newPasswordHash
    });

    // Clear user cache
    try {
      await redis.del(cacheUtils.keys.user(userId));
    } catch (error) {
      // Redis unavailable
    }

    logger.info('Password changed', { userId });
  }

  /**
   * Refresh token
   */
  static async refreshToken(refreshToken: string): Promise<AuthResponse> {
    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    // Find session with this refresh token
    let session = null;
    try {
      // For now, we'll just validate the token exists in cache
      // In a production system, you'd store refresh tokens in database
      const keys = await redis.keys('session:*');
      for (const key of keys) {
        const sessionData = await redis.get(key, true);
        if (sessionData && (sessionData as any).refreshToken === refreshToken) {
          session = sessionData;
          break;
        }
      }
    } catch (error) {
      // Redis unavailable
    }

    if (!session) {
      throw new ValidationError('Invalid refresh token');
    }

    // Get user
    const user = await User.findById((session as any).userId).lean();
    if (!user) {
      throw new ValidationError('User not found');
    }

    // Check if user is still active
    if (user.status !== UserStatus.ACTIVE) {
      throw new ValidationError('Account is not active');
    }

    // Generate new tokens
    const { token, refreshToken: newRefreshToken } = await this.generateTokens(user._id.toString());

    // Update session with new refresh token
    await this.createSession(token, user, newRefreshToken);

    logger.info('Token refreshed', { userId: user._id.toString() });

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role
      },
      token,
      refreshToken: newRefreshToken,
      expiresIn: config.JWT_EXPIRES_IN
    };
  }

  /**
   * Logout from all devices
   */
  static async logoutAll(userId: string): Promise<void> {
    try {
      // Clear all sessions for this user
      const keys = await redis.keys('session:*');
      for (const key of keys) {
        const sessionData = await redis.get(key, true);
        if (sessionData && (sessionData as any).userId === userId) {
          await redis.del(key);
        }
      }

      // Clear user cache
      await redis.del(cacheUtils.keys.user(userId));
    } catch (error) {
      // Redis unavailable
    }

    logger.info('User logged out from all devices', { userId });
  }
}