// Global test setup for the entire test suite
const { execSync } = require('child_process');
const path = require('path');

module.exports = async () => {
  console.log('🚀 Setting up global test environment...');
  
  // Set up test database
  await setupTestDatabase();
  
  // Set up test Redis instance
  await setupTestRedis();
  
  // Set up mock services
  await setupMockServices();
  
  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test_user:test_pass@localhost:5433/delivery_test';
  process.env.REDIS_URL = 'redis://localhost:6380';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.COOKIE_SECRET = 'test-cookie-secret-for-testing';
  process.env.API_PORT = '3010';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  
  console.log('✅ Global test environment setup complete');
};

async function setupTestDatabase() {
  try {
    console.log('📊 Setting up test database...');
    
    // Check if PostgreSQL is running
    try {
      execSync('pg_isready -h localhost -p 5433', { stdio: 'ignore' });
    } catch (error) {
      console.log('Starting PostgreSQL test container...');
      execSync('docker run -d --name postgres-test -p 5433:5432 -e POSTGRES_DB=delivery_test -e POSTGRES_USER=test_user -e POSTGRES_PASSWORD=test_pass postgres:15', { stdio: 'ignore' });
      
      // Wait for PostgreSQL to be ready
      let retries = 30;
      while (retries > 0) {
        try {
          execSync('pg_isready -h localhost -p 5433', { stdio: 'ignore' });
          break;
        } catch (e) {
          retries--;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // Run database migrations
    const migrationsDir = path.join(__dirname, '../../backend/migrations');
    execSync(`psql postgresql://test_user:test_pass@localhost:5433/delivery_test -f ${migrationsDir}/*.sql`, { stdio: 'ignore' });
    
    console.log('✅ Test database setup complete');
  } catch (error) {
    console.error('❌ Test database setup failed:', error.message);
    throw error;
  }
}

async function setupTestRedis() {
  try {
    console.log('📦 Setting up test Redis...');
    
    // Check if Redis is running
    try {
      execSync('redis-cli -p 6380 ping', { stdio: 'ignore' });
    } catch (error) {
      console.log('Starting Redis test container...');
      execSync('docker run -d --name redis-test -p 6380:6379 redis:7', { stdio: 'ignore' });
      
      // Wait for Redis to be ready
      let retries = 10;
      while (retries > 0) {
        try {
          execSync('redis-cli -p 6380 ping', { stdio: 'ignore' });
          break;
        } catch (e) {
          retries--;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    console.log('✅ Test Redis setup complete');
  } catch (error) {
    console.error('❌ Test Redis setup failed:', error.message);
    throw error;
  }
}

async function setupMockServices() {
  console.log('🎭 Setting up mock services...');
  
  // Mock geolocation API
  global.navigator = {
    geolocation: {
      getCurrentPosition: jest.fn((success) => {
        success({
          coords: {
            latitude: 25.276987,
            longitude: 55.296249,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now()
        });
      }),
      watchPosition: jest.fn(() => 1),
      clearWatch: jest.fn()
    },
    permissions: {
      query: jest.fn(() => Promise.resolve({ state: 'granted' }))
    },
    serviceWorker: {
      register: jest.fn(() => Promise.resolve()),
      addEventListener: jest.fn(),
      postMessage: jest.fn()
    }
  };
  
  // Mock WebSocket
  global.WebSocket = jest.fn(() => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1
  }));
  
  // Mock fetch for tests
  global.fetch = jest.fn();
  
  // Mock localStorage
  global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  };
  
  // Mock sessionStorage
  global.sessionStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  };
  
  // Mock IntersectionObserver
  global.IntersectionObserver = jest.fn(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
  }));
  
  // Mock ResizeObserver
  global.ResizeObserver = jest.fn(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
  }));
  
  // Mock matchMedia
  global.matchMedia = jest.fn((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }));
  
  console.log('✅ Mock services setup complete');
}