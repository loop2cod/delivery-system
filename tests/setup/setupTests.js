// Test setup that runs before each test file
import '@testing-library/jest-dom';
import 'jest-canvas-mock';

// Extend Jest matchers
expect.extend({
  toBeValidUAECoordinate(received) {
    const pass = 
      typeof received === 'object' &&
      typeof received.latitude === 'number' &&
      typeof received.longitude === 'number' &&
      received.latitude >= 22.0 && received.latitude <= 26.5 && // UAE latitude range
      received.longitude >= 51.0 && received.longitude <= 57.0; // UAE longitude range
      
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be valid UAE coordinates`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be valid UAE coordinates`,
        pass: false,
      };
    }
  },
  
  toHaveValidDeliveryStatus(received) {
    const validStatuses = ['pending', 'confirmed', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled'];
    const pass = validStatuses.includes(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid delivery status`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid delivery status. Valid statuses: ${validStatuses.join(', ')}`,
        pass: false,
      };
    }
  },
  
  toBeValidQRData(received) {
    const pass = 
      typeof received === 'object' &&
      typeof received.type === 'string' &&
      ['package', 'delivery', 'inquiry', 'tracking'].includes(received.type) &&
      typeof received.id === 'string' &&
      received.id.length > 0 &&
      typeof received.timestamp === 'number';
      
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be valid QR data`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be valid QR data`,
        pass: false,
      };
    }
  }
});

// Mock console methods for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  // Suppress known warnings and errors during tests
  const message = args[0];
  if (
    typeof message === 'string' &&
    (
      message.includes('Warning: ReactDOM.render is deprecated') ||
      message.includes('Warning: componentWillReceiveProps') ||
      message.includes('act(...) warning') ||
      message.includes('Service Worker') ||
      message.includes('WebSocket')
    )
  ) {
    return;
  }
  originalError.apply(console, args);
};

console.warn = (...args) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (
      message.includes('deprecated') ||
      message.includes('Service Worker') ||
      message.includes('WebSocket')
    )
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

// Global test utilities
global.testUtils = {
  // Create mock user data
  createMockUser: (role = 'customer', overrides = {}) => ({
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test User',
    email: 'test@example.com',
    role,
    phone: '+971501234567',
    created_at: new Date().toISOString(),
    ...overrides
  }),
  
  // Create mock delivery data
  createMockDelivery: (overrides = {}) => ({
    id: `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tracking_number: `TRK${Date.now()}`,
    customer_name: 'Test Customer',
    customer_phone: '+971501234567',
    customer_email: 'customer@example.com',
    pickup_address: 'Test Pickup Address, Dubai, UAE',
    pickup_latitude: 25.276987,
    pickup_longitude: 55.296249,
    delivery_address: 'Test Delivery Address, Dubai, UAE',
    delivery_latitude: 25.197197,
    delivery_longitude: 55.274376,
    service_type: 'standard',
    status: 'pending',
    created_at: new Date().toISOString(),
    ...overrides
  }),
  
  // Create mock location data
  createMockLocation: (overrides = {}) => ({
    latitude: 25.276987,
    longitude: 55.296249,
    accuracy: 10,
    timestamp: Date.now(),
    ...overrides
  }),
  
  // Create mock QR data
  createMockQRData: (type = 'package', overrides = {}) => ({
    type,
    id: `${type}_${Date.now()}`,
    timestamp: Date.now(),
    metadata: {},
    ...overrides
  }),
  
  // Simulate async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock API responses
  mockAPIResponse: (data, status = 200) => {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
      headers: new Map([['content-type', 'application/json']])
    });
  },
  
  // Mock geolocation
  mockGeolocation: (coordinates = { latitude: 25.276987, longitude: 55.296249 }) => {
    const mockGeolocation = {
      getCurrentPosition: jest.fn((success) => {
        success({
          coords: {
            ...coordinates,
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
    };
    
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true
    });
    
    return mockGeolocation;
  },
  
  // Mock localStorage with actual implementation
  mockLocalStorage: () => {
    const store = {};
    const mockLocalStorage = {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = value.toString();
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        for (const key in store) {
          delete store[key];
        }
      })
    };
    
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      configurable: true
    });
    
    return mockLocalStorage;
  },
  
  // Mock fetch with predefined responses
  mockFetch: (responses = {}) => {
    const mockFetch = jest.fn((url, options) => {
      const method = options?.method || 'GET';
      const key = `${method} ${url}`;
      
      if (responses[key]) {
        return Promise.resolve(responses[key]);
      }
      
      // Default response
      return testUtils.mockAPIResponse({ success: true });
    });
    
    global.fetch = mockFetch;
    return mockFetch;
  }
};

// Reset mocks before each test
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset fetch mock
  if (global.fetch && global.fetch.mockClear) {
    global.fetch.mockClear();
  }
  
  // Reset localStorage mock
  if (global.localStorage && global.localStorage.clear) {
    global.localStorage.clear();
  }
  
  // Reset sessionStorage mock
  if (global.sessionStorage && global.sessionStorage.clear) {
    global.sessionStorage.clear();
  }
});

// Clean up after each test
afterEach(() => {
  // Clean up any remaining timers
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection in test:', reason);
  throw reason;
});