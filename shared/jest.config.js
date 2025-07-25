// Jest configuration for Shared Library
module.exports = {
  displayName: 'Shared Library',
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // For React components and browser APIs
  
  // Root directory
  rootDir: '.',
  
  // Test files
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/?(*.)+(spec|test).{ts,tsx}'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/../tests/setup/setupTests.js'
  ],
  
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/../tests/setup/__mocks__/fileMock.js'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json'
    }],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/**/*.stories.{ts,tsx}',
    '!src/index.ts' // Entry point
  ],
  
  coverageThreshold: {
    global: {
      branches: 80, // Higher threshold for shared library
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],
  
  // Environment variables for shared library testing
  testEnvironmentOptions: {
    url: 'http://localhost'
  },
  
  // Globals for shared library testing
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    }
  },
  
  // Test timeout for GPS and location services
  testTimeout: 15000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Coverage thresholds for specific directories
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/components/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/location-services.ts': {
      branches: 90, // Critical GPS functionality
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};