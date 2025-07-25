import { config as loadEnv } from 'dotenv';
import { join } from 'path';

// Load environment variables
loadEnv({ path: join(__dirname, '../../.env') });

export const config = {
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  HOST: process.env.HOST || '0.0.0.0',
  PORT: parseInt(process.env.PORT || '3000', 10),

  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://delivery_user:delivery_pass_2025@localhost:5432/delivery_uae_dev',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: process.env.DB_NAME || 'delivery_uae_dev',
  DB_USER: process.env.DB_USER || 'delivery_user',
  DB_PASSWORD: process.env.DB_PASSWORD || 'delivery_pass_2025',
  DB_MAX_CONNECTIONS: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),

  // Redis Configuration
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || 'redis_pass_2025',

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',

  // Cookie Configuration
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'your-super-secret-cookie-key-change-in-production',

  // Email Configuration (SendGrid/SMTP)
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@deliveryuae.com',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',

  // Push Notifications (Web Push)
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  VAPID_EMAIL: process.env.VAPID_EMAIL || 'admin@deliveryuae.com',

  // File Storage
  UPLOAD_DIR: process.env.UPLOAD_DIR || join(__dirname, '../../uploads'),
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
  ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],

  // External Services
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
  SMS_PROVIDER_API_KEY: process.env.SMS_PROVIDER_API_KEY || '',
  SMS_PROVIDER_URL: process.env.SMS_PROVIDER_URL || '',

  // Rate Limiting
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || '1 minute',

  // CORS Origins
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3001',
    'http://localhost:3002', 
    'http://localhost:3003',
    'http://localhost:3004',
    'https://deliveryuae.com',
    'https://admin.deliveryuae.com',
    'https://business.deliveryuae.com',
    'https://driver.deliveryuae.com'
  ],

  // PWA Configuration
  PWA_CACHE_TTL: parseInt(process.env.PWA_CACHE_TTL || '86400', 10), // 24 hours
  OFFLINE_SYNC_INTERVAL: parseInt(process.env.OFFLINE_SYNC_INTERVAL || '60000', 10), // 1 minute

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE || 'logs/app.log',

  // Security
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT || '1800000', 10), // 30 minutes

  // Business Rules
  MAX_PACKAGES_PER_REQUEST: parseInt(process.env.MAX_PACKAGES_PER_REQUEST || '20', 10),
  MAX_DELIVERY_DISTANCE_KM: parseInt(process.env.MAX_DELIVERY_DISTANCE_KM || '500', 10),
  PICKUP_WINDOW_HOURS: parseInt(process.env.PICKUP_WINDOW_HOURS || '2', 10),

  // Development/Testing
  ENABLE_SWAGGER: process.env.ENABLE_SWAGGER !== 'false',
  ENABLE_PLAYGROUND: process.env.ENABLE_PLAYGROUND === 'true',
  MOCK_EXTERNAL_SERVICES: process.env.MOCK_EXTERNAL_SERVICES === 'true'
};

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'COOKIE_SECRET'
];

if (config.NODE_ENV === 'production') {
  requiredEnvVars.push(
    'DATABASE_URL',
    'REDIS_URL',
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY'
  );
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set`);
  }
}

// Configuration validation
if (config.PORT < 1 || config.PORT > 65535) {
  throw new Error('PORT must be between 1 and 65535');
}

if (config.BCRYPT_ROUNDS < 10 || config.BCRYPT_ROUNDS > 15) {
  throw new Error('BCRYPT_ROUNDS must be between 10 and 15');
}

export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';